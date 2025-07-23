/**
 * Base Module Class
 */

import { SynapseAI } from "../client";
import { APIResponse, PaginatedResponse, RequestOptions } from "../types";
import { generateRequestId } from "../utils";

/**
 * Base class for all SDK modules
 */
export abstract class BaseModule {
  protected client: SynapseAI;
  protected baseEndpoint: string;

  constructor(client: SynapseAI, baseEndpoint: string) {
    this.client = client;
    this.baseEndpoint = baseEndpoint;
  }

  /**
   * Make a GET request
   */
  protected async get<T = any>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<T>> {
    return this.client.request<T>(
      "GET",
      `${this.baseEndpoint}${endpoint}`,
      undefined,
      options,
    );
  }

  /**
   * Make a POST request
   */
  protected async post<T = any>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {},
  ): Promise<APIResponse<T>> {
    return this.client.request<T>(
      "POST",
      `${this.baseEndpoint}${endpoint}`,
      data,
      options,
    );
  }

  /**
   * Make a PUT request
   */
  protected async put<T = any>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {},
  ): Promise<APIResponse<T>> {
    return this.client.request<T>(
      "PUT",
      `${this.baseEndpoint}${endpoint}`,
      data,
      options,
    );
  }

  /**
   * Make a PATCH request
   */
  protected async patch<T = any>(
    endpoint: string,
    data?: any,
    options: RequestOptions = {},
  ): Promise<APIResponse<T>> {
    return this.client.request<T>(
      "PATCH",
      `${this.baseEndpoint}${endpoint}`,
      data,
      options,
    );
  }

  /**
   * Make a DELETE request
   */
  protected async delete<T = any>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<APIResponse<T>> {
    return this.client.request<T>(
      "DELETE",
      `${this.baseEndpoint}${endpoint}`,
      undefined,
      options,
    );
  }

  /**
   * Build query string from parameters
   */
  protected buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item) => searchParams.append(key, String(item)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : "";
  }

  /**
   * Handle paginated requests
   */
  protected async getPaginated<T = any>(
    endpoint: string,
    params: {
      page?: number;
      limit?: number;
      [key: string]: any;
    } = {},
    options: RequestOptions = {},
  ): Promise<PaginatedResponse<T>> {
    const queryString = this.buildQueryString({
      page: params.page || 1,
      limit: params.limit || 20,
      ...params,
    });

    return this.get<T[]>(`${endpoint}${queryString}`, options) as Promise<
      PaginatedResponse<T>
    >;
  }

  /**
   * Subscribe to real-time events for this module
   */
  protected subscribe(
    eventType: string,
    callback: (data: any) => void,
    options: {
      targetType?: "all" | "tenant" | "user" | "flow";
      targetId?: string;
      filters?: Record<string, any>;
    } = {},
  ): () => void {
    return this.client.subscribe(eventType, callback, options);
  }

  /**
   * Check if client is connected
   */
  protected isConnected(): boolean {
    return this.client.isConnected();
  }

  /**
   * Check if client is authenticated
   */
  protected isAuthenticated(): boolean {
    return this.client.isAuthenticated();
  }

  /**
   * Get current user from auth state
   */
  protected getCurrentUser() {
    return this.client.getAuthState().user;
  }

  /**
   * Get current organization from auth state
   */
  protected getCurrentOrganization() {
    return this.client.getAuthState().organization;
  }

  /**
   * Generate a unique request ID
   */
  protected generateRequestId(): string {
    return generateRequestId();
  }

  /**
   * Validate required parameters
   */
  protected validateRequired(
    params: Record<string, any>,
    required: string[],
  ): void {
    for (const field of required) {
      if (params[field] === undefined || params[field] === null) {
        throw new Error(`Required parameter '${field}' is missing`);
      }
    }
  }

  /**
   * Emit module-specific events
   */
  protected emit(eventType: string, data: any): void {
    this.client.emit(eventType, data);
  }

  /**
   * Log debug information if debug mode is enabled
   */
  protected debug(message: string, data?: any): void {
    if (this.client.getConfig().debug) {
      console.log(`[${this.constructor.name}] ${message}`, data || "");
    }
  }
}
