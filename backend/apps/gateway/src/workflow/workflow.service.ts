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
    switch (stepType) {
      case 'agent':
        return {
          output: `Mock agent response for ${stepData.agentId || 'unknown agent'}`,
          cost: 0.01,
          tokensUsed: 100,
          executionTime: 1000,
        };
      case 'tool':
        return {
          result: {
            success: true,
            data: `Mock tool result for ${stepData.toolId || 'unknown tool'}`,
          },
          cost: 0.001,
          executionTime: 500,
        };
      case 'condition':
        return {
          conditionResult: true,
          executionTime: 10,
        };
      case 'hitl':
        return {
          approved: true,
          approvedBy: 'test-user',
          executionTime: 100,
        };
      default:
        return {
          output: `Mock response for ${stepType}`,
          executionTime: 100,
        };
    }
  }
}
