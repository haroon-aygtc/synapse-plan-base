import type { 
  SwaggerSpec, 
  ApiEndpoint, 
  EndpointCategory, 
  HttpMethod,
  Parameter,
  RequestBodySchema,
  ResponseSchema,
  SecurityRequirement,
  Operation,
  PathItem
} from '@/types/api-tester'

export class EndpointDiscoveryService {
  private readonly baseUrl: string
  private cachedSpec: SwaggerSpec | null = null
  private cacheTimestamp: number = 0
  private readonly cacheTimeout = 5 * 60 * 1000 // 5 minutes

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl
  }

  /**
   * Fetch Swagger/OpenAPI specification from backend
   */
  async fetchSwaggerSpec(): Promise<SwaggerSpec> {
    // Check cache first
    if (this.cachedSpec && Date.now() - this.cacheTimestamp < this.cacheTimeout) {
      return this.cachedSpec
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/docs-json`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch Swagger spec: ${response.status} ${response.statusText}`)
      }

      const spec: SwaggerSpec = await response.json()
      
      // Validate basic structure
      if (!spec.openapi && !spec.swagger) {
        throw new Error('Invalid Swagger/OpenAPI specification: missing version field')
      }

      if (!spec.paths) {
        throw new Error('Invalid Swagger/OpenAPI specification: missing paths')
      }

      // Cache the result
      this.cachedSpec = spec
      this.cacheTimestamp = Date.now()

      return spec
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch Swagger specification: ${error.message}`)
      }
      throw new Error('Failed to fetch Swagger specification: Unknown error')
    }
  }

  /**
   * Parse endpoints from Swagger specification
   */
  parseEndpoints(spec: SwaggerSpec): ApiEndpoint[] {
    const endpoints: ApiEndpoint[] = []

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      if (!pathItem) continue

      const methods: Array<keyof PathItem> = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options']
      
      for (const method of methods) {
        const operation = pathItem[method] as Operation | undefined
        if (!operation) continue

        const endpoint: ApiEndpoint = {
          id: this.generateEndpointId(method.toUpperCase() as HttpMethod, path),
          method: method.toUpperCase() as HttpMethod,
          path,
          summary: operation.summary || `${method.toUpperCase()} ${path}`,
          description: operation.description,
          category: this.extractCategory(operation.tags, path),
          parameters: this.parseParameters(operation.parameters || []),
          requestBody: operation.requestBody ? this.parseRequestBody(operation.requestBody) : undefined,
          responses: this.parseResponses(operation.responses || {}),
          security: operation.security || [],
          tags: operation.tags || []
        }

        endpoints.push(endpoint)
      }
    }

    return endpoints
  }

  /**
   * Categorize endpoints by logical groups
   */
  categorizeEndpoints(endpoints: ApiEndpoint[]): EndpointCategory[] {
    const categoryMap = new Map<string, ApiEndpoint[]>()

    // Group endpoints by category
    for (const endpoint of endpoints) {
      const category = endpoint.category
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push(endpoint)
    }

    // Convert to category objects and sort
    const categories: EndpointCategory[] = []
    for (const [name, endpointList] of categoryMap.entries()) {
      categories.push({
        name,
        description: this.generateCategoryDescription(name),
        endpoints: endpointList.sort((a, b) => {
          // Sort by path first, then by method
          if (a.path !== b.path) {
            return a.path.localeCompare(b.path)
          }
          return a.method.localeCompare(b.method)
        })
      })
    }

    // Sort categories alphabetically, but put 'Default' last
    return categories.sort((a, b) => {
      if (a.name === 'Default') return 1
      if (b.name === 'Default') return -1
      return a.name.localeCompare(b.name)
    })
  }

  /**
   * Generate a unique ID for an endpoint
   */
  private generateEndpointId(method: HttpMethod, path: string): string {
    return `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`
  }

  /**
   * Extract category from tags or path
   */
  private extractCategory(tags?: string[], path?: string): string {
    if (tags && tags.length > 0) {
      return tags[0]
    }

    if (path) {
      // Extract first path segment as category
      const segments = path.split('/').filter(segment => segment && !segment.startsWith(':') && !segment.startsWith('{'))
      if (segments.length > 0) {
        return segments[0].charAt(0).toUpperCase() + segments[0].slice(1)
      }
    }

    return 'Default'
  }

  /**
   * Parse parameters from operation
   */
  private parseParameters(parameters: any[]): Parameter[] {
    return parameters.map(param => ({
      name: param.name,
      in: param.in,
      required: param.required || false,
      schema: param.schema || { type: 'string' },
      description: param.description,
      example: param.example
    }))
  }

  /**
   * Parse request body from operation
   */
  private parseRequestBody(requestBody: any): RequestBodySchema {
    return {
      required: requestBody.required || false,
      content: requestBody.content || {}
    }
  }

  /**
   * Parse responses from operation
   */
  private parseResponses(responses: Record<string, any>): ResponseSchema[] {
    return Object.entries(responses).map(([status, response]) => ({
      description: response.description || `Response ${status}`,
      content: response.content,
      headers: response.headers
    }))
  }

  /**
   * Generate description for category
   */
  private generateCategoryDescription(categoryName: string): string {
    const descriptions: Record<string, string> = {
      'Auth': 'Authentication and authorization endpoints',
      'User': 'User management and profile endpoints',
      'Agent': 'AI agent management endpoints',
      'Workflow': 'Workflow orchestration endpoints',
      'Tool': 'Tool management endpoints',
      'Knowledge': 'Knowledge base management endpoints',
      'Analytics': 'Analytics and reporting endpoints',
      'Billing': 'Billing and subscription endpoints',
      'Notification': 'Notification management endpoints',
      'Health': 'System health and monitoring endpoints',
      'Default': 'Miscellaneous endpoints'
    }

    return descriptions[categoryName] || `${categoryName} related endpoints`
  }

  /**
   * Clear the cached specification
   */
  clearCache(): void {
    this.cachedSpec = null
    this.cacheTimestamp = 0
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { cached: boolean; age: number } {
    return {
      cached: this.cachedSpec !== null,
      age: this.cachedSpec ? Date.now() - this.cacheTimestamp : 0
    }
  }
}