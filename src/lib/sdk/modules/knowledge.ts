/**
 * Knowledge Module
 * Manages knowledge base documents and search functionality
 */

import { BaseModule } from "./base";
import { SynapseAI } from "../client";
import {
  APIResponse,
  PaginatedResponse,
  KnowledgeDocument,
  KnowledgeSearch,
  KnowledgeSearchResult,
  DocumentStatus,
  RequestOptions,
} from "../types";

export interface CreateDocumentRequest {
  title: string;
  content?: string;
  type: "text" | "pdf" | "docx" | "url";
  source: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface DocumentListOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: "text" | "pdf" | "docx" | "url";
  status?: DocumentStatus;
  tags?: string[];
  sortBy?: "title" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface SearchRequest {
  query: string;
  type?: "semantic" | "keyword" | "hybrid";
  filters?: {
    documentIds?: string[];
    tags?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    metadata?: Record<string, any>;
  };
  maxResults?: number;
  threshold?: number;
}

export interface SearchHistoryOptions {
  page?: number;
  limit?: number;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: "createdAt" | "query";
  sortOrder?: "asc" | "desc";
}

export interface KnowledgeAnalytics {
  totalDocuments: number;
  totalSearches: number;
  averageSearchTime: number;
  topQueries: Array<{
    query: string;
    count: number;
  }>;
  documentUsage: Array<{
    documentId: string;
    title: string;
    searchCount: number;
    lastAccessed: Date;
  }>;
  searchTrends: Array<{
    date: string;
    searches: number;
    averageRelevance: number;
  }>;
}

/**
 * Knowledge Module Class
 */
export class KnowledgeModule extends BaseModule {
  constructor(client: SynapseAI) {
    super(client, "/knowledge");
  }

  /**
   * Upload and create a new document
   */
  async createDocument(
    data: CreateDocumentRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<KnowledgeDocument>> {
    this.validateRequired(data, ["title", "type", "source"]);

    this.debug("Creating knowledge document", {
      title: data.title,
      type: data.type,
    });

    const response = await this.post<KnowledgeDocument>(
      "/documents",
      {
        ...data,
        organizationId: this.getCurrentOrganization()?.id,
        userId: this.getCurrentUser()?.id,
      },
      options,
    );

    this.emit("knowledge:document_created", response.data);
    return response;
  }

  /**
   * Upload file and create document
   */
  async uploadDocument(
    file: File | Buffer,
    metadata: {
      title: string;
      tags?: string[];
      metadata?: Record<string, any>;
    },
    options: RequestOptions = {},
  ): Promise<APIResponse<KnowledgeDocument>> {
    this.validateRequired(metadata, ["title"]);

    this.debug("Uploading knowledge document", { title: metadata.title });

    const formData = new FormData();

    if (file instanceof File) {
      formData.append("file", file);
    } else {
      // Handle Buffer for Node.js environments
      const blob = new Blob([file]);
      formData.append("file", blob);
    }

    formData.append("title", metadata.title);

    if (metadata.tags) {
      formData.append("tags", JSON.stringify(metadata.tags));
    }

    if (metadata.metadata) {
      formData.append("metadata", JSON.stringify(metadata.metadata));
    }

    formData.append("organizationId", this.getCurrentOrganization()?.id || "");
    formData.append("userId", this.getCurrentUser()?.id || "");

    // Use fetch directly for file upload
    const config = this.client.getConfig();
    const response = await fetch(
      `${config.baseURL}/knowledge/documents/upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          ...options.headers,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();

    this.emit("knowledge:document_uploaded", result.data);
    return result;
  }

  /**
   * Get document by ID
   */
  async getDocument(
    id: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<KnowledgeDocument>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Getting knowledge document", { id });

    return this.get<KnowledgeDocument>(`/documents/${id}`, options);
  }

  /**
   * List documents with pagination and filtering
   */
  async listDocuments(
    listOptions: DocumentListOptions = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<KnowledgeDocument>> {
    this.debug("Listing knowledge documents", listOptions);

    const params: Record<string, any> = {
      page: listOptions.page,
      limit: listOptions.limit,
      search: listOptions.search,
      type: listOptions.type,
      status: listOptions.status,
      sortBy: listOptions.sortBy,
      sortOrder: listOptions.sortOrder,
    };

    if (listOptions.tags?.length) {
      params.tags = listOptions.tags.join(",");
    }

    return this.getPaginated<KnowledgeDocument>("/documents", params, options);
  }

  /**
   * Update document
   */
  async updateDocument(
    id: string,
    data: UpdateDocumentRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<KnowledgeDocument>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Updating knowledge document", { id, data });

    const response = await this.put<KnowledgeDocument>(
      `/documents/${id}`,
      data,
      options,
    );

    this.emit("knowledge:document_updated", response.data);
    return response;
  }

  /**
   * Delete document
   */
  async deleteDocument(
    id: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<void>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Deleting knowledge document", { id });

    const response = await this.delete<void>(`/documents/${id}`, options);

    this.emit("knowledge:document_deleted", { id });
    return response;
  }

  /**
   * Search knowledge base
   */
  async search(
    searchRequest: SearchRequest,
    options: RequestOptions = {},
  ): Promise<APIResponse<KnowledgeSearch>> {
    this.validateRequired(searchRequest, ["query"]);

    this.debug("Searching knowledge base", {
      query: searchRequest.query,
      type: searchRequest.type,
    });

    const searchData = {
      ...searchRequest,
      type: searchRequest.type || "hybrid",
      maxResults: searchRequest.maxResults || 10,
      threshold: searchRequest.threshold || 0.7,
    };

    if (searchRequest.filters?.dateRange) {
      searchData.filters = {
        ...searchRequest.filters,
        dateRange: {
          start: searchRequest.filters.dateRange.start.toISOString(),
          end: searchRequest.filters.dateRange.end.toISOString(),
        },
      };
    }

    const response = await this.post<KnowledgeSearch>(
      "/search",
      searchData,
      options,
    );

    this.emit("knowledge:search_performed", response.data);
    return response;
  }

  /**
   * Get search history
   */
  async getSearchHistory(
    historyOptions: SearchHistoryOptions = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<KnowledgeSearch>> {
    this.debug("Getting search history", historyOptions);

    const params: Record<string, any> = {
      page: historyOptions.page,
      limit: historyOptions.limit,
      userId: historyOptions.userId,
      sortBy: historyOptions.sortBy,
      sortOrder: historyOptions.sortOrder,
    };

    if (historyOptions.startDate) {
      params.startDate = historyOptions.startDate.toISOString();
    }

    if (historyOptions.endDate) {
      params.endDate = historyOptions.endDate.toISOString();
    }

    return this.getPaginated<KnowledgeSearch>(
      "/search/history",
      params,
      options,
    );
  }

  /**
   * Get search by ID
   */
  async getSearch(
    searchId: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<KnowledgeSearch>> {
    this.validateRequired({ searchId }, ["searchId"]);

    this.debug("Getting search result", { searchId });

    return this.get<KnowledgeSearch>(`/search/${searchId}`, options);
  }

  /**
   * Reprocess document (re-extract and re-index)
   */
  async reprocessDocument(
    id: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<KnowledgeDocument>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Reprocessing knowledge document", { id });

    const response = await this.post<KnowledgeDocument>(
      `/documents/${id}/reprocess`,
      {},
      options,
    );

    this.emit("knowledge:document_reprocessing", response.data);
    return response;
  }

  /**
   * Get document processing status
   */
  async getProcessingStatus(
    id: string,
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      status: DocumentStatus;
      progress: number;
      error?: string;
      processingSteps: Array<{
        step: string;
        status: "pending" | "processing" | "completed" | "failed";
        startedAt?: Date;
        completedAt?: Date;
        error?: string;
      }>;
    }>
  > {
    this.validateRequired({ id }, ["id"]);

    this.debug("Getting document processing status", { id });

    return this.get(`/documents/${id}/status`, options);
  }

  /**
   * Get similar documents
   */
  async getSimilarDocuments(
    id: string,
    options: {
      maxResults?: number;
      threshold?: number;
    } = {},
    requestOptions: RequestOptions = {},
  ): Promise<APIResponse<KnowledgeSearchResult[]>> {
    this.validateRequired({ id }, ["id"]);

    this.debug("Getting similar documents", { id, options });

    const params = {
      maxResults: options.maxResults || 5,
      threshold: options.threshold || 0.8,
    };

    return this.get<KnowledgeSearchResult[]>(
      `/documents/${id}/similar${this.buildQueryString(params)}`,
      requestOptions,
    );
  }

  /**
   * Get knowledge analytics
   */
  async getAnalytics(
    period: { start: Date; end: Date },
    options: RequestOptions = {},
  ): Promise<APIResponse<KnowledgeAnalytics>> {
    this.validateRequired(period, ["start", "end"]);

    this.debug("Getting knowledge analytics", { period });

    const params = {
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    };

    return this.get<KnowledgeAnalytics>(
      `/analytics${this.buildQueryString(params)}`,
      options,
    );
  }

  /**
   * Bulk upload documents
   */
  async bulkUpload(
    files: Array<{
      file: File | Buffer;
      title: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }>,
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      successful: KnowledgeDocument[];
      failed: Array<{
        title: string;
        error: string;
      }>;
    }>
  > {
    this.validateRequired({ files }, ["files"]);

    if (!files.length) {
      throw new Error("At least one file is required for bulk upload");
    }

    this.debug("Bulk uploading documents", { count: files.length });

    const formData = new FormData();

    files.forEach((fileData, index) => {
      if (fileData.file instanceof File) {
        formData.append(`files[${index}]`, fileData.file);
      } else {
        const blob = new Blob([fileData.file]);
        formData.append(`files[${index}]`, blob);
      }

      formData.append(
        `metadata[${index}]`,
        JSON.stringify({
          title: fileData.title,
          tags: fileData.tags,
          metadata: fileData.metadata,
        }),
      );
    });

    formData.append("organizationId", this.getCurrentOrganization()?.id || "");
    formData.append("userId", this.getCurrentUser()?.id || "");

    const config = this.client.getConfig();
    const response = await fetch(
      `${config.baseURL}/knowledge/documents/bulk-upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          ...options.headers,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`Bulk upload failed: ${response.statusText}`);
    }

    const result = await response.json();

    this.emit("knowledge:bulk_upload_completed", result.data);
    return result;
  }

  /**
   * Create document collection
   */
  async createCollection(
    data: {
      name: string;
      description?: string;
      documentIds: string[];
      tags?: string[];
    },
    options: RequestOptions = {},
  ): Promise<
    APIResponse<{
      id: string;
      name: string;
      description?: string;
      documentCount: number;
      createdAt: Date;
    }>
  > {
    this.validateRequired(data, ["name", "documentIds"]);

    this.debug("Creating document collection", {
      name: data.name,
      documentCount: data.documentIds.length,
    });

    const response = await this.post(
      "/collections",
      {
        ...data,
        organizationId: this.getCurrentOrganization()?.id,
        userId: this.getCurrentUser()?.id,
      },
      options,
    );

    this.emit("knowledge:collection_created", response.data);
    return response;
  }

  /**
   * Search within a specific collection
   */
  async searchCollection(
    collectionId: string,
    searchRequest: Omit<SearchRequest, "filters"> & {
      filters?: Omit<SearchRequest["filters"], "documentIds">;
    },
    options: RequestOptions = {},
  ): Promise<APIResponse<KnowledgeSearch>> {
    this.validateRequired({ collectionId }, ["collectionId"]);
    this.validateRequired(searchRequest, ["query"]);

    this.debug("Searching collection", {
      collectionId,
      query: searchRequest.query,
    });

    return this.post<KnowledgeSearch>(
      `/collections/${collectionId}/search`,
      searchRequest,
      options,
    );
  }

  /**
   * Subscribe to document processing events
   */
  onDocumentProcessed(
    callback: (document: KnowledgeDocument) => void,
  ): () => void {
    return this.subscribe("knowledge:document_processed", callback);
  }

  /**
   * Subscribe to search events
   */
  onSearchPerformed(callback: (search: KnowledgeSearch) => void): () => void {
    return this.subscribe("knowledge:search_performed", callback);
  }
}
