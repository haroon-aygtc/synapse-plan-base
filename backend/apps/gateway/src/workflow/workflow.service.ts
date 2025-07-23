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

  async update(id: string, updateWorkflowDto: UpdateWorkflowDto): Promise<Workflow> {
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
      // Simulate workflow execution for testing
      const result = {
        id: `test_${Date.now()}`,
        workflowId: id,
        status: ExecutionStatus.COMPLETED,
        input: testWorkflowDto.input,
        output: { message: 'Test execution successful', data: testWorkflowDto.input },
        currentStep: null,
        completedSteps: ['start', 'end'],
        variables: testWorkflowDto.variables || {},
        createdAt: new Date(),
        completedAt: new Date(),
      };

      return result;
    } catch (error) {
      return {
        id: `test_${Date.now()}`,
        workflowId: id,
        status: ExecutionStatus.FAILED,
        input: testWorkflowDto.input,
        error: error.message,
        createdAt: new Date(),
        completedAt: new Date(),
      };
    }
  }

  async getExecutions(id: string, options: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
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

  async getAnalytics(id: string, options: {
    startDate?: Date;
    endDate?: Date;
  }) {
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
    const averageExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce(
          (sum, e) => sum + (e.completedAt!.getTime() - e.createdAt.getTime()),
          0,
        ) / completedExecutions.length
      : 0;

    return {
      totalExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      averageExecutionTime,
      errorRate: totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0,
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
      const hasStart = definition.nodes.some((node: any) => node.type === 'start');
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
    const workflow = this.workflowRepository.create({
      name: importData.name,
      description: importData.description,
      definition: importData.definition,
      isActive: true,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.workflowRepository.save(workflow);
  }
}
