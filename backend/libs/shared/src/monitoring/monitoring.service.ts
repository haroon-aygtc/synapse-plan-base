import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomLoggerService } from '../logger/logger.service';

interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: Date;
}

interface TraceData {
  operationName: string;
  duration: number;
  tags?: Record<string, string>;
  status: 'success' | 'error';
  error?: Error;
}

@Injectable()
export class MonitoringService {
  private isDatadogEnabled: boolean;
  private serviceName: string;
  private environment: string;

  constructor(
    private configService: ConfigService,
    private logger: CustomLoggerService,
  ) {
    this.isDatadogEnabled =
      this.configService.get('DATADOG_ENABLED', 'false') === 'true';
    this.serviceName = this.configService.get('SERVICE_NAME', 'synapseai');
    this.environment = this.configService.get('NODE_ENV', 'development');
  }

  // Custom metrics
  recordMetric(data: MetricData) {
    // Log metric for observability
    this.logger.logBusinessMetric(data.name, data.value, 'count', {
      tags: data.tags,
      service: this.serviceName,
      environment: this.environment,
    });

    // Send to DataDog if enabled
    if (this.isDatadogEnabled && global.ddTrace) {
      try {
        global.ddTrace.dogstatsd.increment(data.name, data.value, data.tags);
      } catch (error) {
        this.logger.error(
          'Failed to send metric to DataDog',
          error instanceof Error ? error.stack : String(error),
          'MonitoringService',
        );
      }
    }
  }

  // Performance tracking
  recordTrace(data: TraceData) {
    // Log performance metric
    this.logger.logPerformance(data.operationName, data.duration, {
      status: data.status,
      tags: data.tags,
      error: data.error?.message,
    });

    // Send to DataDog if enabled
    if (this.isDatadogEnabled && global.ddTrace) {
      try {
        const span = global.ddTrace.tracer.startSpan(data.operationName, {
          tags: {
            ...data.tags,
            service: this.serviceName,
            environment: this.environment,
          },
        });

        if (data.status === 'error' && data.error) {
          span.setTag('error', true);
          span.setTag('error.message', data.error.message);
          span.setTag('error.stack', data.error.stack);
        }

        span.finish();
      } catch (error) {
        this.logger.error(
          'Failed to send trace to DataDog',
          error instanceof Error ? error.stack : String(error),
          'MonitoringService',
        );
      }
    }
  }

  // Health check metrics
  recordHealthCheck(
    service: string,
    status: 'healthy' | 'unhealthy',
    responseTime: number,
  ) {
    this.recordMetric({
      name: 'health_check',
      value: status === 'healthy' ? 1 : 0,
      tags: {
        service,
        status,
      },
    });

    this.recordTrace({
      operationName: 'health_check',
      duration: responseTime,
      status: status === 'healthy' ? 'success' : 'error',
      tags: {
        service,
        health_status: status,
      },
    });
  }

  // Database metrics
  recordDatabaseOperation(
    operation: string,
    duration: number,
    success: boolean,
    table?: string,
  ) {
    this.recordMetric({
      name: 'database_operation',
      value: 1,
      tags: {
        operation,
        success: success.toString(),
        table: table || 'unknown',
      },
    });

    this.recordTrace({
      operationName: `database.${operation}`,
      duration,
      status: success ? 'success' : 'error',
      tags: {
        operation,
        table: table || 'unknown',
      },
    });
  }

  // API metrics
  recordApiRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
  ) {
    this.recordMetric({
      name: 'api_request',
      value: 1,
      tags: {
        method,
        endpoint,
        status_code: statusCode.toString(),
        status_class: `${Math.floor(statusCode / 100)}xx`,
      },
    });

    this.recordTrace({
      operationName: `http.${method.toLowerCase()}`,
      duration,
      status: statusCode < 400 ? 'success' : 'error',
      tags: {
        'http.method': method,
        'http.url': endpoint,
        'http.status_code': statusCode.toString(),
      },
    });
  }

  // Business metrics
  recordAgentExecution(
    agentId: string,
    success: boolean,
    duration: number,
    tokensUsed: number,
  ) {
    this.recordMetric({
      name: 'agent_execution',
      value: 1,
      tags: {
        agent_id: agentId,
        success: success.toString(),
      },
    });

    this.recordMetric({
      name: 'agent_tokens_used',
      value: tokensUsed,
      tags: {
        agent_id: agentId,
      },
    });

    this.recordTrace({
      operationName: 'agent.execution',
      duration,
      status: success ? 'success' : 'error',
      tags: {
        agent_id: agentId,
        tokens_used: tokensUsed.toString(),
      },
    });
  }

  recordToolExecution(toolId: string, success: boolean, duration: number) {
    this.recordMetric({
      name: 'tool_execution',
      value: 1,
      tags: {
        tool_id: toolId,
        success: success.toString(),
      },
    });

    this.recordTrace({
      operationName: 'tool.execution',
      duration,
      status: success ? 'success' : 'error',
      tags: {
        tool_id: toolId,
      },
    });
  }

  recordWorkflowExecution(
    workflowId: string,
    success: boolean,
    duration: number,
    stepsCompleted: number,
  ) {
    this.recordMetric({
      name: 'workflow_execution',
      value: 1,
      tags: {
        workflow_id: workflowId,
        success: success.toString(),
      },
    });

    this.recordMetric({
      name: 'workflow_steps_completed',
      value: stepsCompleted,
      tags: {
        workflow_id: workflowId,
      },
    });

    this.recordTrace({
      operationName: 'workflow.execution',
      duration,
      status: success ? 'success' : 'error',
      tags: {
        workflow_id: workflowId,
        steps_completed: stepsCompleted.toString(),
      },
    });
  }

  // Error tracking
  recordError(error: Error, context: string, metadata?: Record<string, any>) {
    this.logger.error(
      `Error in ${context}: ${error.message}`,
      error.stack,
      context,
      metadata,
    );

    this.recordMetric({
      name: 'error_count',
      value: 1,
      tags: {
        context,
        error_type: error.constructor.name,
      },
    });

    if (this.isDatadogEnabled && global.ddTrace) {
      try {
        global.ddTrace.tracer.scope().active()?.setTag('error', true);
        global.ddTrace.tracer
          .scope()
          .active()
          ?.setTag('error.message', error.message);
        global.ddTrace.tracer
          .scope()
          .active()
          ?.setTag('error.stack', error.stack);
      } catch (error) {
        this.logger.error(
          'Failed to record error in DataDog',
          error instanceof Error ? error.stack : String(error),
          'MonitoringService',
        );
      }
    }
  }
}
