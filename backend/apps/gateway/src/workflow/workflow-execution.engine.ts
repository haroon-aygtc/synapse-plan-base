import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { Workflow, WorkflowExecution } from '@database/entities';
import { AgentService } from '../agent/agent.service';
import { ToolService } from '../tool/tool.service';
import { SessionService } from '../session/session.service';
import { WebSocketService } from '../websocket/websocket.service';
import { HITLService } from '../hitl/hitl.service';
import { ExecuteWorkflowDto } from './dto';
import { ExecutionStatus, HITLRequestType, HITLRequestPriority } from '@shared/enums';
import { v4 as uuidv4 } from 'uuid';

export interface WorkflowStep {
  id: string;
  type: 'agent' | 'tool' | 'condition' | 'loop' | 'hitl' | 'start' | 'end';
  data: Record<string, any>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  label?: string;
}

export interface WorkflowExecutionContext {
  executionId: string;
  workflowId: string;
  sessionId: string;
  userId: string;
  organizationId: string;
  variables: Record<string, any>;
  stepResults: Record<string, any>;
  currentStep: string;
  completedSteps: string[];
  failedSteps: string[];
  pausedAt?: Date;
  resumedAt?: Date;
  retryCount: number;
  lastCheckpoint?: Date;
  hitlRequests: Array<{
    requestId: string;
    stepId: string;
    requestType: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    requestedAt: Date;
    resolvedAt?: Date;
    resolvedBy?: string;
    resolution?: any;
  }>;
  agentExecutions: Array<{
    stepId: string;
    agentId: string;
    executionId: string;
    executionTime: number;
    tokensUsed: number;
    cost: number;
    status: string;
  }>;
  toolExecutions: Array<{
    stepId: string;
    toolId: string;
    executionId: string;
    executionTime: number;
    cost: number;
    status: string;
  }>;
}

export interface WorkflowExecutionResult {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  currentStep?: string;
  completedSteps: string[];
  variables: Record<string, any>;
  executionTimeMs: number;
  cost: number;
  error?: string;
  performanceMetrics: {
    stepExecutionTimes: Record<string, number>;
    bottlenecks: Array<{
      stepId: string;
      executionTime: number;
      reason: string;
    }>;
    totalAgentCalls: number;
    totalToolCalls: number;
    totalHitlRequests: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  analyticsData: {
    executionPath: string[];
    decisionPoints: Array<{
      stepId: string;
      condition: string;
      result: boolean;
      evaluationTime: number;
    }>;
    parallelExecutions: Array<{
      stepIds: string[];
      startTime: Date;
      endTime: Date;
      efficiency: number;
    }>;
    optimizationSuggestions: Array<{
      type: 'performance' | 'cost' | 'reliability';
      suggestion: string;
      impact: 'low' | 'medium' | 'high';
      estimatedImprovement: string;
    }>;
  };
}

@Injectable()
export class WorkflowExecutionEngine {
  private readonly logger = new Logger(WorkflowExecutionEngine.name);
  private readonly activeExecutions = new Map<string, WorkflowExecutionContext>();
  private readonly pausedExecutions = new Map<string, WorkflowExecutionContext>();

  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowExecution)
    private readonly workflowExecutionRepository: Repository<WorkflowExecution>,
    private readonly agentService: AgentService,
    private readonly toolService: ToolService,
    private readonly sessionService: SessionService,
    private readonly websocketService: WebSocketService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly hitlService: HITLService
  ) {}

  async execute(
    workflowId: string,
    executeDto: ExecuteWorkflowDto,
    userId?: string,
    organizationId?: string
  ): Promise<any> {
    return this.executeWorkflow(workflowId, executeDto, userId, organizationId);
  }

  async executeWorkflow(
    workflowId: string,
    executeDto: ExecuteWorkflowDto,
    userId?: string,
    organizationId?: string
  ): Promise<any> {
    const workflow = await this.workflowRepository.findOne({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${workflowId} not found`);
    }

    if (!workflow.isActive) {
      throw new BadRequestException('Workflow is not active');
    }

    const executionId = executeDto.executionId || uuidv4();
    const sessionId = uuidv4();
    const startTime = Date.now();

    // Create execution context
    const context: WorkflowExecutionContext = {
      executionId,
      workflowId,
      sessionId,
      userId: userId || workflow.userId,
      organizationId: organizationId || workflow.organizationId,
      variables: { ...workflow.definition.variables, ...executeDto.variables },
      stepResults: {},
      currentStep: '',
      completedSteps: [],
      failedSteps: [],
      retryCount: 0,
      hitlRequests: [],
      agentExecutions: [],
      toolExecutions: [],
    };

    // Create execution record
    const execution = this.workflowExecutionRepository.create({
      id: executionId,
      workflowId,
      sessionId,
      userId: context.userId,
      input: executeDto.input,
      status: ExecutionStatus.RUNNING,
      context: executeDto.input,
      stepResults: {},
      metadata: {
        timeout: executeDto.timeout || workflow.definition.settings?.timeout || 300000,
        retryAttempts: executeDto.retryAttempts || workflow.definition.settings?.retryAttempts || 3,
        notifyOnCompletion: executeDto.notifyOnCompletion || false,
      },
      organizationId: context.organizationId,
      startedAt: new Date(),
      workflowState: {
        variables: context.variables,
        completedSteps: [],
        failedSteps: [],
        retryCount: 0,
        lastCheckpoint: new Date(),
      },
      performanceMetrics: {
        stepExecutionTimes: {},
        bottlenecks: [],
        totalAgentCalls: 0,
        totalToolCalls: 0,
        totalHitlRequests: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
      integrationMetrics: {
        agentExecutions: [],
        toolExecutions: [],
      },
      analyticsData: {
        executionPath: [],
        decisionPoints: [],
        parallelExecutions: [],
        optimizationSuggestions: [],
      },
    });

    await this.workflowExecutionRepository.save(execution);
    this.activeExecutions.set(executionId, context);

    // Emit execution started event
    this.eventEmitter.emit('workflow.execution.started', {
      executionId,
      workflowId,
      userId: context.userId,
      organizationId: context.organizationId,
      timestamp: new Date(),
    });

    // Send real-time update
    await this.websocketService.sendWorkflowExecutionUpdate(context.organizationId, {
      executionId,
      workflowId,
      status: ExecutionStatus.RUNNING,
      currentStep: context.currentStep,
      progress: 0,
    });

    try {
      // Find start node
      const startNode = workflow.definition.nodes.find(
        (node: WorkflowStep) => node.type === 'start'
      );

      if (!startNode) {
        throw new Error('Workflow must have a start node');
      }

      // Execute workflow
      const result = await this.executeWorkflowSteps(workflow, context, startNode.id);

      const executionTime = Date.now() - startTime;

      // Update execution record
      execution.status = ExecutionStatus.COMPLETED;
      execution.output = result.output;
      execution.executionTimeMs = executionTime;
      execution.cost = result.cost;
      execution.completedAt = new Date();
      execution.workflowState = {
        variables: context.variables,
        completedSteps: context.completedSteps,
        failedSteps: context.failedSteps,
        retryCount: context.retryCount,
        lastCheckpoint: new Date(),
      };
      execution.performanceMetrics = result.performanceMetrics;
      execution.integrationMetrics = {
        agentExecutions: context.agentExecutions,
        toolExecutions: context.toolExecutions,
      };
      execution.analyticsData = result.analyticsData;

      await this.workflowExecutionRepository.save(execution);
      this.activeExecutions.delete(executionId);

      // Emit execution completed event
      this.eventEmitter.emit('workflow.execution.completed', {
        executionId,
        workflowId,
        userId: context.userId,
        organizationId: context.organizationId,
        executionTime,
        result,
        timestamp: new Date(),
      });

      // Send real-time update
      await this.websocketService.sendWorkflowExecutionUpdate(context.organizationId, {
        executionId,
        workflowId,
        status: ExecutionStatus.COMPLETED,
        output: result.output,
        executionTime,
        progress: 100,
      });

      // Send notification if requested
      if (executeDto.notifyOnCompletion) {
        await this.sendCompletionNotification(context, result);
      }

      this.logger.log(`Workflow execution completed: ${executionId} in ${executionTime}ms`);

      return {
        id: executionId,
        workflowId,
        status: ExecutionStatus.COMPLETED,
        input: executeDto.input,
        output: result.output,
        currentStep: undefined,
        completedSteps: context.completedSteps,
        variables: context.variables,
        executionTimeMs: executionTime,
        cost: result.cost,
        performanceMetrics: result.performanceMetrics,
        analyticsData: result.analyticsData,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      // Update execution record with error
      execution.status = ExecutionStatus.FAILED;
      execution.error = error.message || 'Unknown error';
      execution.executionTimeMs = executionTime;
      execution.completedAt = new Date();
      execution.errorDetails = {
        stepId: context.currentStep,
        errorType: error.constructor?.name || 'Error',
        errorCode: 'WORKFLOW_EXECUTION_FAILED',
        stackTrace: error.stack || '',
        recoveryAttempts: context.retryCount,
        lastRecoveryAt: new Date(),
        isRecoverable: this.isRecoverableError(
          error instanceof Error ? error : new Error(error.message || 'Unknown error')
        ),
      };

      await this.workflowExecutionRepository.save(execution);

      // Emit execution failed event
      this.eventEmitter.emit('workflow.execution.failed', {
        workflowId,
        executionId,
        userId: context.userId,
        organizationId: context.organizationId,
        error: error.message || 'Unknown error',
        executionTime,
        timestamp: new Date(),
      });

      // Notify via WebSocket
      await this.websocketService.broadcastToOrganization(
        context.organizationId,
        'workflow:execution:failed',
        {
          workflowId,
          status: ExecutionStatus.FAILED,
          error: error.message || 'Unknown error',
          progress: (context.completedSteps.length / workflow.definition.nodes.length) * 100,
          executionId,
          timestamp: new Date(),
        }
      );

      this.logger.error(
        `Workflow execution failed: ${executionId} - ${error.message || 'Unknown error'}`,
        error.stack || ''
      );

      throw error;
    }
  }

  async pause(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }

    // Move to paused executions
    this.pausedExecutions.set(executionId, {
      ...context,
      pausedAt: new Date(),
    });
    this.activeExecutions.delete(executionId);

    // Update execution record
    await this.workflowExecutionRepository.update(
      { id: executionId },
      {
        status: ExecutionStatus.PAUSED,
        workflowState: {
          variables: context.variables,
          completedSteps: context.completedSteps,
          failedSteps: context.failedSteps,
          retryCount: context.retryCount,
          pausedAt: new Date(),
          lastCheckpoint: new Date(),
        },
      }
    );

    // Emit paused event
    this.eventEmitter.emit('workflow.execution.paused', {
      executionId,
      workflowId: context.workflowId,
      userId: context.userId,
      organizationId: context.organizationId,
      timestamp: new Date(),
    });

    // Send real-time update
    await this.websocketService.sendWorkflowExecutionUpdate(context.organizationId, {
      executionId,
      workflowId: context.workflowId,
      status: ExecutionStatus.PAUSED,
      currentStep: context.currentStep,
    });

    this.logger.log(`Workflow execution paused: ${executionId}`);
  }

  async resume(executionId: string): Promise<void> {
    const context = this.pausedExecutions.get(executionId);
    if (!context) {
      throw new NotFoundException(`Paused execution ${executionId} not found`);
    }

    // Move back to active executions
    this.activeExecutions.set(executionId, {
      ...context,
      resumedAt: new Date(),
      pausedAt: undefined,
    });
    this.pausedExecutions.delete(executionId);

    // Update execution record
    await this.workflowExecutionRepository.update(
      { id: executionId },
      {
        status: ExecutionStatus.RUNNING,
        workflowState: {
          variables: context.variables,
          completedSteps: context.completedSteps,
          failedSteps: context.failedSteps,
          retryCount: context.retryCount,
          resumedAt: new Date(),
          lastCheckpoint: new Date(),
        },
      }
    );

    // Emit resumed event
    this.eventEmitter.emit('workflow.execution.resumed', {
      executionId,
      workflowId: context.workflowId,
      userId: context.userId,
      organizationId: context.organizationId,
      timestamp: new Date(),
    });

    // Send real-time update
    await this.websocketService.sendWorkflowExecutionUpdate(context.organizationId, {
      executionId,
      workflowId: context.workflowId,
      status: ExecutionStatus.RUNNING,
      currentStep: context.currentStep,
    });

    this.logger.log(`Workflow execution resumed: ${executionId}`);
  }

  async cancel(executionId: string): Promise<void> {
    const context =
      this.activeExecutions.get(executionId) || this.pausedExecutions.get(executionId);

    if (!context) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }

    // Remove from active/paused executions
    this.activeExecutions.delete(executionId);
    this.pausedExecutions.delete(executionId);

    // Update execution record
    await this.workflowExecutionRepository.update(
      { id: executionId },
      {
        status: ExecutionStatus.CANCELLED,
        completedAt: new Date(),
        workflowState: {
          variables: context.variables,
          completedSteps: context.completedSteps,
          failedSteps: context.failedSteps,
          retryCount: context.retryCount,
          lastCheckpoint: new Date(),
        },
      }
    );

    // Emit cancelled event
    this.eventEmitter.emit('workflow.execution.cancelled', {
      executionId,
      workflowId: context.workflowId,
      userId: context.userId,
      organizationId: context.organizationId,
      timestamp: new Date(),
    });

    // Send real-time update
    await this.websocketService.sendWorkflowExecutionUpdate(context.organizationId, {
      executionId,
      workflowId: context.workflowId,
      status: ExecutionStatus.CANCELLED,
    });

    this.logger.log(`Workflow execution cancelled: ${executionId}`);
  }

  private async executeWorkflowSteps(
    workflow: Workflow,
    context: WorkflowExecutionContext,
    currentStepId: string
  ): Promise<any> {
    const nodes = workflow.definition.nodes as WorkflowStep[];
    const edges = workflow.definition.edges as WorkflowEdge[];
    let totalCost = 0;
    const stepExecutionTimes: Record<string, number> = {};
    const bottlenecks: Array<{
      stepId: string;
      executionTime: number;
      reason: string;
    }> = [];
    const executionPath: string[] = [];
    const decisionPoints: Array<{
      stepId: string;
      condition: string;
      result: boolean;
      evaluationTime: number;
    }> = [];
    let isCompleted = false;

    while (currentStepId && !isCompleted) {
      const currentNode = nodes.find((node) => node.id === currentStepId);
      if (!currentNode) {
        throw new Error(`Step ${currentStepId} not found in workflow`);
      }

      context.currentStep = currentStepId;
      executionPath.push(currentStepId);

      const stepStartTime = Date.now();

      // Update session context
      await this.sessionService.updateSession(context.sessionId, {
        context: {
          workflowId: context.workflowId,
          currentStep: currentStepId,
          variables: context.variables,
          completedSteps: context.completedSteps,
        },
        workflowId: context.workflowId,
      });

      try {
        // Execute step based on type
        const stepResult = await this.executeStep(currentNode, context, workflow);

        const stepExecutionTime = Date.now() - stepStartTime;
        stepExecutionTimes[currentStepId] = stepExecutionTime;

        // Check for bottlenecks (steps taking longer than 30 seconds)
        if (stepExecutionTime > 30000) {
          bottlenecks.push({
            stepId: currentStepId,
            executionTime: stepExecutionTime,
            reason: 'Long execution time detected',
          });
        }

        // Store step result
        context.stepResults[currentStepId] = stepResult;
        context.completedSteps.push(currentStepId);
        totalCost += stepResult.cost || 0;

        // Handle different step types
        if (currentNode.type === 'end') {
          // Workflow completed
          isCompleted = true;
          return {
            output: stepResult.output || context.variables,
            cost: totalCost,
            performanceMetrics: {
              stepExecutionTimes,
              bottlenecks,
              totalAgentCalls: context.agentExecutions.length,
              totalToolCalls: context.toolExecutions.length,
              totalHitlRequests: context.hitlRequests.length,
              memoryUsage: this.calculateMemoryUsage(context),
              cpuUsage: this.calculateCpuUsage(stepExecutionTimes),
            },
            analyticsData: {
              executionPath,
              decisionPoints,
              parallelExecutions: [],
              optimizationSuggestions: this.generateOptimizationSuggestions(bottlenecks, context),
            },
          };
        }

        // Find next step
        const nextStep = await this.findNextStep(currentNode, edges, context, decisionPoints);
        currentStepId = nextStep || '';

        // Send progress update
        const progress = (context.completedSteps.length / nodes.length) * 100;
        await this.websocketService.sendWorkflowExecutionUpdate(context.organizationId, {
          executionId: context.executionId,
          workflowId: context.workflowId,
          status: ExecutionStatus.RUNNING,
          currentStep: currentStepId,
          progress,
          stepResult,
        });
      } catch (error: any) {
        context.failedSteps.push(currentStepId);

        // Handle error based on step's error handling configuration
        const errorHandling = currentNode.data?.errorHandling || 'fail';
        const maxRetries = currentNode.data?.maxRetries || 3;
        if (errorHandling === 'retry' && context.retryCount < maxRetries) {
          context.retryCount++;
          this.logger.warn(
            `Retrying step ${currentStepId} (attempt ${context.retryCount}): ${error.message || 'Unknown error'}`
          );
          continue; // Retry the same step
        } else if (errorHandling === 'continue') {
          this.logger.warn(
            `Continuing after error in step ${currentStepId}: ${error.message || 'Unknown error'}`
          );
          // Find next step and continue
          const nextStep = await this.findNextStep(currentNode, edges, context, decisionPoints);
          const nextStepId = nextStep || '';

          if (nextStepId) {
            currentStepId = nextStepId;
            continue;
          } else {
            // No error path defined, treat as failure
            throw error;
          }
        } else {
          // Fail the workflow
          throw error;
        }
      }
    }

    throw new Error('Workflow execution ended without reaching an end node');
  }

  private async executeStep(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    workflow: Workflow
  ): Promise<any> {
    const stepStartTime = Date.now();

    switch (step.type) {
      case 'start':
        return {
          output: context.variables,
          cost: 0,
          executionTime: Date.now() - stepStartTime,
        };

      case 'agent':
        return await this.executeAgentStep(step, context);

      case 'tool':
        return await this.executeToolStep(step, context);

      case 'condition':
        return await this.executeConditionStep(step, context);

      case 'loop':
        return await this.executeLoopStep(step, context, workflow);

      case 'hitl':
        return await this.executeHitlStep(step, context);

      case 'end':
        return {
          output: context.variables,
          cost: 0,
          executionTime: Date.now() - stepStartTime,
        };

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeAgentStep(
    step: WorkflowStep,
    context: WorkflowExecutionContext
  ): Promise<any> {
    const agentId = step.data.agentId;
    if (!agentId) {
      throw new Error(`Agent ID not specified for step ${step.id}`);
    }

    // Prepare agent input from workflow variables and step configuration
    const agentInput = this.mapParametersToAgent(
      step.data.inputMapping || {},
      context.variables,
      context.stepResults
    );

    const startTime = Date.now();

    try {
      // Execute agent
      const agentResult = await this.agentService.execute(
        agentId,
        {
          input: typeof agentInput === 'string' ? agentInput : JSON.stringify(agentInput),
          sessionId: context.sessionId,
          context: {
            workflowId: context.workflowId,
            stepId: step.id,
            variables: context.variables,
          },
          metadata: {
            workflowExecution: true,
            executionId: context.executionId,
            stepId: step.id,
          },
        },
        context.userId,
        context.organizationId
      );

      const executionTime = Date.now() - startTime;

      // Store agent execution metrics
      context.agentExecutions.push({
        stepId: step.id,
        agentId,
        executionId: agentResult.id,
        executionTime,
        tokensUsed: agentResult.tokensUsed || 0,
        cost: agentResult.cost || 0,
        status: agentResult.status,
      });

      // Map agent output to workflow variables
      const outputMapping = step.data.outputMapping || {};
      this.mapAgentOutputToVariables(agentResult.output, outputMapping, context.variables);

      return {
        output: agentResult.output,
        cost: agentResult.cost || 0,
        executionTime,
        metadata: {
          agentId,
          tokensUsed: agentResult.tokensUsed,
          toolCalls: agentResult.toolCalls,
          knowledgeSearches: agentResult.knowledgeSearches,
        },
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      // Store failed agent execution
      context.agentExecutions.push({
        stepId: step.id,
        agentId,
        executionId: uuidv4(),
        executionTime,
        tokensUsed: 0,
        cost: 0,
        status: ExecutionStatus.FAILED,
      });

      throw new Error(
        `Agent execution failed in step ${step.id}: ${error.message || 'Unknown error'}`
      );
    }
  }

  private async executeToolStep(
    step: WorkflowStep,
    context: WorkflowExecutionContext
  ): Promise<any> {
    const toolId = step.data.toolId;
    if (!toolId) {
      throw new Error(`Tool ID not specified for step ${step.id}`);
    }

    // Prepare tool parameters from workflow variables and step configuration
    const toolParameters = this.mapParametersToTool(
      step.data.parameterMapping || {},
      context.variables,
      context.stepResults
    );

    const startTime = Date.now();

    try {
      // Execute tool
      const toolResult = await this.toolService.execute(
        toolId,
        {
          functionName: step.data.functionName || 'execute',
          parameters: toolParameters,
          callerType: 'workflow',
          callerId: context.executionId,
          timeout: step.data.timeout || 30000,
        },
        context.userId,
        context.organizationId,
        context.sessionId
      );

      const executionTime = Date.now() - startTime;

      // Store tool execution metrics
      context.toolExecutions.push({
        stepId: step.id,
        toolId,
        executionId: toolResult.id,
        executionTime,
        cost: toolResult.cost || 0,
        status: toolResult.status,
      });

      // Map tool output to workflow variables
      const outputMapping = step.data.outputMapping || {};
      this.mapToolOutputToVariables(toolResult.result, outputMapping, context.variables);

      return {
        output: toolResult.result,
        cost: toolResult.cost || 0,
        executionTime,
        metadata: {
          toolId,
          functionName: step.data.functionName,
          parameters: toolParameters,
        },
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      // Store failed tool execution
      context.toolExecutions.push({
        stepId: step.id,
        toolId,
        executionId: uuidv4(),
        executionTime,
        cost: 0,
        status: ExecutionStatus.FAILED,
      });

      throw new Error(
        `Tool execution failed in step ${step.id}: ${error.message || 'Unknown error'}`
      );
    }
  }

  private async executeConditionStep(
    step: WorkflowStep,
    context: WorkflowExecutionContext
  ): Promise<any> {
    const startTime = Date.now();
    const condition = step.data.condition;

    if (!condition) {
      throw new Error(`Condition not specified for step ${step.id}`);
    }

    // Evaluate condition
    const result = this.evaluateCondition(condition, context.variables, context.stepResults);
    const executionTime = Date.now() - startTime;

    // Store condition result in variables
    context.variables[`${step.id}_result`] = result;

    return {
      output: { conditionResult: result },
      cost: 0,
      executionTime,
      metadata: {
        condition,
        result,
      },
    };
  }

  private async executeLoopStep(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    workflow: Workflow
  ): Promise<any> {
    const startTime = Date.now();
    const loopConfig = step.data.loop;

    if (!loopConfig) {
      throw new Error(`Loop configuration not specified for step ${step.id}`);
    }

    const results: any[] = [];
    let totalCost = 0;
    let iterations = 0;
    const maxIterations = loopConfig.maxIterations || 100;

    // Handle different loop types
    if (loopConfig.type === 'forEach') {
      const items = this.getVariableValue(loopConfig.items, context.variables);
      if (!Array.isArray(items)) {
        throw new Error(`Loop items must be an array for step ${step.id}`);
      }

      for (const item of items) {
        if (iterations >= maxIterations) break;

        // Set loop variables
        context.variables[loopConfig.itemVariable || 'item'] = item;
        context.variables[loopConfig.indexVariable || 'index'] = iterations;

        // Execute loop body
        const loopResult = await this.executeWorkflowSteps(
          workflow,
          context,
          loopConfig.bodyStepId
        );

        results.push(loopResult.output);
        totalCost += loopResult.cost;
        iterations++;
      }
    } else if (loopConfig.type === 'while') {
      while (iterations < maxIterations) {
        // Evaluate condition
        const shouldContinue = this.evaluateCondition(
          loopConfig.condition,
          context.variables,
          context.stepResults
        );

        if (!shouldContinue) break;

        // Set loop variables
        context.variables[loopConfig.indexVariable || 'index'] = iterations;

        // Execute loop body
        const loopResult = await this.executeWorkflowSteps(
          workflow,
          context,
          loopConfig.bodyStepId
        );

        results.push(loopResult.output);
        totalCost += loopResult.cost;
        iterations++;
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      output: { loopResults: results, iterations },
      cost: totalCost,
      executionTime,
      metadata: {
        loopType: loopConfig.type,
        iterations,
        maxIterations,
      },
    };
  }

  private async executeHitlStep(
    step: WorkflowStep,
    context: WorkflowExecutionContext
  ): Promise<any> {
    const startTime = Date.now();
    const hitlConfig = step.data.hitl;

    if (!hitlConfig) {
      throw new Error(`HITL configuration not specified for step ${step.id}`);
    }

    // Create actual HITL request using the HITL service
    const hitlRequest = await this.hitlService.createRequest(
      {
        title: hitlConfig.title || `Workflow Step Approval Required`,
        description:
          hitlConfig.description || `Please review and approve workflow step: ${step.id}`,
        type: hitlConfig.type || HITLRequestType.APPROVAL,
        priority: hitlConfig.priority || HITLRequestPriority.MEDIUM,
        sourceType: 'workflow',
        sourceId: context.workflowId,
        executionId: context.executionId,
        executionContext: {
          stepId: step.id,
          variables: context.variables,
          stepResults: context.stepResults,
          currentStep: step.id,
        },
        assigneeId: hitlConfig.assigneeId,
        assigneeRoles: hitlConfig.assigneeRoles,
        assigneeUsers: hitlConfig.assigneeUsers,
        timeoutMs: hitlConfig.timeout || 86400000,
        allowDiscussion: hitlConfig.allowDiscussion || false,
        requireExpertConsultation: hitlConfig.requireExpertConsultation || false,
        expertConsultants: hitlConfig.expertConsultants,
        escalationRules: hitlConfig.escalationRules,
      },
      'system', // System user for workflow-generated requests
      context.organizationId
    );

    // Update context with HITL request info
    context.hitlRequests.push({
      requestId: hitlRequest.id,
      stepId: step.id,
      requestType: hitlConfig.type || 'approval',
      status: 'pending',
      requestedAt: new Date(),
    });

    // Pause workflow execution and wait for approval
    await this.pause(context.executionId);

    // Set up event listener for HITL resolution
    const approvalPromise = this.waitForHITLApproval(
      hitlRequest.id,
      hitlConfig.timeout || 86400000
    );

    try {
      const approval = await approvalPromise;

      // Update HITL request status in context
      const hitlRequestIndex = context.hitlRequests.findIndex(
        (r) => r.requestId === hitlRequest.id
      );
      if (hitlRequestIndex !== -1) {
        context.hitlRequests[hitlRequestIndex].status = approval.approved ? 'approved' : 'rejected';
        context.hitlRequests[hitlRequestIndex].resolvedAt = new Date();
        context.hitlRequests[hitlRequestIndex].resolvedBy = approval.resolvedBy;
        context.hitlRequests[hitlRequestIndex].resolution = approval;
      }

      // Resume workflow execution
      await this.resume(context.executionId);

      const executionTime = Date.now() - startTime;

      if (!approval.approved) {
        throw new Error(`HITL request rejected: ${approval.reason || 'No reason provided'}`);
      }

      return {
        output: {
          hitlRequestId: hitlRequest.id,
          status: 'approved',
          requestType: hitlConfig.type,
          approvalData: approval,
        },
        cost: 0,
        executionTime,
        metadata: {
          requestId: hitlRequest.id,
          requestType: hitlConfig.type,
          stepId: step.id,
          approved: true,
          resolvedBy: approval.resolvedBy,
          approvalTime: executionTime,
        },
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      // Update HITL request status in context
      const hitlRequestIndex = context.hitlRequests.findIndex(
        (r) => r.requestId === hitlRequest.id
      );
      if (hitlRequestIndex !== -1) {
        context.hitlRequests[hitlRequestIndex].status = 'expired';
        context.hitlRequests[hitlRequestIndex].resolvedAt = new Date();
      }

      return {
        output: {
          hitlRequestId: hitlRequest.id,
          status: ExecutionStatus.FAILED,
          requestType: hitlConfig.type,
          error: error.message || 'Unknown error',
        },
        cost: 0,
        executionTime,
        metadata: {
          requestId: hitlRequest.id,
          requestType: hitlConfig.type,
          stepId: step.id,
          approved: false,
          error: error.message || 'Unknown error',
        },
      };
    }
  }

  private async findNextStep(
    currentNode: WorkflowStep,
    edges: WorkflowEdge[],
    context: WorkflowExecutionContext,
    decisionPoints: Array<{
      stepId: string;
      condition: string;
      result: boolean;
      evaluationTime: number;
    }>
  ): Promise<string | null> {
    const outgoingEdges = edges.filter((edge) => edge.source === currentNode.id);

    if (outgoingEdges.length === 0) {
      return null; // No next step
    }

    if (outgoingEdges.length === 1) {
      return outgoingEdges[0].target;
    }

    // Multiple edges - evaluate conditions
    for (const edge of outgoingEdges) {
      if (!edge.condition) {
        // Default edge (no condition)
        return edge.target;
      }

      const evaluationStartTime = Date.now();
      const conditionResult = this.evaluateCondition(
        edge.condition,
        context.variables,
        context.stepResults
      );
      const evaluationTime = Date.now() - evaluationStartTime;

      decisionPoints.push({
        stepId: currentNode.id,
        condition: edge.condition,
        result: conditionResult,
        evaluationTime,
      });

      if (conditionResult) {
        return edge.target;
      }
    }

    throw new Error(`No valid path found from step ${currentNode.id}`);
  }

  private async createHITLRequest(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    hitlConfig: any
  ): Promise<any> {
    try {
      const startTime = Date.now();
      const hitlRequest = await this.hitlService.createRequest(
        {
          title: hitlConfig.title || `Workflow Step Approval Required`,
          description:
            hitlConfig.description || `Please review and approve workflow step: ${step.id}`,
          type: hitlConfig.type || HITLRequestType.APPROVAL,
          priority: hitlConfig.priority || HITLRequestPriority.MEDIUM,
          sourceType: 'workflow',
          sourceId: context.workflowId,
          executionId: context.executionId,
          executionContext: {
            stepId: step.id,
            variables: context.variables,
            stepResults: context.stepResults,
            currentStep: step.id,
          },
          assigneeId: hitlConfig.assigneeId,
          assigneeRoles: hitlConfig.assigneeRoles,
          assigneeUsers: hitlConfig.assigneeUsers,
          timeoutMs: hitlConfig.timeout || 86400000,
          allowDiscussion: hitlConfig.allowDiscussion || false,
          requireExpertConsultation: hitlConfig.requireExpertConsultation || false,
          expertConsultants: hitlConfig.expertConsultants,
          escalationRules: hitlConfig.escalationRules,
        },
        'system', // System user for workflow-generated requests
        context.organizationId
      );

      // Update context with HITL request info
      context.hitlRequests.push({
        requestId: hitlRequest.id,
        stepId: step.id,
        requestType: hitlConfig.type || 'approval',
        status: 'pending',
        requestedAt: new Date(),
      });

      // Pause workflow execution and wait for approval
      await this.pause(context.executionId);

      // Set up event listener for HITL resolution
      const approvalPromise = this.waitForHITLApproval(
        hitlRequest.id,
        hitlConfig.timeout || 86400000
      );

      try {
        const approval = await approvalPromise;

        // Update HITL request status in context
        const hitlRequestIndex = context.hitlRequests.findIndex(
          (r) => r.requestId === hitlRequest.id
        );
        if (hitlRequestIndex !== -1) {
          context.hitlRequests[hitlRequestIndex].status = approval.approved
            ? 'approved'
            : 'rejected';
          context.hitlRequests[hitlRequestIndex].resolvedAt = new Date();
          context.hitlRequests[hitlRequestIndex].resolvedBy = approval.resolvedBy;
          context.hitlRequests[hitlRequestIndex].resolution = approval;
        }

        // Resume workflow execution
        await this.resume(context.executionId);

        const executionTime = Date.now() - startTime;

        if (!approval.approved) {
          throw new Error(`HITL request rejected: ${approval.reason || 'No reason provided'}`);
        }

        return {
          output: {
            hitlRequestId: hitlRequest.id,
            status: 'approved',
            requestType: hitlConfig.type,
            approvalData: approval,
          },
          cost: 0,
          executionTime,
          metadata: {
            requestId: hitlRequest.id,
            requestType: hitlConfig.type,
            stepId: step.id,
            approved: true,
            resolvedBy: approval.resolvedBy,
            approvalTime: executionTime,
          },
        };
      } catch (error: any) {
        const executionTime = Date.now() - startTime;

        // Update HITL request status in context
        const hitlRequestIndex = context.hitlRequests.findIndex(
          (r) => r.requestId === hitlRequest.id
        );
        if (hitlRequestIndex !== -1) {
          context.hitlRequests[hitlRequestIndex].status = 'expired';
          context.hitlRequests[hitlRequestIndex].resolvedAt = new Date();
        }

        return {
          output: {
            hitlRequestId: hitlRequest.id,
            status: ExecutionStatus.FAILED,
            requestType: hitlConfig.type,
            error: error.message || 'Unknown error',
          },
          cost: 0,
          executionTime,
          metadata: {
            requestId: hitlRequest.id,
            requestType: hitlConfig.type,
            stepId: step.id,
            approved: false,
            error: error.message || 'Unknown error',
          },
        };
      }
    } catch (error: any) {
      return {
        status: ExecutionStatus.FAILED,
        requestId: null,
        requestData: {
          status: ExecutionStatus.FAILED,
          requestType: hitlConfig.type,
          error: error.message || 'Unknown error',
        },
        cost: 0,
        executionTime: 0,
        metadata: {
          stepId: step.id,
          approved: false,
          error: error.message || 'Unknown error',
        },
      };
    }
  }

  private evaluateCondition(
    condition: string,
    variables: Record<string, any>,
    stepResults: Record<string, any>
  ): boolean {
    try {
      // Simple condition evaluation - in production, use a proper expression evaluator
      // This is a basic implementation for common conditions

      // Replace variable references
      let evaluatedCondition = condition;

      // Replace ${variable} with actual values
      evaluatedCondition = evaluatedCondition.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        const value = this.getVariableValue(varName, variables);
        return typeof value === 'string' ? `"${value}"` : String(value);
      });

      // Replace step result references
      evaluatedCondition = evaluatedCondition.replace(
        /\$\{steps\.([^.]+)\.([^}]+)\}/g,
        (match, stepId, property) => {
          const stepResult = stepResults[stepId];
          if (stepResult?.output && stepResult.output[property] !== undefined) {
            const value = stepResult.output[property];
            return typeof value === 'string' ? `"${value}"` : String(value);
          }
          return 'null';
        }
      );

      // Evaluate the condition (basic implementation)
      return Function(`"use strict"; return (${evaluatedCondition})`)();
    } catch (error) {
      this.logger.error(`Condition evaluation failed: ${condition}`, error);
      return false;
    }
  }

  private getVariableValue(path: string, variables: Record<string, any>): any {
    const keys = path.split('.');
    let value = variables;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private mapParametersToAgent(
    mapping: Record<string, string>,
    variables: Record<string, any>,
    stepResults: Record<string, any>
  ): any {
    if (Object.keys(mapping).length === 0) {
      return variables;
    }

    const result: Record<string, any> = {};

    for (const [targetKey, sourcePath] of Object.entries(mapping)) {
      if (sourcePath.startsWith('${steps.')) {
        // Step result reference
        const match = sourcePath.match(/\$\{steps\.([^.]+)\.(.+)\}/);
        if (match) {
          const [, stepId, property] = match;
          const stepResult = stepResults[stepId];
          if (stepResult?.output) {
            result[targetKey] = this.getVariableValue(property, stepResult.output);
          }
        }
      } else if (sourcePath.startsWith('${')) {
        // Variable reference
        const varName = sourcePath.slice(2, -1);
        result[targetKey] = this.getVariableValue(varName, variables);
      } else {
        // Literal value
        result[targetKey] = sourcePath;
      }
    }

    return result;
  }

  private mapParametersToTool(
    mapping: Record<string, string>,
    variables: Record<string, any>,
    stepResults: Record<string, any>
  ): Record<string, any> {
    return this.mapParametersToAgent(mapping, variables, stepResults);
  }

  private mapAgentOutputToVariables(
    output: any,
    mapping: Record<string, string>,
    variables: Record<string, any>
  ): void {
    if (Object.keys(mapping).length === 0) {
      // No mapping specified, store entire output
      variables.lastAgentOutput = output;
      return;
    }

    for (const [sourceKey, targetPath] of Object.entries(mapping)) {
      const value =
        typeof output === 'object' && output !== null
          ? this.getVariableValue(sourceKey, output)
          : output;

      this.setVariableValue(targetPath, value, variables);
    }
  }

  private mapToolOutputToVariables(
    output: any,
    mapping: Record<string, string>,
    variables: Record<string, any>
  ): void {
    this.mapAgentOutputToVariables(output, mapping, variables);
  }

  private setVariableValue(path: string, value: any, variables: Record<string, any>): void {
    const keys = path.split('.');
    let current = variables;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  private async waitForHITLApproval(
    requestId: string,
    timeout: number
  ): Promise<{
    approved: boolean;
    resolvedBy?: string;
    reason?: string;
    data?: Record<string, any>;
    resolution?: any;
  }> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('HITL request timed out'));
      }, timeout);

      // Set up event listener for HITL resolution
      const handleHITLResolution = (data: any) => {
        if (data.requestId === requestId) {
          clearTimeout(timeoutId);
          this.eventEmitter.off('hitl.request.resolved', handleHITLResolution);

          resolve({
            approved: data.approved,
            resolvedBy: data.resolvedBy,
            reason: data.reason,
            data: data.decisionData,
            resolution: data,
          });
        }
      };

      // Listen for HITL resolution events
      this.eventEmitter.on('hitl.request.resolved', handleHITLResolution);

      // Also listen for specific approval/rejection events
      const handleApproval = (data: any) => {
        if (data.requestId === requestId) {
          clearTimeout(timeoutId);
          this.eventEmitter.off('hitl.request.approved', handleApproval);
          this.eventEmitter.off('hitl.request.rejected', handleRejection);

          resolve({
            approved: true,
            resolvedBy: data.userId,
            reason: data.reason,
            data: data.decisionData,
            resolution: data,
          });
        }
      };

      const handleRejection = (data: any) => {
        if (data.requestId === requestId) {
          clearTimeout(timeoutId);
          this.eventEmitter.off('hitl.request.approved', handleApproval);
          this.eventEmitter.off('hitl.request.rejected', handleRejection);

          resolve({
            approved: false,
            resolvedBy: data.userId,
            reason: data.reason,
            data: data.decisionData,
            resolution: data,
          });
        }
      };

      this.eventEmitter.on('hitl.request.approved', handleApproval);
      this.eventEmitter.on('hitl.request.rejected', handleRejection);
    });
  }

  private calculateMemoryUsage(context: WorkflowExecutionContext): number {
    return Buffer.byteLength(
      JSON.stringify({
        variables: context.variables,
        stepResults: context.stepResults,
        hitlRequests: context.hitlRequests,
        agentExecutions: context.agentExecutions,
        toolExecutions: context.toolExecutions,
      }),
      'utf8'
    );
  }

  private calculateCpuUsage(stepExecutionTimes: Record<string, number>): number {
    const totalTime = Object.values(stepExecutionTimes).reduce((sum, time) => sum + time, 0);
    return totalTime / Object.keys(stepExecutionTimes).length; // Average execution time
  }

  private generateOptimizationSuggestions(
    bottlenecks: Array<{
      stepId: string;
      executionTime: number;
      reason: string;
    }>,
    context: WorkflowExecutionContext
  ): Array<{
    type: 'performance' | 'cost' | 'reliability';
    suggestion: string;
    impact: 'low' | 'medium' | 'high';
    estimatedImprovement: string;
  }> {
    const suggestions: Array<{
      type: 'performance' | 'cost' | 'reliability';
      suggestion: string;
      impact: 'low' | 'medium' | 'high';
      estimatedImprovement: string;
    }> = [];

    // Performance suggestions based on bottlenecks
    if (bottlenecks.length > 0) {
      suggestions.push({
        type: 'performance',
        suggestion: `Optimize slow steps: ${bottlenecks.map((b) => b.stepId).join(', ')}`,
        impact: 'high',
        estimatedImprovement: `Reduce execution time by ${Math.round(bottlenecks.reduce((sum, b) => sum + b.executionTime, 0) / 1000)}s`,
      });
    }

    // Cost optimization suggestions
    const totalAgentCost = context.agentExecutions.reduce((sum, exec) => sum + exec.cost, 0);
    if (totalAgentCost > 1.0) {
      suggestions.push({
        type: 'cost',
        suggestion: 'Consider using more cost-effective AI models for non-critical steps',
        impact: 'medium',
        estimatedImprovement: `Reduce cost by up to ${Math.round(totalAgentCost * 0.3 * 100)}%`,
      });
    }

    // Reliability suggestions
    if (context.failedSteps.length > 0) {
      suggestions.push({
        type: 'reliability',
        suggestion: 'Add error handling and retry logic for failed steps',
        impact: 'high',
        estimatedImprovement: 'Increase success rate by 20-40%',
      });
    }

    return suggestions;
  }

  private isRecoverableError(error: Error): boolean {
    const recoverableErrors = ['timeout', 'rate_limit', 'network', 'temporary'];

    return recoverableErrors.some((type) => error.message.toLowerCase().includes(type));
  }

  private async sendCompletionNotification(
    context: WorkflowExecutionContext,
    result: any
  ): Promise<void> {
    await this.websocketService.sendSystemNotification(context.organizationId, {
      type: 'success',
      title: 'Workflow Completed',
      message: `Workflow ${context.workflowId} has completed successfully`,
      timestamp: new Date(),
    });
  }
}
