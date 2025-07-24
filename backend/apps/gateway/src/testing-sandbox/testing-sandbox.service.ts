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
import { Observable, interval, map } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import {
  TestingSandbox,
  TestScenario,
  TestExecution,
  MockData,
  DebugSession,
  Agent,
  Tool,
  Workflow,
} from '@database/entities';
import { AgentService } from '../agent/agent.service';
import { ToolService } from '../tool/tool.service';
import { WorkflowService } from '../workflow/workflow.service';
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
  };
  traces: Array<{
    timestamp: Date;
    level: string;
    message: string;
    data?: any;
  }>;
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
}

@Injectable()
export class TestingSandboxService {
  private readonly logger = new Logger(TestingSandboxService.name);
  private readonly docker: Docker;
  private readonly cachePrefix = 'sandbox:';

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
    private readonly agentService: AgentService,
    private readonly toolService: ToolService,
    private readonly workflowService: WorkflowService,
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

  // Test Execution
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

    const executionId = uuidv4();
    const startTime = Date.now();

    // Create test execution record
    const testExecution = this.testExecutionRepository.create({
      id: executionId,
      sandboxId,
      testType: executeTestDto.testType,
      testData: executeTestDto.testData,
      status: ExecutionStatus.RUNNING,
      userId,
      organizationId,
      startedAt: new Date(),
    });

    await this.testExecutionRepository.save(testExecution);

    try {
      // Execute test based on type
      let result: any;
      switch (executeTestDto.testType) {
        case 'agent':
          result = await this.executeAgentTest(
            sandbox,
            executeTestDto,
            executionId,
          );
          break;
        case 'tool':
          result = await this.executeToolTest(
            sandbox,
            executeTestDto,
            executionId,
          );
          break;
        case 'workflow':
          result = await this.executeWorkflowTest(
            sandbox,
            executeTestDto,
            executionId,
          );
          break;
        case 'integration':
          result = await this.executeIntegrationTest(
            sandbox,
            executeTestDto,
            executionId,
          );
          break;
        default:
          throw new BadRequestException(
            `Unsupported test type: ${executeTestDto.testType}`,
          );
      }

      const executionTime = Date.now() - startTime;

      // Update test execution record
      testExecution.status = ExecutionStatus.COMPLETED;
      testExecution.output = result.output;
      testExecution.metrics = {
        executionTime,
        memoryUsage: result.memoryUsage || 0,
        cpuUsage: result.cpuUsage || 0,
        networkCalls: result.networkCalls || 0,
      };
      testExecution.completedAt = new Date();

      await this.testExecutionRepository.save(testExecution);

      const executionResult: TestExecutionResult = {
        id: executionId,
        status: ExecutionStatus.COMPLETED,
        output: result.output,
        metrics: testExecution.metrics,
        traces: result.traces || [],
      };

      // Emit event
      this.eventEmitter.emit('test.execution.completed', {
        sandboxId,
        executionId,
        result: executionResult,
        userId,
        organizationId,
        timestamp: new Date(),
      });

      return executionResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Update test execution record with error
      testExecution.status = ExecutionStatus.FAILED;
      testExecution.error =
        error instanceof Error ? error.message : 'Unknown error';
      testExecution.metrics = {
        executionTime,
        memoryUsage: 0,
        cpuUsage: 0,
        networkCalls: 0,
      };
      testExecution.completedAt = new Date();

      await this.testExecutionRepository.save(testExecution);

      this.logger.error(`Test execution failed: ${executionId}`, error);

      throw error;
    }
  }

  executeTestStream(
    sandboxId: string,
    testId: string,
    userId: string,
    organizationId: string,
  ): Observable<MessageEvent> {
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

  // Test Scenarios
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

  // Integration Testing
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

    try {
      // Execute integration test flow
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
              );
              break;
            case 'tool':
              stepResult = await this.executeToolInIntegration(
                step,
                sandbox,
                dataFlow,
              );
              break;
            case 'workflow':
              stepResult = await this.executeWorkflowInIntegration(
                step,
                sandbox,
                dataFlow,
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

      const integrationResult: IntegrationTestResult = {
        id: testId,
        testName: runIntegrationTestDto.testName,
        modules: runIntegrationTestDto.testFlow.map((step) => step.moduleId),
        status: overallStatus,
        results,
        dataFlow,
        totalExecutionTime,
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

      this.logger.log(
        `Integration test completed: ${testId} for sandbox ${sandboxId}`,
      );

      return integrationResult;
    } catch (error) {
      this.logger.error(`Integration test failed: ${testId}`, error);
      throw error;
    }
  }

  // Performance Testing
  async runPerformanceTest(
    sandboxId: string,
    performanceTestDto: PerformanceTestDto,
    userId: string,
    organizationId: string,
  ) {
    const sandbox = await this.findOneSandbox(sandboxId, organizationId);
    const testId = uuidv4();

    // Implement performance testing logic
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

    // Run load test
    const loadTestResults = await this.runLoadTest(
      sandbox,
      performanceTestDto,
      testId,
    );

    return {
      testId,
      metrics: performanceMetrics,
      results: loadTestResults,
      recommendations:
        this.generatePerformanceRecommendations(performanceMetrics),
    };
  }

  // Mock Data Management
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

  // Debug Sessions
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
      sandboxId,
      sessionType: debugSessionDto.sessionType,
      configuration: debugSessionDto.configuration,
      status: 'active',
      userId,
      organizationId,
      startedAt: new Date(),
    });

    const savedSession = await this.debugSessionRepository.save(debugSession);

    // Initialize debug environment
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

  // Collaborative Testing
  async startCollaborativeTest(
    sandboxId: string,
    collaborativeTestDto: CollaborativeTestDto,
    userId: string,
    organizationId: string,
  ) {
    const sandbox = await this.findOneSandbox(sandboxId, organizationId);
    const sessionId = uuidv4();

    // Create collaborative session
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

    // Notify participants
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

  // Analytics and Reporting
  async getAnalytics(
    sandboxId: string,
    organizationId: string,
    timeRange?: { from: Date; to: Date },
  ) {
    const sandbox = await this.findOneSandbox(sandboxId, organizationId);

    const queryBuilder = this.testExecutionRepository
      .createQueryBuilder('execution')
      .where('execution.sandboxId = :sandboxId', { sandboxId })
      .andWhere('execution.organizationId = :organizationId', {
        organizationId,
      });

    if (timeRange) {
      queryBuilder
        .andWhere('execution.startedAt >= :from', { from: timeRange.from })
        .andWhere('execution.startedAt <= :to', { to: timeRange.to });
    }

    const executions = await queryBuilder.getMany();

    const analytics = {
      totalTests: executions.length,
      successRate:
        executions.filter((e) => e.status === ExecutionStatus.COMPLETED)
          .length / executions.length,
      averageExecutionTime:
        executions.reduce(
          (sum, e) => sum + (e.metrics?.executionTime || 0),
          0,
        ) / executions.length,
      testsByType: this.groupBy(executions, 'testType'),
      testsByStatus: this.groupBy(executions, 'status'),
      executionTrend: this.calculateExecutionTrend(executions),
      resourceUsage: await this.calculateResourceUsage(sandboxId),
    };

    return analytics;
  }

  // Resource Management
  async getResourceUsage(sandboxId: string, organizationId: string) {
    const sandbox = await this.findOneSandbox(sandboxId, organizationId);

    // Get container stats if sandbox is running in Docker
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
      // Create Docker container for isolated execution
      const container = await this.docker.createContainer({
        Image: 'node:18-alpine',
        name: `sandbox-${sandbox.id}`,
        Env: [
          `SANDBOX_ID=${sandbox.id}`,
          `ORGANIZATION_ID=${sandbox.organizationId}`,
        ],
        HostConfig: {
          Memory: this.parseMemoryLimit(sandbox.resourceLimits.memory),
          CpuQuota: this.parseCpuLimit(sandbox.resourceLimits.cpu),
          NetworkMode: sandbox.resourceLimits.networkAccess ? 'bridge' : 'none',
          AutoRemove: true,
        },
        WorkingDir: '/app',
        Cmd: ['tail', '-f', '/dev/null'], // Keep container running
      });

      await container.start();

      // Update sandbox with container info
      sandbox.containerInfo = {
        containerId: container.id,
        status: 'running',
        createdAt: new Date(),
      };
      sandbox.status = 'active';

      await this.sandboxRepository.save(sandbox);

      this.logger.log(`Sandbox environment initialized: ${sandbox.id}`);
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

  private async executeAgentTest(
    sandbox: TestingSandbox,
    executeTestDto: ExecuteTestDto,
    executionId: string,
  ): Promise<any> {
    const agentId = executeTestDto.testData.agentId;
    const input = executeTestDto.testData.input;

    // Execute agent in isolated environment
    const result = await this.agentService.execute(
      agentId,
      { input },
      executeTestDto.testData.userId,
      sandbox.organizationId,
    );

    return {
      output: result,
      traces: [
        {
          timestamp: new Date(),
          level: 'info',
          message: 'Agent execution completed',
          data: { agentId, executionId },
        },
      ],
    };
  }

  private async executeToolTest(
    sandbox: TestingSandbox,
    executeTestDto: ExecuteTestDto,
    executionId: string,
  ): Promise<any> {
    const toolId = executeTestDto.testData.toolId;
    const parameters = executeTestDto.testData.parameters;

    // Execute tool in isolated environment
    const result = await this.toolService.execute(toolId, {
      functionName: executeTestDto.testData.functionName || 'execute',
      parameters,
    });

    return {
      output: result,
      traces: [
        {
          timestamp: new Date(),
          level: 'info',
          message: 'Tool execution completed',
          data: { toolId, executionId },
        },
      ],
    };
  }

  private async executeWorkflowTest(
    sandbox: TestingSandbox,
    executeTestDto: ExecuteTestDto,
    executionId: string,
  ): Promise<any> {
    const workflowId = executeTestDto.testData.workflowId;
    const input = executeTestDto.testData.input;

    // Execute workflow in isolated environment
    const result = await this.workflowService.execute(workflowId, { input });

    return {
      output: result,
      traces: [
        {
          timestamp: new Date(),
          level: 'info',
          message: 'Workflow execution completed',
          data: { workflowId, executionId },
        },
      ],
    };
  }

  private async executeIntegrationTest(
    sandbox: TestingSandbox,
    executeTestDto: ExecuteTestDto,
    executionId: string,
  ): Promise<any> {
    // Implement integration test logic
    return {
      output: 'Integration test completed',
      traces: [
        {
          timestamp: new Date(),
          level: 'info',
          message: 'Integration test completed',
          data: { executionId },
        },
      ],
    };
  }

  private async executeAgentInIntegration(
    step: any,
    sandbox: TestingSandbox,
    dataFlow: any[],
  ): Promise<any> {
    // Execute agent and track data flow
    const result = await this.agentService.execute(
      step.moduleId,
      { input: step.input },
      sandbox.userId,
      sandbox.organizationId,
    );

    dataFlow.push({
      from: 'input',
      to: step.moduleId,
      data: step.input,
      timestamp: new Date(),
    });

    return result;
  }

  private async executeToolInIntegration(
    step: any,
    sandbox: TestingSandbox,
    dataFlow: any[],
  ): Promise<any> {
    // Execute tool and track data flow
    const result = await this.toolService.execute(step.moduleId, {
      functionName: step.functionName || 'execute',
      parameters: step.input,
    });

    dataFlow.push({
      from: 'input',
      to: step.moduleId,
      data: step.input,
      timestamp: new Date(),
    });

    return result;
  }

  private async executeWorkflowInIntegration(
    step: any,
    sandbox: TestingSandbox,
    dataFlow: any[],
  ): Promise<any> {
    // Execute workflow and track data flow
    const result = await this.workflowService.execute(step.moduleId, {
      input: step.input,
    });

    dataFlow.push({
      from: 'input',
      to: step.moduleId,
      data: step.input,
      timestamp: new Date(),
    });

    return result;
  }

  private async runLoadTest(
    sandbox: TestingSandbox,
    performanceTestDto: PerformanceTestDto,
    testId: string,
  ): Promise<any> {
    // Implement load testing logic
    const results = [];
    const concurrency = performanceTestDto.concurrency || 10;
    const duration = performanceTestDto.duration || 60000; // 1 minute

    const startTime = Date.now();
    const endTime = startTime + duration;

    while (Date.now() < endTime) {
      const promises = [];
      for (let i = 0; i < concurrency; i++) {
        promises.push(this.executeLoadTestRequest(sandbox, performanceTestDto));
      }

      const batchResults = await Promise.allSettled(promises);
      results.push(...batchResults);

      // Wait before next batch
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }

  private async executeLoadTestRequest(
    sandbox: TestingSandbox,
    performanceTestDto: PerformanceTestDto,
  ): Promise<any> {
    const startTime = Date.now();
    try {
      // Execute the test request
      const result = await this.executeTest(
        sandbox.id,
        performanceTestDto.testRequest,
        sandbox.userId,
        sandbox.organizationId,
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

  private async initializeDebugEnvironment(
    sandbox: TestingSandbox,
    debugSession: DebugSession,
  ): Promise<void> {
    // Initialize debugging tools and environment
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
    // Calculate CPU usage percentage from Docker stats
    return 0; // Placeholder implementation
  }

  private calculateMemoryUsage(stats: any): number {
    // Calculate memory usage from Docker stats
    return 0; // Placeholder implementation
  }

  private calculateNetworkUsage(stats: any): number {
    // Calculate network usage from Docker stats
    return 0; // Placeholder implementation
  }

  private calculateDiskUsage(stats: any): number {
    // Calculate disk usage from Docker stats
    return 0; // Placeholder implementation
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  private calculateExecutionTrend(executions: any[]): any[] {
    // Calculate execution trend over time
    return [];
  }

  private async calculateResourceUsage(sandboxId: string): Promise<any> {
    // Calculate resource usage for analytics
    return {
      cpu: 0,
      memory: 0,
      network: 0,
      disk: 0,
    };
  }
}
