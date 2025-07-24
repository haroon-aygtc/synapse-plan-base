import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import OpenAI from 'openai';
import { firstValueFrom } from 'rxjs';
import {
  APIEndpointAnalysisDto,
  SchemaGenerationDto,
  AuthenticationDetectionDto,
  ParameterMappingDto,
  ErrorPatternAnalysisDto,
  APITestingDto,
  APIValidationDto,
  AuthenticationType,
  HttpMethod,
  ParameterType,
} from '../dto/api-pattern-detection.dto';

interface APIAnalysisResult {
  endpoint: string;
  method: HttpMethod;
  authentication: AuthenticationAnalysis;
  schema: GeneratedSchema;
  parameters: ParameterMapping[];
  errorPatterns: ErrorPattern[];
  rateLimit: RateLimitInfo;
  recommendations: string[];
}

interface AuthenticationAnalysis {
  type: AuthenticationType;
  location: string;
  parameterName?: string;
  format?: string;
  description: string;
  configuration: Record<string, any>;
}

interface GeneratedSchema {
  request: any;
  response: any;
  parameters: SchemaParameter[];
  validation: ValidationRule[];
}

interface SchemaParameter {
  name: string;
  type: ParameterType;
  dataType: string;
  required: boolean;
  description: string;
  example?: any;
  validation?: ValidationRule[];
}

interface ValidationRule {
  type: string;
  rule: string;
  message: string;
}

interface ParameterMapping {
  apiParameter: string;
  userParameter: string;
  transformation?: string;
  validation?: ValidationRule[];
  description: string;
}

interface ErrorPattern {
  statusCode: number;
  errorType: string;
  pattern: string;
  description: string;
  handlingStrategy: string;
  retryable: boolean;
}

interface RateLimitInfo {
  detected: boolean;
  limit?: number;
  window?: string;
  headers?: string[];
  strategy: string;
}

interface APITestResult {
  success: boolean;
  statusCode?: number;
  responseTime: number;
  response?: any;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

@Injectable()
export class APIPatternDetectionService {
  private readonly logger = new Logger(APIPatternDetectionService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async analyzeAPIEndpoint(
    dto: APIEndpointAnalysisDto,
    userId: string,
    organizationId: string,
  ): Promise<APIAnalysisResult> {
    this.logger.log(`Analyzing API endpoint: ${dto.endpoint}`);

    try {
      // Perform comprehensive API analysis
      const [
        authAnalysis,
        schemaAnalysis,
        errorPatterns,
        rateLimitInfo,
      ] = await Promise.all([
        this.detectAuthentication({
          endpoint: dto.endpoint,
          headers: dto.headers || {},
          context: dto.context,
        }),
        this.generateSchema({
          endpoint: dto.endpoint,
          method: dto.method,
          sampleRequest: dto.requestBody,
          context: dto.context,
        }),
        this.analyzeErrorPatterns({
          endpoint: dto.endpoint,
          errorResponses: [], // Will be populated from actual testing
          context: dto.context,
        }),
        this.detectRateLimit(dto.endpoint, dto.headers || {}),
      ]);

      // Generate parameter mappings
      const parameterMappings = await this.generateParameterMapping({
        endpoint: dto.endpoint,
        schema: schemaAnalysis,
        userRequirements: 'Auto-generated from endpoint analysis',
        context: dto.context,
      });

      // Generate recommendations
      const recommendations = await this.generateRecommendations({
        endpoint: dto.endpoint,
        authentication: authAnalysis,
        schema: schemaAnalysis,
        errorPatterns,
        rateLimit: rateLimitInfo,
      });

      const result: APIAnalysisResult = {
        endpoint: dto.endpoint,
        method: dto.method,
        authentication: authAnalysis,
        schema: schemaAnalysis,
        parameters: parameterMappings,
        errorPatterns,
        rateLimit: rateLimitInfo,
        recommendations,
      };

      this.logger.log(`API analysis completed for ${dto.endpoint}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to analyze API endpoint', error);
      throw new Error('Failed to analyze API endpoint');
    }
  }

  async generateSchema(dto: SchemaGenerationDto): Promise<GeneratedSchema> {
    this.logger.log(`Generating schema for ${dto.endpoint}`);

    try {
      const prompt = `
Analyze the following API endpoint and generate a comprehensive schema:

Endpoint: ${dto.endpoint}
Method: ${dto.method}
Sample Request: ${JSON.stringify(dto.sampleRequest || {})}
Sample Response: ${JSON.stringify(dto.sampleResponse || {})}
Documentation: ${dto.documentationUrl || 'Not provided'}
Context: ${JSON.stringify(dto.context)}

Generate a detailed schema in JSON format:
{
  "request": {
    "type": "object",
    "properties": {
      "parameter_name": {
        "type": "data_type",
        "description": "parameter description",
        "required": true/false,
        "example": "example_value"
      }
    }
  },
  "response": {
    "type": "object",
    "properties": {
      "response_field": {
        "type": "data_type",
        "description": "field description"
      }
    }
  },
  "parameters": [
    {
      "name": "parameter_name",
      "type": "query|path|header|body|form",
      "dataType": "string|number|boolean|object|array",
      "required": true/false,
      "description": "parameter description",
      "example": "example_value",
      "validation": [
        {
          "type": "validation_type",
          "rule": "validation_rule",
          "message": "validation_message"
        }
      ]
    }
  ],
  "validation": [
    {
      "type": "validation_type",
      "rule": "validation_rule",
      "message": "validation_message"
    }
  ]
}

Make the schema comprehensive and production-ready.
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert API schema generator. Create comprehensive, accurate schemas in valid JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 2500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const schema = JSON.parse(content);
      
      this.logger.log(`Generated schema with ${schema.parameters?.length || 0} parameters`);
      return schema;
    } catch (error) {
      this.logger.error('Failed to generate schema', error);
      throw new Error('Failed to generate API schema');
    }
  }

  async detectAuthentication(dto: AuthenticationDetectionDto): Promise<AuthenticationAnalysis> {
    this.logger.log(`Detecting authentication for ${dto.endpoint}`);

    try {
      const prompt = `
Analyze the following API endpoint and detect the authentication method:

Endpoint: ${dto.endpoint}
Request Headers: ${JSON.stringify(dto.headers)}
Response Headers: ${JSON.stringify(dto.responseHeaders || {})}
Documentation: ${dto.documentation || 'Not provided'}
Context: ${JSON.stringify(dto.context)}

Analyze the authentication pattern and respond in JSON format:
{
  "type": "none|api_key|bearer_token|basic_auth|oauth2|jwt|custom",
  "location": "header|query|body",
  "parameterName": "parameter_name_if_applicable",
  "format": "format_description",
  "description": "detailed description of authentication method",
  "configuration": {
    "headerName": "header_name_if_applicable",
    "queryParam": "query_param_if_applicable",
    "tokenPrefix": "Bearer|API-Key|etc",
    "authUrl": "oauth_url_if_applicable",
    "scope": "required_scopes_if_applicable"
  }
}

Provide accurate authentication detection based on common API patterns.
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert API authentication analyzer. Detect authentication methods accurately based on headers and patterns.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const authAnalysis = JSON.parse(content);
      
      this.logger.log(`Detected authentication type: ${authAnalysis.type}`);
      return authAnalysis;
    } catch (error) {
      this.logger.error('Failed to detect authentication', error);
      throw new Error('Failed to detect authentication method');
    }
  }

  async generateParameterMapping(dto: ParameterMappingDto): Promise<ParameterMapping[]> {
    this.logger.log(`Generating parameter mapping for ${dto.endpoint}`);

    try {
      const prompt = `
Generate parameter mapping for the API endpoint based on user requirements:

Endpoint: ${dto.endpoint}
Schema: ${JSON.stringify(dto.schema)}
User Requirements: ${dto.userRequirements}
Sample Data: ${JSON.stringify(dto.sampleData || {})}
Context: ${JSON.stringify(dto.context)}

Create parameter mappings in JSON format:
{
  "mappings": [
    {
      "apiParameter": "api_parameter_name",
      "userParameter": "user_friendly_parameter_name",
      "transformation": "transformation_logic_if_needed",
      "validation": [
        {
          "type": "validation_type",
          "rule": "validation_rule",
          "message": "validation_message"
        }
      ],
      "description": "description of parameter mapping"
    }
  ]
}

Make mappings intuitive and user-friendly while maintaining API compatibility.
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert API parameter mapping specialist. Create intuitive, user-friendly parameter mappings.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);
      
      this.logger.log(`Generated ${result.mappings?.length || 0} parameter mappings`);
      return result.mappings || [];
    } catch (error) {
      this.logger.error('Failed to generate parameter mapping', error);
      throw new Error('Failed to generate parameter mapping');
    }
  }

  async analyzeErrorPatterns(dto: ErrorPatternAnalysisDto): Promise<ErrorPattern[]> {
    this.logger.log(`Analyzing error patterns for ${dto.endpoint}`);

    try {
      const prompt = `
Analyze error patterns for the API endpoint:

Endpoint: ${dto.endpoint}
Error Responses: ${JSON.stringify(dto.errorResponses)}
Error Documentation: ${dto.errorDocumentation || 'Not provided'}
Context: ${JSON.stringify(dto.context)}

Analyze error patterns and respond in JSON format:
{
  "patterns": [
    {
      "statusCode": 400,
      "errorType": "validation_error|authentication_error|rate_limit|server_error|not_found",
      "pattern": "error_pattern_description",
      "description": "detailed error description",
      "handlingStrategy": "retry|abort|user_input|fallback",
      "retryable": true/false
    }
  ]
}

Include common HTTP error patterns and API-specific error handling strategies.
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert API error pattern analyzer. Identify error patterns and provide handling strategies.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);
      
      this.logger.log(`Analyzed ${result.patterns?.length || 0} error patterns`);
      return result.patterns || [];
    } catch (error) {
      this.logger.error('Failed to analyze error patterns', error);
      throw new Error('Failed to analyze error patterns');
    }
  }

  async testAPI(dto: APITestingDto): Promise<APITestResult> {
    this.logger.log(`Testing API endpoint: ${dto.endpoint}`);

    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Prepare request configuration
      const requestConfig: any = {
        method: dto.method.toLowerCase(),
        url: dto.endpoint,
        timeout: 10000, // 10 second timeout
      };

      // Add authentication
      if (dto.authentication.type !== AuthenticationType.NONE) {
        this.addAuthentication(requestConfig, dto.authentication);
      }

      // Add parameters
      if (dto.testParameters) {
        this.addParameters(requestConfig, dto.testParameters, dto.method);
      }

      // Make the API call
      const response = await firstValueFrom(this.httpService.request(requestConfig));
      const responseTime = Date.now() - startTime;

      // Validate response
      if (dto.expectedResponse) {
        this.validateResponse(response.data, dto.expectedResponse, warnings);
      }

      // Generate recommendations
      this.generateTestRecommendations(response, recommendations);

      this.logger.log(`API test completed successfully for ${dto.endpoint}`);
      
      return {
        success: true,
        statusCode: response.status,
        responseTime,
        response: response.data,
        errors,
        warnings,
        recommendations,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      if (error.response) {
        // API returned an error response
        errors.push(`API returned ${error.response.status}: ${error.response.statusText}`);
        
        return {
          success: false,
          statusCode: error.response.status,
          responseTime,
          response: error.response.data,
          errors,
          warnings,
          recommendations: ['Check API endpoint and authentication', 'Verify request parameters'],
        };
      } else {
        // Network or other error
        errors.push(`Network error: ${error.message}`);
        
        return {
          success: false,
          responseTime,
          errors,
          warnings,
          recommendations: ['Check network connectivity', 'Verify API endpoint URL'],
        };
      }
    }
  }

  async validateAPIConfiguration(dto: APIValidationDto): Promise<{
    isValid: boolean;
    validationResults: Array<{
      field: string;
      status: 'valid' | 'warning' | 'error';
      message: string;
      suggestion?: string;
    }>;
    score: number;
    recommendations: string[];
  }> {
    this.logger.log('Validating API configuration');

    try {
      const validationResults: Array<{
        field: string;
        status: 'valid' | 'warning' | 'error';
        message: string;
        suggestion?: string;
      }> = [];

      let score = 100;

      // Validate endpoint
      if (!dto.apiConfiguration.endpoint) {
        validationResults.push({
          field: 'endpoint',
          status: 'error',
          message: 'API endpoint is required',
          suggestion: 'Provide a valid API endpoint URL',
        });
        score -= 20;
      } else if (!this.isValidUrl(dto.apiConfiguration.endpoint)) {
        validationResults.push({
          field: 'endpoint',
          status: 'error',
          message: 'Invalid endpoint URL format',
          suggestion: 'Ensure the endpoint is a valid URL',
        });
        score -= 15;
      }

      // Validate method
      if (!dto.apiConfiguration.method) {
        validationResults.push({
          field: 'method',
          status: 'error',
          message: 'HTTP method is required',
          suggestion: 'Specify the HTTP method (GET, POST, etc.)',
        });
        score -= 10;
      }

      // Validate authentication
      if (!dto.apiConfiguration.authentication || !dto.apiConfiguration.authentication.type) {
        validationResults.push({
          field: 'authentication',
          status: 'warning',
          message: 'Authentication method not specified',
          suggestion: 'Consider adding authentication for security',
        });
        score -= 5;
      }

      // Validate schema
      if (!dto.apiConfiguration.schema) {
        validationResults.push({
          field: 'schema',
          status: 'warning',
          message: 'API schema not defined',
          suggestion: 'Define request/response schema for better validation',
        });
        score -= 10;
      }

      // Validate error handling
      if (!dto.apiConfiguration.errorHandling) {
        validationResults.push({
          field: 'errorHandling',
          status: 'warning',
          message: 'Error handling not configured',
          suggestion: 'Configure error handling strategies',
        });
        score -= 10;
      }

      // Generate recommendations
      const recommendations = this.generateConfigurationRecommendations(dto.apiConfiguration, validationResults);

      const isValid = validationResults.filter(r => r.status === 'error').length === 0;

      this.logger.log(`API configuration validation completed: ${isValid ? 'valid' : 'invalid'}, score: ${score}`);
      
      return {
        isValid,
        validationResults,
        score: Math.max(0, score),
        recommendations,
      };
    } catch (error) {
      this.logger.error('Failed to validate API configuration', error);
      throw new Error('Failed to validate API configuration');
    }
  }

  private async detectRateLimit(endpoint: string, headers: Record<string, string>): Promise<RateLimitInfo> {
    // Simplified rate limit detection
    const rateLimitHeaders = ['x-ratelimit-limit', 'x-rate-limit-limit', 'ratelimit-limit'];
    const rateLimitWindowHeaders = ['x-ratelimit-window', 'x-rate-limit-window', 'ratelimit-window'];

    const detected = Object.keys(headers).some(header => 
      rateLimitHeaders.some(rlHeader => header.toLowerCase().includes(rlHeader.toLowerCase()))
    );

    return {
      detected,
      limit: detected ? 1000 : undefined, // Default assumption
      window: detected ? '1h' : undefined,
      headers: rateLimitHeaders,
      strategy: detected ? 'exponential_backoff' : 'none',
    };
  }

  private async generateRecommendations(analysis: {
    endpoint: string;
    authentication: AuthenticationAnalysis;
    schema: GeneratedSchema;
    errorPatterns: ErrorPattern[];
    rateLimit: RateLimitInfo;
  }): Promise<string[]> {
    const recommendations: string[] = [];

    // Authentication recommendations
    if (analysis.authentication.type === AuthenticationType.NONE) {
      recommendations.push('Consider implementing authentication for better security');
    }

    // Schema recommendations
    if (!analysis.schema.validation || analysis.schema.validation.length === 0) {
      recommendations.push('Add input validation rules to improve data quality');
    }

    // Error handling recommendations
    if (analysis.errorPatterns.length === 0) {
      recommendations.push('Implement comprehensive error handling for better reliability');
    }

    // Rate limiting recommendations
    if (analysis.rateLimit.detected) {
      recommendations.push('Implement rate limiting handling to avoid API throttling');
    }

    return recommendations;
  }

  private addAuthentication(requestConfig: any, authentication: any): void {
    switch (authentication.type) {
      case AuthenticationType.API_KEY:
        if (authentication.credentials.location === 'header') {
          requestConfig.headers = requestConfig.headers || {};
          requestConfig.headers[authentication.credentials.headerName] = authentication.credentials.apiKey;
        } else if (authentication.credentials.location === 'query') {
          requestConfig.params = requestConfig.params || {};
          requestConfig.params[authentication.credentials.paramName] = authentication.credentials.apiKey;
        }
        break;

      case AuthenticationType.BEARER_TOKEN:
        requestConfig.headers = requestConfig.headers || {};
        requestConfig.headers['Authorization'] = `Bearer ${authentication.credentials.token}`;
        break;

      case AuthenticationType.BASIC_AUTH:
        requestConfig.auth = {
          username: authentication.credentials.username,
          password: authentication.credentials.password,
        };
        break;

      default:
        // Handle other authentication types
        break;
    }
  }

  private addParameters(requestConfig: any, parameters: Record<string, any>, method: HttpMethod): void {
    if (method === HttpMethod.GET || method === HttpMethod.DELETE) {
      requestConfig.params = parameters;
    } else {
      requestConfig.data = parameters;
    }
  }

  private validateResponse(actual: any, expected: any, warnings: string[]): void {
    // Simplified response validation
    if (typeof expected === 'object' && expected !== null) {
      for (const key in expected) {
        if (!(key in actual)) {
          warnings.push(`Expected response field '${key}' is missing`);
        }
      }
    }
  }

  private generateTestRecommendations(response: any, recommendations: string[]): void {
    // Generate recommendations based on response
    if (response.status >= 200 && response.status < 300) {
      recommendations.push('API call successful - consider implementing caching for better performance');
    }

    if (response.headers && response.headers['content-type']?.includes('application/json')) {
      recommendations.push('JSON response detected - ensure proper JSON parsing in implementation');
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private generateConfigurationRecommendations(config: any, validationResults: any[]): string[] {
    const recommendations: string[] = [];

    const errorCount = validationResults.filter(r => r.status === 'error').length;
    const warningCount = validationResults.filter(r => r.status === 'warning').length;

    if (errorCount > 0) {
      recommendations.push('Fix all error-level issues before deploying to production');
    }

    if (warningCount > 0) {
      recommendations.push('Address warning-level issues to improve API integration quality');
    }

    if (!config.authentication || config.authentication.type === 'none') {
      recommendations.push('Implement proper authentication for production use');
    }

    if (!config.errorHandling) {
      recommendations.push('Add comprehensive error handling and retry logic');
    }

    return recommendations;
  }
}