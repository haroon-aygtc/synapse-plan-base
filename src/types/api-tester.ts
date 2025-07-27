// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

// Error Types
export type ErrorType = 'network' | 'auth' | 'validation' | 'server' | 'parsing'

// Swagger/OpenAPI Models
export interface SwaggerSpec {
  openapi: string
  info: Info
  servers: Server[]
  paths: Record<string, PathItem>
  components: Components
}

export interface Info {
  title: string
  version: string
  description?: string
}

export interface Server {
  url: string
  description?: string
}

export interface PathItem {
  get?: Operation
  post?: Operation
  put?: Operation
  delete?: Operation
  patch?: Operation
  head?: Operation
  options?: Operation
}

export interface Operation {
  summary?: string
  description?: string
  operationId?: string
  tags?: string[]
  parameters?: Parameter[]
  requestBody?: RequestBodySchema
  responses: Record<string, ResponseSchema>
  security?: SecurityRequirement[]
}

export interface Components {
  schemas?: Record<string, Schema>
  securitySchemes?: Record<string, SecurityScheme>
}

export interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect'
  scheme?: string
  bearerFormat?: string
  in?: 'query' | 'header' | 'cookie'
  name?: string
}

export interface SecurityRequirement {
  [key: string]: string[]
}

// Parameter and Schema Models
export interface Parameter {
  name: string
  in: 'query' | 'path' | 'header' | 'cookie'
  required: boolean
  schema: Schema
  description?: string
  example?: any
}

export interface RequestBodySchema {
  required: boolean
  content: Record<string, MediaType>
}

export interface MediaType {
  schema: Schema
  example?: any
  examples?: Record<string, Example>
}

export interface Example {
  summary?: string
  description?: string
  value?: any
}

export interface ResponseSchema {
  description: string
  content?: Record<string, MediaType>
  headers?: Record<string, Header>
}

export interface Header {
  description?: string
  schema: Schema
}

export interface Schema {
  type?: string
  format?: string
  properties?: Record<string, Schema>
  items?: Schema
  required?: string[]
  enum?: any[]
  example?: any
  description?: string
  default?: any
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  additionalProperties?: boolean | Schema
  allOf?: Schema[]
  oneOf?: Schema[]
  anyOf?: Schema[]
  not?: Schema
}

// API Endpoint Models
export interface ApiEndpoint {
  id: string
  method: HttpMethod
  path: string
  summary: string
  description?: string
  category: string
  parameters: Parameter[]
  requestBody?: RequestBodySchema
  responses: ResponseSchema[]
  security: SecurityRequirement[]
  tags?: string[]
}

export interface EndpointCategory {
  name: string
  description?: string
  endpoints: ApiEndpoint[]
}

// Request and Response Models
export interface ApiRequest {
  method: HttpMethod
  url: string
  headers: Record<string, string>
  body?: any
  files?: File[]
  auth?: AuthConfig
  parameters?: Record<string, any>
}

export interface ApiResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  data: any
  responseTime: number
  timestamp: string
  size?: number
}

// Authentication Models
export type AuthType = 'bearer' | 'apikey' | 'basic' | 'none'

export interface AuthConfig {
  type: AuthType
  token?: string
  apiKey?: string
  apiKeyHeader?: string
  username?: string
  password?: string
  environment: string
}

// Environment Models
export interface Environment {
  id: string
  name: string
  baseUrl: string
  description?: string
  authConfig?: AuthConfig
  isDefault?: boolean
}

// Saved Test Models
export interface SavedTest {
  id: string
  name: string
  description?: string
  endpointId: string
  method: HttpMethod
  path: string
  parameters: Record<string, any>
  requestBody?: any
  files?: FileInfo[]
  authConfig: AuthConfig
  environment: string
  createdAt: string
  updatedAt: string
  tags?: string[]
}

export interface FileInfo {
  name: string
  type: string
  size: number
}

export interface TestCollection {
  id: string
  name: string
  description?: string
  tests: SavedTest[]
  environment: string
  createdAt: string
  updatedAt: string
}

// Error Handling Models
export interface UserFriendlyError {
  type: ErrorType
  message: string
  details?: string
  suggestions?: string[]
  retryable: boolean
  statusCode?: number
}

export interface NetworkError extends Error {
  code?: string
  timeout?: boolean
}

export interface AuthError extends Error {
  statusCode: number
  type: 'invalid_token' | 'expired_token' | 'missing_token' | 'insufficient_permissions'
}

export interface ValidationError extends Error {
  field: string
  value: any
  constraint: string
}

// Form and UI Models
export interface FormField {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file'
  required: boolean
  description?: string
  example?: any
  validation?: ValidationRule[]
  options?: string[] // for enum fields
  properties?: FormField[] // for object fields
  items?: FormField // for array fields
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'email' | 'url'
  value?: any
  message: string
}

// Service Interfaces
export interface EndpointDiscoveryService {
  fetchSwaggerSpec(): Promise<SwaggerSpec>
  parseEndpoints(spec: SwaggerSpec): ApiEndpoint[]
  categorizeEndpoints(endpoints: ApiEndpoint[]): EndpointCategory[]
}

export interface HttpClientService {
  sendRequest(request: ApiRequest): Promise<ApiResponse>
}

export interface StorageService {
  saveTest(test: SavedTest): void
  loadSavedTests(): SavedTest[]
  deleteTest(testId: string): void
  saveAuthConfig(environment: string, config: AuthConfig): void
  loadAuthConfig(environment: string): AuthConfig | null
  saveEnvironments(environments: Environment[]): void
  loadEnvironments(): Environment[]
}

// Component Props Interfaces
export interface EndpointExplorerProps {
  selectedEndpoint: ApiEndpoint | null
  onEndpointSelect: (endpoint: ApiEndpoint) => void
  environment: Environment | null
}

export interface RequestBuilderProps {
  endpoint: ApiEndpoint | null
  onSendRequest: (request: ApiRequest) => void
  savedAuth: AuthConfig | null
  loading: boolean
}

export interface ResponseViewerProps {
  response: ApiResponse | null
  loading: boolean
  error?: string
}

export interface AuthenticationPanelProps {
  authConfig: AuthConfig | null
  onAuthChange: (config: AuthConfig | null) => void
  environment: string
}

export interface EnvironmentSelectorProps {
  currentEnvironment: Environment | null
  onEnvironmentChange: (environment: Environment | null) => void
}

export interface SavedTestsManagerProps {
  onLoadTest: (test: SavedTest) => void
}