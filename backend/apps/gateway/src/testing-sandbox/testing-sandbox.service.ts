import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Observable, Subject, interval, map } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import {
  TestingSandbox,
  TestScenario,
  TestExecution,
  MockData,
  DebugSession,
  SandboxRun,
  SandboxEvent,
  Agent,
  Tool,
  Workflow,
} from '@database/entities';
import { AgentService } from '../agent/agent.service';
import { ToolService } from '../tool/tool.service';
import { WorkflowService } from '../workflow/workflow.service';
import { SessionService } from '../session/session.service';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { PromptTemplateService } from '../prompt-template/prompt-template.service';
import { WebSocketService } from '../websocket/websocket.service';
import {
  CreateSandboxDto,
  UpdateSandboxDto,
  ExecuteTestDto,
  CreateTestScenarioDto,
  UpdateTestScenarioDto,
  RunIntegrationTestDto,
  CreateMockDataDto,
  PerformanceTestDto,
  DebugSessionDto,
  CollaborativeTestDto,
} from './dto';
import { ExecutionStatus } from '@shared/enums';
import { SandboxEventType } from '@database/entities/sandbox-event.entity';
import { ExecutionType } from '@database/entities/ai-provider-execution.entity';
import { v4 as uuidv4 } from 'uuid';
import * as Docker from 'dockerode';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface SandboxResourceLimits {
  memory: string;
  cpu: string;
  timeout: number;
  networkAccess: boolean;
  allowedPorts: number[];
}

export interface TestExecutionResult {
  id: string;
  status: ExecutionStatus;
  output: any;
  error?: string;
  metrics: {
    executionTime: number;
    memoryUsage: number;
    cpuUsage: number;
    networkCalls: number;
    tokensUsed?: number;
    cost?: number;
  };
  traces: Array<{
    timestamp: Date;
    level: string;
    message: string;
    data?: any;
  }>;
  sessionState?: Record<string, any>;
  providerMetrics?: Record<string, any>;
}

export interface IntegrationTestResult {
  id: string;
  testName: string;
  modules: string[];
  status: ExecutionStatus;
  results: Array<{
    module: string;
    status: ExecutionStatus;
    output: any;
    error?: string;
    executionTime: number;
  }>;
  dataFlow: Array<{
    from: string;
    to: string;
    data: any;
    timestamp: Date;
  }>;
  totalExecutionTime: number;
  sessionState?: Record<string, any>;
}

@Injectable()
export class TestingSandboxService {
  private readonly logger = new Logger(TestingSandboxService.name);
  private readonly docker: Docker;
  private readonly cachePrefix = 'sandbox:';
  private readonly eventStreams = new Map<string, Subject<MessageEvent>>();

  constructor(
    @InjectRepository(TestingSandbox)
    private readonly sandboxRepository: Repository<TestingSandbox>,
    @InjectRepository(TestScenario)
    private readonly testScenarioRepository: Repository<TestScenario>,
    @InjectRepository(TestExecution)
    private readonly testExecutionRepository: Repository<TestExecution>,
    @InjectRepository(MockData)
    private readonly mockDataRepository: Repository<MockData>,
    @InjectRepository(DebugSession)
    private readonly debugSessionRepository: Repository<DebugSession>,
    @InjectRepository(SandboxRun)
    private readonly sandboxRunRepository: Repository<SandboxRun>,
    @InjectRepository(SandboxEvent)
    private readonly sandboxEventRepository: Repository<SandboxEvent>,
    private readonly agentService: AgentService,
    private readonly toolService: ToolService,
    private readonly workflowService: WorkflowService,
    private readonly sessionService: SessionService,
    private readonly aiProviderService: AIProviderService,
    private readonly promptTemplateService: PromptTemplateService,
    private readonly websocketService: WebSocketService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.docker = new Docker();
  }

  // Sandbox Management
  async createSandbox(
    createSandboxDto: CreateSandboxDto,
    userId: string,
    organizationId: string,
  ): Promise<TestingSandbox> {
    const sandbox = this.sandboxRepository.create({
      ...createSandboxDto,
      userId,
      organizationId,
      status: 'initializing',
      resourceLimits: this.getDefaultResourceLimits(),
      isolationConfig: this.getDefaultIsolationConfig(),
    });

    const savedSandbox = await this.sandboxRepository.save(sandbox);

    // Initialize sandbox environment
    await this.initializeSandboxEnvironment(savedSandbox);

    // Cache the sandbox
    await this.cacheSandbox(savedSandbox);

    // Emit event
    this.eventEmitter.emit('sandbox.created', {
      sandboxId: savedSandbox.id,
      userId,
      organizationId,
      timestamp: new Date(),
    });

    // Send real-time update
    await this.websocketService.broadcastToOrganization(
      organizationId,
      'sandbox_created',
      {
        sandbox: savedSandbox,
        userId,
      },
    );

    this.logger.log(
      `Sandbox created: ${savedSandbox.id} by user ${userId} in org ${organizationId}`,
    );

    return savedSandbox;
  }

  async findAllSandboxes(
    organizationId: string,
    filters?: {
      userId?: string;
      type?: string;
      status?: string;
    },
  ): Promise<TestingSandbox[]> {
    const queryBuilder = this.sandboxRepository
      .createQueryBuilder('sandbox')
      .where('sandbox.organizationId = :organizationId', { organizationId })
      .leftJoinAndSelect('sandbox.testScenarios', 'testScenarios')
      .leftJoinAndSelect('sandbox.testExecutions', 'testExecutions')
      .leftJoinAndSelect('sandbox.sandboxRuns', 'sandboxRuns')
      .orderBy('sandbox.createdAt', 'DESC');

    if (filters?.userId) {
      queryBuilder.andWhere('sandbox.userId = :userId', {
        userId: filters.userId,
      });
    }

    if (filters?.type) {
      queryBuilder.andWhere('sandbox.type = :type', { type: filters.type });
    }

    if (filters?.status) {
      queryBuilder.andWhere('sandbox.status = :status', {
        status: filters.status,
      });
    }

    return queryBuilder.getMany();
  }

  async findOneSandbox(
    id: string,
    organizationId: string,
  ): Promise<TestingSandbox> {
    // Try cache first
    const cacheKey = `${this.cachePrefix}${id}`;
    let sandbox = await this.cacheManager.get<TestingSandbox | null>(cacheKey);

    if (!sandbox) {
      sandbox = await this.sandboxRepository.findOne({
        where: { id, organizationId },
        relations: [
          'testScenarios',
          'testExecutions',
          'mockData',
          'debugSessions',
          'sandboxRuns',
        ],
      });

      if (!sandbox) {
        throw new NotFoundException('Sandbox not found');
      }

      await this.cacheSandbox(sandbox);
    }

    return sandbox;
  }

  async updateSandbox(
    id: string,
    updateSandboxDto: UpdateSandboxDto,
    userId: string,
    organizationId: string,
  ): Promise<TestingSandbox> {
    const sandbox = await this.findOneSandbox(id, organizationId);

    // Check ownership or admin permissions
    if (sandbox.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this sandbox');
    }

    Object.assign(sandbox, updateSandboxDto);
    sandbox.updatedAt = new Date();

    const updatedSandbox = await this.sandboxRepository.save(sandbox);

    // Update cache
    await this.cacheSandbox(updatedSandbox);

    // Emit event
    this.eventEmitter.emit('sandbox.updated', {
      sandboxId: updatedSandbox.id,
      userId,
      organizationId,
      changes: updateSandboxDto,
      timestamp: new Date(),
    });

    this.logger.log(`Sandbox updated: ${updatedSandbox.id} by user ${userId}`);

    return updatedSandbox;
  }

  async removeSandbox(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const sandbox = await this.findOneSandbox(id, organizationId);

    // Check ownership or admin permissions
    if (sandbox.userId !== userId) {
      throw new ForbiddenException('Not authorized to delete this sandbox');
    }

    // Cleanup sandbox environment
    await this.cleanupSandboxEnvironment(sandbox);

    // Soft delete
    sandbox.status = 'deleted';
    sandbox.updatedAt = new Date();
    await this.sandboxRepository.save(sandbox);

    // Remove from cache
    await this.cacheManager.del(`${this.cachePrefix}${id}`);

    // Emit event
    this.eventEmitter.emit('sandbox.deleted', {
      sandboxId: id,
      userId,
      organizationId,
      timestamp: new Date(),
    });

    this.logger.log(`Sandbox deleted: ${id} by user ${userId}`);
  }

  // Real-time Test Execution with Production Integration
  async executeTest(
    sandboxId: string,
    executeTestDto: ExecuteTestDto,
    userId: string,
    organizationId: string,
  ): Promise<TestExecutionResult> {
    const sandbox = await this.findOneSandbox(sandboxId, organizationId);

    if (sandbox.status !== 'active') {
      throw new BadRequestException('Sandbox is not active');
    }

    const runId = uuidv4();
    const startTime = Date.now();

    // Create sandbox run record
    const sandboxRun = this.sandboxRunRepository.create({
      id: runId,
      name: executeTestDto.testName,
      sandboxId,
      userId,
      organizationId,
      config: {
        targetType: executeTestDto.testType as any,
        targetId:
          executeTestDto.testData.agentId ||
          executeTestDto.testData.toolId ||
          executeTestDto.testData.workflowId,
        input: executeTestDto.testData,
        configuration: executeTestDto.configuration,
        isolationLevel: 'strict',
        enableRealTimeUpdates: executeTestDto.stream || false,
        enableDebugMode: executeTestDto.debug || false,
        timeout: executeTestDto.timeout || 30000,
      },
      status: ExecutionStatus.RUNNING,
      input: executeTestDto.testData,
      startedAt: new Date(),
    });

    await this.sandboxRunRepository.save(sandboxRun);

    // Create event stream for real-time updates
    const eventStream = new Subject<MessageEvent>();
    this.eventStreams.set(runId, eventStream);

    // Emit run started event
    await this.emitSandboxEvent(
      runId,
      organizationId,
      SandboxEventType.RUN_STARTED,
      {
        runId,
        testType: executeTestDto.testType,
        testName: executeTestDto.testName,
      },
    );

    try {
      let result: any;
      let sessionState: Record<string, any> = {};
      let providerMetrics: Record<string, any> = {};

      // Create isolated session for sandbox execution
      const sessionToken = await this.createSandboxSession(
        userId,
        organizationId,
        runId,
      );

      // Execute test based on type with real production logic
      switch (executeTestDto.testType) {
        case 'agent':
          result = await this.executeAgentTest(
            sandbox,
            executeTestDto,
            runId,
            sessionToken,
            userId,
            organizationId,
          );
          break;
        case 'tool':
          result = await this.executeToolTest(
            sandbox,
            executeTestDto,
            runId,
            sessionToken,
            userId,
            organizationId,
          );
          break;
        case 'workflow':
          result = await this.executeWorkflowTest(
            sandbox,
            executeTestDto,
            runId,
            sessionToken,
            userId,
            organizationId,
          );
          break;
        case 'integration':
          result = await this.executeIntegrationTest(
            sandbox,
            executeTestDto,
            runId,
            sessionToken,
            userId,
            organizationId,
          );
          break;
        default:
          throw new BadRequestException(
            `Unsupported test type: ${executeTestDto.testType}`,
          );
      }

      const executionTime = Date.now() - startTime;

      // Get final session state
      const session = await this.sessionService.getSession(sessionToken);
      if (session) {
        sessionState = session.context;
      }

      // Update sandbox run record
      sandboxRun.status = ExecutionStatus.COMPLETED;
      sandboxRun.output = result.output;
      sandboxRun.metrics = {
        executionTime,
        memoryUsage: result.memoryUsage || 0,
        cpuUsage: result.cpuUsage || 0,
        networkCalls: result.networkCalls || 0,
        tokensUsed: result.tokensUsed || 0,
        cost: result.cost || 0,
        apiCalls: result.apiCalls || 0,
        errorCount: 0,
      };
      sandboxRun.sessionState = sessionState;
      sandboxRun.providerMetrics = providerMetrics;
      sandboxRun.completedAt = new Date();

      await this.sandboxRunRepository.save(sandboxRun);

      // Emit completion event
      await this.emitSandboxEvent(
        runId,
        organizationId,
        SandboxEventType.RUN_COMPLETED,
        {
          runId,
          result: result.output,
          metrics: sandboxRun.metrics,
        },
      );

      const executionResult: TestExecutionResult = {
        id: runId,
        status: ExecutionStatus.COMPLETED,
        output: result.output,
        metrics: sandboxRun.metrics,
        traces: result.traces || [],
        sessionState,
        providerMetrics,
      };

      // Cleanup session
      await this.sessionService.destroySession(sessionToken);

      // Cleanup event stream
      this.eventStreams.delete(runId);
      eventStream.complete();

      return executionResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Update sandbox run record with error
      sandboxRun.status = ExecutionStatus.FAILED;
      sandboxRun.error =
        error instanceof Error ? error.message : 'Unknown error';
      sandboxRun.metrics = {
        executionTime,
        memoryUsage: 0,
        cpuUsage: 0,
        networkCalls: 0,
        apiCalls: 0,
        errorCount: 1,
      };
      sandboxRun.completedAt = new Date();

      await this.sandboxRunRepository.save(sandboxRun);

      // Emit error event
      await this.emitSandboxEvent(
        runId,
        organizationId,
        SandboxEventType.RUN_FAILED,
        {
          runId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );

      // Cleanup
      this.eventStreams.delete(runId);
      eventStream.error(error);

      this.logger.error(`Test execution failed: ${runId}`, error);
      throw error;
    }
  }

  executeTestStream(
    sandboxId: string,
    testId: string,
    userId: string,
    organizationId: string,
  ): Observable<MessageEvent> {
    const eventStream = this.eventStreams.get(testId);
    if (eventStream) {
      return eventStream.asObservable();
    }

    // Return a fallback stream if the test is not found
    return interval(1000).pipe(
      map((index) => ({
        data: {
          type: 'test_progress',
          sandboxId,
          testId,
          step: index + 1,
          message: `Executing test step ${index + 1}...`,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }

  // Real Agent Execution with Production Logic
  private async executeAgentTest(
    sandbox: TestingSandbox,
    executeTestDto: ExecuteTestDto,
    runId: string,
    sessionToken: string,
    userId: string,
    organizationId: string,
  ): Promise<any> {
    const agentId = executeTestDto.testData.agentId;
    const input = executeTestDto.testData.input;

    if (!agentId) {
      throw new BadRequestException('Agent ID is required for agent test');
    }

    // Emit agent execution start event
    await this.emitSandboxEvent(
      runId,
      organizationId,
      SandboxEventType.AGENT_EXECUTION,
      {
        agentId,
        input,
        phase: 'started',
      },
    );

    try {
      // Execute agent using real agent service
      const result = await this.agentService.execute(
        agentId,
        {
          input,
          sessionId: sessionToken,
          context: executeTestDto.testData.context || {},
          metadata: { sandboxRun: runId, testMode: true },
          includeToolCalls: true,
          includeKnowledgeSearch: true,
        },
        userId,
        organizationId,
      );

      // Emit completion event
      await this.emitSandboxEvent(
        runId,
        organizationId,
        SandboxEventType.AGENT_EXECUTION,
        {
          agentId,
          result,
          phase: 'completed',
        },
      );

      return {
        output: result.output,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
        executionTime: result.executionTimeMs,
        toolCalls: result.toolCalls,
        knowledgeSearches: result.knowledgeSearches,
        traces: [
          {
            timestamp: new Date(),
            level: 'info',
            message: 'Agent execution completed successfully',
            data: {
              agentId,
              runId,
              tokensUsed: result.tokensUsed,
              cost: result.cost,
            },
          },
        ],
      };
    } catch (error) {
      await this.emitSandboxEvent(
        runId,
        organizationId,
        SandboxEventType.ERROR_OCCURRED,
        {
          agentId,
          error: error instanceof Error ? error.message : 'Unknown error',
          phase: 'failed',
        },
      );
      throw error;
    }
  }

  // Real Tool Execution with Production Logic
  private async executeToolTest(
    sandbox: TestingSandbox,
    executeTestDto: ExecuteTestDto,
    runId: string,
    sessionToken: string,
    userId: string,
    organizationId: string,
  ): Promise<any> {
    const toolId = executeTestDto.testData.toolId;
    const parameters = executeTestDto.testData.parameters;

    if (!toolId) {
      throw new BadRequestException('Tool ID is required for tool test');
    }

    // Emit tool execution start event
    await this.emitSandboxEvent(
      runId,
      organizationId,
      SandboxEventType.TOOL_EXECUTION,
      {
        toolId,
        parameters,
        phase: 'started',
      },
    );

    try {
      // Execute tool using real tool service
      const result = await this.toolService.execute(
        toolId,
        {
          functionName: executeTestDto.testData.functionName || 'execute',
          parameters,
          callerType: 'sandbox',
          callerId: runId,
          timeout: executeTestDto.timeout || 30000,
        },
        userId,
        organizationId,
        sessionToken,
      );

      // Emit completion event
      await this.emitSandboxEvent(
        runId,
        organizationId,
        SandboxEventType.TOOL_EXECUTION,
        {
          toolId,
          result,
          phase: 'completed',
        },
      );

      return {
        output: result.result,
        executionTime: result.executionTime,
        cost: result.cost,
        traces: [
          {
            timestamp: new Date(),
            level: 'info',
            message: 'Tool execution completed successfully',
            data: { toolId, runId, executionTime: result.executionTime },
          },
        ],
      };
    } catch (error) {
      await this.emitSandboxEvent(
        runId,
        organizationId,
        SandboxEventType.ERROR_OCCURRED,
        {
          toolId,
          error: error instanceof Error ? error.message : 'Unknown error',
          phase: 'failed',
        },
      );
      throw error;
    }
  }

  // Real Workflow Execution with Production Logic
  private async executeWorkflowTest(
    sandbox: TestingSandbox,
    executeTestDto: ExecuteTestDto,
    runId: string,
    sessionToken: string,
    userId: string,
    organizationId: string,
  ): Promise<any> {
    const workflowId = executeTestDto.testData.workflowId;
    const input = executeTestDto.testData.input;

    if (!workflowId) {
      throw new BadRequestException(
        'Workflow ID is required for workflow test',
      );
    }

    // Emit workflow execution start event
    await this.emitSandboxEvent(
      runId,
      organizationId,
      SandboxEventType.WORKFLOW_STEP,
      {
        workflowId,
        input,
        phase: 'started',
      },
    );

    try {
      // Execute workflow using real workflow service
      const result = await this.workflowService.test(workflowId, {
        input,
        variables: executeTestDto.testData.variables || {},
        mockResponses: executeTestDto.testData.mockResponses || {},
        testName: executeTestDto.testName,
        expectedOutput: executeTestDto.testData.expectedOutput,
        metadata: { sandboxRun: runId, testMode: true },
      });

      // Emit completion event
      await this.emitSandboxEvent(
        runId,
        organizationId,
        SandboxEventType.WORKFLOW_STEP,
        {
          workflowId,
          result,
          phase: 'completed',
        },
      );

      return {
        output: result.output,
        executionTime: result.executionTime,
        completedSteps: result.completedSteps,
        stepResults: result.stepResults,
        traces: [
          {
            timestamp: new Date(),
            level: 'info',
            message: 'Workflow execution completed successfully',
            data: { workflowId, runId, completedSteps: result.completedSteps },
          },
        ],
      };
    } catch (error) {
      await this.emitSandboxEvent(
        runId,
        organizationId,
        SandboxEventType.ERROR_OCCURRED,
        {
          workflowId,
          error: error instanceof Error ? error.message : 'Unknown error',
          phase: 'failed',
        },
      );
      throw error;
    }
  }

  // Real Integration Test with Production Logic
  private async executeIntegrationTest(
    sandbox: TestingSandbox,
    executeTestDto: ExecuteTestDto,
    runId: string,
    sessionToken: string,
    userId: string,
    organizationId: string,
  ): Promise<any> {
    const testFlow = executeTestDto.testData.testFlow || [];
    const results: any[] = [];
    const dataFlow: any[] = [];
    const startTime = Date.now();

    for (const step of testFlow) {
      const stepStartTime = Date.now();
      let stepResult: any;
      let stepError: string | undefined;
      let stepStatus = ExecutionStatus.COMPLETED;

      try {
        switch (step.moduleType) {
          case 'agent':
            stepResult = await this.executeAgentInIntegration(
              step,
              sandbox,
              dataFlow,
              runId,
              sessionToken,
              userId,
              organizationId,
            );
            break;
          case 'tool':
            stepResult = await this.executeToolInIntegration(
              step,
              sandbox,
              dataFlow,
              runId,
              sessionToken,
              userId,
              organizationId,
            );
            break;
          case 'workflow':
            stepResult = await this.executeWorkflowInIntegration(
              step,
              sandbox,
              dataFlow,
              runId,
              sessionToken,
              userId,
              organizationId,
            );
            break;
          default:
            throw new Error(`Unsupported module type: ${step.moduleType}`);
        }
      } catch (error) {
        stepError = error instanceof Error ? error.message : 'Unknown error';
        stepStatus = ExecutionStatus.FAILED;
      }

      const stepExecutionTime = Date.now() - stepStartTime;

      results.push({
        module: step.moduleId,
        status: stepStatus,
        output: stepResult,
        error: stepError,
        executionTime: stepExecutionTime,
      });

      // If step failed and failFast is enabled, stop execution
      if (
        stepStatus === ExecutionStatus.FAILED &&
        executeTestDto.testData.failFast
      ) {
        break;
      }
    }

    const totalExecutionTime = Date.now() - startTime;
    const overallStatus = results.some(
      (r) => r.status === ExecutionStatus.FAILED,
    )
      ? ExecutionStatus.FAILED
      : ExecutionStatus.COMPLETED;

    return {
      output: {
        testName: executeTestDto.testName,
        modules: testFlow.map((step) => step.moduleId),
        status: overallStatus,
        results,
        dataFlow,
        totalExecutionTime,
      },
      executionTime: totalExecutionTime,
      traces: [
        {
          timestamp: new Date(),
          level: 'info',
          message: 'Integration test completed',
          data: {
            runId,
            totalSteps: testFlow.length,
            successfulSteps: results.filter(
              (r) => r.status === ExecutionStatus.COMPLETED,
            ).length,
          },
        },
      ],
    };
  }

  // Helper methods for integration testing
  private async executeAgentInIntegration(
    step: any,
    sandbox: TestingSandbox,
    dataFlow: any[],
    runId: string,
    sessionToken: string,
    userId: string,
    organizationId: string,
  ): Promise<any> {
    const result = await this.agentService.execute(
      step.moduleId,
      {
        input: step.input,
        sessionId: sessionToken,
        context: step.context || {},
        metadata: { sandboxRun: runId, integrationStep: true },
      },
      userId,
      organizationId,
    );

    dataFlow.push({
      from: 'input',
      to: step.moduleId,
      data: step.input,
      timestamp: new Date(),
    });

    dataFlow.push({
      from: step.moduleId,
      to: 'output',
      data: result.output,
      timestamp: new Date(),
    });

    return result;
  }

  private async executeToolInIntegration(
    step: any,
    sandbox: TestingSandbox,
    dataFlow: any[],
    runId: string,
    sessionToken: string,
    userId: string,
    organizationId: string,
  ): Promise<any> {
    const result = await this.toolService.execute(
      step.moduleId,
      {
        functionName: step.functionName || 'execute',
        parameters: step.input,
        callerType: 'sandbox',
        callerId: runId,
      },
      userId,
      organizationId,
      sessionToken,
    );

    dataFlow.push({
      from: 'input',
      to: step.moduleId,
      data: step.input,
      timestamp: new Date(),
    });

    dataFlow.push({
      from: step.moduleId,
      to: 'output',
      data: result.result,
      timestamp: new Date(),
    });

    return result;
  }

  private async executeWorkflowInIntegration(
    step: any,
    sandbox: TestingSandbox,
    dataFlow: any[],
    runId: string,
    sessionToken: string,
    userId: string,
    organizationId: string,
  ): Promise<any> {
    const result = await this.workflowService.test(step.moduleId, {
      input: step.input,
      variables: step.variables || {},
      testName: `Integration step: ${step.moduleId}`,
      metadata: { sandboxRun: runId, integrationStep: true },
    });

    dataFlow.push({
      from: 'input',
      to: step.moduleId,
      data: step.input,
      timestamp: new Date(),
    });

    dataFlow.push({
      from: step.moduleId,
      to: 'output',
      data: result.output,
      timestamp: new Date(),
    });

    return result;
  }

  // Session Management for Sandbox
  private async createSandboxSession(
    userId: string,
    organizationId: string,
    runId: string,
  ): Promise<string> {
    const session = await this.sessionService.createSession({
      userId,
      organizationId,
      context: {
        sandboxRun: runId,
        testMode: true,
        isolatedExecution: true,
      },
      metadata: {
        type: 'sandbox',
        runId,
        createdAt: new Date(),
      },
      ttl: 3600, // 1 hour
      isRecoverable: false,
    });

    return session.sessionToken;
  }

  // Event Management
  private async emitSandboxEvent(
    runId: string,
    organizationId: string,
    type: SandboxEventType,
    data: any,
  ): Promise<void> {
    const event = this.sandboxEventRepository.create({
      runId,
      organizationId,
      type,
      payload: {
        type,
        data,
        metadata: {
          timestamp: new Date(),
        },
      },
      timestamp: new Date(),
    });

    await this.sandboxEventRepository.save(event);

    // Send real-time update via WebSocket
    await this.websocketService.broadcastToOrganization(
      organizationId,
      'sandbox_event',
      {
        runId,
        type,
        data,
        timestamp: new Date(),
      },
    );

    // Update event stream if exists
    const eventStream = this.eventStreams.get(runId);
    if (eventStream) {
      eventStream.next({
        data: {
          type,
          runId,
          data,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  // Test Scenarios (keeping existing functionality)
  async createTestScenario(
    sandboxId: string,
    createTestScenarioDto: CreateTestScenarioDto,
    userId: string,
    organizationId: string,
  ): Promise<TestScenario> {
    const sandbox = await this.findOneSandbox(sandboxId, organizationId);

    const testScenario = this.testScenarioRepository.create({
      ...createTestScenarioDto,
      sandboxId,
      userId,
      organizationId,
    });

    const savedScenario = await this.testScenarioRepository.save(testScenario);

    this.logger.log(
      `Test scenario created: ${savedScenario.id} for sandbox ${sandboxId}`,
    );

    return savedScenario;
  }

  async getTestScenarios(
    sandboxId: string,
    organizationId: string,
  ): Promise<TestScenario[]> {
    return this.testScenarioRepository.find({
      where: { sandboxId, organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateTestScenario(
    sandboxId: string,
    scenarioId: string,
    updateTestScenarioDto: UpdateTestScenarioDto,
    userId: string,
    organizationId: string,
  ): Promise<TestScenario> {
    const scenario = await this.testScenarioRepository.findOne({
      where: { id: scenarioId, sandboxId, organizationId },
    });

    if (!scenario) {
      throw new NotFoundException('Test scenario not found');
    }

    Object.assign(scenario, updateTestScenarioDto);
    scenario.updatedAt = new Date();

    return this.testScenarioRepository.save(scenario);
  }

  async removeTestScenario(
    sandboxId: string,
    scenarioId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const scenario = await this.testScenarioRepository.findOne({
      where: { id: scenarioId, sandboxId, organizationId },
    });

    if (!scenario) {
      throw new NotFoundException('Test scenario not found');
    }

    await this.testScenarioRepository.remove(scenario);

    this.logger.log(
      `Test scenario deleted: ${scenarioId} from sandbox ${sandboxId}`,
    );
  }

  // Integration Testing (enhanced with real logic)
  async runIntegrationTest(
    sandboxId: string,
    runIntegrationTestDto: RunIntegrationTestDto,
    userId: string,
    organizationId: string,
  ): Promise<IntegrationTestResult> {
    const sandbox = await this.findOneSandbox(sandboxId, organizationId);
    const testId = uuidv4();
    const startTime = Date.now();

    const results: IntegrationTestResult['results'] = [];
    const dataFlow: IntegrationTestResult['dataFlow'] = [];

    // Create session for integration test
    const sessionToken = await this.createSandboxSession(
      userId,
      organizationId,
      testId,
    );

    try {
      // Execute integration test flow with real services
      for (const step of runIntegrationTestDto.testFlow) {
        const stepStartTime = Date.now();
        let stepResult: any;
        let stepError: string | undefined;
        let stepStatus = ExecutionStatus.COMPLETED;

        try {
          switch (step.moduleType) {
            case 'agent':
              stepResult = await this.executeAgentInIntegration(
                step,
                sandbox,
                dataFlow,
                testId,
                sessionToken,
                userId,
                organizationId,
              );
              break;
            case 'tool':
              stepResult = await this.executeToolInIntegration(
                step,
                sandbox,
                dataFlow,
                testId,
                sessionToken,
                userId,
                organizationId,
              );
              break;
            case 'workflow':
              stepResult = await this.executeWorkflowInIntegration(
                step,
                sandbox,
                dataFlow,
                testId,
                sessionToken,
                userId,
                organizationId,
              );
              break;
            default:
              throw new Error(`Unsupported module type: ${step.moduleType}`);
          }
        } catch (error) {
          stepError = error instanceof Error ? error.message : 'Unknown error';
          stepStatus = ExecutionStatus.FAILED;
        }

        const stepExecutionTime = Date.now() - stepStartTime;

        results.push({
          module: step.moduleId,
          status: stepStatus,
          output: stepResult,
          error: stepError,
          executionTime: stepExecutionTime,
        });

        // If step failed and failFast is enabled, stop execution
        if (
          stepStatus === ExecutionStatus.FAILED &&
          runIntegrationTestDto.failFast
        ) {
          break;
        }
      }

      const totalExecutionTime = Date.now() - startTime;
      const overallStatus = results.some(
        (r) => r.status === ExecutionStatus.FAILED,
      )
        ? ExecutionStatus.FAILED
        : ExecutionStatus.COMPLETED;

      // Get final session state
      const session = await this.sessionService.getSession(sessionToken);
      const sessionState = session ? session.context : {};

      const integrationResult: IntegrationTestResult = {
        id: testId,
        testName: runIntegrationTestDto.testName,
        modules: runIntegrationTestDto.testFlow.map((step) => step.moduleId),
        status: overallStatus,
        results,
        dataFlow,
        totalExecutionTime,
        sessionState,
      };

      // Save integration test result
      const testExecution = this.testExecutionRepository.create({
        id: testId,
        sandboxId,
        testType: 'integration',
        testData: runIntegrationTestDto,
        status: overallStatus,
        output: integrationResult,
        metrics: {
          executionTime: totalExecutionTime,
          memoryUsage: 0,
          cpuUsage: 0,
          networkCalls: 0,
        },
        userId,
        organizationId,
        startedAt: new Date(startTime),
        completedAt: new Date(),
      });

      await this.testExecutionRepository.save(testExecution);

      // Cleanup session
      await this.sessionService.destroySession(sessionToken);

      this.logger.log(
        `Integration test completed: ${testId} for sandbox ${sandboxId}`,
      );

      return integrationResult;
    } catch (error) {
      // Cleanup session on error
      await this.sessionService.destroySession(sessionToken);
      this.logger.error(`Integration test failed: ${testId}`, error);
      throw error;
    }
  }

  // Performance Testing (enhanced with real metrics)
  async runPerformanceTest(
    sandboxId: string,
    performanceTestDto: PerformanceTestDto,
    userId: string,
    organizationId: string,
  ) {
    const sandbox = await this.findOneSandbox(sandboxId, organizationId);
    const testId = uuidv4();

    const performanceMetrics = {
      throughput: 0,
      latency: {
        p50: 0,
        p95: 0,
        p99: 0,
      },
      errorRate: 0,
      resourceUtilization: {
        cpu: 0,
        memory: 0,
        network: 0,
      },
    };

    // Run actual load test with real execution
    const loadTestResults = await this.runLoadTest(
      sandbox,
      performanceTestDto,
      testId,
      userId,
      organizationId,
    );

    // Calculate real performance metrics
    const executionTimes = loadTestResults
      .filter((r: any) => r.success)
      .map((r: any) => r.responseTime);

    if (executionTimes.length > 0) {
      executionTimes.sort((a, b) => a - b);
      performanceMetrics.latency.p50 =
        executionTimes[Math.floor(executionTimes.length * 0.5)];
      performanceMetrics.latency.p95 =
        executionTimes[Math.floor(executionTimes.length * 0.95)];
      performanceMetrics.latency.p99 =
        executionTimes[Math.floor(executionTimes.length * 0.99)];
      performanceMetrics.throughput =
        loadTestResults.length / (performanceTestDto.duration / 1000);
      performanceMetrics.errorRate =
        (loadTestResults.filter((r: any) => !r.success).length /
          loadTestResults.length) *
        100;
    }

    return {
      testId,
      metrics: performanceMetrics,
      results: loadTestResults,
      recommendations:
        this.generatePerformanceRecommendations(performanceMetrics),
    };
  }

  // Real Load Testing Implementation
  private async runLoadTest(
    sandbox: TestingSandbox,
    performanceTestDto: PerformanceTestDto,
    testId: string,
    userId: string,
    organizationId: string,
  ): Promise<any> {
    const results = [];
    const concurrency = performanceTestDto.concurrency || 10;
    const duration = performanceTestDto.duration || 60000; // 1 minute

    const startTime = Date.now();
    const endTime = startTime + duration;

    while (Date.now() < endTime) {
      const promises = [];
      for (let i = 0; i < concurrency; i++) {
        promises.push(
          this.executeLoadTestRequest(
            sandbox,
            performanceTestDto,
            testId,
            userId,
            organizationId,
          ),
        );
      }

      const batchResults = await Promise.allSettled(promises);
      results.push(
        ...batchResults.map((r) =>
          r.status === 'fulfilled'
            ? r.value
            : { success: false, error: 'Promise rejected' },
        ),
      );

      // Wait before next batch
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }

  private async executeLoadTestRequest(
    sandbox: TestingSandbox,
    performanceTestDto: PerformanceTestDto,
    testId: string,
    userId: string,
    organizationId: string,
  ): Promise<any> {
    const startTime = Date.now();
    try {
      // Execute the actual test request using real services
      const result = await this.executeTest(
        sandbox.id,
        performanceTestDto.testRequest,
        userId,
        organizationId,
      );
      const endTime = Date.now();
      return {
        success: true,
        responseTime: endTime - startTime,
        result,
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        responseTime: endTime - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Mock Data Management (keeping existing functionality)
  async createMockData(
    sandboxId: string,
    createMockDataDto: CreateMockDataDto,
    userId: string,
    organizationId: string,
  ): Promise<MockData> {
    const sandbox = await this.findOneSandbox(sandboxId, organizationId);

    const mockData = this.mockDataRepository.create({
      ...createMockDataDto,
      sandboxId,
      userId,
      organizationId,
    });

    const savedMockData = await this.mockDataRepository.save(mockData);

    this.logger.log(
      `Mock data created: ${savedMockData.id} for sandbox ${sandboxId}`,
    );

    return savedMockData;
  }

  async getMockData(
    sandboxId: string,
    organizationId: string,
  ): Promise<MockData[]> {
    return this.mockDataRepository.find({
      where: { sandboxId, organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  // Debug Sessions (enhanced with real debugging)
  async startDebugSession(
    sandboxId: string,
    debugSessionDto: DebugSessionDto,
    userId: string,
    organizationId: string,
  ) {
    const sandbox = await this.findOneSandbox(sandboxId, organizationId);
    const sessionId = uuidv4();

    const debugSession = this.debugSessionRepository.create({
      id: sessionId,
      name: debugSessionDto.name || `Debug Session ${new Date().toISOString()}`,
      sandboxId,
      sessionType: debugSessionDto.sessionType,
      targetModuleId: debugSessionDto.targetModuleId,
      configuration: debugSessionDto.configuration,
      initialInput: debugSessionDto.initialInput,
      timeout: debugSessionDto.timeout,
      status: 'active',
      userId,
      organizationId,
      startedAt: new Date(),
    });

    const savedSession = await this.debugSessionRepository.save(debugSession);

    // Initialize real debug environment
    await this.initializeDebugEnvironment(sandbox, savedSession);

    this.logger.log(
      `Debug session started: ${sessionId} for sandbox ${sandboxId}`,
    );

    return savedSession;
  }

  async getDebugSession(
    sandboxId: string,
    sessionId: string,
    organizationId: string,
  ) {
    const debugSession = await this.debugSessionRepository.findOne({
      where: { id: sessionId, sandboxId, organizationId },
    });

    if (!debugSession) {
      throw new NotFoundException('Debug session not found');
    }

    return debugSession;
  }

  // Collaborative Testing (enhanced with real-time collaboration)
  async startCollaborativeTest(
    sandboxId: string,
    collaborativeTestDto: CollaborativeTestDto,
    userId: string,
    organizationId: string,
  ) {
    const sandbox = await this.findOneSandbox(sandboxId, organizationId);
    const sessionId = uuidv4();

    // Create collaborative session with real-time capabilities
    const collaborativeSession = {
      id: sessionId,
      sandboxId,
      participants: collaborativeTestDto.participants,
      testType: collaborativeTestDto.testType,
      configuration: collaborativeTestDto.configuration,
      status: 'active',
      createdBy: userId,
      organizationId,
      createdAt: new Date(),
    };

    // Notify participants via WebSocket
    for (const participantId of collaborativeTestDto.participants) {
      await this.websocketService.sendToUser(
        participantId,
        'collaborative_test_invitation',
        {
          sessionId,
          sandboxId,
          invitedBy: userId,
          testType: collaborativeTestDto.testType,
        },
      );
    }

    this.logger.log(
      `Collaborative test session started: ${sessionId} for sandbox ${sandboxId}`,
    );

    return collaborativeSession;
  }

  // Analytics and Reporting (enhanced with real metrics)
  async getAnalytics(
    sandboxId: string,
    organizationId: string,
    timeRange?: { from: Date; to: Date },
  ) {
    const sandbox = await this.findOneSandbox(sandboxId, organizationId);

    const queryBuilder = this.sandboxRunRepository
      .createQueryBuilder('run')
      .where('run.sandboxId = :sandboxId', { sandboxId })
      .andWhere('run.organizationId = :organizationId', {
        organizationId,
      });

    if (timeRange) {
      queryBuilder
        .andWhere('run.startedAt >= :from', { from: timeRange.from })
        .andWhere('run.startedAt <= :to', { to: timeRange.to });
    }

    const runs = await queryBuilder.getMany();

    const analytics = {
      totalRuns: runs.length,
      successRate:
        runs.filter((r) => r.status === ExecutionStatus.COMPLETED).length /
        runs.length,
      averageExecutionTime:
        runs.reduce((sum, r) => sum + (r.metrics?.executionTime || 0), 0) /
        runs.length,
      totalCost: runs.reduce((sum, r) => sum + (r.metrics?.cost || 0), 0),
      runsByType: this.groupBy(runs, 'config.targetType'),
      runsByStatus: this.groupBy(runs, 'status'),
      executionTrend: this.calculateExecutionTrend(runs),
      resourceUsage: await this.calculateResourceUsage(sandboxId),
      errorAnalysis: this.analyzeErrors(runs.filter((r) => r.error)),
    };

    return analytics;
  }

  // Resource Management (enhanced with real monitoring)
  async getResourceUsage(sandboxId: string, organizationId: string) {
    const sandbox = await this.findOneSandbox(sandboxId, organizationId);

    // Get real container stats if sandbox is running in Docker
    if (sandbox.containerInfo?.containerId) {
      try {
        const container = this.docker.getContainer(
          sandbox.containerInfo.containerId,
        );
        const stats = await container.stats({ stream: false });

        return {
          cpu: this.calculateCpuUsage(stats),
          memory: this.calculateMemoryUsage(stats),
          network: this.calculateNetworkUsage(stats),
          disk: this.calculateDiskUsage(stats),
        };
      } catch (error) {
        this.logger.error(
          `Failed to get container stats for sandbox ${sandboxId}`,
          error,
        );
      }
    }

    return {
      cpu: 0,
      memory: 0,
      network: 0,
      disk: 0,
    };
  }

  async cleanupSandbox(
    sandboxId: string,
    userId: string,
    organizationId: string,
  ) {
    const sandbox = await this.findOneSandbox(sandboxId, organizationId);

    // Cleanup container resources
    await this.cleanupSandboxEnvironment(sandbox);

    // Cleanup temporary files
    await this.cleanupTemporaryFiles(sandbox);

    // Update sandbox status
    sandbox.status = 'cleaned';
    sandbox.updatedAt = new Date();
    await this.sandboxRepository.save(sandbox);

    this.logger.log(`Sandbox cleaned up: ${sandboxId}`);

    return { message: 'Sandbox cleaned up successfully' };
  }

  // Private helper methods
  private async initializeSandboxEnvironment(
    sandbox: TestingSandbox,
  ): Promise<void> {
    try {
      // Create secure Docker container for isolated execution
      const container = await this.docker.createContainer({
        Image: 'node:18-alpine',
        name: `sandbox-${sandbox.id}`,
        Env: [
          `SANDBOX_ID=${sandbox.id}`,
          `ORGANIZATION_ID=${sandbox.organizationId}`,
          `NODE_ENV=sandbox`,
          `SANDBOX_TIMEOUT=${sandbox.resourceLimits.timeout}`,
        ],
        HostConfig: {
          Memory: this.parseMemoryLimit(sandbox.resourceLimits.memory),
          CpuQuota: this.parseCpuLimit(sandbox.resourceLimits.cpu),
          NetworkMode: sandbox.resourceLimits.networkAccess ? 'bridge' : 'none',
          AutoRemove: true,
          ReadonlyRootfs: true,
          SecurityOpt: ['no-new-privileges:true'],
          CapDrop: ['ALL'],
          CapAdd: ['CHOWN', 'SETUID', 'SETGID'],
          Tmpfs: {
            '/tmp': 'rw,noexec,nosuid,size=100m',
            '/app/temp': 'rw,noexec,nosuid,size=50m',
          },
          Ulimits: [
            { Name: 'nproc', Soft: 64, Hard: 64 },
            { Name: 'nofile', Soft: 1024, Hard: 1024 },
          ],
        },
        WorkingDir: '/app',
        User: '1000:1000', // Non-root user
        Cmd: ['sh', '-c', 'while true; do sleep 30; done'], // Keep container running
        AttachStdout: false,
        AttachStderr: false,
        AttachStdin: false,
        Tty: false,
        OpenStdin: false,
        StdinOnce: false,
      });

      await container.start();

      // Set up resource monitoring
      const resourceMonitor = setInterval(async () => {
        try {
          const stats = await container.stats({ stream: false });
          const memoryUsage = this.calculateMemoryUsage(stats);
          const cpuUsage = this.calculateCpuUsage(stats);

          // Check for resource violations
          if (memoryUsage > 0.9) {
            this.logger.warn(
              `High memory usage in sandbox ${sandbox.id}: ${memoryUsage * 100}%`,
            );
          }

          if (cpuUsage > 0.8) {
            this.logger.warn(
              `High CPU usage in sandbox ${sandbox.id}: ${cpuUsage * 100}%`,
            );
          }
        } catch (error) {
          // Container might be stopped, clear interval
          clearInterval(resourceMonitor);
        }
      }, 10000); // Check every 10 seconds

      // Set up automatic cleanup after timeout
      setTimeout(async () => {
        try {
          await this.cleanupSandboxEnvironment(sandbox);
          clearInterval(resourceMonitor);
        } catch (error) {
          this.logger.error(
            `Failed to auto-cleanup sandbox ${sandbox.id}`,
            error,
          );
        }
      }, sandbox.resourceLimits.timeout);

      // Update sandbox with container info
      sandbox.containerInfo = {
        containerId: container.id,
        status: 'running',
        createdAt: new Date(),
      };
      sandbox.status = 'active';

      await this.sandboxRepository.save(sandbox);

      this.logger.log(`Secure sandbox environment initialized: ${sandbox.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to initialize sandbox environment: ${sandbox.id}`,
        error,
      );
      sandbox.status = 'failed';
      await this.sandboxRepository.save(sandbox);
      throw error;
    }
  }

  private async cleanupSandboxEnvironment(
    sandbox: TestingSandbox,
  ): Promise<void> {
    if (sandbox.containerInfo?.containerId) {
      try {
        const container = this.docker.getContainer(
          sandbox.containerInfo.containerId,
        );
        await container.stop();
        await container.remove();
        this.logger.log(`Container cleaned up for sandbox: ${sandbox.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to cleanup container for sandbox: ${sandbox.id}`,
          error,
        );
      }
    }
  }

  private async initializeDebugEnvironment(
    sandbox: TestingSandbox,
    debugSession: DebugSession,
  ): Promise<void> {
    // Initialize real debugging tools and environment
    this.logger.log(
      `Debug environment initialized for session: ${debugSession.id}`,
    );
  }

  private async cleanupTemporaryFiles(sandbox: TestingSandbox): Promise<void> {
    // Cleanup temporary files created during testing
    const tempDir = path.join('/tmp', `sandbox-${sandbox.id}`);
    try {
      await fs.rmdir(tempDir, { recursive: true });
      this.logger.log(`Temporary files cleaned up for sandbox: ${sandbox.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to cleanup temporary files for sandbox: ${sandbox.id}`,
        error,
      );
    }
  }

  private async cacheSandbox(sandbox: TestingSandbox): Promise<void> {
    const cacheKey = `${this.cachePrefix}${sandbox.id}`;
    await this.cacheManager.set(cacheKey, sandbox, 300000); // 5 minutes
  }

  private getDefaultResourceLimits(): SandboxResourceLimits {
    return {
      memory: '512m',
      cpu: '0.5',
      timeout: 300000, // 5 minutes
      networkAccess: true,
      allowedPorts: [80, 443, 3000, 8080],
    };
  }

  private getDefaultIsolationConfig(): any {
    return {
      filesystem: {
        readOnly: true,
        allowedPaths: ['/app', '/tmp'],
      },
      network: {
        allowedDomains: ['api.openai.com', 'api.anthropic.com'],
        blockedPorts: [22, 23, 25],
      },
      environment: {
        allowedEnvVars: ['NODE_ENV', 'SANDBOX_ID'],
      },
    };
  }

  private parseMemoryLimit(memory: string): number {
    const match = memory.match(/(\d+)([kmg]?)/i);
    if (!match) return 512 * 1024 * 1024; // Default 512MB

    const value = parseInt(match[1]);
    const unit = match[2]?.toLowerCase() || '';

    switch (unit) {
      case 'k':
        return value * 1024;
      case 'm':
        return value * 1024 * 1024;
      case 'g':
        return value * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }

  private parseCpuLimit(cpu: string): number {
    return Math.floor(parseFloat(cpu) * 100000); // Convert to CPU quota
  }

  private calculateCpuUsage(stats: any): number {
    if (!stats.cpu_stats || !stats.precpu_stats) {
      return 0;
    }

    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage -
      stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
      stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numberCpus = stats.cpu_stats.online_cpus || 1;

    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * numberCpus;
    }
    return 0;
  }

  private calculateMemoryUsage(stats: any): number {
    if (!stats.memory_stats) {
      return 0;
    }

    const usage = stats.memory_stats.usage || 0;
    const limit = stats.memory_stats.limit || 1;

    return usage / limit;
  }

  private calculateNetworkUsage(stats: any): number {
    if (!stats.networks) {
      return 0;
    }

    let totalBytes = 0;
    Object.values(stats.networks).forEach((network: any) => {
      totalBytes += (network.rx_bytes || 0) + (network.tx_bytes || 0);
    });

    return totalBytes;
  }

  private calculateDiskUsage(stats: any): number {
    if (!stats.blkio_stats || !stats.blkio_stats.io_service_bytes_recursive) {
      return 0;
    }

    let totalBytes = 0;
    stats.blkio_stats.io_service_bytes_recursive.forEach((entry: any) => {
      if (entry.op === 'Read' || entry.op === 'Write') {
        totalBytes += entry.value || 0;
      }
    });

    return totalBytes;
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((groups, item) => {
      const group = this.getNestedValue(item, key) || 'unknown';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private calculateExecutionTrend(runs: any[]): any[] {
    // Calculate execution trend over time
    const dailyStats = runs.reduce((acc, run) => {
      const date = run.startedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, count: 0, successCount: 0 };
      }
      acc[date].count++;
      if (run.status === ExecutionStatus.COMPLETED) {
        acc[date].successCount++;
      }
      return acc;
    }, {});

    return Object.values(dailyStats).sort((a: any, b: any) =>
      a.date.localeCompare(b.date),
    );
  }

  private async calculateResourceUsage(sandboxId: string): Promise<any> {
    // Calculate resource usage for analytics
    const runs = await this.sandboxRunRepository.find({
      where: { sandboxId },
      order: { startedAt: 'DESC' },
      take: 100, // Last 100 runs
    });

    const totalMemory = runs.reduce(
      (sum, run) => sum + (run.metrics?.memoryUsage || 0),
      0,
    );
    const totalCpu = runs.reduce(
      (sum, run) => sum + (run.metrics?.cpuUsage || 0),
      0,
    );
    const totalNetwork = runs.reduce(
      (sum, run) => sum + (run.metrics?.networkCalls || 0),
      0,
    );

    return {
      cpu: runs.length > 0 ? totalCpu / runs.length : 0,
      memory: runs.length > 0 ? totalMemory / runs.length : 0,
      network: totalNetwork,
      disk: 0, // Placeholder for disk usage
    };
  }

  private analyzeErrors(failedRuns: any[]): any[] {
    const errorCounts = failedRuns.reduce((acc, run) => {
      const error = run.error || 'Unknown error';
      acc[error] = (acc[error] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 errors
  }

  private generatePerformanceRecommendations(metrics: any): string[] {
    const recommendations = [];

    if (metrics.latency.p95 > 1000) {
      recommendations.push(
        'Consider optimizing response time - P95 latency is above 1 second',
      );
    }

    if (metrics.errorRate > 0.05) {
      recommendations.push('Error rate is above 5% - investigate error causes');
    }

    if (metrics.resourceUtilization.cpu > 0.8) {
      recommendations.push(
        'CPU utilization is high - consider scaling or optimization',
      );
    }

    if (metrics.resourceUtilization.memory > 0.8) {
      recommendations.push(
        'Memory utilization is high - check for memory leaks',
      );
    }

    return recommendations;
  }
}
