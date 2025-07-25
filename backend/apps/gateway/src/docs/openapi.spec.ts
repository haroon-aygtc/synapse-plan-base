import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { INestApplication } from "@nestjs/common";

/**
 * OpenAPI 3.1 Specification for SynapseAI Platform
 * Production-ready API documentation with full typing support
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("SynapseAI Platform API")
    .setDescription(
      `
      # SynapseAI Universal API
      
      Production-ready REST and WebSocket API for the SynapseAI platform.
      
      ## Features
      - **Multi-tenant**: Organization-scoped resources
      - **RBAC**: Role-based access control
      - **Real-time**: WebSocket support via APIX protocol
      - **Streaming**: Real-time agent responses
      - **Type-safe**: Full TypeScript support
      - **Rate Limited**: Built-in rate limiting and security
      - **Scalable**: Horizontal scaling support with Redis
      
      ## Authentication
      All endpoints require Bearer token authentication.
      
      ## Rate Limiting
      - 100 requests per minute for regular users
      - 500 requests per minute for admin users
      - WebSocket message rate limiting per user/organization
      
      ## WebSocket Events
      Connect to \`/socket.io\` for real-time events using the APIX protocol.
      
      ## Error Handling
      All endpoints return standardized error responses with proper HTTP status codes.
    `,
    )
    .setVersion("1.0.0")
    .setContact(
      "SynapseAI Support",
      "https://synapseai.com/support",
      "support@synapseai.com",
    )
    .setLicense("MIT", "https://opensource.org/licenses/MIT")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "Authorization",
        description: "Enter JWT Bearer token",
        in: "header",
      },
      "JWT-auth",
    )
    .addServer("http://localhost:3001/api", "Development")
    .addServer("https://api.synapseai.com", "Production")
    .addTag("Authentication", "User authentication and authorization")
    .addTag("Agents", "AI agent management and execution")
    .addTag("Tools", "Tool management and execution")
    .addTag("Workflows", "Workflow orchestration")
    .addTag("Knowledge", "Knowledge base and document management")
    .addTag("Providers", "AI provider configuration and routing")
    .addTag("Sessions", "Session management")
    .addTag("Analytics", "Usage analytics and reporting")
    .addTag("Billing", "Billing and usage tracking")
    .addTag("Widgets", "Widget creation and deployment")
    .addTag("HITL", "Human-in-the-loop interactions")
    .addTag("Admin", "Administrative functions")
    .addTag("Health", "System health and monitoring")
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  });

  // Add custom schemas for APIX protocol
  document.components = {
    ...document.components,
    schemas: {
      ...document.components?.schemas,
      APXMessage: {
        type: "object",
        required: ["type", "session_id", "payload", "timestamp", "request_id"],
        properties: {
          type: {
            type: "string",
            enum: [
              "agent_execution_started",
              "agent_text_chunk",
              "agent_execution_complete",
              "tool_call_start",
              "tool_call_result",
              "kb_search_performed",
              "hitl_request_created",
              "widget_query_submitted",
              "stream_pause",
              "stream_resume",
            ],
            description: "APIX message type",
          },
          session_id: {
            type: "string",
            format: "uuid",
            description: "WebSocket session identifier",
          },
          payload: {
            type: "object",
            description: "Message payload (varies by type)",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "Message timestamp",
          },
          request_id: {
            type: "string",
            format: "uuid",
            description: "Unique request identifier",
          },
          correlation_id: {
            type: "string",
            format: "uuid",
            description: "Optional correlation identifier",
          },
          user_id: {
            type: "string",
            format: "uuid",
            description: "User identifier",
          },
          organization_id: {
            type: "string",
            format: "uuid",
            description: "Organization identifier",
          },
        },
      },
      StreamingResponse: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Execution identifier",
          },
          type: {
            type: "string",
            enum: ["chunk", "complete", "error"],
            description: "Response type",
          },
          data: {
            type: "object",
            description: "Response data",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "Response timestamp",
          },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["success", "error", "timestamp"],
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          error: {
            type: "string",
            description: "Error message",
          },
          code: {
            type: "string",
            description: "Error code",
          },
          details: {
            type: "object",
            description: "Additional error details",
          },
          timestamp: {
            type: "string",
            format: "date-time",
          },
          requestId: {
            type: "string",
            description: "Request identifier for debugging",
          },
        },
      },
      PaginatedResponse: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            example: true,
          },
          data: {
            type: "array",
            items: {
              type: "object",
            },
          },
          pagination: {
            type: "object",
            properties: {
              page: {
                type: "integer",
                minimum: 1,
              },
              limit: {
                type: "integer",
                minimum: 1,
                maximum: 100,
              },
              total: {
                type: "integer",
                minimum: 0,
              },
              totalPages: {
                type: "integer",
                minimum: 0,
              },
              hasNext: {
                type: "boolean",
              },
              hasPrev: {
                type: "boolean",
              },
            },
          },
          timestamp: {
            type: "string",
            format: "date-time",
          },
        },
      },
    },
  };

  // Add WebSocket documentation
  document.info["x-websocket"] = {
    url: "/socket.io",
    protocol: "APIX",
    description: "Real-time WebSocket connection using APIX protocol",
    events: {
      agent_execution_started: {
        description: "Agent execution has started",
        payload: {
          $ref: "#/components/schemas/APXMessage",
        },
      },
      agent_text_chunk: {
        description: "Streaming text chunk from agent",
        payload: {
          $ref: "#/components/schemas/APXMessage",
        },
      },
      agent_execution_complete: {
        description: "Agent execution completed",
        payload: {
          $ref: "#/components/schemas/APXMessage",
        },
      },
    },
  };

  SwaggerModule.setup("docs", app, document, {
    customSiteTitle: "SynapseAI API Documentation",
    customfavIcon: "/favicon.ico",
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1f2937 }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: "list",
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
  });
}
