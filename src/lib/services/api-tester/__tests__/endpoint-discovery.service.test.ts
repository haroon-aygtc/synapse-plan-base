import { EndpointDiscoveryService } from '../endpoint-discovery.service'
import type { SwaggerSpec, ApiEndpoint } from '@/types/api-tester'

// Mock fetch globally
global.fetch = jest.fn()

describe('EndpointDiscoveryService', () => {
  let service: EndpointDiscoveryService
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    service = new EndpointDiscoveryService('http://localhost:3001')
    mockFetch.mockClear()
    service.clearCache()
  })

  describe('fetchSwaggerSpec', () => {
    const mockSwaggerSpec: SwaggerSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server'
        }
      ],
      paths: {
        '/api/users': {
          get: {
            summary: 'Get users',
            tags: ['User'],
            responses: {
              '200': {
                description: 'Success'
              }
            }
          }
        }
      },
      components: {}
    }

    it('should fetch Swagger specification successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSwaggerSpec,
      } as Response)

      const result = await service.fetchSwaggerSpec()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/docs-json',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      )
      expect(result).toEqual(mockSwaggerSpec)
    })

    it('should cache the Swagger specification', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSwaggerSpec,
      } as Response)

      // First call
      await service.fetchSwaggerSpec()
      
      // Second call should use cache
      const result = await service.fetchSwaggerSpec()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockSwaggerSpec)
    })

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response)

      await expect(service.fetchSwaggerSpec()).rejects.toThrow(
        'Failed to fetch Swagger specification: Failed to fetch Swagger spec: 404 Not Found'
      )
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(service.fetchSwaggerSpec()).rejects.toThrow(
        'Failed to fetch Swagger specification: Network error'
      )
    })

    it('should validate Swagger specification structure', async () => {
      const invalidSpec = {
        info: { title: 'Test', version: '1.0.0' }
        // Missing openapi/swagger and paths
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidSpec,
      } as Response)

      await expect(service.fetchSwaggerSpec()).rejects.toThrow(
        'Failed to fetch Swagger specification: Invalid Swagger/OpenAPI specification: missing version field'
      )
    })

    it('should validate paths exist in specification', async () => {
      const invalidSpec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' }
        // Missing paths
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidSpec,
      } as Response)

      await expect(service.fetchSwaggerSpec()).rejects.toThrow(
        'Failed to fetch Swagger specification: Invalid Swagger/OpenAPI specification: missing paths'
      )
    })
  })

  describe('parseEndpoints', () => {
    it('should parse endpoints from Swagger specification', () => {
      const spec: SwaggerSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        paths: {
          '/api/users': {
            get: {
              summary: 'Get all users',
              description: 'Retrieve a list of all users',
              tags: ['User'],
              parameters: [
                {
                  name: 'limit',
                  in: 'query',
                  required: false,
                  schema: { type: 'number' },
                  description: 'Maximum number of users to return'
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: { type: 'array' }
                    }
                  }
                }
              }
            },
            post: {
              summary: 'Create user',
              tags: ['User'],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: { type: 'object' }
                  }
                }
              },
              responses: {
                '201': {
                  description: 'Created'
                }
              }
            }
          },
          '/api/auth/login': {
            post: {
              summary: 'Login',
              tags: ['Auth'],
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        },
        components: {}
      }

      const endpoints = service.parseEndpoints(spec)

      expect(endpoints).toHaveLength(3)
      
      // Check GET /api/users
      const getUsersEndpoint = endpoints.find(e => e.method === 'GET' && e.path === '/api/users')
      expect(getUsersEndpoint).toBeDefined()
      expect(getUsersEndpoint!.summary).toBe('Get all users')
      expect(getUsersEndpoint!.description).toBe('Retrieve a list of all users')
      expect(getUsersEndpoint!.category).toBe('User')
      expect(getUsersEndpoint!.parameters).toHaveLength(1)
      expect(getUsersEndpoint!.parameters[0].name).toBe('limit')
      expect(getUsersEndpoint!.parameters[0].required).toBe(false)
      expect(getUsersEndpoint!.tags).toEqual(['User'])

      // Check POST /api/users
      const createUserEndpoint = endpoints.find(e => e.method === 'POST' && e.path === '/api/users')
      expect(createUserEndpoint).toBeDefined()
      expect(createUserEndpoint!.summary).toBe('Create user')
      expect(createUserEndpoint!.requestBody).toBeDefined()
      expect(createUserEndpoint!.requestBody!.required).toBe(true)

      // Check POST /api/auth/login
      const loginEndpoint = endpoints.find(e => e.method === 'POST' && e.path === '/api/auth/login')
      expect(loginEndpoint).toBeDefined()
      expect(loginEndpoint!.category).toBe('Auth')
    })

    it('should handle endpoints without tags', () => {
      const spec: SwaggerSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        paths: {
          '/api/health': {
            get: {
              summary: 'Health check',
              responses: {
                '200': {
                  description: 'OK'
                }
              }
            }
          }
        },
        components: {}
      }

      const endpoints = service.parseEndpoints(spec)

      expect(endpoints).toHaveLength(1)
      expect(endpoints[0].category).toBe('Api')
    })

    it('should generate default summary when missing', () => {
      const spec: SwaggerSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        paths: {
          '/api/test': {
            get: {
              responses: {
                '200': {
                  description: 'OK'
                }
              }
            }
          }
        },
        components: {}
      }

      const endpoints = service.parseEndpoints(spec)

      expect(endpoints).toHaveLength(1)
      expect(endpoints[0].summary).toBe('GET /api/test')
    })

    it('should handle empty paths', () => {
      const spec: SwaggerSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        paths: {},
        components: {}
      }

      const endpoints = service.parseEndpoints(spec)

      expect(endpoints).toHaveLength(0)
    })
  })

  describe('categorizeEndpoints', () => {
    const mockEndpoints: ApiEndpoint[] = [
      {
        id: 'GET_api_users',
        method: 'GET',
        path: '/api/users',
        summary: 'Get users',
        category: 'User',
        parameters: [],
        responses: [],
        security: []
      },
      {
        id: 'POST_api_users',
        method: 'POST',
        path: '/api/users',
        summary: 'Create user',
        category: 'User',
        parameters: [],
        responses: [],
        security: []
      },
      {
        id: 'POST_api_auth_login',
        method: 'POST',
        path: '/api/auth/login',
        summary: 'Login',
        category: 'Auth',
        parameters: [],
        responses: [],
        security: []
      },
      {
        id: 'GET_api_health',
        method: 'GET',
        path: '/api/health',
        summary: 'Health check',
        category: 'Default',
        parameters: [],
        responses: [],
        security: []
      }
    ]

    it('should categorize endpoints correctly', () => {
      const categories = service.categorizeEndpoints(mockEndpoints)

      expect(categories).toHaveLength(3)
      
      // Check Auth category
      const authCategory = categories.find(c => c.name === 'Auth')
      expect(authCategory).toBeDefined()
      expect(authCategory!.description).toBe('Authentication and authorization endpoints')
      expect(authCategory!.endpoints).toHaveLength(1)
      expect(authCategory!.endpoints[0].summary).toBe('Login')

      // Check User category
      const userCategory = categories.find(c => c.name === 'User')
      expect(userCategory).toBeDefined()
      expect(userCategory!.description).toBe('User management and profile endpoints')
      expect(userCategory!.endpoints).toHaveLength(2)

      // Check Default category (should be last)
      const defaultCategory = categories.find(c => c.name === 'Default')
      expect(defaultCategory).toBeDefined()
      expect(defaultCategory!.description).toBe('Miscellaneous endpoints')
      expect(categories[categories.length - 1]).toBe(defaultCategory)
    })

    it('should sort endpoints within categories', () => {
      const categories = service.categorizeEndpoints(mockEndpoints)
      const userCategory = categories.find(c => c.name === 'User')!

      // Should be sorted by path first, then by method
      expect(userCategory.endpoints[0].method).toBe('GET')
      expect(userCategory.endpoints[1].method).toBe('POST')
    })

    it('should sort categories alphabetically with Default last', () => {
      const categories = service.categorizeEndpoints(mockEndpoints)
      const categoryNames = categories.map(c => c.name)

      expect(categoryNames).toEqual(['Auth', 'User', 'Default'])
    })

    it('should handle empty endpoints array', () => {
      const categories = service.categorizeEndpoints([])

      expect(categories).toHaveLength(0)
    })

    it('should generate descriptions for unknown categories', () => {
      const customEndpoints: ApiEndpoint[] = [
        {
          id: 'GET_api_custom',
          method: 'GET',
          path: '/api/custom',
          summary: 'Custom endpoint',
          category: 'CustomCategory',
          parameters: [],
          responses: [],
          security: []
        }
      ]

      const categories = service.categorizeEndpoints(customEndpoints)

      expect(categories).toHaveLength(1)
      expect(categories[0].description).toBe('CustomCategory related endpoints')
    })
  })

  describe('cache management', () => {
    it('should clear cache', () => {
      service.clearCache()
      const status = service.getCacheStatus()

      expect(status.cached).toBe(false)
      expect(status.age).toBe(0)
    })

    it('should report cache status', async () => {
      const mockSpec: SwaggerSpec = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        servers: [],
        paths: {},
        components: {}
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSpec,
      } as Response)

      await service.fetchSwaggerSpec()
      const status = service.getCacheStatus()

      expect(status.cached).toBe(true)
      expect(status.age).toBeGreaterThanOrEqual(0)
    })
  })

  describe('private methods', () => {
    it('should generate unique endpoint IDs', () => {
      const spec: SwaggerSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        paths: {
          '/api/users/{id}': {
            get: {
              summary: 'Get user by ID',
              responses: { '200': { description: 'OK' } }
            }
          }
        },
        components: {}
      }

      const endpoints = service.parseEndpoints(spec)

      expect(endpoints[0].id).toBe('GET__api_users__id_')
    })

    it('should extract category from path when no tags', () => {
      const spec: SwaggerSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        servers: [],
        paths: {
          '/api/billing/invoices': {
            get: {
              summary: 'Get invoices',
              responses: { '200': { description: 'OK' } }
            }
          }
        },
        components: {}
      }

      const endpoints = service.parseEndpoints(spec)

      expect(endpoints[0].category).toBe('Api')
    })
  })
})