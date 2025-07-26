import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KnowledgeDocument } from '@database/entities';
import { DocumentStatus, AgentEventType as EventType } from '@shared/enums';
import { VectorSearchService } from './vector-search.service';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DocumentProcessingService {
  private readonly logger = new Logger(DocumentProcessingService.name);
  private readonly openai: OpenAI;

  constructor(
    @InjectRepository(KnowledgeDocument)
    private readonly documentRepository: Repository<KnowledgeDocument>,
    private readonly vectorSearchService: VectorSearchService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async processDocument(documentId: string): Promise<void> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    try {
      // Update status to processing
      document.status = DocumentStatus.PROCESSING;
      await this.documentRepository.save(document);

      // Emit processing started event
      this.eventEmitter.emit(EventType.KNOWLEDGE_DOCUMENT_UPLOADED, {
        documentId,
        title: document.title,
        type: document.type,
        organizationId: document.organizationId,
        timestamp: new Date(),
      });

      // Extract and chunk content
      const chunks = await this.chunkDocument(document.content, document.type);

      // Generate embeddings for each chunk
      const embeddedChunks = await this.generateEmbeddings(chunks);

      // Store in vector database
      await this.vectorSearchService.indexDocument({
        documentId: document.id,
        title: document.title,
        type: document.type,
        chunks: embeddedChunks,
        metadata: {
          ...document.metadata,
          organizationId: document.organizationId,
          userId: document.userId,
          tags: document.tags,
          processedAt: new Date(),
        },
      });

      // Update document status
      document.status = DocumentStatus.PROCESSED;
      document.processedAt = new Date();
      document.metadata = {
        ...document.metadata,
        chunkCount: chunks.length,
        embeddingModel: 'text-embedding-3-small',
        processedAt: new Date(),
      };

      await this.documentRepository.save(document);

      // Emit processing completed event
      this.eventEmitter.emit(EventType.KNOWLEDGE_DOCUMENT_PROCESSED, {
        documentId,
        title: document.title,
        chunkCount: chunks.length,
        organizationId: document.organizationId,
        timestamp: new Date(),
      });

      this.logger.log(`Document processed successfully: ${documentId} (${chunks.length} chunks)`);
    } catch (error) {
      // Update status to failed
      document.status = DocumentStatus.FAILED;
      document.error = error instanceof Error ? error.message : 'Unknown error';
      await this.documentRepository.save(document);

      this.logger.error(`Document processing failed: ${documentId}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  private async chunkDocument(
    content: string,
    type: string
  ): Promise<Array<{ text: string; metadata: any }>> {
    const chunks: Array<{ text: string; metadata: any }> = [];
    const maxChunkSize = 1000; // characters
    const overlapSize = 200; // characters

    // Simple text chunking - in production, use more sophisticated methods
    if (type === 'text' || type === 'markdown') {
      const paragraphs = content.split('\n\n').filter((p) => p.trim().length > 0);

      let currentChunk = '';
      let chunkIndex = 0;

      for (const paragraph of paragraphs) {
        if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
          chunks.push({
            text: currentChunk.trim(),
            metadata: {
              chunkIndex,
              type: 'paragraph',
              length: currentChunk.length,
            },
          });

          // Add overlap
          const words = currentChunk.split(' ');
          const overlapWords = words.slice(-Math.floor(overlapSize / 5));
          currentChunk = `${overlapWords.join(' ')} ${paragraph}`;
          chunkIndex++;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      }

      if (currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          metadata: {
            chunkIndex,
            type: 'paragraph',
            length: currentChunk.length,
          },
        });
      }
    } else {
      // For other types, use simple character-based chunking
      for (let i = 0; i < content.length; i += maxChunkSize - overlapSize) {
        const chunk = content.slice(i, i + maxChunkSize);
        chunks.push({
          text: chunk,
          metadata: {
            chunkIndex: Math.floor(i / (maxChunkSize - overlapSize)),
            type: 'text',
            startIndex: i,
            length: chunk.length,
          },
        });
      }
    }

    return chunks;
  }

  private async generateEmbeddings(
    chunks: Array<{ text: string; metadata: any }>
  ): Promise<Array<{ text: string; embedding: number[]; metadata: any }>> {
    const embeddedChunks = [];
    const batchSize = 100; // Process in batches to avoid rate limits

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((chunk) => chunk.text);

      try {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: texts,
        });

        for (let j = 0; j < batch.length; j++) {
          embeddedChunks.push({
            text: batch[j].text,
            embedding: response.data[j].embedding,
            metadata: batch[j].metadata,
          });
        }

        // Small delay to respect rate limits
        if (i + batchSize < chunks.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        this.logger.error(`Failed to generate embeddings for batch ${i}-${i + batchSize}`, error);
        throw error;
      }
    }

    return embeddedChunks;
  }

  async reprocessDocument(documentId: string): Promise<void> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Remove from vector database first
    await this.vectorSearchService.removeDocument(documentId);

    // Reset status and reprocess
    document.status = DocumentStatus.UPLOADED;
    document.error = undefined;
    document.processedAt = undefined;
    await this.documentRepository.save(document);

    await this.processDocument(documentId);
  }

  async getProcessingStats(organizationId: string): Promise<{
    totalDocuments: number;
    processingDocuments: number;
    processedDocuments: number;
    failedDocuments: number;
    averageProcessingTime: number;
  }> {
    const stats = await this.documentRepository
      .createQueryBuilder('doc')
      .select('doc.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(EXTRACT(EPOCH FROM (doc.processedAt - doc.createdAt)))', 'avgTime')
      .where('doc.organizationId = :organizationId', { organizationId })
      .groupBy('doc.status')
      .getRawMany();

    const result = {
      totalDocuments: 0,
      processingDocuments: 0,
      processedDocuments: 0,
      failedDocuments: 0,
      averageProcessingTime: 0,
    };

    for (const stat of stats) {
      result.totalDocuments += parseInt(stat.count);

      switch (stat.status) {
        case DocumentStatus.PROCESSING:
          result.processingDocuments = parseInt(stat.count);
          break;
        case DocumentStatus.PROCESSED:
          result.processedDocuments = parseInt(stat.count);
          result.averageProcessingTime = parseFloat(stat.avgTime) || 0;
          break;
        case DocumentStatus.FAILED:
          result.failedDocuments = parseInt(stat.count);
          break;
      }
    }

    return result;
  }
}
