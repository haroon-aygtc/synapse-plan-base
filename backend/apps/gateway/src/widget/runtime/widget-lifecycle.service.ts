import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Widget } from '@database/entities/widget.entity';
import { WidgetExecution } from '@database/entities/widget-execution.entity';
import { WebSocketService } from '../../websocket/websocket.service';
import { WidgetSessionService } from '../session/widget-session.service';
import { WidgetErrorHandlerService } from './widget-error-handler.service';

export interface WidgetLifecycleState {
  widgetId: string;
  sessionId: string;
  phase: 'initializing' | 'loading' | 'ready' | 'executing' | 'paused' | 'error' | 'cleanup' | 'terminated';
  startTime: Date;
  lastTransition: Date;
  metadata: Record<string, any>;
  resources: WidgetResourceUsage;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

export interface WidgetResourceUsage {
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
  storageUsage: number;
  executionTime: number;
  lastUpdated: Date;
}

export interface LifecycleEvent {
  type: 'phase_change' | 'resource_alert' | 'health_check' | 'cleanup' | 'error';
  widgetId: string;
  sessionId: string;
  timestamp: Date;
  data: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface LifecycleHook {
  phase: WidgetLifecycleState['phase'];
  action: 'before' | 'after';
  handler: (state: WidgetLifecycleState) => Promise<void>;
  priority: number;
}

@Injectable()
export class WidgetLifecycleService {
  private readonly logger = new Logger(WidgetLifecycleService.name);
  private readonly lifecycleStates = new Map<string, WidgetLifecycleState>();
  private readonly lifecycleHooks = new Map<string, LifecycleHook[]>();
  private readonly resourceMonitors = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectRepository(Widget)
    private widgetRepository: Repository<Widget>,
    @InjectRepository(WidgetExecution)
    private widgetExecutionRepository: Repository<WidgetExecution>,
    @InjectQueue('widget-lifecycle')
    private lifecycleQueue: Queue,
    private websocketService: WebSocketService,
    private sessionService: WidgetSessionService,
    private errorHandler: WidgetErrorHandlerService,
  ) {
    this.initializeLifecycleManager();
  }

  private initializeLifecycleManager(): void {
    this.logger.log('Initializing Widget Lifecycle Manager...');

    // Set up default lifecycle hooks
    this.setupDefaultHooks();

    // Set up cleanup intervals
    setInterval(() => this.cleanupTerminatedStates(), 300000); // Every 5 minutes
    setInterval(() => this.performHealthChecks(), 60000); // Every minute

    this.logger.log('Widget Lifecycle Manager initialized successfully');
  }

  /**
   * Initialize widget lifecycle
   */
  async initializeWidget(
    widgetId: string,
    sessionId: string,
    metadata: Record<string, any> = {},
  ): Promise<WidgetLifecycleState> {
    this.logger.debug(`Initializing widget lifecycle: ${widgetId} in session ${sessionId}`);

    const stateKey = `${widgetId}_${sessionId}`;

    const lifecycleState: WidgetLifecycleState = {
      widgetId,
      sessionId,
      phase: 'initializing',
      startTime: new Date(),
      lastTransition: new Date(),
      metadata,
      resources: {
        memoryUsage: 0,
        cpuUsage: 0,
        networkRequests: 0,
        storageUsage: 0,
        executionTime: 0,
        lastUpdated: new Date(),
      },
      healthStatus: 'healthy',
    };

    this.lifecycleStates.set(stateKey, lifecycleState);

    // Start resource monitoring
    this.startResourceMonitoring(stateKey);

    // Emit lifecycle event
    await this.emitLifecycleEvent({
      type: 'phase_change',
      widgetId,
      sessionId,
      timestamp: new Date(),
      data: { phase: 'initializing', metadata },
      severity: 'info',
    });

    // Execute before hooks
    await this.executeHooks('initializing', 'before', lifecycleState);

    // Transition to loading phase
    await this.transitionPhase(stateKey, 'loading');

    return lifecycleState;
  }

  /**
   * Transition widget to next phase
   */
  async transitionPhase(
    stateKey: string,
    newPhase: WidgetLifecycleState['phase'],
    metadata?: Record<string, any>,
  ): Promise<void> {
    const state = this.lifecycleStates.get(stateKey);
    if (!state) {
      throw new Error(`Lifecycle state not found: ${stateKey}`);
    }

    const oldPhase = state.phase;

    this.logger.debug(`Transitioning widget ${state.widgetId} from ${oldPhase} to ${newPhase}`);

    // Execute before hooks for new phase
    await this.executeHooks(newPhase, 'before', state);

    // Update state
    state.phase = newPhase;
    state.lastTransition = new Date();

    if (metadata) {
      state.metadata = { ...state.metadata, ...metadata };
    }

    // Execute after hooks for old phase
    await this.executeHooks(oldPhase, 'after', state);

    // Emit lifecycle event
    await this.emitLifecycleEvent({
      type: 'phase_change',
      widgetId: state.widgetId,
      sessionId: state.sessionId,
      timestamp: new Date(),
      data: {
        oldPhase,
        newPhase,
        metadata: state.metadata,
        transitionTime: Date.now() - state.lastTransition.getTime(),
      },
      severity: 'info',
    });

    // Handle phase-specific logic
    await this.handlePhaseTransition(state, oldPhase, newPhase);
  }

  /**
   * Mark widget as ready for execution
   */
  async markReady(widgetId: string, sessionId: string): Promise<void> {
    const stateKey = `${widgetId}_${sessionId}`;
    await this.transitionPhase(stateKey, 'ready');
  }

  /**
   * Start widget execution
   */
  async startExecution(
    widgetId: string,
    sessionId: string,
    executionId: string,
  ): Promise<void> {
    const stateKey = `${widgetId}_${sessionId}`;
    await this.transitionPhase(stateKey, 'executing', { executionId });
  }

  /**
   * Pause widget execution
   */
  async pauseExecution(widgetId: string, sessionId: string, reason: string): Promise<void> {
    const stateKey = `${widgetId}_${sessionId}`;
    await this.transitionPhase(stateKey, 'paused', { pauseReason: reason });
  }

  /**
   * Resume widget execution
   */
  async resumeExecution(widgetId: string, sessionId: string): Promise<void> {
    const stateKey = `${widgetId}_${sessionId}`;
    const state = this.lifecycleStates.get(stateKey);

    if (state?.phase === 'paused') {
      await this.transitionPhase(stateKey, 'executing', { resumedAt: new Date() });
    }
  }

  /**
   * Handle widget error
   */
  async handleError(
    widgetId: string,
    sessionId: string,
    error: Error,
    context: Record<string, any> = {},
  ): Promise<void> {
    const stateKey = `${widgetId}_${sessionId}`;
    const state = this.lifecycleStates.get(stateKey);

    if (state) {
      state.healthStatus = 'unhealthy';
      await this.transitionPhase(stateKey, 'error', {
        error: error.message,
        errorContext: context,
        errorTime: new Date(),
      });

      // Emit error event
      await this.emitLifecycleEvent({
        type: 'error',
        widgetId,
        sessionId,
        timestamp: new Date(),
        data: { error: error.message, context },
        severity: 'error',
      });

      // Attempt error recovery
      try {
        const recoveryResult = await this.errorHandler.handleError(
          widgetId,
          sessionId,
          error,
          context,
        );

        if (recoveryResult.success) {
          state.healthStatus = 'healthy';
          await this.transitionPhase(stateKey, 'ready', {
            recoveredAt: new Date(),
            recoveryStrategy: recoveryResult.strategy,
          });
        }
      } catch (recoveryError) {
        this.logger.error(`Failed to recover from error for widget ${widgetId}:`, recoveryError);
      }
    }
  }

  /**
   * Clean up widget resources
   */
  async cleanup(widgetId: string, sessionId: string, reason: string = 'normal'): Promise<void> {
    const stateKey = `${widgetId}_${sessionId}`;
    const state = this.lifecycleStates.get(stateKey);

    if (!state) {
      return;
    }

    this.logger.debug(`Cleaning up widget ${widgetId} in session ${sessionId}: ${reason}`);

    await this.transitionPhase(stateKey, 'cleanup', { cleanupReason: reason });

    // Stop resource monitoring
    const monitor = this.resourceMonitors.get(stateKey);
    if (monitor) {
      clearInterval(monitor);
      this.resourceMonitors.delete(stateKey);
    }

    // Clean up session resources
    try {
      await this.sessionService.endSession(sessionId, reason);
    } catch (error) {
      this.logger.warn(`Failed to end session ${sessionId}:`, error);
    }

    // Queue cleanup tasks
    await this.lifecycleQueue.add('cleanup-widget', {
      widgetId,
      sessionId,
      reason,
      resources: state.resources,
    });

    // Transition to terminated
    await this.transitionPhase(stateKey, 'terminated', { terminatedAt: new Date() });

    // Emit cleanup event
    await this.emitLifecycleEvent({
      type: 'cleanup',
      widgetId,
      sessionId,
      timestamp: new Date(),
      data: { reason, resources: state.resources },
      severity: 'info',
    });
  }

  /**
   * Get widget lifecycle state
   */
  getLifecycleState(widgetId: string, sessionId: string): WidgetLifecycleState | undefined {
    const stateKey = `${widgetId}_${sessionId}`;
    return this.lifecycleStates.get(stateKey);
  }

  /**
   * Get all active widget states
   */
  getActiveStates(): WidgetLifecycleState[] {
    return Array.from(this.lifecycleStates.values())
      .filter(state => state.phase !== 'terminated');
  }

  /**
   * Update resource usage
   */
  updateResourceUsage(
    widgetId: string,
    sessionId: string,
    resources: Partial<WidgetResourceUsage>,
  ): void {
    const stateKey = `${widgetId}_${sessionId}`;
    const state = this.lifecycleStates.get(stateKey);

    if (state) {
      state.resources = {
        ...state.resources,
        ...resources,
        lastUpdated: new Date(),
      };

      // Check for resource alerts
      this.checkResourceAlerts(state);
    }
  }

  /**
   * Register lifecycle hook
   */
  registerHook(hook: LifecycleHook): void {
    const key = `${hook.phase}_${hook.action}`;
    const hooks = this.lifecycleHooks.get(key) || [];
    hooks.push(hook);
    hooks.sort((a, b) => a.priority - b.priority);
    this.lifecycleHooks.set(key, hooks);
  }

  /**
   * Get lifecycle statistics
   */
  async getLifecycleStatistics(widgetId?: string): Promise<any> {
    const states = widgetId
      ? Array.from(this.lifecycleStates.values()).filter(s => s.widgetId === widgetId)
      : Array.from(this.lifecycleStates.values());

    const phaseDistribution = new Map<string, number>();
    const healthDistribution = new Map<string, number>();
    let totalExecutionTime = 0;
    let totalMemoryUsage = 0;

    for (const state of states) {
      phaseDistribution.set(state.phase, (phaseDistribution.get(state.phase) || 0) + 1);
      healthDistribution.set(state.healthStatus, (healthDistribution.get(state.healthStatus) || 0) + 1);
      totalExecutionTime += state.resources.executionTime;
      totalMemoryUsage += state.resources.memoryUsage;
    }

    return {
      totalStates: states.length,
      phaseDistribution: Object.fromEntries(phaseDistribution),
      healthDistribution: Object.fromEntries(healthDistribution),
      averageExecutionTime: states.length > 0 ? totalExecutionTime / states.length : 0,
      averageMemoryUsage: states.length > 0 ? totalMemoryUsage / states.length : 0,
      activeStates: states.filter(s => s.phase !== 'terminated').length,
    };
  }

  // Private helper methods

  private async executeHooks(
    phase: WidgetLifecycleState['phase'],
    action: 'before' | 'after',
    state: WidgetLifecycleState,
  ): Promise<void> {
    const key = `${phase}_${action}`;
    const hooks = this.lifecycleHooks.get(key) || [];

    for (const hook of hooks) {
      try {
        await hook.handler(state);
      } catch (error) {
        this.logger.error(`Lifecycle hook failed for ${key}:`, error);
      }
    }
  }

  private async handlePhaseTransition(
    state: WidgetLifecycleState,
    oldPhase: WidgetLifecycleState['phase'],
    newPhase: WidgetLifecycleState['phase'],
  ): Promise<void> {
    switch (newPhase) {
      case 'loading':
        await this.handleLoadingPhase(state);
        break;
      case 'ready':
        await this.handleReadyPhase(state);
        break;
      case 'executing':
        await this.handleExecutingPhase(state);
        break;
      case 'paused':
        await this.handlePausedPhase(state);
        break;
      case 'error':
        await this.handleErrorPhase(state);
        break;
      case 'cleanup':
        await this.handleCleanupPhase(state);
        break;
      case 'terminated':
        await this.handleTerminatedPhase(state);
        break;
    }
  }

  private async handleLoadingPhase(state: WidgetLifecycleState): Promise<void> {
    // Load widget configuration and resources
    const widget = await this.widgetRepository.findOne({
      where: { id: state.widgetId },
    });

    if (widget) {
      state.metadata.widgetConfig = widget.configuration;
      state.metadata.widgetVersion = widget.version;
    }
  }

  private async handleReadyPhase(state: WidgetLifecycleState): Promise<void> {
    // Widget is ready for execution
    state.healthStatus = 'healthy';
  }

  private async handleExecutingPhase(state: WidgetLifecycleState): Promise<void> {
    // Start execution monitoring
    state.resources.executionTime = Date.now() - state.startTime.getTime();
  }

  private async handlePausedPhase(state: WidgetLifecycleState): Promise<void> {
    // Pause execution monitoring
    state.metadata.pausedAt = new Date();
  }

  private async handleErrorPhase(state: WidgetLifecycleState): Promise<void> {
    // Handle error state
    state.healthStatus = 'unhealthy';
  }

  private async handleCleanupPhase(state: WidgetLifecycleState): Promise<void> {
    // Perform cleanup operations
    state.metadata.cleanupStarted = new Date();
  }

  private async handleTerminatedPhase(state: WidgetLifecycleState): Promise<void> {
    // Widget lifecycle completed
    state.metadata.terminatedAt = new Date();
    state.metadata.totalLifetime = Date.now() - state.startTime.getTime();
  }

  private startResourceMonitoring(stateKey: string): void {
    const monitor = setInterval(() => {
      this.updateResourceMetrics(stateKey);
    }, 5000); // Every 5 seconds

    this.resourceMonitors.set(stateKey, monitor);
  }

  private updateResourceMetrics(stateKey: string): void {
    const state = this.lifecycleStates.get(stateKey);
    if (!state || state.phase === 'terminated') {
      return;
    }

    // Simulate resource monitoring (in real implementation, this would use actual system metrics)
    const memoryUsage = process.memoryUsage().heapUsed;
    const cpuUsage = process.cpuUsage();

    this.updateResourceUsage(state.widgetId, state.sessionId, {
      memoryUsage,
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to milliseconds
      lastUpdated: new Date(),
    });
  }

  private checkResourceAlerts(state: WidgetLifecycleState): void {
    const { resources } = state;
    const alerts: string[] = [];

    // Memory usage alert (100MB threshold)
    if (resources.memoryUsage > 100 * 1024 * 1024) {
      alerts.push('High memory usage detected');
      state.healthStatus = 'degraded';
    }

    // CPU usage alert (80% threshold)
    if (resources.cpuUsage > 80) {
      alerts.push('High CPU usage detected');
      state.healthStatus = 'degraded';
    }

    // Execution time alert (5 minutes threshold)
    if (resources.executionTime > 5 * 60 * 1000) {
      alerts.push('Long execution time detected');
    }

    if (alerts.length > 0) {
      this.emitLifecycleEvent({
        type: 'resource_alert',
        widgetId: state.widgetId,
        sessionId: state.sessionId,
        timestamp: new Date(),
        data: { alerts, resources },
        severity: 'warning',
      });
    }
  }

  private async emitLifecycleEvent(event: LifecycleEvent): Promise<void> {
    // Emit to organization
    const widget = await this.widgetRepository.findOne({
      where: { id: event.widgetId },
    });

    if (widget) {
      this.websocketService.broadcastToOrganization(
        widget.organizationId,
        'widget:lifecycle',
        event,
      );
    }

    this.logger.debug(`Lifecycle event emitted: ${event.type} for widget ${event.widgetId}`);
  }

  private setupDefaultHooks(): void {
    // Before loading hook - validate widget
    this.registerHook({
      phase: 'loading',
      action: 'before',
      priority: 1,
      handler: async (state) => {
        const widget = await this.widgetRepository.findOne({
          where: { id: state.widgetId, isActive: true, isDeployed: true },
        });

        if (!widget) {
          throw new Error('Widget not found or inactive');
        }
      },
    });

    // After ready hook - notify session
    this.registerHook({
      phase: 'ready',
      action: 'after',
      priority: 1,
      handler: async (state) => {
        await this.sessionService.updateActivity(state.sessionId, {
          widgetReady: true,
          readyAt: new Date(),
        });
      },
    });

    // Before cleanup hook - save final metrics
    this.registerHook({
      phase: 'cleanup',
      action: 'before',
      priority: 1,
      handler: async (state) => {
        // Save final resource metrics
        state.metadata.finalResources = { ...state.resources };
      },
    });
  }

  private performHealthChecks(): void {
    for (const [stateKey, state] of this.lifecycleStates.entries()) {
      if (state.phase === 'terminated') {
        continue;
      }

      // Check for stale states
      const timeSinceLastTransition = Date.now() - state.lastTransition.getTime();
      const maxStaleTime = 10 * 60 * 1000; // 10 minutes

      if (timeSinceLastTransition > maxStaleTime) {
        this.logger.warn(`Stale widget state detected: ${stateKey}`);
        state.healthStatus = 'degraded';

        this.emitLifecycleEvent({
          type: 'health_check',
          widgetId: state.widgetId,
          sessionId: state.sessionId,
          timestamp: new Date(),
          data: {
            issue: 'stale_state',
            timeSinceLastTransition,
            maxStaleTime,
          },
          severity: 'warning',
        });
      }
    }
  }

  private cleanupTerminatedStates(): void {
    const cutoffTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const toDelete: string[] = [];

    for (const [stateKey, state] of this.lifecycleStates.entries()) {
      if (state.phase === 'terminated' && state.lastTransition < cutoffTime) {
        toDelete.push(stateKey);
      }
    }

    for (const stateKey of toDelete) {
      this.lifecycleStates.delete(stateKey);
    }

    if (toDelete.length > 0) {
      this.logger.debug(`Cleaned up ${toDelete.length} terminated lifecycle states`);
    }
  }
}