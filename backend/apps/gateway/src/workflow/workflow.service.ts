import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow, WorkflowExecution } from '@database/entities';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  TestWorkflowDto,
  ExecuteWorkflowDto,
} from './dto';
import { ExecutionStatus } from '@shared/enums/execution-status.enum';

import { WorkflowExecutionEngine } from './workflow-execution.engine';
import { safeErrorMessage, getSafeErrorInfo } from '@shared/utils/error-guards';
import { AgentService } from '../agent/agent.service';
import { ToolService } from '../tool/tool.service';
import { HITLService } from '../hitl/hitl.service';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowExecution)
    private readonly workflowExecutionRepository: Repository<WorkflowExecution>,
    private readonly workflowExecutionEngine: WorkflowExecutionEngine,
    private readonly agentService: AgentService,
    private readonly toolService: ToolService,
    private readonly hitlService: HITLService,
  ) { }

  async create(createWorkflowDto: CreateWorkflowDto): Promise<Workflow> {
    const workflow = this.workflowRepository.create({
      ...createWorkflowDto,
      isActive: createWorkflowDto.isActive ?? true,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.workflowRepository.save(workflow);
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) {
    const { page = 1, limit = 20, search, isActive } = options;
    const queryBuilder = this.workflowRepository.createQueryBuilder('workflow');

    if (search) {
      queryBuilder.andWhere(
        '(workflow.name ILIKE :search OR workflow.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('workflow.isActive = :isActive', { isActive });
    }

    queryBuilder
      .orderBy('workflow.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [workflows, total] = await queryBuilder.getManyAndCount();

    return {
      data: workflows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Workflow> {
    const workflow = await this.workflowRepository.findOne({ where: { id } });
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }
    return workflow;
  }

  async update(
    id: string,
    updateWorkflowDto: UpdateWorkflowDto,
  ): Promise<Workflow> {
    const workflow = await this.findOne(id);

    Object.assign(workflow, {
      ...updateWorkflowDto,
      updatedAt: new Date(),
    });

    return this.workflowRepository.save(workflow);
  }

  async remove(id: string): Promise<void> {
    const workflow = await this.findOne(id);
    await this.workflowRepository.remove(workflow);
  }

  async test(id: string, testWorkflowDto: TestWorkflowDto): Promise<any> {
    const workflowDto = { ...testWorkflowDto, workflowId: id };
    return this.testWorkflow(workflowDto);
  }

  async testWorkflow(testWorkflowDto: TestWorkflowDto): Promise<any> {
    const workflow = await this.findOne(testWorkflowDto.workflowId);
    const startTime = Date.now();
    let currentOutput: any = null;
    const completedSteps: string[] = [];

    try {
      // Validate workflow definition
      const validation = await this.validateDefinition(workflow.definition);
      if (!validation.isValid) {
        const errorMessage = `Workflow validation failed: ${validation.errors?.join(', ') || 'Unknown validation error'}`;
        this.logger.error(errorMessage, {
          workflowId: testWorkflowDto.workflowId,
        });
        throw new Error(errorMessage);
      }

      // Create test execution context
      const testContext = {
        variables: {
          ...workflow.definition.variables,
          ...testWorkflowDto.variables,
        },
        stepResults: {} as Record<string, any>,
        mockResponses: testWorkflowDto.mockResponses || {},
      };

      // Execute each step using real execution engine
      for (const node of workflow.definition.nodes) {
        const mockKey = `${node.type}_${node.id}`;
        let stepResult: any;

        if (testContext.mockResponses[mockKey]) {
          // Use provided mock response for testing
          stepResult = testContext.mockResponses[mockKey];
        } else {
          // Execute real step based on node type
          try {
            stepResult = await this.executeWorkflowStep(node, testContext.variables, testWorkflowDto);
          } catch (error) {
            // If real execution fails in test mode, fall back to mock
            this.logger.warn(`Real execution failed for step ${node.id}, using mock: ${error instanceof Error ? error.message : 'Unknown error'}`);
            stepResult = this.generateMockResponse(node.type, node.data);
          }
        }

        testContext.stepResults[node.id as string] = stepResult;
        currentOutput = stepResult;
        completedSteps.push(node.id as string);
      }

      const executionTime = Date.now() - startTime;

      const result = {
        id: `test_${Date.now()}`,
        workflowId: testWorkflowDto.workflowId,
        status: ExecutionStatus.COMPLETED,
        input: testWorkflowDto.input,
        output: currentOutput,
        currentStep: null,
        completedSteps,
        variables: testContext.variables,
        stepResults: testContext.stepResults,
        executionTime,
        testMode: true,
        createdAt: new Date(),
        completedAt: new Date(),
      };

      return result;
    } catch (error: any) {
      // Record execution failure
      const executionTime = Date.now() - startTime;
      const result = {
        workflowId: testWorkflowDto.workflowId,
        status: ExecutionStatus.FAILED,
        input: testWorkflowDto.input,
        error: safeErrorMessage(error),
        executionTime,
        testMode: true,
        createdAt: new Date(),
        completedAt: new Date(),
      };

      return result;
    }
  }

  async getExecutions(
    id: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
    },
  ) {
    const { page = 1, limit = 20, status } = options;
    const queryBuilder = this.workflowExecutionRepository
      .createQueryBuilder('execution')
      .where('execution.workflowId = :workflowId', { workflowId: id });

    if (status) {
      queryBuilder.andWhere('execution.status = :status', { status });
    }

    queryBuilder
      .orderBy('execution.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [executions, total] = await queryBuilder.getManyAndCount();

    return {
      data: executions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAnalytics(
    id: string,
    options: {
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const workflow = await this.findOne(id);
    const { startDate, endDate } = options;

    const queryBuilder = this.workflowExecutionRepository
      .createQueryBuilder('execution')
      .where('execution.workflowId = :workflowId', { workflowId: id });

    if (startDate) {
      queryBuilder.andWhere('execution.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('execution.createdAt <= :endDate', { endDate });
    }

    const executions = await queryBuilder.getMany();
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(
      (e: WorkflowExecution) => e.status === ExecutionStatus.COMPLETED,
    ).length;
    const failedExecutions = executions.filter(
      (e: WorkflowExecution) => e.status === ExecutionStatus.FAILED,
    ).length;

    const completedExecutions = executions.filter(
      (e: WorkflowExecution) => e.completedAt && e.createdAt,
    );
    const averageExecutionTime =
      completedExecutions.length > 0
        ? completedExecutions.reduce(
          (sum: number, e: WorkflowExecution) =>
            sum + (e.completedAt!.getTime() - e.createdAt.getTime()),
          0,
        ) / completedExecutions.length
        : 0;

    return {
      totalExecutions,
      successRate:
        totalExecutions > 0
          ? (successfulExecutions / totalExecutions) * 100
          : 0,
      averageExecutionTime,
      errorRate:
        totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0,
      mostCommonErrors: [],
      executionTrends: [],
    };
  }

  async validateDefinition(definition: any) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic definition validation
    if (!definition || typeof definition !== 'object') {
      errors.push('Definition must be a valid object');
    }

    if (!definition.nodes || !Array.isArray(definition.nodes)) {
      errors.push('Definition must have a nodes array');
    }

    if (!definition.edges || !Array.isArray(definition.edges)) {
      errors.push('Definition must have an edges array');
    }

    // Check for start and end nodes
    if (definition.nodes) {
      const hasStart = definition.nodes.some(
        (node: any) => node.type === 'start',
      );
      const hasEnd = definition.nodes.some((node: any) => node.type === 'end');

      if (!hasStart) {
        warnings.push('Workflow should have a start node');
      }

      if (!hasEnd) {
        warnings.push('Workflow should have an end node');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async clone(id: string, cloneData: { name: string; description?: string }) {
    const workflow = await this.findOne(id);

    const clonedWorkflow = this.workflowRepository.create({
      name: cloneData.name,
      description: cloneData.description || `Clone of ${workflow.name}`,
      definition: workflow.definition,
      organizationId: workflow.organizationId,
      userId: workflow.userId,
      isActive: true,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.workflowRepository.save(clonedWorkflow);
  }

  async export(id: string) {
    const workflow = await this.findOne(id);

    return {
      definition: workflow.definition,
      metadata: {
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        exportedAt: new Date(),
        exportedBy: 'system',
      },
    };
  }

  async import(importData: {
    name: string;
    description: string;
    definition: any;
    metadata?: any;
  }) {
    // Validate imported definition
    const validation = await this.validateDefinition(importData.definition);
    if (!validation.isValid) {
      throw new Error(
        `Invalid workflow definition: ${validation.errors?.join(', ')}`,
      );
    }

    const workflow = this.workflowRepository.create({
      name: importData.name,
      description: importData.description,
      definition: importData.definition,
      isActive: true,
      version: '1.0.0',
      metadata: importData.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.workflowRepository.save(workflow);
  }

  private generateMockResponse(stepType: string, stepData: any): any {
    // Fallback mock response only when real execution fails
    const timestamp = new Date();

    this.logger.warn(`Using fallback mock response for step type: ${stepType}`);

    return {
      output: `Fallback mock response for ${stepType} at ${timestamp.toISOString()}`,
      executionTime: 100,
      metadata: {
        stepType,
        executedAt: timestamp,
        fallback: true,
      },
    };
  }


  async executeWorkflow(
    params: {
      workflowId: string;
      input: any;
      sessionId: string;
      context?: any;
      metadata?: any;
      timeout?: number;
    },
    userId: string,
    organizationId: string,
  ): Promise<any> {
    // This is a wrapper around the workflow execution engine
    return this.workflowExecutionEngine.executeWorkflow(
      params.workflowId,
      {
        input: params.input,
        variables: params.context || {},
        timeout: params.timeout || 30000,
        notifyOnCompletion: false,
        retryAttempts: 3,
        executionId: undefined,
      },
      userId,
      organizationId,
    );
  }

  private async executeWorkflowStep(node: any, variables: any, testWorkflowDto: TestWorkflowDto): Promise<any> {
    const startTime = Date.now();

    try {
      switch (node.type) {
        case 'agent':
          return await this.executeAgentStep(node.data.agentId, testWorkflowDto.input, variables);
        case 'tool':
          return await this.executeToolStep(node.data.toolId, testWorkflowDto.input, variables);
        case 'condition':
          return await this.executeConditionStep(node.data, variables);
        case 'hitl':
          return await this.executeHITLStep(node.data, variables);
        case 'start':
          return { output: 'Workflow started', executionTime: 0 };
        case 'end':
          return { output: 'Workflow completed', executionTime: 0 };
        default:
          this.logger.warn(`Unknown node type: ${node.type}, using mock response`);
          return this.generateMockResponse(node.type, node.data);
      }
    } catch (error) {
      this.logger.error(`Failed to execute step ${node.id}:`, error);
      throw error;
    }
  }

  private async executeAgentStep(agentId: string, input: any, variables: any): Promise<any> {
    try {
      // Execute real agent using the agent service
      const result = await this.agentService.execute(
        agentId,
        {
          input: typeof input === 'string' ? input : JSON.stringify(input),
          context: variables,
          metadata: { testMode: true },
        },
        'system', // system user for testing
        'system' // system organization for testing
      );

      return {
        output: result.output,
        cost: result.cost || 0,
        tokensUsed: result.tokensUsed || 0,
        executionTime: result.executionTimeMs,
        provider: result.metadata?.provider || 'unknown',
        model: result.metadata?.model || 'unknown',
        cached: result.metadata?.cached || false,
        metadata: {
          agentId,
          input,
          testMode: true,
          executionId: result.id,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to execute agent ${agentId}:`, error);
      throw error;
    }
  }

  private async executeToolStep(toolId: string, input: any, variables: any): Promise<any> {
    try {
      // Execute real tool using the tool service
      const result = await this.toolService.execute(
        toolId,
        {
          functionName: 'execute',
          parameters: input,
          callerType: 'workflow',
          callerId: 'workflow-test',
          toolCallId: `test_${Date.now()}`,
          timeout: 30000,
        },
        'system', // system user for testing
        'system', // system organization for testing
        `test_session_${Date.now()}`
      );

      return {
        result: result.result,
        cost: result.cost || 0,
        executionTime: result.executionTime || 0,
        metadata: {
          toolId,
          input,
          testMode: true,
          executionId: result.id,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to execute tool ${toolId}:`, error);
      throw error;
    }
  }

  private async executeConditionStep(nodeData: any, variables: any): Promise<any> {
    // Evaluate condition based on variables
    const condition = nodeData.condition;
    const conditionResult = this.evaluateCondition(condition, variables);

    return {
      conditionResult,
      evaluatedAt: new Date(),
      executionTime: 5,
    };
  }

  private async executeHITLStep(nodeData: any, variables: any): Promise<any> {
    try {
      // Create real HITL request for testing
      const hitlRequest = await this.hitlService.createRequest(
        {
          title: `Test HITL Request for ${nodeData.title || 'Workflow Step'}`,
          description: `Test HITL approval required for workflow step`,
          type: 'APPROVAL' as any,
          priority: 'MEDIUM' as any,
          sourceType: 'workflow',
          sourceId: 'workflow-test',
          executionId: `test_${Date.now()}`,
          executionContext: {
            nodeData,
            variables,
          },
        },
        'system', // system user for testing
        'system' // system organization for testing
      );

      // For testing, auto-approve the request
      await this.hitlService.updateRequest(hitlRequest.id, { status: 'APPROVED' }, 'system', 'system');

      return {
        approved: true,
        approvedBy: 'system',
        approvedAt: new Date(),
        executionTime: 100,
        hitlRequestId: hitlRequest.id,
      };
    } catch (error) {
      this.logger.error(`Failed to execute HITL step:`, error);
      // Fallback to mock for testing
      return {
        approved: true,
        approvedBy: 'test-user',
        approvedAt: new Date(),
        executionTime: 100,
      };
    }
  }

  private evaluateCondition(condition: string, variables: any): boolean {
    try {
      // Simple condition evaluation - in production, use a proper expression evaluator
      if (condition.includes('==')) {
        const [left, right] = condition.split('==').map(s => s.trim());
        return variables[left] === right;
      }
      if (condition.includes('!=')) {
        const [left, right] = condition.split('!=').map(s => s.trim());
        return variables[left] !== right;
      }
      if (condition.includes('>')) {
        const [left, right] = condition.split('>').map(s => s.trim());
        return Number(variables[left]) > Number(right);
      }
      if (condition.includes('<')) {
        const [left, right] = condition.split('<').map(s => s.trim());
        return Number(variables[left]) < Number(right);
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }
}
