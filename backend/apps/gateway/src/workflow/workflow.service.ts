import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow, WorkflowExecution } from '@database/entities';
import { CreateWorkflowDto, UpdateWorkflowDto, TestWorkflowDto } from './dto';
import { ExecutionStatus } from '@shared/enums';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowExecution)
    private readonly workflowExecutionRepository: Repository<WorkflowExecution>,
  ) {}

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

  async test(id: string, testWorkflowDto: TestWorkflowDto) {
    const workflow = await this.findOne(id);
    const startTime = Date.now();

    try {
      // Validate workflow definition
      const validation = await this.validateDefinition(workflow.definition);
      if (!validation.isValid) {
        throw new Error(
          `Workflow validation failed: ${validation.errors.join(', ')}`,
        );
      }

      // Create test execution context
      const testContext = {
        variables: {
          ...workflow.definition.variables,
          ...testWorkflowDto.variables,
        },
        stepResults: {},
        mockResponses: testWorkflowDto.mockResponses || {},
      };

      // Simulate step execution with mock responses
      const nodes = workflow.definition.nodes || [];
      const completedSteps: string[] = [];
      let currentOutput = testWorkflowDto.input;

      for (const node of nodes) {
        if (node.type === 'start') {
          completedSteps.push(node.id);
          continue;
        }

        if (node.type === 'end') {
          completedSteps.push(node.id);
          break;
        }

        // Simulate step execution
        const mockKey = `${node.type}_${node.id}`;
        if (testContext.mockResponses[mockKey]) {
          testContext.stepResults[node.id] = testContext.mockResponses[mockKey];
          currentOutput = testContext.mockResponses[mockKey];
        } else {
          // Default mock response based on step type
          const mockResponse = this.generateMockResponse(node.type, node.data);
          testContext.stepResults[node.id] = mockResponse;
          currentOutput = mockResponse;
        }

        completedSteps.push(node.id);
      }

      const executionTime = Date.now() - startTime;

      const result = {
        id: `test_${Date.now()}`,
        workflowId: id,
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
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        id: `test_${Date.now()}`,
        workflowId: id,
        status: ExecutionStatus.FAILED,
        input: testWorkflowDto.input,
        error: error.message,
        executionTime,
        testMode: true,
        createdAt: new Date(),
        completedAt: new Date(),
      };
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
      (e) => e.status === ExecutionStatus.COMPLETED,
    ).length;
    const failedExecutions = executions.filter(
      (e) => e.status === ExecutionStatus.FAILED,
    ).length;

    const completedExecutions = executions.filter(
      (e) => e.completedAt && e.createdAt,
    );
    const averageExecutionTime =
      completedExecutions.length > 0
        ? completedExecutions.reduce(
            (sum, e) =>
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
        `Invalid workflow definition: ${validation.errors.join(', ')}`,
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
    // Generate realistic mock responses for testing purposes only
    const timestamp = new Date();

    switch (stepType) {
      case 'agent':
        return {
          output: `Test agent response for ${stepData.agentId || 'unknown agent'} at ${timestamp.toISOString()}`,
          cost: Math.random() * 0.02 + 0.005, // Random cost between 0.005-0.025
          tokensUsed: Math.floor(Math.random() * 200) + 50, // Random tokens 50-250
          executionTime: Math.floor(Math.random() * 2000) + 500, // Random time 500-2500ms
          provider: 'test-provider',
          model: 'test-model',
          cached: false,
        };
      case 'tool':
        return {
          result: {
            success: true,
            data: `Test tool result for ${stepData.toolId || 'unknown tool'} at ${timestamp.toISOString()}`,
            metadata: {
              toolId: stepData.toolId,
              executedAt: timestamp,
            },
          },
          cost: Math.random() * 0.005 + 0.001, // Random cost between 0.001-0.006
          executionTime: Math.floor(Math.random() * 1000) + 200, // Random time 200-1200ms
        };
      case 'condition':
        return {
          conditionResult: Math.random() > 0.3, // 70% chance of true
          evaluatedAt: timestamp,
          executionTime: Math.floor(Math.random() * 50) + 5, // Random time 5-55ms
        };
      case 'hitl':
        return {
          approved: Math.random() > 0.2, // 80% chance of approval
          approvedBy: 'test-user',
          approvedAt: timestamp,
          executionTime: Math.floor(Math.random() * 500) + 50, // Random time 50-550ms
        };
      default:
        return {
          output: `Test response for ${stepType} at ${timestamp.toISOString()}`,
          executionTime: Math.floor(Math.random() * 200) + 50, // Random time 50-250ms
          metadata: {
            stepType,
            executedAt: timestamp,
          },
        };
    }
  }

  private async executeAgentStep(
    agentId: string,
    input: any,
    testData: any,
  ): Promise<any> {
    // This would execute a real agent in production
    // For now, return enhanced mock response
    return {
      output: `Real agent execution would happen here for agent ${agentId}`,
      cost: 0.015,
      tokensUsed: 150,
      executionTime: 1200,
      provider: 'openai',
      model: 'gpt-4',
      cached: false,
      metadata: {
        agentId,
        input,
        testMode: true,
      },
    };
  }

  private async executeToolStep(
    toolId: string,
    input: any,
    testData: any,
  ): Promise<any> {
    // This would execute a real tool in production
    // For now, return enhanced mock response
    return {
      result: {
        success: true,
        data: `Real tool execution would happen here for tool ${toolId}`,
        metadata: {
          toolId,
          input,
          testMode: true,
        },
      },
      cost: 0.003,
      executionTime: 800,
    };
  }
}
