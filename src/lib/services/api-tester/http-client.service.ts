import type { ApiRequest, ApiResponse, AuthConfig } from '@/types/api-tester'

export class HttpClientService {
  /**
   * Send HTTP request with proper authentication and headers
   * Will be implemented in task 6
   */
  async sendRequest(request: ApiRequest): Promise<ApiResponse> {
    throw new Error('Not implemented - will be implemented in task 6')
  }

  /**
   * Build request with authentication headers
   * Will be implemented in task 6
   */
  private buildAuthenticatedRequest(request: ApiRequest, auth: AuthConfig): ApiRequest {
    throw new Error('Not implemented - will be implemented in task 6')
  }

  /**
   * Handle form data and file uploads
   * Will be implemented in task 6
   */
  private buildFormDataRequest(request: ApiRequest): FormData {
    throw new Error('Not implemented - will be implemented in task 6')
  }
}