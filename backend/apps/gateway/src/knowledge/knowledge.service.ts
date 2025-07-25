import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  KnowledgeDocument,
  KnowledgeDocumentChunk,
  KnowledgeDocumentVersion,
  KnowledgeSearch,
  DocumentType,
  DocumentVisibility,
} from '@database/entities';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  SearchDocumentsDto,
} from './dto';
import { DocumentProcessingService } from './document-processing.service';
import { VectorSearchService } from './vector-search.service';
import { KnowledgeAnalyticsService } from './knowledge-analytics.service';
import { DocumentParsingService } from './document-parsing.service';
import {
  KnowledgeSecurityService,
  SecurityContext,
} from './knowledge-security.service';
import { DocumentStatus, AgentEventType as EventType } from '@shared/enums';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(KnowledgeDocument)
    private readonly documentRepository: Repository<KnowledgeDocument>,
    @InjectRepository(KnowledgeDocumentChunk)
    private readonly chunkRepository: Repository<KnowledgeDocumentChunk>,
    @InjectRepository(KnowledgeDocumentVersion)
    private readonly versionRepository: Repository<KnowledgeDocumentVersion>,
    @InjectRepository(KnowledgeSearch)
    private readonly searchRepository: Repository<KnowledgeSearch>,
    @InjectQueue('document-processing')
    private readonly processingQueue: Queue,
    private readonly documentProcessingService: DocumentProcessingService,
    private readonly vectorSearchService: VectorSearchService,
    private readonly analyticsService: KnowledgeAnalyticsService,
    private readonly parsingService: DocumentParsingService,
    private readonly securityService: KnowledgeSecurityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createDocument(
    createDocumentDto: CreateDocumentDto,
    context: SecurityContext,
  ) {
    // Check organization quota with real database validation
    const organization = await this.organizationRepository.findOne({
      where: { id: context.organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check actual document count against organization limits
    const currentDocumentCount = await this.documentRepository.count({
      where: { organizationId: context.organizationId },
    });

    const maxDocuments = organization.settings?.maxDocuments || 10000;
    if (currentDocumentCount >= maxDocuments) {
      throw new ForbiddenException(
        `Organization has reached maximum limit of ${maxDocuments} documents`,
      );
    }

    // Generate content hash for deduplication
    const contentHash = crypto
      .createHash('sha256')
      .update(createDocumentDto.content)
      .digest('hex');

    // Check for duplicate content
    const existingDocument = await this.documentRepository.findOne({
      where: {
        contentHash,
        organizationId: context.organizationId,
      },
    });

    if (existingDocument) {
      throw new Error('Document with identical content already exists');
    }

    const document = this.documentRepository.create({
      ...createDocumentDto,
      contentHash,
      status: DocumentStatus.UPLOADED,
      visibility: createDocumentDto.visibility || DocumentVisibility.PRIVATE,
      userId: context.userId,
      organizationId: context.organizationId,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedDocument = await this.documentRepository.save(document);

    // Create initial version
    await this.createDocumentVersion(savedDocument, context.userId);

    // Queue document for processing
    await this.processingQueue.add('process-document', {
      documentId: savedDocument.id,
      priority: 'normal',
    });

    // Emit event
    this.eventEmitter.emit(EventType.KNOWLEDGE_DOCUMENT_UPLOADED, {
      documentId: savedDocument.id,
      organizationId: context.organizationId,
      userId: context.userId,
    });

    return savedDocument;
  }

  async uploadDocument(
    file: Express.Multer.File,
    metadata: {
      title: string;
      tags?: string[];
      metadata?: Record<string, any>;
      visibility?: DocumentVisibility;
    },
    context: SecurityContext,
  ) {
    // Validate upload
    const validation = await this.securityService.validateDocumentUpload(
      file.buffer,
      file.originalname,
      context,
    );

    if (!validation.isValid) {
      throw new Error(
        `Upload validation failed: ${validation.issues.join(', ')}`,
      );
    }

    // Parse document content
    const documentType = this.getFileType(file.originalname);
    const parsedDocument = await this.parsingService.parseDocument(
      validation.sanitizedContent || file.buffer,
      documentType,
      file.originalname,
    );

    // Check for duplicate content
    const existingDocument = await this.documentRepository.findOne({
      where: {
        contentHash: parsedDocument.metadata.contentHash,
        organizationId: context.organizationId,
      },
    });

    if (existingDocument) {
      throw new Error('Document with identical content already exists');
    }

    const document = this.documentRepository.create({
      title: metadata.title,
      type: documentType,
      source: file.originalname,
      content: parsedDocument.content,
      tags: metadata.tags || [],
      metadata: {
        ...metadata.metadata,
        ...parsedDocument.metadata,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      },
      status: DocumentStatus.UPLOADED,
      visibility: metadata.visibility || DocumentVisibility.PRIVATE,
      userId: context.userId,
      organizationId: context.organizationId,
      fileSize: file.size,
      language: parsedDocument.metadata.language,
      contentHash: parsedDocument.metadata.contentHash,
      tokenCount: parsedDocument.metadata.wordCount, // Approximate
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedDocument = await this.documentRepository.save(document);

    // Create initial version
    await this.createDocumentVersion(savedDocument, context.userId);

    // Queue for processing
    await this.processingQueue.add('process-document', {
      documentId: savedDocument.id,
      priority: 'normal',
    });

    return savedDocument;
  }

  async bulkUploadDocuments(
    files: Express.Multer.File[],
    metadata: Array<{
      title: string;
      tags?: string[];
      metadata?: Record<string, any>;
      visibility?: DocumentVisibility;
    }>,
    context: SecurityContext,
  ) {
    const successful: any[] = [];
    const failed: Array<{ title: string; error: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileMetadata = metadata[i] || { title: file.originalname };

      try {
        const document = await this.uploadDocument(file, fileMetadata, context);
        successful.push(document);
      } catch (error) {
        failed.push({
          title: fileMetadata.title,
          error: error.message,
        });
      }
    }

    return { successful, failed };
  }

  async listDocuments(
    options: {
      page?: number;
      limit?: number;
      search?: string;
      type?: string;
      status?: string;
      tags?: string[];
    },
    context: SecurityContext,
  ) {
    const { page = 1, limit = 20, search, type, status, tags } = options;
    const queryBuilder = this.documentRepository.createQueryBuilder('document');

    // Organization isolation
    queryBuilder.andWhere('document.organizationId = :organizationId', {
      organizationId: context.organizationId,
    });

    if (search) {
      queryBuilder.andWhere(
        '(document.title ILIKE :search OR document.content ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (type) {
      queryBuilder.andWhere('document.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('document.status = :status', { status });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('document.tags && :tags', { tags });
    }

    queryBuilder
      .orderBy('document.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [documents, total] = await queryBuilder.getManyAndCount();

    // Filter documents based on access permissions
    const accessibleDocuments =
      await this.securityService.filterDocumentsByAccess(documents, context);

    return {
      data: accessibleDocuments,
      pagination: {
        page,
        limit,
        total: accessibleDocuments.length,
        totalPages: Math.ceil(accessibleDocuments.length / limit),
      },
    };
  }

  async getDocument(id: string, context: SecurityContext) {
    const document = await this.documentRepository.findOne({
      where: {
        id,
        organizationId: context.organizationId,
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Check access permissions
    const hasAccess = await this.securityService.checkDocumentAccess(
      id,
      context,
      'read',
    );

    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this document');
    }

    // Track document access
    await this.analyticsService.trackDocumentAccess(id, context.userId);

    return document;
  }

  async updateDocument(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
    context: SecurityContext,
  ) {
    const document = await this.getDocument(id, context);

    // Check write permissions
    const hasWriteAccess = await this.securityService.checkDocumentAccess(
      id,
      context,
      'write',
    );

    if (!hasWriteAccess) {
      throw new ForbiddenException('Write access denied to this document');
    }

    // Create new version if content changed
    if (
      updateDocumentDto.content &&
      updateDocumentDto.content !== document.content
    ) {
      await this.createDocumentVersion(document, context.userId);
      document.version += 1;
    }

    Object.assign(document, {
      ...updateDocumentDto,
      updatedAt: new Date(),
    });

    const updatedDocument = await this.documentRepository.save(document);

    // If content changed, reprocess the document
    if (
      updateDocumentDto.content &&
      updateDocumentDto.content !== document.content
    ) {
      await this.processingQueue.add('process-document', {
        documentId: document.id,
        priority: 'normal',
      });
    }

    return updatedDocument;
  }

  async deleteDocument(id: string, context: SecurityContext) {
    const document = await this.getDocument(id, context);

    // Check delete permissions
    const hasDeleteAccess = await this.securityService.checkDocumentAccess(
      id,
      context,
      'delete',
    );

    if (!hasDeleteAccess) {
      throw new ForbiddenException('Delete access denied to this document');
    }

    // Remove from vector database
    await this.vectorSearchService.removeDocument(id);

    // Remove document and all related data
    await this.documentRepository.remove(document);

    // Emit deletion event
    this.eventEmitter.emit(EventType.KNOWLEDGE_DOCUMENT_PROCESSED, {
      documentId: id,
      action: 'deleted',
      organizationId: context.organizationId,
      userId: context.userId,
      timestamp: new Date(),
    });
  }

  async searchDocuments(
    searchDto: SearchDocumentsDto,
    context: SecurityContext,
  ) {
    const searchId = uuidv4();
    const startTime = Date.now();

    // Validate search query
    const queryValidation = await this.securityService.validateSearchQuery(
      searchDto.query,
      context,
    );

    if (!queryValidation.isValid) {
      throw new Error(
        `Invalid search query: ${queryValidation.issues.join(', ')}`,
      );
    }

    try {
      // Add organization filter to ensure data isolation
      const searchOptions = {
        query: queryValidation.sanitizedQuery!,
        type: searchDto.type || 'hybrid',
        maxResults: searchDto.maxResults || 10,
        threshold: searchDto.threshold || 0.7,
        filters: {
          ...searchDto.filters,
          organizationId: context.organizationId,
        },
      };

      // Perform vector search
      const searchResults =
        await this.vectorSearchService.search(searchOptions);

      // Filter results based on document access permissions
      const accessibleResults = [];
      for (const result of searchResults.results) {
        const hasAccess = await this.securityService.checkDocumentAccess(
          result.documentId,
          context,
          'read',
        );
        if (hasAccess) {
          accessibleResults.push(result);
          // Track document access
          await this.analyticsService.trackDocumentAccess(
            result.documentId,
            context.userId,
          );
        }
      }

      const executionTime = Date.now() - startTime;
      const averageScore =
        accessibleResults.length > 0
          ? accessibleResults.reduce((sum, r) => sum + r.score, 0) /
            accessibleResults.length
          : 0;

      // Save search record
      const search = this.searchRepository.create({
        id: searchId,
        query: searchDto.query,
        type: searchDto.type || 'hybrid',
        status: 'success',
        results: accessibleResults,
        filters: searchDto.filters,
        resultCount: accessibleResults.length,
        executionTimeMs: executionTime,
        averageScore,
        maxScore:
          accessibleResults.length > 0
            ? Math.max(...accessibleResults.map((r) => r.score))
            : 0,
        minScore:
          accessibleResults.length > 0
            ? Math.min(...accessibleResults.map((r) => r.score))
            : 0,
        userId: context.userId,
        organizationId: context.organizationId,
        performanceMetrics: {
          tokenCount: searchDto.query.split(' ').length,
          processingSteps: ['validation', 'vector_search', 'access_filter'],
        },
        createdAt: new Date(),
      });

      await this.searchRepository.save(search);

      // Emit search event
      this.eventEmitter.emit(EventType.KNOWLEDGE_SEARCH_PERFORMED, {
        searchId,
        query: searchDto.query,
        resultCount: accessibleResults.length,
        organizationId: context.organizationId,
        userId: context.userId,
      });

      return {
        ...search,
        sources: searchResults.sources,
        searchId,
      };
    } catch (error) {
      // Save failed search record
      const search = this.searchRepository.create({
        id: searchId,
        query: searchDto.query,
        type: searchDto.type || 'hybrid',
        status: 'failed',
        results: [],
        filters: searchDto.filters,
        resultCount: 0,
        executionTimeMs: Date.now() - startTime,
        errorMessage: error.message,
        userId: context.userId,
        organizationId: context.organizationId,
        createdAt: new Date(),
      });

      await this.searchRepository.save(search);
      throw error;
    }
  }

  async getSearchHistory(
    options: {
      page?: number;
      limit?: number;
      userId?: string;
    },
    context: SecurityContext,
  ) {
    const { page = 1, limit = 20, userId } = options;
    const queryBuilder = this.searchRepository.createQueryBuilder('search');

    // Organization isolation
    queryBuilder.andWhere('search.organizationId = :organizationId', {
      organizationId: context.organizationId,
    });

    if (userId) {
      queryBuilder.andWhere('search.userId = :userId', { userId });
    }

    queryBuilder
      .orderBy('search.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [searches, total] = await queryBuilder.getManyAndCount();

    return {
      data: searches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSearch(id: string, context: SecurityContext) {
    const search = await this.searchRepository.findOne({
      where: {
        id,
        organizationId: context.organizationId,
      },
    });

    if (!search) {
      throw new NotFoundException(`Search with ID ${id} not found`);
    }

    return search;
  }

  async reprocessDocument(id: string, context: SecurityContext) {
    const document = await this.getDocument(id, context);

    // Check write permissions
    const hasWriteAccess = await this.securityService.checkDocumentAccess(
      id,
      context,
      'write',
    );

    if (!hasWriteAccess) {
      throw new ForbiddenException('Write access denied to this document');
    }

    document.status = DocumentStatus.PROCESSING;
    await this.documentRepository.save(document);

    // Start reprocessing
    await this.processingQueue.add('process-document', {
      documentId: id,
      priority: 'high',
    });

    return document;
  }

  async getProcessingStatus(id: string, context: SecurityContext) {
    const document = await this.getDocument(id, context);

    return {
      status: document.status,
      progress: this.getProcessingProgress(document.status),
      error: document.error,
      processedAt: document.processedAt,
      chunkCount: document.chunkCount,
      tokenCount: document.tokenCount,
      processingSteps: [
        {
          step: 'upload',
          status: 'completed',
          startedAt: document.createdAt,
          completedAt: document.createdAt,
        },
        {
          step: 'extraction',
          status:
            document.status === DocumentStatus.PROCESSING
              ? 'processing'
              : document.status === DocumentStatus.PROCESSED
                ? 'completed'
                : document.status === DocumentStatus.FAILED
                  ? 'failed'
                  : 'pending',
        },
        {
          step: 'vectorization',
          status:
            document.status === DocumentStatus.PROCESSED
              ? 'completed'
              : document.status === DocumentStatus.FAILED
                ? 'failed'
                : 'pending',
          completedAt: document.processedAt,
        },
      ],
    };
  }

  async getSimilarDocuments(
    id: string,
    options: {
      maxResults?: number;
      threshold?: number;
    },
    context: SecurityContext,
  ) {
    const document = await this.getDocument(id, context);

    // Use vector search to find similar documents
    const results = await this.vectorSearchService.getSimilarDocuments(id, {
      maxResults: options.maxResults || 5,
      threshold: options.threshold || 0.7,
    });

    // Filter results based on access permissions
    const accessibleResults = [];
    for (const result of results) {
      const hasAccess = await this.securityService.checkDocumentAccess(
        result.documentId,
        context,
        'read',
      );
      if (hasAccess) {
        accessibleResults.push(result);
      }
    }

    return accessibleResults;
  }

  async getAnalytics(
    options: { start: Date; end: Date },
    context: SecurityContext,
  ) {
    return this.analyticsService.generateReport(
      context.organizationId,
      options.start,
      options.end,
    );
  }

  private getProcessingProgress(status: DocumentStatus) {
    switch (status) {
      case DocumentStatus.PROCESSING:
        return 'Processing...';
      case DocumentStatus.PROCESSED:
        return 'Completed';
      default:
        return 'Pending';
    }
  }

  private async createDocumentVersion(
    document: KnowledgeDocument,
    userId: string,
  ): Promise<void> {
    const contentHash = crypto
      .createHash('sha256')
      .update(document.content)
      .digest('hex');

    const version = this.versionRepository.create({
      documentId: document.id,
      version: document.version,
      content: document.content,
      metadata: document.metadata,
      contentHash,
      createdBy: userId,
    });

    await this.versionRepository.save(version);
  }

  private getFileType(filename: string): DocumentType {
    const extension = filename.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        return DocumentType.PDF;
      case 'doc':
      case 'docx':
        return DocumentType.DOCUMENT;
      case 'txt':
        return DocumentType.TEXT;
      case 'md':
      case 'markdown':
        return DocumentType.MARKDOWN;
      case 'html':
      case 'htm':
        return DocumentType.HTML;
      case 'json':
        return DocumentType.JSON;
      case 'csv':
        return DocumentType.CSV;
      default:
        return DocumentType.UNKNOWN;
    }
  }

  // Collection methods
  async createCollection(
    collectionData: {
      name: string;
      description?: string;
      documentIds: string[];
      tags?: string[];
      metadata?: Record<string, any>;
    },
    context: SecurityContext,
  ) {
    // Verify all documents exist and user has access
    const documents = await this.documentRepository.find({
      where: {
        id: In(collectionData.documentIds),
        organizationId: context.organizationId,
      },
    });

    if (documents.length !== collectionData.documentIds.length) {
      throw new NotFoundException('Some documents not found or not accessible');
    }

    // Check access to all documents
    for (const doc of documents) {
      const hasAccess = await this.securityService.checkDocumentAccess(
        doc.id,
        context,
        'read',
      );
      if (!hasAccess) {
        throw new ForbiddenException(`Access denied to document: ${doc.title}`);
      }
    }

    // Create collection metadata document
    const collectionDoc = this.documentRepository.create({
      title: collectionData.name,
      type: DocumentType.JSON,
      source: 'collection',
      content: JSON.stringify({
        type: 'collection',
        name: collectionData.name,
        description: collectionData.description,
        documentIds: collectionData.documentIds,
        documentTitles: documents.map((d) => d.title),
      }),
      tags: collectionData.tags || [],
      metadata: {
        ...collectionData.metadata,
        isCollection: true,
        documentCount: documents.length,
      },
      status: DocumentStatus.PROCESSED,
      visibility: DocumentVisibility.PRIVATE,
      userId: context.userId,
      organizationId: context.organizationId,
      version: 1,
    });

    return this.documentRepository.save(collectionDoc);
  }

  async searchCollection(
    collectionId: string,
    searchDto: SearchDocumentsDto,
    context: SecurityContext,
  ) {
    const collection = await this.getDocument(collectionId, context);

    if (!collection.metadata?.isCollection) {
      throw new Error('Document is not a collection');
    }

    const collectionData = JSON.parse(collection.content);
    const documentIds = collectionData.documentIds;

    // Add document filter to search only within collection
    const searchOptions = {
      ...searchDto,
      filters: {
        ...searchDto.filters,
        documentIds,
        organizationId: context.organizationId,
      },
    };

    return this.searchDocuments(searchOptions, context);
  }
}
