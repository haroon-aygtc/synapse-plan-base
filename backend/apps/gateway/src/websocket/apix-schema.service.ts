import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  APXMessageType,
  APXSecurityLevel,
  APXPermissionLevel,
} from '@shared/enums';
import {
  IAPXMessage,
  IAPXValidationError,
  IAPXMessageSchema,
} from '@shared/interfaces';

@Injectable()
export class APXSchemaService {
  private readonly logger = new Logger(APXSchemaService.name);
  private readonly schemas = new Map<APXMessageType, z.ZodObject<any>>();

  constructor() {
    this.initializeSchemas();
  }

  private initializeSchemas(): void {
    // Base message schema
    const baseMessageSchema = z.object({
      type: z.nativeEnum(APXMessageType),
      session_id: z.string().uuid(),
      payload: z.record(z.any()),
      timestamp: z.string().datetime(),
      request_id: z.string().uuid(),
      correlation_id: z.string().uuid().optional(),
      user_id: z.string().uuid().optional(),
      organization_id: z.string().uuid().optional(),
      security_level: z.nativeEnum(APXSecurityLevel).optional(),
      permissions: z.array(z.nativeEnum(APXPermissionLevel)).optional(),
      metadata: z.record(z.any()).optional(),
    });

    // Agent Execution Started
    this.schemas.set(
      APXMessageType.AGENT_EXECUTION_STARTED,
      baseMessageSchema.extend({
        payload: z.object({
          agent_id: z.string().uuid(),
          execution_id: z.string().uuid(),
          prompt: z.string(),
          model: z.string().optional(),
          parameters: z.record(z.any()).optional(),
          tools_available: z.array(z.string()).optional(),
          knowledge_sources: z.array(z.string()).optional(),
          execution_context: z.record(z.any()).optional(),
        }),
      }),
    );

    // Agent Text Chunk
    this.schemas.set(
      APXMessageType.AGENT_TEXT_CHUNK,
      baseMessageSchema.extend({
        payload: z.object({
          execution_id: z.string().uuid(),
          chunk_id: z.string(),
          text: z.string(),
          is_final: z.boolean(),
          token_count: z.number().int().nonnegative(),
          cumulative_tokens: z.number().int().nonnegative(),
        }),
      }),
    );

    // Agent Tool Call
    this.schemas.set(
      APXMessageType.AGENT_TOOL_CALL,
      baseMessageSchema.extend({
        payload: z.object({
          execution_id: z.string().uuid(),
          tool_call_id: z.string().uuid(),
          tool_id: z.string(),
          function_name: z.string(),
          parameters: z.record(z.any()),
          start_time: z.string().datetime(),
        }),
      }),
    );

    // Agent Memory Used
    this.schemas.set(
      APXMessageType.AGENT_MEMORY_USED,
      baseMessageSchema.extend({
        payload: z.object({
          execution_id: z.string().uuid(),
          memory_id: z.string(),
          memory_type: z.string(),
          content: z.string(),
          relevance_score: z.number().min(0).max(1),
          source: z.string(),
        }),
      }),
    );

    // Agent Error
    this.schemas.set(
      APXMessageType.AGENT_ERROR,
      baseMessageSchema.extend({
        payload: z.object({
          execution_id: z.string().uuid(),
          error_type: z.string(),
          error_code: z.string(),
          error_message: z.string(),
          error_details: z.any().optional(),
          retry_possible: z.boolean(),
          suggested_action: z.string(),
        }),
      }),
    );

    // Agent Execution Complete
    this.schemas.set(
      APXMessageType.AGENT_EXECUTION_COMPLETE,
      baseMessageSchema.extend({
        payload: z.object({
          execution_id: z.string().uuid(),
          final_response: z.string(),
          total_tokens: z.number().int().nonnegative(),
          execution_time_ms: z.number().int().nonnegative(),
          tools_used: z.array(
            z.object({
              tool_id: z.string(),
              function_name: z.string(),
              execution_time_ms: z.number().int().nonnegative(),
            }),
          ),
          memory_updates: z.array(
            z.object({
              memory_id: z.string(),
              memory_type: z.string(),
            }),
          ),
          cost_breakdown: z.object({
            model_cost: z.number().nonnegative(),
            tool_cost: z.number().nonnegative(),
            total_cost: z.number().nonnegative(),
          }),
        }),
      }),
    );

    // Tool Call Start
    this.schemas.set(
      APXMessageType.TOOL_CALL_START,
      baseMessageSchema.extend({
        payload: z.object({
          tool_call_id: z.string().uuid(),
          tool_id: z.string(),
          function_name: z.string(),
          parameters: z.record(z.any()),
          timeout_ms: z.number().int().nonnegative().optional(),
          execution_context: z.record(z.any()).optional(),
        }),
      }),
    );

    // Tool Call Result
    this.schemas.set(
      APXMessageType.TOOL_CALL_RESULT,
      baseMessageSchema.extend({
        payload: z.object({
          tool_call_id: z.string().uuid(),
          tool_id: z.string(),
          function_name: z.string(),
          result: z.any(),
          execution_time_ms: z.number().int().nonnegative(),
          cost: z.number().nonnegative().optional(),
        }),
      }),
    );

    // Tool Call Error
    this.schemas.set(
      APXMessageType.TOOL_CALL_ERROR,
      baseMessageSchema.extend({
        payload: z.object({
          tool_call_id: z.string().uuid(),
          tool_id: z.string(),
          function_name: z.string(),
          error_type: z.string(),
          error_message: z.string(),
          error_details: z.any().optional(),
          retry_possible: z.boolean(),
        }),
      }),
    );

    // Knowledge Base Search Performed
    this.schemas.set(
      APXMessageType.KB_SEARCH_PERFORMED,
      baseMessageSchema.extend({
        payload: z.object({
          search_id: z.string().uuid(),
          query: z.string(),
          search_type: z.string(),
          knowledge_sources: z.array(z.string()),
          filters: z.record(z.any()).optional(),
          top_k: z.number().int().positive().optional(),
        }),
      }),
    );

    // Knowledge Base Chunk Injected
    this.schemas.set(
      APXMessageType.KB_CHUNK_INJECTED,
      baseMessageSchema.extend({
        payload: z.object({
          search_id: z.string().uuid(),
          chunk_id: z.string(),
          content: z.string(),
          source: z.string(),
          relevance_score: z.number().min(0).max(1),
          metadata: z.record(z.any()).optional(),
        }),
      }),
    );

    // HITL Request Created
    this.schemas.set(
      APXMessageType.HITL_REQUEST_CREATED,
      baseMessageSchema.extend({
        payload: z.object({
          request_id: z.string().uuid(),
          request_type: z.string(),
          title: z.string(),
          description: z.string().optional(),
          context: z.record(z.any()).optional(),
          options: z
            .array(
              z.object({
                id: z.string(),
                label: z.string(),
                value: z.any(),
              }),
            )
            .optional(),
          priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
          expiration: z.string().datetime().optional(),
          assignee_roles: z.array(z.string()).optional(),
          assignee_users: z.array(z.string()).optional(),
        }),
      }),
    );

    // HITL Resolution Pending
    this.schemas.set(
      APXMessageType.HITL_RESOLUTION_PENDING,
      baseMessageSchema.extend({
        payload: z.object({
          request_id: z.string().uuid(),
          assigned_to: z.string(),
          assigned_at: z.string().datetime(),
          expected_resolution_by: z.string().datetime().optional(),
        }),
      }),
    );

    // HITL Resolved
    this.schemas.set(
      APXMessageType.HITL_RESOLVED,
      baseMessageSchema.extend({
        payload: z.object({
          request_id: z.string().uuid(),
          resolved_by: z.string(),
          resolution: z.any(),
          resolution_time_ms: z.number().int().nonnegative(),
          notes: z.string().optional(),
        }),
      }),
    );

    // HITL Expired
    this.schemas.set(
      APXMessageType.HITL_EXPIRED,
      baseMessageSchema.extend({
        payload: z.object({
          request_id: z.string().uuid(),
          created_at: z.string().datetime(),
          expired_at: z.string().datetime(),
          fallback_action: z.string().optional(),
          fallback_result: z.any().optional(),
        }),
      }),
    );

    // Widget Loaded
    this.schemas.set(
      APXMessageType.WIDGET_LOADED,
      baseMessageSchema.extend({
        payload: z.object({
          widget_id: z.string(),
          widget_type: z.string(),
          container_id: z.string(),
          load_time_ms: z.number().int().nonnegative(),
          configuration: z.record(z.any()).optional(),
        }),
      }),
    );

    // Widget Opened
    this.schemas.set(
      APXMessageType.WIDGET_OPENED,
      baseMessageSchema.extend({
        payload: z.object({
          widget_id: z.string(),
          widget_type: z.string(),
          session_id: z.string(),
          referrer: z.string().url().optional(),
          user_agent: z.string().optional(),
          device_info: z.record(z.any()).optional(),
        }),
      }),
    );

    // Widget Query Submitted
    this.schemas.set(
      APXMessageType.WIDGET_QUERY_SUBMITTED,
      baseMessageSchema.extend({
        payload: z.object({
          interaction_id: z.string().uuid(),
          widget_id: z.string(),
          query: z.string(),
          query_type: z.string(),
          context: z.record(z.any()).optional(),
          user_info: z.record(z.any()).optional(),
        }),
      }),
    );

    // Widget Converted
    this.schemas.set(
      APXMessageType.WIDGET_CONVERTED,
      baseMessageSchema.extend({
        payload: z.object({
          widget_id: z.string(),
          interaction_id: z.string().uuid(),
          conversion_type: z.string(),
          conversion_value: z.number().optional(),
          conversion_details: z.record(z.any()).optional(),
        }),
      }),
    );

    // Stream Control
    this.schemas.set(
      APXMessageType.STREAM_PAUSE,
      baseMessageSchema.extend({
        payload: z.object({
          execution_id: z.string().uuid(),
          action: z.enum(['pause', 'resume']),
          requested_by: z.string(),
          reason: z.string().optional(),
          timestamp: z.string().datetime(),
        }),
      }),
    );

    this.schemas.set(
      APXMessageType.STREAM_RESUME,
      this.schemas.get(APXMessageType.STREAM_PAUSE)!,
    );

    // Token Limit Reached
    this.schemas.set(
      APXMessageType.TOKEN_LIMIT_REACHED,
      baseMessageSchema.extend({
        payload: z.object({
          execution_id: z.string().uuid(),
          limit: z.number().int().positive(),
          current_usage: z.number().int().nonnegative(),
          limit_type: z.enum(['user', 'organization', 'model']),
          suggested_action: z.string(),
        }),
      }),
    );

    // Provider Fallback
    this.schemas.set(
      APXMessageType.PROVIDER_FALLBACK,
      baseMessageSchema.extend({
        payload: z.object({
          execution_id: z.string().uuid(),
          original_provider: z.string(),
          fallback_provider: z.string(),
          reason: z.string(),
          impact_assessment: z.string(),
        }),
      }),
    );

    // Connection Acknowledgment
    this.schemas.set(
      APXMessageType.CONNECTION_ACK,
      baseMessageSchema.extend({
        payload: z.object({
          connection_id: z.string().uuid(),
          session_id: z.string().uuid(),
          server_time: z.string().datetime(),
          protocol_version: z.string(),
          supported_features: z.array(z.string()),
          rate_limits: z.object({
            messages_per_minute: z.number().int().nonnegative(),
            executions_per_hour: z.number().int().nonnegative(),
            concurrent_streams: z.number().int().nonnegative(),
          }),
        }),
      }),
    );

    // Connection Heartbeat
    this.schemas.set(
      APXMessageType.CONNECTION_HEARTBEAT,
      baseMessageSchema.extend({
        payload: z.object({
          timestamp: z.string().datetime(),
          client_id: z.string().optional(),
        }),
      }),
    );

    // Session Created
    this.schemas.set(
      APXMessageType.SESSION_CREATED,
      baseMessageSchema.extend({
        payload: z.object({
          session_id: z.string().uuid(),
          user_id: z.string().uuid(),
          organization_id: z.string().uuid(),
          created_at: z.string().datetime(),
          expires_at: z.string().datetime(),
          session_type: z.string(),
          client_info: z
            .object({
              user_agent: z.string().optional(),
              ip_address: z.string().optional(),
              device_id: z.string().optional(),
            })
            .optional(),
        }),
      }),
    );

    // Session Ended
    this.schemas.set(
      APXMessageType.SESSION_ENDED,
      baseMessageSchema.extend({
        payload: z.object({
          session_id: z.string().uuid(),
          user_id: z.string().uuid(),
          organization_id: z.string().uuid(),
          ended_at: z.string().datetime(),
          duration_ms: z.number().int().nonnegative(),
          end_reason: z.string(),
        }),
      }),
    );

    this.logger.log(`Initialized ${this.schemas.size} APIX message schemas`);
  }

  validateMessage(message: IAPXMessage): {
    valid: boolean;
    errors?: IAPXValidationError;
  } {
    try {
      // Basic structure validation
      if (!message.type || !message.session_id || !message.request_id) {
        return {
          valid: false,
          errors: {
            error_code: 'MISSING_REQUIRED_FIELDS',
            error_message:
              'Message must include type, session_id, and request_id',
            request_id: message.request_id || 'unknown',
          },
        };
      }

      // Payload size validation
      const payloadSize = JSON.stringify(message.payload || {}).length;
      const maxSize = 1024 * 1024; // 1MB default limit
      if (payloadSize > maxSize) {
        return {
          valid: false,
          errors: {
            error_code: 'PAYLOAD_TOO_LARGE',
            error_message: `Payload size ${payloadSize} exceeds maximum ${maxSize} bytes`,
            request_id: message.request_id,
          },
        };
      }

      // Schema validation
      const schema = this.schemas.get(message.type);

      if (!schema) {
        return {
          valid: false,
          errors: {
            error_code: 'SCHEMA_NOT_FOUND',
            error_message: `No schema found for message type: ${message.type}`,
            request_id: message.request_id,
          },
        };
      }

      // Sanitize payload to prevent XSS and injection attacks
      const sanitizedMessage = this.sanitizeMessage(message);

      schema.parse(sanitizedMessage);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};

        error.errors.forEach((err) => {
          const path = err.path.join('.');
          fieldErrors[path] = err.message;
        });

        return {
          valid: false,
          errors: {
            error_code: 'VALIDATION_ERROR',
            error_message: 'Message validation failed',
            field_errors: fieldErrors,
            request_id: message.request_id,
          },
        };
      }

      return {
        valid: false,
        errors: {
          error_code: 'VALIDATION_ERROR',
          error_message: error.message || 'Unknown validation error',
          request_id: message.request_id,
        },
      };
    }
  }

  private sanitizeMessage(message: IAPXMessage): IAPXMessage {
    // Deep clone to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(message));

    // Sanitize string fields recursively
    this.sanitizeObject(sanitized);

    return sanitized;
  }

  private sanitizeObject(obj: any): void {
    if (typeof obj === 'string') {
      // Basic XSS prevention - remove script tags and javascript: protocols
      return obj
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        obj[index] = this.sanitizeObject(item);
      });
    } else if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach((key) => {
        obj[key] = this.sanitizeObject(obj[key]);
      });
    }

    return obj;
  }

  getMessageSchema(messageType: APXMessageType): IAPXMessageSchema | undefined {
    const schema = this.schemas.get(messageType);
    if (!schema) return undefined;

    // Extract schema information
    const shape = schema.shape;
    const payloadShape = shape.payload?.shape || {};

    const requiredFields: string[] = [];
    const optionalFields: string[] = [];
    const payloadSchema: Record<string, string> = {};

    // Extract payload schema information
    for (const [key, field] of Object.entries(payloadShape)) {
      // Cast field to ZodTypeAny to access internal properties
      const zodField = field as z.ZodTypeAny;
      const isOptional = zodField._def?.typeName === 'ZodOptional';

      if (isOptional) {
        optionalFields.push(key);
      } else {
        requiredFields.push(key);
      }

      // Determine field type
      let fieldType = 'any';
      const innerType = isOptional ? zodField._def?.innerType : zodField;

      switch (innerType._def?.typeName) {
        case 'ZodString':
          fieldType = 'string';
          break;
        case 'ZodNumber':
          fieldType = 'number';
          break;
        case 'ZodBoolean':
          fieldType = 'boolean';
          break;
        case 'ZodArray':
          fieldType = 'array';
          break;
        case 'ZodObject':
          fieldType = 'object';
          break;
        case 'ZodEnum':
          fieldType = 'enum';
          break;
        case 'ZodDate':
          fieldType = 'date';
          break;
        default:
          fieldType = 'any';
      }

      payloadSchema[key] = fieldType;
    }

    return {
      type: messageType,
      required_fields: requiredFields,
      optional_fields: optionalFields,
      payload_schema: payloadSchema,
      security_requirements: {
        min_permission_level: APXPermissionLevel.READ,
        required_security_level: APXSecurityLevel.AUTHENTICATED,
        tenant_isolation: true,
      },
    };
  }
}
