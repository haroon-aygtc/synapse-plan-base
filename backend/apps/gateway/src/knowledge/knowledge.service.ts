import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeDocument, KnowledgeSearch } from '@database/entities';
import { CreateDocumentDto, UpdateDocumentDto, SearchDocumentsDto } from './dto';
import { DocumentProcessingService } from './document-processing.service';
import { VectorSearchService } from './vector-search.service';
import { DocumentStatus } from '@shared/enums';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(KnowledgeDocument)
    private readonly documentRepository: Repository<KnowledgeDocument>,
    @InjectRepository(KnowledgeSearch)
    private readonly searchRepository: Repository<KnowledgeSearch>,
    private readonly documentProcessingService: DocumentProcessingService,
    private readonly vectorSearchService: VectorSearchService,
  ) {}

  async createDocument(createDocumentDto: CreateDocumentDto) {
    const document = this.documentRepository.create({
      ...createDocumentDto,
      status: DocumentStatus.UPLOADED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedDocument = await this.documentRepository.save(document);

    // Start processing the document
    this.documentProcessingService.processDocument(savedDocument.id).catch((error) => {
      console.error(`Failed to process document ${savedDocument.id}:`, error);
    });

    return savedDocument;
  }

  async uploadDocument(
    file: Express.Multer.File,
    metadata: {
      title: string;
      tags?: string[];
      metadata?: Record<string, any>;
    },
  ) {
    const document = this.documentRepository.create({
      title: metadata.title,
      type: this.getFileType(file.originalname),
      source: file.originalname,
      content: file.buffer.toString('utf-8'),
      tags: metadata.tags || [],
      metadata: {
        ...metadata.metadata,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      },
      status: DocumentStatus.UPLOADED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedDocument = await this.documentRepository.save(document);

    // Start processing the document
    this.documentProcessingService.processDocument(savedDocument.id).catch((error) => {
      console.error(`Failed to process document ${savedDocument.id}:`, error);
    });

    return savedDocument;
  }

  async bulkUploadDocuments(
    files: Express.Multer.File[],
    metadata: Array<{
      title: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }>,
  ) {
    const successful: any[] = [];
    const failed: Array<{ title: string; error: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileMetadata = metadata[i] || { title: file.originalname };

      try {
        const document = await this.uploadDocument(file, fileMetadata);
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

  async listDocuments(options: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    status?: string;
    tags?: string[];
  }) {
    const { page = 1, limit = 20, search, type, status, tags } = options;
    const queryBuilder = this.documentRepository.createQueryBuilder('document');

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

    return {
      data: documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDocument(id: string) {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }

  async updateDocument(id: string, updateDocumentDto: UpdateDocumentDto) {
    const document = await this.getDocument(id);
    
    Object.assign(document, {
      ...updateDocumentDto,
      updatedAt: new Date(),
    });

    return this.documentRepository.save(document);
  }

  async deleteDocument(id: string) {
    const document = await this.getDocument(id);
    await this.documentRepository.remove(document);
  }

  async searchDocuments(searchDto: SearchDocumentsDto) {
    const searchId = uuidv4();
    const startTime = Date.now();

    try {
      // Perform vector search
      const results = await this.vectorSearchService.search({
        query: searchDto.query,
        type: searchDto.type || 'hybrid',
        maxResults: searchDto.maxResults || 10,
        threshold: searchDto.threshold || 0.7,
        filters: searchDto.filters,
      });

      // Save search record
      const search = this.searchRepository.create({
        id: searchId,
        query: searchDto.query,
        type: searchDto.type || 'hybrid',
        results,
        filters: searchDto.filters,
        createdAt: new Date(),
      });

      await this.searchRepository.save(search);

      return search;
    } catch (error) {
      // Save failed search record
      const search = this.searchRepository.create({
        id: searchId,
        query: searchDto.query,
        type: searchDto.type || 'hybrid',
        results: [],
        filters: searchDto.filters,
        createdAt: new Date(),
      });

      await this.searchRepository.save(search);
      throw error;
    }
  }

  async getSearchHistory(options: {
    page?: number;
    limit?: number;
    userId?: string;
  }) {
    const { page = 1, limit = 20, userId } = options;
    const queryBuilder = this.searchRepository.createQueryBuilder('search');

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

  async getSearch(id: string) {
    const search = await this.searchRepository.findOne({ where: { id } });
    if (!search) {
      throw new NotFoundException(`Search with ID ${id} not found`);
    }
    return search;
  }

  async reprocessDocument(id: string) {
    const document = await this.getDocument(id);
    
    document.status = DocumentStatus.PROCESSING;
    await this.documentRepository.save(document);

    // Start reprocessing
    this.documentProcessingService.processDocument(id).catch((error) => {
      console.error(`Failed to reprocess document ${id}:`, error);
    });

    return document;
  }

  async getProcessingStatus(id: string) {
    const document = await this.getDocument(id);
    
    return {
      status: document.status,
      progress: this.getProcessingProgress(document.status),
      processingSteps: [
        {
          step: 'upload',
          status: 'completed',
          startedAt: document.createdAt,
          completedAt: document.createdAt,
        },
        {
          step: 'extraction',
          status: document.status === DocumentStatus.PROCESSING ? 'processing' : 
                  document.status === DocumentStatus.PROCESSED ? 'completed' : 'pending',
        },
        {
          step: 'vectorization',
          status: document.status === DocumentStatus.PROCESSED ? 'completed' : 'pending',
        },
      ],
    };
  }

  async getSimilarDocuments(id: string, options: {
    maxResults?: number;
    threshold?: number;
  }) {
    const document = await this.getDocument(id);
    
    // Use vector search to find similar documents
    const results = await this.vectorSearchService.search({
      query: document.content,
      type: 'hybrid',
      maxResults: options.maxResults || 5,
      threshold: options.threshold || 0.7,
    });

    return results;
  }

  async getAnalytics(options: {
    start: Date;
    end: Date;
  }) {
    const { start, end } = options;
    const queryBuilder = this.documentRepository.createQueryBuilder('document');

    queryBuilder
      .select('document.type', 'type')
      .addSelect('COUNT(document.id)', 'count')
      .where('document.createdAt >= :start', { start })
      .andWhere('document.createdAt <= :end', { end })
      .groupBy('document.type')
      .orderBy('count', 'DESC');

    const results = await queryBuilder.getRawMany();

    return results;
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
}