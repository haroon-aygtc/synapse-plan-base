import { apiClient } from "./api";

export interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  content: string;
  category: string;
  version: string;
  variables?: TemplateVariable[];
  metadata?: Record<string, any>;
  tags?: string[];
  isPublic: boolean;
  isActive: boolean;
  parentTemplateId?: string;
  forkCount: number;
  usageCount: number;
  rating: number;
  ratingCount: number;
  userId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface CreatePromptTemplateRequest {
  name: string;
  description?: string;
  content: string;
  category: string;
  version?: string;
  variables?: TemplateVariable[];
  metadata?: Record<string, any>;
  tags?: string[];
  isPublic?: boolean;
  parentTemplateId?: string;
}

export interface UpdatePromptTemplateRequest
  extends Partial<CreatePromptTemplateRequest> {}

export interface RenderTemplateRequest {
  templateId: string;
  variables: Record<string, any>;
}

export interface RenderTemplateResponse {
  rendered: string;
}

export interface PromptTemplateFilters {
  userId?: string;
  includeInactive?: boolean;
  category?: string;
  isPublic?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export class PromptTemplateAPI {
  static async createTemplate(
    data: CreatePromptTemplateRequest,
  ): Promise<PromptTemplate> {
    const response = await apiClient.post("/prompt-templates", data);
    return response.data;
  }

  static async getTemplates(
    filters?: PromptTemplateFilters,
  ): Promise<PromptTemplate[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    const response = await apiClient.get(`/prompt-templates?${params.toString()}`);
    return response.data;
  }

  static async getTemplate(
    id: string,
    options?: {
      includeChildren?: boolean;
      includeAgents?: boolean;
    },
  ): Promise<PromptTemplate> {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    const response = await apiClient.get(
      `/prompt-templates/${id}?${params.toString()}`,
    );
    return response.data;
  }

  static async updateTemplate(
    id: string,
    data: UpdatePromptTemplateRequest,
  ): Promise<PromptTemplate> {
    const response = await apiClient.patch(`/prompt-templates/${id}`, data);
    return response.data;
  }

  static async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/prompt-templates/${id}`);
  }

  static async renderTemplate(
    data: RenderTemplateRequest,
  ): Promise<RenderTemplateResponse> {
    const response = await apiClient.post("/prompt-templates/render", data);
    return response.data;
  }

  static async createVersion(
    id: string,
    version: string,
    changes: Record<string, any>,
  ): Promise<PromptTemplate> {
    const response = await apiClient.post(`/prompt-templates/${id}/versions`, {
      version,
      changes,
    });
    return response.data;
  }

  static async getVersionHistory(id: string): Promise<PromptTemplate[]> {
    const response = await apiClient.get(`/prompt-templates/${id}/versions`);
    return response.data;
  }

  static async rateTemplate(
    id: string,
    rating: number,
  ): Promise<PromptTemplate> {
    const response = await apiClient.post(`/prompt-templates/${id}/rate`, { rating });
    return response.data;
  }

  static async validateTemplate(
    content: string,
    variables: Record<string, any>,
  ): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      await this.renderTemplate({
        templateId: "validation",
        variables: { content, ...variables },
      });
      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        errors: [error.message || "Validation failed"],
      };
    }
  }

  static async searchTemplates(
    query: string,
    filters?: Omit<PromptTemplateFilters, "search">,
  ): Promise<PromptTemplate[]> {
    return this.getTemplates({ ...filters, search: query });
  }

  static async getTemplatesByCategory(
    category: string,
  ): Promise<PromptTemplate[]> {
    return this.getTemplates({ category });
  }

  static async getPublicTemplates(): Promise<PromptTemplate[]> {
    return this.getTemplates({ isPublic: true });
  }

  static async getUserTemplates(userId: string): Promise<PromptTemplate[]> {
    return this.getTemplates({ userId });
  }
}

export default PromptTemplateAPI;
