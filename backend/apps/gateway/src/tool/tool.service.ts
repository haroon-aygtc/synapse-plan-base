import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tool, ToolExecution } from '@database/entities';
import { CreateToolDto, UpdateToolDto, TestToolDto } from './dto';
import { ExecutionStatus } from '@shared/enums';

@Injectable()
export class ToolService {
  constructor(
    @InjectRepository(Tool)
    private readonly toolRepository: Repository<Tool>,
    @InjectRepository(ToolExecution)
    private readonly toolExecutionRepository: Repository<ToolExecution>,
  ) {}

  async create(createToolDto: CreateToolDto): Promise<Tool> {
    const tool = this.toolRepository.create({
      ...createToolDto,
      isActive: createToolDto.isActive ?? true,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.toolRepository.save(tool);
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    isActive?: boolean;
  }) {
    const { page = 1, limit = 20, search, category, isActive } = options;
    const queryBuilder = this.toolRepository.createQueryBuilder('tool');

    if (search) {
      queryBuilder.andWhere(
        '(tool.name ILIKE :search OR tool.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (category) {
      queryBuilder.andWhere('tool.category = :category', { category });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('tool.isActive = :isActive', { isActive });
    }

    queryBuilder
      .orderBy('tool.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [tools, total] = await queryBuilder.getManyAndCount();

    return {
      data: tools,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId?: string): Promise<Tool> {
    const whereClause: any = { id };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const tool = await this.toolRepository.findOne({ where: whereClause });
    if (!tool) {
      throw new NotFoundException(`Tool with ID ${id} not found`);
    }
    return tool;
  }

  async execute(
    toolId: string,
    executeDto: any,
    userId: string,
    organizationId: string,
    sessionId?: string,
  ): Promise<any> {
    const tool = await this.findOne(toolId, organizationId);

    if (!tool.isActive) {
      throw new BadRequestException('Tool is not active');
    }

    const executionId = executeDto.toolCallId || require('uuid').v4();
    const startTime = Date.now();

    // Create execution record
    const execution = this.toolExecutionRepository.create({
      id: executionId,
      toolId,
      functionName: executeDto.functionName || 'execute',
      parameters: executeDto.parameters,
      status: ExecutionStatus.RUNNING,
      callerType: executeDto.callerType || 'user',
      callerId: executeDto.callerId || userId,
      organizationId,
      createdAt: new Date(),
    });

    await this.toolExecutionRepository.save(execution);

    try {
      // Execute the tool
      const result = await this.performToolExecution(tool, executeDto);
      const executionTime = Date.now() - startTime;

      // Update execution record
      execution.status = ExecutionStatus.COMPLETED;
      execution.result = result;
      execution.executionTimeMs = executionTime;
      execution.cost = this.calculateCost(tool, executionTime);
      execution.completedAt = new Date();

      await this.toolExecutionRepository.save(execution);

      return {
        id: executionId,
        toolId,
        functionName: executeDto.functionName || 'execute',
        parameters: executeDto.parameters,
        result,
        status: ExecutionStatus.COMPLETED,
        executionTime,
        cost: execution.cost,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Update execution record with error
      execution.status = ExecutionStatus.FAILED;
      execution.error = error.message;
      execution.executionTimeMs = executionTime;
      execution.completedAt = new Date();

      await this.toolExecutionRepository.save(execution);

      throw error;
    }
  }

  private async performToolExecution(
    tool: Tool,
    executeDto: any,
  ): Promise<any> {
    const { endpoint, method, headers } = tool;
    const { parameters } = executeDto;

    try {
      const axios = require('axios');
      const response = await axios({
        url: endpoint,
        method: method.toLowerCase(),
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        data: method.toUpperCase() !== 'GET' ? parameters : undefined,
        params: method.toUpperCase() === 'GET' ? parameters : undefined,
        timeout: executeDto.timeout || 30000,
      });

      return response.data;
    } catch (error) {
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  }

  private calculateCost(tool: Tool, executionTimeMs: number): number {
    // Simple cost calculation based on execution time
    const baseCost = 0.001; // $0.001 per execution
    const timeCost = (executionTimeMs / 1000) * 0.0001; // $0.0001 per second
    return baseCost + timeCost;
  }

  async update(id: string, updateToolDto: UpdateToolDto): Promise<Tool> {
    const tool = await this.findOne(id);

    Object.assign(tool, {
      ...updateToolDto,
      updatedAt: new Date(),
    });

    return this.toolRepository.save(tool);
  }

  async remove(id: string): Promise<void> {
    const tool = await this.findOne(id);
    await this.toolRepository.remove(tool);
  }

  async test(id: string, testToolDto: TestToolDto) {
    const tool = await this.findOne(id);
    const startTime = Date.now();

    try {
      // Simulate tool execution for testing
      const result = {
        success: true,
        result: {
          message: 'Test execution successful',
          data: testToolDto.parameters,
        },
        executionTime: Date.now() - startTime,
        cost: 0.001,
      };

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
        cost: 0,
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
    const queryBuilder = this.toolExecutionRepository
      .createQueryBuilder('execution')
      .where('execution.toolId = :toolId', { toolId: id });

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
    const tool = await this.findOne(id);
    const { startDate, endDate } = options;

    const queryBuilder = this.toolExecutionRepository
      .createQueryBuilder('execution')
      .where('execution.toolId = :toolId', { toolId: id });

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

    const averageExecutionTime =
      totalExecutions > 0
        ? executions.reduce((sum, e) => sum + (e.executionTimeMs || 0), 0) /
          totalExecutions
        : 0;

    const totalCost = executions.reduce((sum, e) => sum + (e.cost || 0), 0);

    return {
      totalExecutions,
      successRate:
        totalExecutions > 0
          ? (successfulExecutions / totalExecutions) * 100
          : 0,
      averageExecutionTime,
      totalCost,
      errorRate:
        totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0,
      popularFunctions: [
        {
          functionName: 'execute',
          callCount: totalExecutions,
          successRate:
            totalExecutions > 0
              ? (successfulExecutions / totalExecutions) * 100
              : 0,
        },
      ],
    };
  }

  async validateSchema(schema: any) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic schema validation
    if (!schema || typeof schema !== 'object') {
      errors.push('Schema must be a valid object');
    }

    if (!schema.type) {
      errors.push('Schema must have a type property');
    }

    if (!schema.properties) {
      warnings.push('Schema should have properties defined');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async getCategories() {
    const categories = await this.toolRepository
      .createQueryBuilder('tool')
      .select('tool.category', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('tool.isActive = :isActive', { isActive: true })
      .groupBy('tool.category')
      .getRawMany();

    return categories.map((cat) => ({
      name: cat.name || 'Uncategorized',
      count: parseInt(cat.count, 10),
      description: `Tools in the ${cat.name || 'uncategorized'} category`,
    }));
  }

  async search(
    query: string,
    options: {
      category?: string;
      tags?: string[];
      limit?: number;
    },
  ) {
    const { category, tags, limit = 20 } = options;
    const queryBuilder = this.toolRepository
      .createQueryBuilder('tool')
      .where('tool.isActive = :isActive', { isActive: true })
      .andWhere('(tool.name ILIKE :query OR tool.description ILIKE :query)', {
        query: `%${query}%`,
      });

    if (category) {
      queryBuilder.andWhere('tool.category = :category', { category });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('tool.tags && :tags', { tags });
    }

    queryBuilder.orderBy('tool.name', 'ASC').limit(limit);

    return queryBuilder.getMany();
  }
}
