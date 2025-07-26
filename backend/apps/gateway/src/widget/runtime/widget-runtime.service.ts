import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Widget, WidgetExecution, Session } from '@database/entities';
import { WebSocketService } from '../../websocket/websocket.service';
import { SessionService } from '../../session/session.service';
import {
  WidgetExecutionContext,
  WidgetExecutionInput,
  WidgetExecutionOutput,
  WidgetExecutionMetrics,
} from '@shared/interfaces';

export interface WidgetRuntimeConfig {
  sandboxEnabled: boolean;
  maxExecutionTime: number;
  maxMemoryUsage: number;
  allowedOrigins: string[];
  enableCrossOriginCommunication: boolean;
  sessionTimeout: number;
  enableRealTimeSync: boolean;
}

export interface WidgetConnection {
  id: string;
  widgetId: string;
  sessionId: string;
  origin: string;
  userId?: string;
  establishedAt: Date;
  lastActivity: Date;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface WidgetLifecycleEvent {
  type: 'load' | 'execute' | 'cleanup' | 'error' | 'timeout';
  widgetId: string;
  sessionId: string;
  timestamp: Date;
  data?: any;
  error?: string;
}

@Injectable()
export class WidgetRuntimeService {
  private readonly logger = new Logger(WidgetRuntimeService.name);
  private readonly activeConnections = new Map<string, WidgetConnection>();
  private readonly executionTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly sandboxInstances = new Map<string, any>();

  constructor(
    @InjectRepository(Widget)
    private widgetRepository: Repository<Widget>,
    @InjectRepository(WidgetExecution)
    private widgetExecutionRepository: Repository<WidgetExecution>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectQueue('widget-runtime')
    private runtimeQueue: Queue,
    private websocketService: WebSocketService,
    private sessionService: SessionService
  ) {
    this.initializeRuntime();
  }

  private async initializeRuntime(): Promise<void> {
    this.logger.log('Initializing Widget Runtime Engine...');

    // Set up cleanup intervals
    setInterval(() => this.cleanupInactiveConnections(), 60000); // Every minute
    setInterval(() => this.cleanupExpiredSessions(), 300000); // Every 5 minutes

    this.logger.log('Widget Runtime Engine initialized successfully');
  }

  /**
   * Establish a secure connection between widget and parent platform
   */
  async establishConnection(
    widgetId: string,
    parentOrigin: string,
    sessionId: string,
    userId?: string
  ): Promise<WidgetConnection> {
    this.logger.debug(`Establishing connection for widget ${widgetId} from origin ${parentOrigin}`);

    // Validate widget exists and is active
    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, isActive: true, isDeployed: true },
    });

    if (!widget) {
      throw new Error('Widget not found or inactive');
    }

    // Validate origin against allowed domains
    if (!this.validateOrigin(parentOrigin, widget.configuration.security.allowedDomains)) {
      throw new Error('Origin not allowed');
    }

    // Create or get existing session
    let session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      const sessionResult = await this.sessionService.createSession({
        userId: userId || '',
        organizationId: widget.organizationId,
        metadata: { widgetId, origin: parentOrigin },
      });
      session = { id: sessionResult.id } as Session;
    }

    // Create connection
    const connectionId = `${widgetId}_${sessionId}_${Date.now()}`;
    const connection: WidgetConnection = {
      id: connectionId,
      widgetId,
      sessionId: session.id,
      origin: parentOrigin,
      userId,
      establishedAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      metadata: {
        userAgent: '',
        deviceType: 'desktop',
        browserInfo: {},
      },
    };

    this.activeConnections.set(connectionId, connection);

    // Emit connection established event
    this.emitLifecycleEvent({
      type: 'load',
      widgetId,
      sessionId: session.id,
      timestamp: new Date(),
      data: { connectionId, origin: parentOrigin },
    });

    // Set up real-time communication channel
    if (widget.configuration.security.enableCORS) {
      await this.setupRealTimeCommunication(connection);
    }

    this.logger.debug(`Connection established: ${connectionId}`);
    return connection;
  }

  /**
   * Execute widget in secure sandboxed environment
   */
  async executeWidget(
    widgetId: string,
    input: WidgetExecutionInput,
    context: WidgetExecutionContext
  ): Promise<WidgetExecutionOutput> {
    this.logger.debug(`Executing widget ${widgetId}`);

    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, isActive: true, isDeployed: true },
    });

    if (!widget) {
      throw new Error('Widget not found or inactive');
    }

    // Create execution record
    const execution = this.widgetExecutionRepository.create({
      widgetId,
      sessionId: context.sessionId,
      userId: (context as any).userId,
      status: 'pending',
      input,
      context,
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        apiCalls: 0,
        errorCount: 0,
        cacheHits: 0,
        cacheMisses: 0,
      },
    });

    const savedExecution = await this.widgetExecutionRepository.save(execution);

    try {
      // Set execution timeout
      const timeoutId = setTimeout(() => {
        this.handleExecutionTimeout(savedExecution.id);
      }, widget.configuration.behavior.sessionTimeout || 30000);

      this.executionTimeouts.set(savedExecution.id, timeoutId);

      // Execute in sandbox if enabled
      let result: WidgetExecutionOutput;
      if (widget.configuration.security.encryptData) {
        result = await this.executeInSandbox(widget, input, context);
      } else {
        result = await this.executeDirectly(widget, input, context);
      }

      // Clear timeout
      clearTimeout(timeoutId);
      this.executionTimeouts.delete(savedExecution.id);

      // Update execution record
      savedExecution.markAsCompleted(result, {
        endTime: new Date(),
        tokensUsed: result.metadata?.tokensUsed || 0,
        apiCalls: result.metadata?.apiCalls || 1,
      });

      await this.widgetExecutionRepository.save(savedExecution);

      // Update connection activity
      const connection = Array.from(this.activeConnections.values()).find(
        (conn) => conn.sessionId === context.sessionId
      );
      if (connection) {
        connection.lastActivity = new Date();
      }

      // Emit execution event
      this.emitLifecycleEvent({
        type: 'execute',
        widgetId,
        sessionId: context.sessionId,
        timestamp: new Date(),
        data: { executionId: savedExecution.id, result },
      });

      return result;
    } catch (error) {
      // Clear timeout
      const timeoutId = this.executionTimeouts.get(savedExecution.id);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.executionTimeouts.delete(savedExecution.id);
      }

      // Update execution record with error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      savedExecution.markAsFailed(errorMessage, { error: errorStack });
      await this.widgetExecutionRepository.save(savedExecution);

      // Emit error event
      this.emitLifecycleEvent({
        type: 'error',
        widgetId,
        sessionId: context.sessionId,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Validate origin against allowed domains
   */
  validateOrigin(origin: string, allowedDomains: string[]): boolean {
    if (!allowedDomains || allowedDomains.length === 0) {
      return true; // Allow all if no restrictions
    }

    // Check exact matches
    if (allowedDomains.includes(origin)) {
      return true;
    }

    // Check wildcard patterns
    for (const domain of allowedDomains) {
      if (domain.startsWith('*.')) {
        const pattern = domain.substring(2);
        if (origin.endsWith(pattern)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Clean up widget connection and resources
   */
  async cleanupConnection(connectionId: string): Promise<void> {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) {
      return;
    }

    this.logger.debug(`Cleaning up connection: ${connectionId}`);

    // Mark connection as inactive
    connection.isActive = false;

    // Clean up sandbox instance if exists
    const sandboxInstance = this.sandboxInstances.get(connectionId);
    if (sandboxInstance) {
      await this.cleanupSandbox(sandboxInstance);
      this.sandboxInstances.delete(connectionId);
    }

    // Remove from active connections
    this.activeConnections.delete(connectionId);

    // Emit cleanup event
    this.emitLifecycleEvent({
      type: 'cleanup',
      widgetId: connection.widgetId,
      sessionId: connection.sessionId,
      timestamp: new Date(),
      data: { connectionId },
    });

    this.logger.debug(`Connection cleaned up: ${connectionId}`);
  }

  /**
   * Get active connections for a widget
   */
  getActiveConnections(widgetId: string): WidgetConnection[] {
    return Array.from(this.activeConnections.values()).filter(
      (conn) => conn.widgetId === widgetId && conn.isActive
    );
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): WidgetConnection | undefined {
    return this.activeConnections.get(connectionId);
  }

  /**
   * Update connection metadata
   */
  updateConnectionMetadata(connectionId: string, metadata: Partial<Record<string, any>>): void {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      connection.metadata = { ...connection.metadata, ...metadata };
      connection.lastActivity = new Date();
    }
  }

  /**
   * Handle real-time communication between widget and parent
   */
  async sendMessageToParent(connectionId: string, message: any): Promise<void> {
    const connection = this.activeConnections.get(connectionId);
    if (!connection?.isActive) {
      throw new Error('Connection not found or inactive');
    }

    // Send message through WebSocket
    this.websocketService.broadcastToUser(connection.userId || '', 'widget:message', {
      connectionId,
      widgetId: connection.widgetId,
      message,
      timestamp: new Date(),
    });

    connection.lastActivity = new Date();
  }

  /**
   * Handle message from parent to widget
   */
  async handleParentMessage(connectionId: string, message: any): Promise<void> {
    const connection = this.activeConnections.get(connectionId);
    if (!connection?.isActive) {
      throw new Error('Connection not found or inactive');
    }

    // Process message based on type
    switch (message.type) {
      case 'config_update':
        await this.handleConfigUpdate(connection, message.data);
        break;
      case 'theme_change':
        await this.handleThemeChange(connection, message.data);
        break;
      case 'resize':
        await this.handleResize(connection, message.data);
        break;
      default:
        this.logger.warn(`Unknown message type: ${message.type}`);
    }

    connection.lastActivity = new Date();
  }

  // Private helper methods

  private async executeInSandbox(
    widget: Widget,
    input: WidgetExecutionInput,
    context: WidgetExecutionContext
  ): Promise<WidgetExecutionOutput> {
    // Create isolated sandbox environment
    const sandbox = await this.createSandbox(widget, context);

    try {
      // Set resource limits for sandbox
      const resourceLimits = {
        maxMemory: (widget.configuration.security as any).maxMemoryUsage || 128 * 1024 * 1024, // 128MB
        maxExecutionTime: (widget.configuration.security as any).maxExecutionTime || 30000, // 30 seconds
        maxCpuUsage: 80, // 80% CPU limit
      };

      // Execute widget logic in sandbox with monitoring
      const startTime = Date.now();
      const result = await Promise.race([
        sandbox.execute(input, resourceLimits),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Sandbox execution timeout')),
            resourceLimits.maxExecutionTime
          )
        ),
      ]);

      const executionTime = Date.now() - startTime;

      return {
        type: 'response',
        content: result,
        metadata: {
          executedInSandbox: true,
          sandboxId: sandbox.id,
          executionTime,
          resourceUsage: await sandbox.getResourceUsage(),
        },
      };
    } catch (error) {
      this.logger.error(`Sandbox execution failed for widget ${widget.id}:`, error);

      // Attempt recovery if possible
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('memory') || errorMessage.includes('timeout')) {
        throw new Error(`Resource limit exceeded: ${errorMessage}`);
      }

      throw error;
    } finally {
      // Clean up sandbox
      await this.cleanupSandbox(sandbox);
    }
  }

  private async executeDirectly(
    widget: Widget,
    input: WidgetExecutionInput,
    context: WidgetExecutionContext
  ): Promise<WidgetExecutionOutput> {
    // Execute widget directly based on type
    switch (widget.type) {
      case 'agent':
        return await this.executeAgent(widget.sourceId, input, context);
      case 'tool':
        return await this.executeTool(widget.sourceId, input, context);
      case 'workflow':
        return await this.executeWorkflow(widget.sourceId, input, context);
      default:
        throw new Error(`Unsupported widget type: ${widget.type}`);
    }
  }

  private async createSandbox(widget: Widget, context: WidgetExecutionContext): Promise<any> {
    // Create isolated execution environment
    const sandbox = {
      id: `sandbox_${widget.id}_${Date.now()}`,
      widgetId: widget.id,
      context,
      createdAt: new Date(),
      execute: async (input: WidgetExecutionInput) => {
        // Implement sandboxed execution logic
        return await this.executeDirectly(widget, input, context);
      },
    };

    return sandbox;
  }

  private async cleanupSandbox(sandbox: any): Promise<void> {
    // Clean up sandbox resources
    this.logger.debug(`Cleaning up sandbox: ${sandbox.id}`);
    // Implementation would clean up any resources, processes, etc.
  }

  private async executeAgent(
    agentId: string,
    input: WidgetExecutionInput,
    context: WidgetExecutionContext
  ): Promise<WidgetExecutionOutput> {
    // Queue agent execution
    const job = await this.runtimeQueue.add('execute-agent', {
      agentId,
      input,
      context,
    });

    // Wait for result (this would be implemented with proper job handling)
    return {
      type: 'response',
      content: 'Agent execution result',
      metadata: { jobId: job.id },
    };
  }

  private async executeTool(
    toolId: string,
    input: WidgetExecutionInput,
    context: WidgetExecutionContext
  ): Promise<WidgetExecutionOutput> {
    // Queue tool execution
    const job = await this.runtimeQueue.add('execute-tool', {
      toolId,
      input,
      context,
    });

    return {
      type: 'response',
      content: 'Tool execution result',
      metadata: { jobId: job.id },
    };
  }

  private async executeWorkflow(
    workflowId: string,
    input: WidgetExecutionInput,
    context: WidgetExecutionContext
  ): Promise<WidgetExecutionOutput> {
    // Queue workflow execution
    const job = await this.runtimeQueue.add('execute-workflow', {
      workflowId,
      input,
      context,
    });

    return {
      type: 'response',
      content: 'Workflow execution result',
      metadata: { jobId: job.id },
    };
  }

  private async setupRealTimeCommunication(connection: WidgetConnection): Promise<void> {
    // Set up WebSocket communication channel
    this.websocketService.broadcastToRoom(
      `widget_${connection.widgetId}`,
      'widget:connection:established',
      {
        connectionId: connection.id,
        widgetId: connection.widgetId,
        sessionId: connection.sessionId,
      }
    );
  }

  private async handleExecutionTimeout(executionId: string): Promise<void> {
    const execution = await this.widgetExecutionRepository.findOne({
      where: { id: executionId },
    });

    if (execution && execution.status === 'pending') {
      execution.markAsTimeout();
      await this.widgetExecutionRepository.save(execution);

      this.emitLifecycleEvent({
        type: 'timeout',
        widgetId: execution.widgetId,
        sessionId: execution.sessionId,
        timestamp: new Date(),
        data: { executionId },
      });
    }
  }

  private async handleConfigUpdate(connection: WidgetConnection, configData: any): Promise<void> {
    // Handle configuration updates from parent
    this.logger.debug(`Handling config update for connection: ${connection.id}`);
    // Implementation would update widget configuration
  }

  private async handleThemeChange(connection: WidgetConnection, themeData: any): Promise<void> {
    // Handle theme changes from parent
    this.logger.debug(`Handling theme change for connection: ${connection.id}`);
    // Implementation would update widget theme
  }

  private async handleResize(connection: WidgetConnection, resizeData: any): Promise<void> {
    // Handle resize events from parent
    this.logger.debug(`Handling resize for connection: ${connection.id}`);
    // Implementation would handle widget resizing
  }

  private cleanupInactiveConnections(): void {
    const now = new Date();
    const timeout = 30 * 60 * 1000; // 30 minutes

    for (const [connectionId, connection] of this.activeConnections.entries()) {
      if (now.getTime() - connection.lastActivity.getTime() > timeout) {
        this.cleanupConnection(connectionId);
      }
    }
  }

  private async cleanupExpiredSessions(): Promise<void> {
    // Clean up expired sessions and their associated resources
    const expiredSessions = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.expiresAt < :now', { now: new Date() })
      .getMany();

    for (const session of expiredSessions) {
      const connections = Array.from(this.activeConnections.values()).filter(
        (conn) => conn.sessionId === session.id
      );

      for (const connection of connections) {
        await this.cleanupConnection(connection.id);
      }
    }
  }

  private emitLifecycleEvent(event: WidgetLifecycleEvent): void {
    this.websocketService.broadcastToRoom(`widget_${event.widgetId}`, 'widget:lifecycle', event);
    this.logger.debug(`Lifecycle event emitted: ${event.type} for widget ${event.widgetId}`);
  }
}
