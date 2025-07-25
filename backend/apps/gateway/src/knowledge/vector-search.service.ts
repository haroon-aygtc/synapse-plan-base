import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventType } from '@shared/enums';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

export interface VectorDocument {
  documentId: string;
  title: string;
  type: string;
  chunks: Array<{
    text: string;
    embedding: number[];
    metadata: any;
  }>;
  metadata: any;
}

export interface SearchOptions {
  query: string;
  type: 'semantic' | 'keyword' | 'hybrid';
  maxResults: number;
  threshold: number;
  filters?: {
    documentTypes?: string[];
    tags?: string[];
    dateRange?: {
      from: Date;
      to: Date;
    };
    organizationId?: string;
    userId?: string;
  };
}

export interface SearchResult {
  documentId: string;
  title: string;
  content: string;
  score: number;
  source: string;
  metadata: any;
  highlights?: string[];
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);
  private readonly openai: OpenAI;
  private readonly vectorStore = new Map<string, VectorDocument>();
  private readonly documentIndex = new Map<string, string[]>(); // documentId -> chunkIds

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async indexDocument(document: VectorDocument): Promise<void> {
    try {
      const chunkIds: string[] = [];

      // Store each chunk with a unique ID
      for (const chunk of document.chunks) {
        const chunkId = uuidv4();
        chunkIds.push(chunkId);

        this.vectorStore.set(chunkId, {
          ...document,
          chunks: [chunk], // Store individual chunk
        });
      }

      // Map document to its chunks
      this.documentIndex.set(document.documentId, chunkIds);

      this.logger.log(
        `Indexed document: ${document.documentId} with ${document.chunks.length} chunks`
      );
    } catch (error) {
      this.logger.error(`Failed to index document: ${document.documentId}`, error);
      throw error;
    }
  }

  async removeDocument(documentId: string): Promise<void> {
    const chunkIds = this.documentIndex.get(documentId);
    if (chunkIds) {
      // Remove all chunks for this document
      for (const chunkId of chunkIds) {
        this.vectorStore.delete(chunkId);
      }
      this.documentIndex.delete(documentId);

      this.logger.log(`Removed document from index: ${documentId}`);
    }
  }

  async search(options: SearchOptions): Promise<{
    results: SearchResult[];
    sources: string[];
    totalResults: number;
    searchId: string;
  }> {
    const searchId = uuidv4();
    const startTime = Date.now();

    try {
      let results: SearchResult[] = [];

      if (options.type === 'semantic' || options.type === 'hybrid') {
        results = await this.semanticSearch(options);
      }

      if (options.type === 'keyword' || options.type === 'hybrid') {
        const keywordResults = await this.keywordSearch(options);

        if (options.type === 'hybrid') {
          // Merge and re-rank results
          results = this.mergeResults(results, keywordResults);
        } else {
          results = keywordResults;
        }
      }

      // Apply filters
      results = this.applyFilters(results, options.filters);

      // Sort by score and limit results
      results = results.sort((a, b) => b.score - a.score).slice(0, options.maxResults);

      const sources = [...new Set(results.map((r) => r.source))];

      // Emit search event
      this.eventEmitter.emit(EventType.KNOWLEDGE_SEARCH_PERFORMED, {
        searchId,
        query: options.query,
        type: options.type,
        resultCount: results.length,
        executionTime: Date.now() - startTime,
        organizationId: options.filters?.organizationId,
        timestamp: new Date(),
      });

      return {
        results,
        sources,
        totalResults: results.length,
        searchId,
      };
    } catch (error) {
      this.logger.error(`Search failed for query: "${options.query}"`, error);
      throw error;
    }
  }

  private async semanticSearch(options: SearchOptions): Promise<SearchResult[]> {
    // Generate embedding for the query
    const queryEmbedding = await this.generateQueryEmbedding(options.query);

    const results: SearchResult[] = [];

    // Calculate similarity with all chunks
    for (const [chunkId, document] of this.vectorStore.entries()) {
      const chunk = document.chunks[0]; // Each entry has one chunk
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);

      if (similarity >= options.threshold) {
        results.push({
          documentId: document.documentId,
          title: document.title,
          content: chunk.text,
          score: similarity,
          source: document.metadata.source || document.title,
          metadata: {
            ...document.metadata,
            chunkMetadata: chunk.metadata,
            similarity,
          },
        });
      }
    }

    return results;
  }

  private async keywordSearch(options: SearchOptions): Promise<SearchResult[]> {
    const query = options.query.toLowerCase();
    const keywords = query.split(/\s+/).filter((word) => word.length > 2);

    const results: SearchResult[] = [];

    for (const [chunkId, document] of this.vectorStore.entries()) {
      const chunk = document.chunks[0];
      const content = chunk.text.toLowerCase();

      let score = 0;
      const highlights: string[] = [];

      // Calculate keyword match score
      for (const keyword of keywords) {
        const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
        if (matches > 0) {
          score += (matches / content.length) * 1000; // Normalize by content length
          highlights.push(keyword);
        }
      }

      if (score > 0) {
        results.push({
          documentId: document.documentId,
          title: document.title,
          content: chunk.text,
          score,
          source: document.metadata.source || document.title,
          metadata: {
            ...document.metadata,
            chunkMetadata: chunk.metadata,
            keywordScore: score,
          },
          highlights,
        });
      }
    }

    return results;
  }

  private mergeResults(
    semanticResults: SearchResult[],
    keywordResults: SearchResult[]
  ): SearchResult[] {
    const merged = new Map<string, SearchResult>();

    // Add semantic results with weight
    for (const result of semanticResults) {
      const key = `${result.documentId}:${result.content.substring(0, 50)}`;
      merged.set(key, {
        ...result,
        score: result.score * 0.7, // Weight semantic results
      });
    }

    // Add or merge keyword results
    for (const result of keywordResults) {
      const key = `${result.documentId}:${result.content.substring(0, 50)}`;
      const existing = merged.get(key);

      if (existing) {
        // Combine scores
        existing.score += result.score * 0.3; // Weight keyword results
        existing.highlights = [...(existing.highlights || []), ...(result.highlights || [])];
      } else {
        merged.set(key, {
          ...result,
          score: result.score * 0.3,
        });
      }
    }

    return Array.from(merged.values());
  }

  private applyFilters(
    results: SearchResult[],
    filters?: SearchOptions['filters']
  ): SearchResult[] {
    if (!filters) return results;

    return results.filter((result) => {
      // Filter by document types
      if (filters.documentTypes && filters.documentTypes.length > 0) {
        if (!filters.documentTypes.includes(result.metadata.type)) {
          return false;
        }
      }

      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        const resultTags = result.metadata.tags || [];
        if (!filters.tags.some((tag) => resultTags.includes(tag))) {
          return false;
        }
      }

      // Filter by organization
      if (filters.organizationId) {
        if (result.metadata.organizationId !== filters.organizationId) {
          return false;
        }
      }

      // Filter by user
      if (filters.userId) {
        if (result.metadata.userId !== filters.userId) {
          return false;
        }
      }

      // Filter by date range
      if (filters.dateRange) {
        const createdAt = new Date(result.metadata.createdAt);
        if (createdAt < filters.dateRange.from || createdAt > filters.dateRange.to) {
          return false;
        }
      }

      return true;
    });
  }

  private async generateQueryEmbedding(query: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    return response.data[0].embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async getSimilarDocuments(
    documentId: string,
    options: { maxResults: number; threshold: number }
  ): Promise<SearchResult[]> {
    const chunkIds = this.documentIndex.get(documentId);
    if (!chunkIds || chunkIds.length === 0) {
      return [];
    }

    // Use the first chunk as reference
    const referenceDocument = this.vectorStore.get(chunkIds[0]);
    if (!referenceDocument) {
      return [];
    }

    const referenceEmbedding = referenceDocument.chunks[0].embedding;
    const results: SearchResult[] = [];

    for (const [chunkId, document] of this.vectorStore.entries()) {
      // Skip chunks from the same document
      if (document.documentId === documentId) {
        continue;
      }

      const chunk = document.chunks[0];
      const similarity = this.cosineSimilarity(referenceEmbedding, chunk.embedding);

      if (similarity >= options.threshold) {
        results.push({
          documentId: document.documentId,
          title: document.title,
          content: chunk.text,
          score: similarity,
          source: document.metadata.source || document.title,
          metadata: {
            ...document.metadata,
            similarity,
          },
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, options.maxResults);
  }

  getIndexStats(): {
    totalDocuments: number;
    totalChunks: number;
    averageChunksPerDocument: number;
  } {
    const totalDocuments = this.documentIndex.size;
    const totalChunks = this.vectorStore.size;
    const averageChunksPerDocument = totalDocuments > 0 ? totalChunks / totalDocuments : 0;

    return {
      totalDocuments,
      totalChunks,
      averageChunksPerDocument,
    };
  }
}
