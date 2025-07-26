import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Widget, WidgetExecution } from '@database/entities';
import { WebSocketService } from '../../websocket/websocket.service';

export interface WidgetError {
  id: string;
  widgetId: string;
  sessionId: string;
  executionId?: string;
  type: 'runtime' | 'timeout' | 'resource' | 'security' | 'network' | 'validation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  context: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
}

export interface RecoveryStrategy {
  type: 'retry' | 'fallback' | 'graceful_degradation' | 'user_intervention';
  maxAttempts: number;
  backoffMs: number;
  fallbackAction?: () => Promise<any>;
  userNotification?: {
    title: string;
    message: string;
    actions?: Array<{ label: string; action: string }>;
  };
}

export interface ErrorRecoveryResult {
  success: boolean;
  strategy: string;
  attempts: number;
  result?: any;
  error?: string;
  requiresUserIntervention: boolean;
}

@Injectable()
export class WidgetErrorHandlerService {
  private readonly logger = new Logger(WidgetErrorHandlerService.name);
  private readonly activeErrors = new Map<string, WidgetError>();
  private readonly recoveryStrategies = new Map<string, RecoveryStrategy>();

  constructor(
    @InjectRepository(Widget)
    private widgetRepository: Repository<Widget>,
    @InjectRepository(WidgetExecution)
    private widgetExecutionRepository: Repository<WidgetExecution>,
    @InjectQueue('widget-error-recovery')
    private errorRecoveryQueue: Queue,
    private websocketService: WebSocketService
  ) {
    this.initializeErrorHandler();
  }

  private initializeErrorHandler(): void {
    this.logger.log('Initializing Widget Error Handler...');

    // Set up default recovery strategies
    this.setupDefaultRecoveryStrategies();

    // Set up error cleanup interval
    setInterval(() => this.cleanupResolvedErrors(), 300000); // Every 5 minutes

    this.logger.log('Widget Error Handler initialized successfully');
  }

  /**
   * Handle widget runtime error
   */
  async handleError(
    widgetId: string,
    sessionId: string,
    error: Error,
    context: Record<string, any> = {},
    executionId?: string
  ): Promise<ErrorRecoveryResult> {
    const widgetError = await this.createWidgetError(
      widgetId,
      sessionId,
      error,
      context,
      executionId
    );

    this.logger.error(`Widget error occurred: ${widgetError.id}`, {
      widgetId,
      sessionId,
      error: error.message,
      context,
    });

    // Store error for tracking
    this.activeErrors.set(widgetError.id, widgetError);

    // Emit error event
    this.websocketService.broadcastToUser(
      '', // We'll need to get userId from session
      'widget:error',
      {
        errorId: widgetError.id,
        type: widgetError.type,
        severity: widgetError.severity,
        message: widgetError.message,
        timestamp: widgetError.timestamp,
      }
    );

    // Attempt recovery
    const recoveryResult = await this.attemptRecovery(widgetError);

    // Update error status
    if (recoveryResult.success) {
      widgetError.resolved = true;
      this.websocketService.broadcastToUser(
        '', // We'll need to get userId from session
        'widget:error:resolved',
        {
          errorId: widgetError.id,
          strategy: recoveryResult.strategy,
          attempts: recoveryResult.attempts,
        }
      );
    }

    return recoveryResult;
  }

  /**
   * Attempt to recover from error
   */
  async attemptRecovery(widgetError: WidgetError): Promise<ErrorRecoveryResult> {
    const strategy = this.getRecoveryStrategy(widgetError);

    if (!strategy) {
      return {
        success: false,
        strategy: 'none',
        attempts: 0,
        error: 'No recovery strategy available',
        requiresUserIntervention: true,
      };
    }

    this.logger.debug(
      `Attempting recovery for error ${widgetError.id} using strategy: ${strategy.type}`
    );

    let attempts = 0;
    let lastError: string | undefined;

    while (
      attempts < strategy.maxAttempts &&
      widgetError.recoveryAttempts < widgetError.maxRecoveryAttempts
    ) {
      attempts++;
      widgetError.recoveryAttempts++;

      try {
        let result: any;

        switch (strategy.type) {
          case 'retry':
            result = await this.retryOperation(widgetError);
            break;
          case 'fallback':
            result = await this.executeFallback(widgetError, strategy);
            break;
          case 'graceful_degradation':
            result = await this.gracefulDegradation(widgetError);
            break;
          case 'user_intervention':
            result = await this.requestUserIntervention(widgetError, strategy);
            break;
          default:
            throw new Error(`Unknown recovery strategy: ${strategy.type}`);
        }

        // Recovery successful
        return {
          success: true,
          strategy: strategy.type,
          attempts,
          result,
          requiresUserIntervention: strategy.type === 'user_intervention',
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        lastError = errorMessage;
        this.logger.warn(
          `Recovery attempt ${attempts} failed for error ${widgetError.id}: ${errorMessage}`
        );

        // Wait before next attempt (exponential backoff)
        if (attempts < strategy.maxAttempts) {
          const backoffMs = strategy.backoffMs * Math.pow(2, attempts - 1);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    // All recovery attempts failed
    return {
      success: false,
      strategy: strategy.type,
      attempts,
      error: lastError || 'All recovery attempts failed',
      requiresUserIntervention: true,
    };
  }

  /**
   * Get error statistics for a widget
   */
  async getErrorStatistics(widgetId: string, timeRange?: { start: Date; end: Date }) {
    const query = this.widgetExecutionRepository
      .createQueryBuilder('execution')
      .where('execution.widgetId = :widgetId', { widgetId })
      .andWhere('execution.status = :status', { status: 'failed' });

    if (timeRange) {
      query
        .andWhere('execution.createdAt >= :start', { start: timeRange.start })
        .andWhere('execution.createdAt <= :end', { end: timeRange.end });
    }

    const failedExecutions = await query.getMany();

    // Categorize errors
    const errorsByType = new Map<string, number>();
    const errorsBySeverity = new Map<string, number>();
    const errorTrends: Array<{ date: string; count: number }> = [];

    for (const execution of failedExecutions) {
      const errorType = this.categorizeError(execution.errorMessage || 'Unknown error');
      const severity = this.determineSeverity(execution.errorMessage || 'Unknown error');

      errorsByType.set(errorType, (errorsByType.get(errorType) || 0) + 1);
      errorsBySeverity.set(severity, (errorsBySeverity.get(severity) || 0) + 1);
    }

    // Calculate error trends (daily)
    const dailyErrors = new Map<string, number>();
    for (const execution of failedExecutions) {
      const date = execution.createdAt.toISOString().split('T')[0];
      dailyErrors.set(date, (dailyErrors.get(date) || 0) + 1);
    }

    for (const [date, count] of dailyErrors.entries()) {
      errorTrends.push({ date, count });
    }

    return {
      totalErrors: failedExecutions.length,
      errorsByType: Object.fromEntries(errorsByType),
      errorsBySeverity: Object.fromEntries(errorsBySeverity),
      errorTrends: errorTrends.sort((a, b) => a.date.localeCompare(b.date)),
      averageRecoveryTime: this.calculateAverageRecoveryTime(failedExecutions),
      recoverySuccessRate: this.calculateRecoverySuccessRate(widgetId),
    };
  }

  /**
   * Get active errors for a widget
   */
  getActiveErrors(widgetId: string): WidgetError[] {
    return Array.from(this.activeErrors.values()).filter(
      (error) => error.widgetId === widgetId && !error.resolved
    );
  }

  /**
   * Resolve error manually
   */
  async resolveError(errorId: string, resolution: string): Promise<void> {
    const error = this.activeErrors.get(errorId);
    if (!error) {
      throw new Error('Error not found');
    }

    error.resolved = true;
    error.context.manualResolution = resolution;
    error.context.resolvedAt = new Date();

    this.websocketService.broadcastToUser(
      '', // We'll need to get userId from session
      'widget:error:resolved',
      {
        errorId,
        resolution,
        resolvedAt: new Date(),
      }
    );

    this.logger.log(`Error ${errorId} manually resolved: ${resolution}`);
  }

  // Private helper methods

  private async createWidgetError(
    widgetId: string,
    sessionId: string,
    error: Error,
    context: Record<string, any>,
    executionId?: string
  ): Promise<WidgetError> {
    const errorType = this.categorizeError(error.message);
    const severity = this.determineSeverity(error.message);

    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      widgetId,
      sessionId,
      executionId,
      type: errorType,
      severity,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
      resolved: false,
      recoveryAttempts: 0,
      maxRecoveryAttempts: this.getMaxRecoveryAttempts(errorType, severity),
    };
  }

  private categorizeError(errorMessage: string): WidgetError['type'] {
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      return 'timeout';
    }
    if (errorMessage.includes('memory') || errorMessage.includes('resource')) {
      return 'resource';
    }
    if (
      errorMessage.includes('origin') ||
      errorMessage.includes('security') ||
      errorMessage.includes('unauthorized')
    ) {
      return 'security';
    }
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('fetch')
    ) {
      return 'network';
    }
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return 'validation';
    }
    return 'runtime';
  }

  private determineSeverity(errorMessage: string): WidgetError['severity'] {
    if (errorMessage.includes('critical') || errorMessage.includes('fatal')) {
      return 'critical';
    }
    if (errorMessage.includes('security') || errorMessage.includes('unauthorized')) {
      return 'high';
    }
    if (errorMessage.includes('timeout') || errorMessage.includes('resource')) {
      return 'medium';
    }
    return 'low';
  }

  private getMaxRecoveryAttempts(
    type: WidgetError['type'],
    severity: WidgetError['severity']
  ): number {
    if (severity === 'critical') return 1;
    if (severity === 'high') return 2;
    if (type === 'timeout' || type === 'network') return 3;
    return 2;
  }

  private getRecoveryStrategy(widgetError: WidgetError): RecoveryStrategy | undefined {
    const key = `${widgetError.type}_${widgetError.severity}`;
    return this.recoveryStrategies.get(key) || this.recoveryStrategies.get(widgetError.type);
  }

  private setupDefaultRecoveryStrategies(): void {
    // Timeout errors - retry with exponential backoff
    this.recoveryStrategies.set('timeout', {
      type: 'retry',
      maxAttempts: 3,
      backoffMs: 1000,
    });

    // Resource errors - graceful degradation
    this.recoveryStrategies.set('resource', {
      type: 'graceful_degradation',
      maxAttempts: 2,
      backoffMs: 2000,
    });

    // Network errors - retry with fallback
    this.recoveryStrategies.set('network', {
      type: 'retry',
      maxAttempts: 3,
      backoffMs: 1500,
      fallbackAction: async () => {
        return { type: 'cached_response', message: 'Using cached response due to network issues' };
      },
    });

    // Security errors - user intervention required
    this.recoveryStrategies.set('security', {
      type: 'user_intervention',
      maxAttempts: 1,
      backoffMs: 0,
      userNotification: {
        title: 'Security Error',
        message: 'A security issue was detected. Please verify your configuration.',
        actions: [
          { label: 'Review Settings', action: 'review_settings' },
          { label: 'Contact Support', action: 'contact_support' },
        ],
      },
    });

    // Validation errors - user intervention
    this.recoveryStrategies.set('validation', {
      type: 'user_intervention',
      maxAttempts: 1,
      backoffMs: 0,
      userNotification: {
        title: 'Validation Error',
        message: 'Invalid input detected. Please check your data and try again.',
        actions: [
          { label: 'Fix Input', action: 'fix_input' },
          { label: 'Use Default', action: 'use_default' },
        ],
      },
    });

    // Runtime errors - retry with fallback
    this.recoveryStrategies.set('runtime', {
      type: 'retry',
      maxAttempts: 2,
      backoffMs: 1000,
      fallbackAction: async () => {
        return { type: 'error_response', message: 'Service temporarily unavailable' };
      },
    });
  }

  private async retryOperation(widgetError: WidgetError): Promise<any> {
    // Queue retry operation
    const job = await this.errorRecoveryQueue.add('retry-operation', {
      errorId: widgetError.id,
      widgetId: widgetError.widgetId,
      sessionId: widgetError.sessionId,
      executionId: widgetError.executionId,
      context: widgetError.context,
    });

    return { jobId: job.id, type: 'retry_queued' };
  }

  private async executeFallback(
    widgetError: WidgetError,
    strategy: RecoveryStrategy
  ): Promise<any> {
    if (strategy.fallbackAction) {
      return await strategy.fallbackAction();
    }

    // Default fallback response
    return {
      type: 'fallback_response',
      message: 'Using fallback due to error',
      originalError: widgetError.message,
    };
  }

  private async gracefulDegradation(widgetError: WidgetError): Promise<any> {
    // Implement graceful degradation based on error type
    switch (widgetError.type) {
      case 'resource':
        return {
          type: 'degraded_response',
          message: 'Service running in limited mode due to resource constraints',
          features: ['basic_functionality'],
        };
      case 'timeout':
        return {
          type: 'partial_response',
          message: 'Partial results due to timeout',
          data: widgetError.context.partialData || {},
        };
      default:
        return {
          type: 'minimal_response',
          message: 'Service temporarily degraded',
        };
    }
  }

  private async requestUserIntervention(
    widgetError: WidgetError,
    strategy: RecoveryStrategy
  ): Promise<any> {
    if (strategy.userNotification) {
      this.websocketService.broadcastToUser(
        '', // We'll need to get userId from session
        'widget:user_intervention_required',
        {
          errorId: widgetError.id,
          notification: strategy.userNotification,
          timestamp: new Date(),
        }
      );
    }

    return {
      type: 'user_intervention_requested',
      errorId: widgetError.id,
      requiresAction: true,
    };
  }

  private calculateAverageRecoveryTime(executions: WidgetExecution[]): number {
    const recoveredExecutions = executions.filter((e) => (e.context as any)?.recovered);
    if (recoveredExecutions.length === 0) return 0;

    const totalRecoveryTime = recoveredExecutions.reduce((sum, e) => {
      const recoveryTime = (e.context as any)?.recoveryTime || 0;
      return sum + recoveryTime;
    }, 0);

    return totalRecoveryTime / recoveredExecutions.length;
  }

  private calculateRecoverySuccessRate(widgetId: string): number {
    const widgetErrors = Array.from(this.activeErrors.values()).filter(
      (error) => error.widgetId === widgetId
    );

    if (widgetErrors.length === 0) return 100;

    const resolvedErrors = widgetErrors.filter((error) => error.resolved);
    return (resolvedErrors.length / widgetErrors.length) * 100;
  }

  private cleanupResolvedErrors(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    for (const [errorId, error] of this.activeErrors.entries()) {
      if (error.resolved && error.timestamp < cutoffTime) {
        this.activeErrors.delete(errorId);
      }
    }
  }
}
