import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Tool, ToolExecution, Agent, Workflow } from '@database/entities';
import { CreateToolDto, UpdateToolDto, TestToolDto } from './dto';
import { ExecutionStatus } from '@shared/enums';
import axios from 'axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { ExecutionType } from '@database/entities/ai-provider-execution.entity';

@Injectable()
export class ToolService {
  private readonly logger = new Logger(ToolService.name);

  constructor(
    @InjectRepository(Tool)
    private readonly toolRepository: Repository<Tool>,
    @InjectRepository(ToolExecution)
    private readonly toolExecutionRepository: Repository<ToolExecution>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
    private readonly eventEmitter: EventEmitter2,
    private readonly aiProviderService: AIProviderService,
  ) {}

  async create(createToolDto: CreateToolDto): Promise<Tool> {
    // Validate endpoint accessibility
    await this.validateEndpoint(
      createToolDto.endpoint,
      createToolDto.method,
      createToolDto.headers,
    );

    // Auto-detect API patterns and generate schema if not provided
    const detectedSchema = await this.detectAPIPatterns(
      createToolDto.endpoint,
      createToolDto.method,
      createToolDto.headers,
    );
    const finalSchema = createToolDto.schema || detectedSchema;

    const tool = this.toolRepository.create({
      ...createToolDto,
      schema: finalSchema,
      isActive: createToolDto.isActive ?? true,
      isPublic: createToolDto.isPublic ?? false,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedTool = await this.toolRepository.save(tool);

    // Emit tool created event
    this.eventEmitter.emit('tool.created', {
      toolId: savedTool.id,
      name: savedTool.name,
      organizationId: savedTool.organizationId,
      userId: savedTool.userId,
    });

    return savedTool;
  }

  private async validateEndpoint(
    endpoint: string,
    method: string,
    headers?: Record<string, string>,
  ): Promise<void> {
    try {
      const response = await axios({
        url: endpoint,
        method: method.toLowerCase() as any,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout: 10000,
        validateStatus: () => true, // Don't throw on any status code
      });

      if (response.status >= 500) {
        throw new BadRequestException(
          `Endpoint returned server error: ${response.status}`,
        );
      }
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new BadRequestException(`Cannot reach endpoint: ${endpoint}`);
      }
      if (error.code === 'ETIMEDOUT') {
        throw new BadRequestException(`Endpoint timeout: ${endpoint}`);
      }
      // Log but don't fail for other errors (might be auth-related)
      this.logger.warn(
        `Endpoint validation warning for ${endpoint}: ${error.message}`,
      );
    }
  }

  async detectAPIPatterns(
    endpoint: string,
    method: string,
    headers?: Record<string, string>,
  ): Promise<any> {
    try {
      // Try to get OpenAPI/Swagger spec
      const possibleSpecUrls = [
        `${endpoint}/swagger.json`,
        `${endpoint}/openapi.json`,
        `${endpoint}/api-docs`,
        `${endpoint.replace(/\/[^\/]*$/, '')}/swagger.json`,
        `${endpoint.replace(/\/[^\/]*$/, '')}/openapi.json`,
      ];

      for (const specUrl of possibleSpecUrls) {
        try {
          const response = await axios.get(specUrl, {
            headers: { Accept: 'application/json' },
            timeout: 5000,
          });

          if (
            response.data &&
            (response.data.openapi || response.data.swagger)
          ) {
            return this.extractSchemaFromOpenAPI(
              response.data,
              endpoint,
              method,
            );
          }
        } catch (error) {
          // Continue to next URL
        }
      }

      // Fallback: Generate basic schema based on endpoint analysis
      return this.generateBasicSchema(endpoint, method);
    } catch (error) {
      this.logger.warn(
        `API pattern detection failed for ${endpoint}: ${error.message}`,
      );
      return this.generateBasicSchema(endpoint, method);
    }
  }

  private extractSchemaFromOpenAPI(
    spec: any,
    endpoint: string,
    method: string,
  ): any {
    const paths = spec.paths || {};
    const pathKey = Object.keys(paths).find((path) => endpoint.includes(path));

    if (pathKey && paths[pathKey] && paths[pathKey][method.toLowerCase()]) {
      const operation = paths[pathKey][method.toLowerCase()];
      return {
        type: 'object',
        properties: this.extractParametersFromOperation(operation),
        required: this.extractRequiredFromOperation(operation),
        description:
          operation.summary ||
          operation.description ||
          'Auto-detected from OpenAPI spec',
      };
    }

    return this.generateBasicSchema(endpoint, method);
  }

  private extractParametersFromOperation(operation: any): any {
    const properties: any = {};

    if (operation.parameters) {
      operation.parameters.forEach((param: any) => {
        properties[param.name] = {
          type: param.schema?.type || 'string',
          description: param.description,
          example: param.example,
        };
      });
    }

    if (
      operation.requestBody?.content?.['application/json']?.schema?.properties
    ) {
      Object.assign(
        properties,
        operation.requestBody.content['application/json'].schema.properties,
      );
    }

    return properties;
  }

  private extractRequiredFromOperation(operation: any): string[] {
    const required: string[] = [];

    if (operation.parameters) {
      operation.parameters.forEach((param: any) => {
        if (param.required) {
          required.push(param.name);
        }
      });
    }

    if (
      operation.requestBody?.content?.['application/json']?.schema?.required
    ) {
      required.push(
        ...operation.requestBody.content['application/json'].schema.required,
      );
    }

    return required;
  }

  private generateBasicSchema(endpoint: string, method: string): any {
    const urlParts = endpoint.split('/');
    const lastPart = urlParts[urlParts.length - 1];

    // Basic schema based on common REST patterns
    const baseSchema = {
      type: 'object',
      properties: {},
      required: [],
      description: `Auto-generated schema for ${method} ${endpoint}`,
    };

    // Add common parameters based on method
    switch (method.toUpperCase()) {
      case 'GET':
        if (lastPart.includes('{') || lastPart.includes(':')) {
          baseSchema.properties = {
            id: { type: 'string', description: 'Resource identifier' },
          };
          baseSchema.required = ['id'];
        } else {
          baseSchema.properties = {
            limit: {
              type: 'number',
              description: 'Number of items to return',
              default: 10,
            },
            offset: {
              type: 'number',
              description: 'Number of items to skip',
              default: 0,
            },
            search: { type: 'string', description: 'Search query' },
          };
        }
        break;
      case 'POST':
        baseSchema.properties = {
          data: { type: 'object', description: 'Data to create' },
        };
        baseSchema.required = ['data'];
        break;
      case 'PUT':
      case 'PATCH':
        baseSchema.properties = {
          id: { type: 'string', description: 'Resource identifier' },
          data: { type: 'object', description: 'Data to update' },
        };
        baseSchema.required = ['id', 'data'];
        break;
      case 'DELETE':
        baseSchema.properties = {
          id: { type: 'string', description: 'Resource identifier' },
        };
        baseSchema.required = ['id'];
        break;
    }

    return baseSchema;
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
      sessionId: sessionId || require('uuid').v4(),
      input: executeDto.parameters,
      status: ExecutionStatus.RUNNING,
      context: {
        functionName: executeDto.functionName || 'execute',
        callerType: executeDto.callerType || 'user',
        callerId: executeDto.callerId || userId,
        organizationId,
      },
      startedAt: new Date(),
      createdAt: new Date(),
    });

    await this.toolExecutionRepository.save(execution);

    try {
      // Execute the tool
      const result = await this.performToolExecution(tool, executeDto);
      const executionTime = Date.now() - startTime;

      // Update execution record
      execution.status = ExecutionStatus.COMPLETED;
      execution.output = result;
      execution.executionTimeMs = executionTime;
      execution.cost = this.calculateCost(tool, executionTime);
      execution.completedAt = new Date();

      await this.toolExecutionRepository.save(execution);

      // Record execution in AI provider metrics if this is an AI-powered tool
      if (tool.category === 'ai' && organizationId && userId) {
        try {
          // This would be for AI-powered tools that use LLM providers
          // For now, we'll skip this for regular API tools
        } catch (error) {
          this.logger.warn(
            `Failed to record tool execution in AI provider metrics: ${error.message}`,
          );
        }
      }

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
      let testContext = {};

      // If testing within workflow context, prepare context data
      if (testToolDto.workflowId && testToolDto.workflowContext) {
        const workflow = await this.workflowRepository.findOne({
          where: { id: testToolDto.workflowId },
        });

        if (workflow) {
          testContext = {
            workflowId: testToolDto.workflowId,
            workflowName: workflow.name,
            stepId: testToolDto.workflowContext.stepId,
            stepName: testToolDto.workflowContext.stepName,
            stepType: testToolDto.workflowContext.stepType,
            previousStepResults:
              testToolDto.workflowContext.previousStepResults || {},
            workflowVariables:
              testToolDto.workflowContext.workflowVariables || {},
            executionId: testToolDto.workflowContext.executionId,
            availableVariables: this.extractAvailableVariables(
              workflow.definition,
              testToolDto.workflowContext.stepId,
            ),
          };
        }
      }

      // Perform actual tool execution with context
      const result = await this.performToolExecution(tool, {
        functionName: testToolDto.functionName,
        parameters: testToolDto.parameters,
        callerType: testToolDto.workflowId ? 'workflow' : 'user',
        callerId: testToolDto.workflowId || 'test',
        timeout: 30000,
      });

      const executionTime = Date.now() - startTime;
      const cost = this.calculateCost(tool, executionTime);

      // Log test execution for analytics
      const execution = this.toolExecutionRepository.create({
        toolId: id,
        sessionId: require('uuid').v4(),
        input: testToolDto.parameters,
        output: result,
        status: ExecutionStatus.COMPLETED,
        context: {
          ...testContext,
          testMode: true,
          functionName: testToolDto.functionName,
        },
        executionTimeMs: executionTime,
        cost,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        createdAt: new Date(),
      });

      await this.toolExecutionRepository.save(execution);

      return {
        success: true,
        result,
        executionTime,
        cost,
        context: testContext,
        recommendations: this.generateTestRecommendations(
          tool,
          testToolDto,
          result,
          executionTime,
        ),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Log failed test execution
      const execution = this.toolExecutionRepository.create({
        toolId: id,
        sessionId: require('uuid').v4(),
        input: testToolDto.parameters,
        status: ExecutionStatus.FAILED,
        error: error.message,
        context: {
          testMode: true,
          functionName: testToolDto.functionName,
          workflowId: testToolDto.workflowId,
        },
        executionTimeMs: executionTime,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        createdAt: new Date(),
      });

      await this.toolExecutionRepository.save(execution);

      return {
        success: false,
        error: error.message,
        executionTime,
        cost: 0,
        recommendations: this.generateTestRecommendations(
          tool,
          testToolDto,
          null,
          executionTime,
          error.message,
        ),
      };
    }
  }

  private generateTestRecommendations(
    tool: any,
    testData: TestToolDto,
    result: any,
    executionTime: number,
    error?: string,
  ) {
    const recommendations = [];

    if (error) {
      recommendations.push({
        type: 'error',
        priority: 'high',
        title: 'Test Failed',
        description: `Tool test failed: ${error}`,
        suggestion:
          'Check tool configuration, authentication, and input parameters',
      });
    }

    if (executionTime > 10000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Slow Execution',
        description: `Test execution took ${executionTime}ms`,
        suggestion: 'Consider optimizing the API call or implementing caching',
      });
    }

    if (testData.workflowId) {
      recommendations.push({
        type: 'workflow_context',
        priority: 'info',
        title: 'Workflow Context Test',
        description: 'Tool tested successfully within workflow context',
        suggestion:
          'Monitor performance when integrated into the full workflow execution',
      });
    }

    if (testData.expectedResult && result) {
      const matches =
        JSON.stringify(result) === JSON.stringify(testData.expectedResult);
      if (!matches) {
        recommendations.push({
          type: 'validation',
          priority: 'medium',
          title: 'Result Mismatch',
          description: 'Actual result does not match expected result',
          suggestion: 'Review test parameters and expected output format',
        });
      }
    }

    return recommendations;
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
      .andWhere(
        '(tool.name ILIKE :query OR tool.description ILIKE :query OR tool.tags::text ILIKE :query)',
        {
          query: `%${query}%`,
        },
      );

    if (category) {
      queryBuilder.andWhere('tool.category = :category', { category });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('tool.tags && :tags', { tags });
    }

    queryBuilder.orderBy('tool.name', 'ASC').limit(limit);

    return queryBuilder.getMany();
  }

  async getToolConnections(toolId: string) {
    const tool = await this.findOne(toolId);

    // Find agents using this tool
    const agents = await this.agentRepository.find({
      where: {
        tools: Like(`%${toolId}%`),
        organizationId: tool.organizationId,
      },
      select: ['id', 'name', 'description', 'isActive', 'createdAt'],
    });

    // Find workflows using this tool
    const workflows = await this.workflowRepository
      .createQueryBuilder('workflow')
      .where('workflow.organizationId = :organizationId', {
        organizationId: tool.organizationId,
      })
      .andWhere('workflow.definition::text LIKE :toolId', {
        toolId: `%${toolId}%`,
      })
      .select([
        'workflow.id',
        'workflow.name',
        'workflow.description',
        'workflow.isActive',
        'workflow.createdAt',
      ])
      .getMany();

    // Get usage statistics
    const usageStats = await this.toolExecutionRepository
      .createQueryBuilder('execution')
      .select([
        'execution.callerType',
        'execution.callerId',
        'COUNT(*) as executionCount',
        'AVG(execution.executionTimeMs) as avgExecutionTime',
        'SUM(execution.cost) as totalCost',
      ])
      .where('execution.toolId = :toolId', { toolId })
      .andWhere('execution.createdAt >= :since', {
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      }) // Last 30 days
      .groupBy('execution.callerType, execution.callerId')
      .getRawMany();

    return {
      agents: agents.map((agent) => ({
        ...agent,
        usage: usageStats.filter(
          (stat) => stat.callerType === 'agent' && stat.callerId === agent.id,
        )[0] || {
          executionCount: 0,
          avgExecutionTime: 0,
          totalCost: 0,
        },
      })),
      workflows: workflows.map((workflow) => ({
        ...workflow,
        usage: usageStats.filter(
          (stat) =>
            stat.callerType === 'workflow' && stat.callerId === workflow.id,
        )[0] || {
          executionCount: 0,
          avgExecutionTime: 0,
          totalCost: 0,
        },
      })),
      totalUsage: {
        totalExecutions: usageStats.reduce(
          (sum, stat) => sum + parseInt(stat.executionCount),
          0,
        ),
        avgExecutionTime:
          usageStats.length > 0
            ? usageStats.reduce(
                (sum, stat) => sum + parseFloat(stat.avgExecutionTime || '0'),
                0,
              ) / usageStats.length
            : 0,
        totalCost: usageStats.reduce(
          (sum, stat) => sum + parseFloat(stat.totalCost || '0'),
          0,
        ),
      },
    };
  }

  async getToolPerformanceMetrics(
    toolId: string,
    period: { start: Date; end: Date },
  ) {
    const tool = await this.findOne(toolId);

    const executions = await this.toolExecutionRepository
      .createQueryBuilder('execution')
      .where('execution.toolId = :toolId', { toolId })
      .andWhere('execution.createdAt >= :start', { start: period.start })
      .andWhere('execution.createdAt <= :end', { end: period.end })
      .getMany();

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(
      (e) => e.status === ExecutionStatus.COMPLETED,
    ).length;
    const failedExecutions = executions.filter(
      (e) => e.status === ExecutionStatus.FAILED,
    ).length;

    const executionTimes = executions
      .filter((e) => e.executionTimeMs)
      .map((e) => e.executionTimeMs!);

    const costs = executions.filter((e) => e.cost).map((e) => e.cost!);

    // Calculate percentiles
    const sortedTimes = executionTimes.sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;

    // Group by day for trends
    const dailyStats = executions.reduce(
      (acc, execution) => {
        const date = execution.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            executions: 0,
            successes: 0,
            failures: 0,
            totalTime: 0,
            totalCost: 0,
          };
        }
        acc[date].executions++;
        if (execution.status === ExecutionStatus.COMPLETED)
          acc[date].successes++;
        if (execution.status === ExecutionStatus.FAILED) acc[date].failures++;
        if (execution.executionTimeMs)
          acc[date].totalTime += execution.executionTimeMs;
        if (execution.cost) acc[date].totalCost += execution.cost;
        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      summary: {
        totalExecutions,
        successRate:
          totalExecutions > 0
            ? (successfulExecutions / totalExecutions) * 100
            : 0,
        errorRate:
          totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0,
        averageExecutionTime:
          executionTimes.length > 0
            ? executionTimes.reduce((sum, time) => sum + time, 0) /
              executionTimes.length
            : 0,
        totalCost: costs.reduce((sum, cost) => sum + cost, 0),
        averageCost:
          costs.length > 0
            ? costs.reduce((sum, cost) => sum + cost, 0) / costs.length
            : 0,
      },
      performance: {
        p50ExecutionTime: p50,
        p95ExecutionTime: p95,
        p99ExecutionTime: p99,
        minExecutionTime: Math.min(...executionTimes) || 0,
        maxExecutionTime: Math.max(...executionTimes) || 0,
      },
      trends: Object.entries(dailyStats)
        .map(([date, stats]) => ({
          date,
          executions: stats.executions,
          successRate:
            stats.executions > 0
              ? (stats.successes / stats.executions) * 100
              : 0,
          averageExecutionTime:
            stats.executions > 0 ? stats.totalTime / stats.executions : 0,
          totalCost: stats.totalCost,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      errorAnalysis: this.analyzeErrors(executions.filter((e) => e.error)),
    };
  }

  private analyzeErrors(failedExecutions: ToolExecution[]) {
    const errorCounts = failedExecutions.reduce(
      (acc, execution) => {
        const error = execution.error || 'Unknown error';
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 errors
  }

  async getMarketplaceTools(options: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sortBy?: 'rating' | 'downloads' | 'name' | 'createdAt';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      sortBy = 'rating',
      sortOrder = 'DESC',
    } = options;

    const queryBuilder = this.toolRepository
      .createQueryBuilder('tool')
      .where('tool.isPublic = :isPublic', { isPublic: true })
      .andWhere('tool.isActive = :isActive', { isActive: true });

    if (search) {
      queryBuilder.andWhere(
        '(tool.name ILIKE :search OR tool.description ILIKE :search OR tool.tags::text ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (category) {
      queryBuilder.andWhere('tool.category = :category', { category });
    }

    // Add rating and download count (would need additional tables in real implementation)
    queryBuilder
      .addSelect("COALESCE(tool.metadata->'rating', '0')::float", 'rating')
      .addSelect("COALESCE(tool.metadata->'downloads', '0')::int", 'downloads')
      .orderBy(
        sortBy === 'rating'
          ? 'rating'
          : sortBy === 'downloads'
            ? 'downloads'
            : sortBy === 'name'
              ? 'tool.name'
              : 'tool.createdAt',
        sortOrder,
      )
      .skip((page - 1) * limit)
      .take(limit);

    const [tools, total] = await queryBuilder.getManyAndCount();

    return {
      data: tools.map((tool) => ({
        ...tool,
        rating: parseFloat(tool.metadata?.rating || '0'),
        downloads: parseInt(tool.metadata?.downloads || '0'),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async installMarketplaceTool(
    toolId: string,
    organizationId: string,
    userId: string,
  ) {
    const marketplaceTool = await this.toolRepository.findOne({
      where: { id: toolId, isPublic: true, isActive: true },
    });

    if (!marketplaceTool) {
      throw new NotFoundException('Marketplace tool not found');
    }

    // Check if already installed
    const existingTool = await this.toolRepository.findOne({
      where: {
        name: marketplaceTool.name,
        organizationId,
        metadata: { originalToolId: toolId },
      },
    });

    if (existingTool) {
      throw new BadRequestException('Tool already installed');
    }

    // Create a copy for the organization
    const installedTool = this.toolRepository.create({
      ...marketplaceTool,
      id: undefined, // Let DB generate new ID
      organizationId,
      userId,
      isPublic: false,
      metadata: {
        ...marketplaceTool.metadata,
        originalToolId: toolId,
        installedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedTool = await this.toolRepository.save(installedTool);

    // Update download count
    await this.toolRepository.update(toolId, {
      metadata: {
        ...marketplaceTool.metadata,
        downloads: (
          parseInt(marketplaceTool.metadata?.downloads || '0') + 1
        ).toString(),
      },
    });

    return savedTool;
  }

  async generateToolTemplates() {
    const templates = [
      {
        id: 'slack-message-sender',
        name: 'Slack Message Sender',
        description:
          'Send messages to Slack channels or users with rich formatting support',
        category: 'communication',
        endpoint: 'https://slack.com/api/chat.postMessage',
        method: 'POST',
        schema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID or name (e.g., #general or C1234567890)',
              example: '#general',
            },
            text: {
              type: 'string',
              description: 'Message text content',
              example: 'Hello from the tool!',
            },
            username: {
              type: 'string',
              description: 'Bot username override',
              example: 'MyBot',
            },
            icon_emoji: {
              type: 'string',
              description: 'Bot emoji icon',
              example: ':robot_face:',
            },
            blocks: {
              type: 'array',
              description: 'Rich message blocks for advanced formatting',
              items: { type: 'object' },
            },
          },
          required: ['channel', 'text'],
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer {token}',
        },
        authentication: {
          type: 'bearer',
          description: 'Slack Bot Token (xoxb-...)',
          guide:
            'Go to https://api.slack.com/apps → Your App → OAuth & Permissions → Bot User OAuth Token',
        },
        tags: ['slack', 'messaging', 'communication', 'notifications'],
        iconUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/slack.svg',
        documentationUrl: 'https://api.slack.com/methods/chat.postMessage',
        rateLimit: { requestsPerMinute: 100, burstLimit: 20 },
        costPerExecution: 0.001,
      },
      {
        id: 'gmail-sender',
        name: 'Gmail Email Sender',
        description: 'Send emails via Gmail API with attachment support',
        category: 'communication',
        endpoint:
          'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        method: 'POST',
        schema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Recipient email address',
              example: 'user@example.com',
            },
            subject: {
              type: 'string',
              description: 'Email subject line',
              example: 'Important Update',
            },
            body: {
              type: 'string',
              description: 'Email body content (HTML or plain text)',
              example: '<h1>Hello!</h1><p>This is an automated email.</p>',
            },
            cc: {
              type: 'string',
              description: 'CC recipients (comma-separated)',
              example: 'cc1@example.com,cc2@example.com',
            },
            bcc: {
              type: 'string',
              description: 'BCC recipients (comma-separated)',
              example: 'bcc@example.com',
            },
            attachments: {
              type: 'array',
              description: 'File attachments',
              items: {
                type: 'object',
                properties: {
                  filename: { type: 'string' },
                  content: {
                    type: 'string',
                    description: 'Base64 encoded content',
                  },
                  mimeType: { type: 'string' },
                },
              },
            },
          },
          required: ['to', 'subject', 'body'],
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer {token}',
        },
        authentication: {
          type: 'oauth2',
          description: 'Gmail OAuth2 access token',
          guide:
            'Set up OAuth2 in Google Cloud Console → Enable Gmail API → Create credentials',
        },
        tags: ['gmail', 'email', 'communication', 'google'],
        iconUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/gmail.svg',
        documentationUrl:
          'https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send',
        rateLimit: { requestsPerMinute: 250, burstLimit: 50 },
        costPerExecution: 0.002,
      },
      {
        id: 'salesforce-lead-creator',
        name: 'Salesforce Lead Creator',
        description:
          'Create and manage leads in Salesforce CRM with validation',
        category: 'crm',
        endpoint:
          'https://{instance}.salesforce.com/services/data/v58.0/sobjects/Lead',
        method: 'POST',
        schema: {
          type: 'object',
          properties: {
            FirstName: {
              type: 'string',
              description: 'Lead first name',
              example: 'John',
            },
            LastName: {
              type: 'string',
              description: 'Lead last name',
              example: 'Doe',
            },
            Company: {
              type: 'string',
              description: 'Company name',
              example: 'Acme Corp',
            },
            Email: {
              type: 'string',
              description: 'Email address',
              example: 'john.doe@acme.com',
            },
            Phone: {
              type: 'string',
              description: 'Phone number',
              example: '+1-555-123-4567',
            },
            Status: {
              type: 'string',
              description: 'Lead status',
              enum: [
                'Open - Not Contacted',
                'Working - Contacted',
                'Closed - Converted',
                'Closed - Not Converted',
              ],
              default: 'Open - Not Contacted',
            },
            LeadSource: {
              type: 'string',
              description: 'Lead source',
              example: 'Web',
            },
            Industry: {
              type: 'string',
              description: 'Industry',
              example: 'Technology',
            },
          },
          required: ['LastName', 'Company'],
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer {token}',
        },
        authentication: {
          type: 'bearer',
          description: 'Salesforce OAuth2 access token',
          guide:
            'Create Connected App in Salesforce Setup → Use OAuth 2.0 Web Server Flow',
        },
        tags: ['salesforce', 'crm', 'leads', 'sales'],
        iconUrl:
          'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/salesforce.svg',
        documentationUrl:
          'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta.api_rest.dome_sobject_create.htm',
        rateLimit: { requestsPerMinute: 100, burstLimit: 25 },
        costPerExecution: 0.003,
      },
      {
        id: 'hubspot-contact-creator',
        name: 'HubSpot Contact Creator',
        description: 'Create and update contacts in HubSpot CRM',
        category: 'crm',
        endpoint: 'https://api.hubapi.com/crm/v3/objects/contacts',
        method: 'POST',
        schema: {
          type: 'object',
          properties: {
            properties: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  description: 'Contact email',
                  example: 'contact@example.com',
                },
                firstname: {
                  type: 'string',
                  description: 'First name',
                  example: 'Jane',
                },
                lastname: {
                  type: 'string',
                  description: 'Last name',
                  example: 'Smith',
                },
                phone: {
                  type: 'string',
                  description: 'Phone number',
                  example: '+1-555-987-6543',
                },
                company: {
                  type: 'string',
                  description: 'Company name',
                  example: 'Example Inc',
                },
                website: {
                  type: 'string',
                  description: 'Website URL',
                  example: 'https://example.com',
                },
                lifecyclestage: {
                  type: 'string',
                  description: 'Lifecycle stage',
                  enum: [
                    'subscriber',
                    'lead',
                    'marketingqualifiedlead',
                    'salesqualifiedlead',
                    'opportunity',
                    'customer',
                  ],
                },
              },
              required: ['email'],
            },
          },
          required: ['properties'],
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer {token}',
        },
        authentication: {
          type: 'bearer',
          description: 'HubSpot Private App Access Token',
          guide:
            'HubSpot Settings → Integrations → Private Apps → Create private app',
        },
        tags: ['hubspot', 'crm', 'contacts', 'marketing'],
        iconUrl:
          'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/hubspot.svg',
        documentationUrl:
          'https://developers.hubspot.com/docs/api/crm/contacts',
        rateLimit: { requestsPerMinute: 100, burstLimit: 10 },
        costPerExecution: 0.002,
      },
      {
        id: 'discord-webhook',
        name: 'Discord Webhook Sender',
        description: 'Send messages to Discord channels via webhooks',
        category: 'communication',
        endpoint:
          'https://discord.com/api/webhooks/{webhook_id}/{webhook_token}',
        method: 'POST',
        schema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Message content',
              example: 'Hello from Discord webhook!',
            },
            username: {
              type: 'string',
              description: 'Override webhook username',
              example: 'Bot Name',
            },
            avatar_url: {
              type: 'string',
              description: 'Override webhook avatar',
              example: 'https://example.com/avatar.png',
            },
            embeds: {
              type: 'array',
              description: 'Rich embed objects',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  color: { type: 'integer' },
                  url: { type: 'string' },
                },
              },
            },
          },
          required: ['content'],
        },
        headers: { 'Content-Type': 'application/json' },
        authentication: {
          type: 'none',
          description: 'Uses webhook URL for authentication',
        },
        tags: ['discord', 'webhook', 'messaging', 'gaming'],
        iconUrl:
          'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/discord.svg',
        documentationUrl:
          'https://discord.com/developers/docs/resources/webhook',
        rateLimit: { requestsPerMinute: 30, burstLimit: 5 },
        costPerExecution: 0.001,
      },
      {
        id: 'stripe-payment-intent',
        name: 'Stripe Payment Intent',
        description: 'Create payment intents for Stripe payments',
        category: 'payments',
        endpoint: 'https://api.stripe.com/v1/payment_intents',
        method: 'POST',
        schema: {
          type: 'object',
          properties: {
            amount: {
              type: 'integer',
              description: 'Amount in cents',
              example: 2000,
            },
            currency: {
              type: 'string',
              description: 'Currency code',
              example: 'usd',
            },
            customer: {
              type: 'string',
              description: 'Customer ID',
              example: 'cus_1234567890',
            },
            description: {
              type: 'string',
              description: 'Payment description',
              example: 'Payment for order #123',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
            },
          },
          required: ['amount', 'currency'],
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Bearer {token}',
        },
        authentication: {
          type: 'bearer',
          description: 'Stripe Secret Key',
          guide: 'Stripe Dashboard → Developers → API keys → Secret key',
        },
        tags: ['stripe', 'payments', 'ecommerce', 'billing'],
        iconUrl:
          'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/stripe.svg',
        documentationUrl: 'https://stripe.com/docs/api/payment_intents/create',
        rateLimit: { requestsPerMinute: 100, burstLimit: 25 },
        costPerExecution: 0.005,
      },
    ];

    return templates;
  }

  async generateAIConfiguration(
    description: string,
    apiUrl?: string,
    serviceType?: string,
  ) {
    try {
      // Use OpenAI or similar service for real AI configuration
      const openaiApiKey = process.env.OPENAI_API_KEY;

      if (openaiApiKey) {
        const openaiResponse = await this.callOpenAIForConfiguration(
          description,
          apiUrl,
          serviceType,
        );

        if (openaiResponse) {
          return {
            success: true,
            data: openaiResponse,
            suggestions: this.generateConfigurationSuggestions(
              description,
              serviceType,
            ),
          };
        }
      }

      // Fallback to intelligent pattern matching
      const config = this.generateIntelligentDefaults(
        description,
        apiUrl,
        serviceType,
      );

      return {
        success: true,
        data: config,
        suggestions: this.generateConfigurationSuggestions(
          description,
          serviceType,
        ),
      };
    } catch (error) {
      this.logger.error(`AI configuration failed: ${error.message}`);
      throw new Error(`AI configuration failed: ${error.message}`);
    }
  }

  private async callOpenAIForConfiguration(
    description: string,
    apiUrl?: string,
    serviceType?: string,
  ) {
    try {
      const axios = require('axios');
      const openaiApiKey = process.env.OPENAI_API_KEY;

      const prompt = `Generate a tool configuration for: "${description}"
${apiUrl ? `API URL: ${apiUrl}` : ''}
${serviceType ? `Service Type: ${serviceType}` : ''}

Return a JSON object with:
- name: descriptive tool name
- description: detailed description
- endpoint: API endpoint URL
- method: HTTP method (GET, POST, PUT, DELETE)
- schema: JSON schema for parameters
- authentication: {type: 'none'|'api_key'|'bearer'|'basic'|'oauth2'}
- headers: required headers object
- category: tool category
- tags: array of relevant tags`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content:
                'You are an API integration expert. Generate tool configurations in valid JSON format only.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        },
        {
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const content = response.data.choices[0]?.message?.content;
      if (content) {
        try {
          return JSON.parse(content);
        } catch (parseError) {
          this.logger.warn('Failed to parse OpenAI response as JSON');
          return null;
        }
      }

      return null;
    } catch (error) {
      this.logger.warn(`OpenAI API call failed: ${error.message}`);
      return null;
    }
  }

  private generateIntelligentDefaults(
    description: string,
    apiUrl?: string,
    serviceType?: string,
  ) {
    const lowerDesc = description.toLowerCase();

    // Detect service type from description
    let detectedService = serviceType;
    if (!detectedService) {
      if (lowerDesc.includes('slack')) detectedService = 'slack';
      else if (lowerDesc.includes('email') || lowerDesc.includes('gmail'))
        detectedService = 'email';
      else if (lowerDesc.includes('salesforce') || lowerDesc.includes('crm'))
        detectedService = 'crm';
      else if (lowerDesc.includes('webhook')) detectedService = 'webhook';
      else if (lowerDesc.includes('database') || lowerDesc.includes('sql'))
        detectedService = 'database';
    }

    // Generate configuration based on detected service
    const baseConfig = {
      name: this.generateToolName(description),
      description: description,
      endpoint: apiUrl || this.suggestEndpoint(detectedService),
      method: this.suggestMethod(description, detectedService),
      category: this.suggestCategory(detectedService),
      tags: this.generateTags(description, detectedService),
      headers: this.suggestHeaders(detectedService),
      authentication: this.suggestAuthentication(detectedService),
      schema: this.generateSchema(description, detectedService),
    };

    return baseConfig;
  }

  private generateToolName(description: string): string {
    // Extract key words and create a proper tool name
    const words = description.split(' ').filter((word) => word.length > 2);
    const keyWords = words
      .slice(0, 3)
      .map(
        (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      );
    return keyWords.join(' ') + ' Tool';
  }

  private suggestEndpoint(serviceType?: string): string {
    const endpoints = {
      slack: 'https://slack.com/api/chat.postMessage',
      email: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      crm: 'https://api.salesforce.com/services/data/v58.0/sobjects/Lead',
      webhook: 'https://hooks.example.com/webhook',
      database: 'https://api.example.com/v1/query',
    };
    return endpoints[serviceType] || 'https://api.example.com/v1/endpoint';
  }

  private suggestMethod(description: string, serviceType?: string): string {
    const lowerDesc = description.toLowerCase();
    if (
      lowerDesc.includes('get') ||
      lowerDesc.includes('fetch') ||
      lowerDesc.includes('retrieve')
    ) {
      return 'GET';
    }
    if (lowerDesc.includes('update') || lowerDesc.includes('modify')) {
      return 'PUT';
    }
    if (lowerDesc.includes('delete') || lowerDesc.includes('remove')) {
      return 'DELETE';
    }
    return 'POST'; // Default for most actions
  }

  private suggestCategory(serviceType?: string): string {
    const categories = {
      slack: 'communication',
      email: 'communication',
      crm: 'crm',
      webhook: 'integration',
      database: 'data',
    };
    return categories[serviceType] || 'integration';
  }

  private generateTags(description: string, serviceType?: string): string[] {
    const baseTags = [];
    const lowerDesc = description.toLowerCase();

    if (serviceType) baseTags.push(serviceType);
    if (lowerDesc.includes('message') || lowerDesc.includes('send'))
      baseTags.push('messaging');
    if (lowerDesc.includes('email')) baseTags.push('email');
    if (lowerDesc.includes('notification')) baseTags.push('notifications');
    if (lowerDesc.includes('data')) baseTags.push('data');
    if (lowerDesc.includes('api')) baseTags.push('api');

    return [...new Set(baseTags)]; // Remove duplicates
  }

  private suggestHeaders(serviceType?: string): Record<string, string> {
    const headers = {
      slack: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer {token}',
      },
      email: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer {token}',
      },
      crm: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer {token}',
      },
      webhook: { 'Content-Type': 'application/json' },
      database: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer {token}',
      },
    };
    return headers[serviceType] || { 'Content-Type': 'application/json' };
  }

  private suggestAuthentication(serviceType?: string) {
    const auth = {
      slack: { type: 'bearer', description: 'Slack Bot Token' },
      email: { type: 'oauth2', description: 'Gmail OAuth2 Token' },
      crm: { type: 'bearer', description: 'Salesforce Access Token' },
      webhook: { type: 'none' },
      database: { type: 'bearer', description: 'Database API Token' },
    };
    return auth[serviceType] || { type: 'api_key', description: 'API Key' };
  }

  private generateSchema(description: string, serviceType?: string) {
    const lowerDesc = description.toLowerCase();

    // Generate schema based on common patterns
    const properties: any = {};
    const required: string[] = [];

    if (lowerDesc.includes('message') || lowerDesc.includes('send')) {
      properties.message = { type: 'string', description: 'Message content' };
      required.push('message');
    }

    if (lowerDesc.includes('email')) {
      properties.to = { type: 'string', description: 'Recipient email' };
      properties.subject = { type: 'string', description: 'Email subject' };
      required.push('to', 'subject');
    }

    if (lowerDesc.includes('name')) {
      properties.name = { type: 'string', description: 'Name' };
      required.push('name');
    }

    if (lowerDesc.includes('data') || lowerDesc.includes('query')) {
      properties.query = { type: 'string', description: 'Query or data' };
      required.push('query');
    }

    // Add common optional parameters
    properties.options = {
      type: 'object',
      description: 'Additional options',
      properties: {
        timeout: { type: 'number', description: 'Request timeout in ms' },
        retries: { type: 'number', description: 'Number of retries' },
      },
    };

    return {
      type: 'object',
      properties,
      required,
      description: `Schema for ${description}`,
    };
  }

  private generateConfigurationSuggestions(
    description: string,
    serviceType?: string,
  ) {
    const suggestions = [];

    if (serviceType === 'slack') {
      suggestions.push('Consider adding support for rich message blocks');
      suggestions.push(
        'Add channel validation to prevent sending to wrong channels',
      );
    }

    if (serviceType === 'email') {
      suggestions.push('Implement email template support');
      suggestions.push('Add attachment handling capabilities');
    }

    if (description.toLowerCase().includes('webhook')) {
      suggestions.push('Add webhook signature verification for security');
      suggestions.push('Implement retry logic for failed webhook calls');
    }

    suggestions.push('Consider adding rate limiting to prevent API abuse');
    suggestions.push('Implement proper error handling and logging');
    suggestions.push('Add input validation for all parameters');

    return suggestions;
  }

  async checkToolHealth(toolId: string) {
    const tool = await this.findOne(toolId);
    const startTime = Date.now();

    try {
      // Perform health check by making a test request
      const response = await axios({
        url: tool.endpoint,
        method: 'HEAD', // Use HEAD to minimize data transfer
        headers: tool.headers,
        timeout: 10000,
        validateStatus: () => true, // Don't throw on any status
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = response.status < 500;

      return {
        toolId,
        isHealthy,
        status: response.status,
        responseTime,
        endpoint: tool.endpoint,
        lastChecked: new Date(),
        details: {
          statusText: response.statusText,
          headers: response.headers,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        toolId,
        isHealthy: false,
        status: 0,
        responseTime,
        endpoint: tool.endpoint,
        lastChecked: new Date(),
        error: error.message,
        details: {
          errorCode: error.code,
          errorType: error.name,
        },
      };
    }
  }

  async getCostAnalysis(
    toolId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const tool = await this.findOne(toolId);
    const { startDate, endDate } = options;

    const queryBuilder = this.toolExecutionRepository
      .createQueryBuilder('execution')
      .where('execution.toolId = :toolId', { toolId });

    if (startDate) {
      queryBuilder.andWhere('execution.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('execution.createdAt <= :endDate', { endDate });
    }

    const executions = await queryBuilder.getMany();

    const totalCost = executions.reduce((sum, e) => sum + (e.cost || 0), 0);
    const totalExecutions = executions.length;
    const averageCost = totalExecutions > 0 ? totalCost / totalExecutions : 0;

    // Calculate cost trends by day
    const dailyCosts = executions.reduce(
      (acc, execution) => {
        const date = execution.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { executions: 0, cost: 0 };
        }
        acc[date].executions++;
        acc[date].cost += execution.cost || 0;
        return acc;
      },
      {} as Record<string, { executions: number; cost: number }>,
    );

    const costTrends = Object.entries(dailyCosts)
      .map(([date, data]) => ({
        date,
        executions: data.executions,
        cost: data.cost,
        averageCost: data.cost / data.executions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Generate optimization recommendations
    const recommendations = this.generateCostOptimizationRecommendations(
      tool,
      executions,
      totalCost,
      averageCost,
    );

    return {
      toolId,
      period: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate || new Date(),
      },
      summary: {
        totalCost,
        totalExecutions,
        averageCost,
        projectedMonthlyCost: this.calculateProjectedMonthlyCost(costTrends),
      },
      trends: costTrends,
      recommendations,
      breakdown: {
        successfulExecutions: executions.filter(
          (e) => e.status === ExecutionStatus.COMPLETED,
        ).length,
        failedExecutions: executions.filter(
          (e) => e.status === ExecutionStatus.FAILED,
        ).length,
        averageExecutionTime:
          executions.reduce((sum, e) => sum + (e.executionTimeMs || 0), 0) /
          totalExecutions,
      },
    };
  }

  private generateCostOptimizationRecommendations(
    tool: Tool,
    executions: ToolExecution[],
    totalCost: number,
    averageCost: number,
  ) {
    const recommendations = [];

    // High cost per execution
    if (averageCost > 0.01) {
      recommendations.push({
        type: 'cost_reduction',
        priority: 'high',
        title: 'High Cost Per Execution',
        description: `Average cost of ${averageCost.toFixed(4)} per execution is above recommended threshold`,
        suggestion:
          'Consider optimizing API calls, implementing caching, or negotiating better API rates',
        potentialSavings: totalCost * 0.3, // Estimated 30% savings
      });
    }

    // High failure rate
    const failureRate =
      executions.filter((e) => e.status === ExecutionStatus.FAILED).length /
      executions.length;
    if (failureRate > 0.1) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        title: 'High Failure Rate',
        description: `${(failureRate * 100).toFixed(1)}% of executions are failing`,
        suggestion:
          'Implement better error handling, retry logic, and input validation',
        potentialSavings: totalCost * failureRate, // Cost of failed executions
      });
    }

    // Slow execution times
    const avgExecutionTime =
      executions.reduce((sum, e) => sum + (e.executionTimeMs || 0), 0) /
      executions.length;
    if (avgExecutionTime > 5000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Slow Execution Times',
        description: `Average execution time of ${avgExecutionTime.toFixed(0)}ms is above optimal range`,
        suggestion:
          'Optimize API calls, implement connection pooling, or consider async processing',
        potentialSavings: totalCost * 0.1, // Estimated 10% savings from efficiency
      });
    }

    // Rate limiting opportunities
    if (tool.rateLimit && tool.rateLimit.requestsPerMinute > 100) {
      recommendations.push({
        type: 'rate_limiting',
        priority: 'low',
        title: 'Rate Limiting Optimization',
        description: 'Current rate limit may be higher than necessary',
        suggestion:
          'Monitor actual usage patterns and adjust rate limits to optimize costs',
        potentialSavings: totalCost * 0.05, // Estimated 5% savings
      });
    }

    return recommendations;
  }

  private calculateProjectedMonthlyCost(costTrends: any[]): number {
    if (costTrends.length === 0) return 0;

    // Calculate average daily cost from recent trends
    const recentTrends = costTrends.slice(-7); // Last 7 days
    const avgDailyCost =
      recentTrends.reduce((sum, trend) => sum + trend.cost, 0) /
      recentTrends.length;

    return avgDailyCost * 30; // Project for 30 days
  }

  async getAgentConnections(toolId: string) {
    const tool = await this.findOne(toolId);

    // Get agents that use this tool
    const agents = await this.agentRepository
      .createQueryBuilder('agent')
      .where('agent.organizationId = :organizationId', {
        organizationId: tool.organizationId,
      })
      .andWhere('agent.tools::jsonb ? :toolId', { toolId })
      .select([
        'agent.id',
        'agent.name',
        'agent.description',
        'agent.isActive',
        'agent.createdAt',
        'agent.performanceMetrics',
      ])
      .getMany();

    // Get usage statistics for each agent
    const agentUsageStats = await Promise.all(
      agents.map(async (agent) => {
        const executions = await this.toolExecutionRepository
          .createQueryBuilder('execution')
          .where('execution.toolId = :toolId', { toolId })
          .andWhere('execution.context->>"callerId" = :agentId', {
            agentId: agent.id,
          })
          .andWhere('execution.context->>"callerType" = :callerType', {
            callerType: 'agent',
          })
          .andWhere('execution.createdAt >= :since', {
            since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          })
          .getMany();

        const totalExecutions = executions.length;
        const successfulExecutions = executions.filter(
          (e) => e.status === ExecutionStatus.COMPLETED,
        ).length;
        const avgExecutionTime =
          totalExecutions > 0
            ? executions.reduce((sum, e) => sum + (e.executionTimeMs || 0), 0) /
              totalExecutions
            : 0;
        const totalCost = executions.reduce((sum, e) => sum + (e.cost || 0), 0);

        return {
          ...agent,
          usage: {
            totalExecutions,
            successfulExecutions,
            successRate:
              totalExecutions > 0
                ? (successfulExecutions / totalExecutions) * 100
                : 0,
            avgExecutionTime,
            totalCost,
            lastExecution: executions[0]?.createdAt || null,
          },
        };
      }),
    );

    return {
      toolId,
      agents: agentUsageStats,
      summary: {
        totalAgents: agents.length,
        activeAgents: agents.filter((a) => a.isActive).length,
        totalExecutions: agentUsageStats.reduce(
          (sum, a) => sum + a.usage.totalExecutions,
          0,
        ),
        totalCost: agentUsageStats.reduce(
          (sum, a) => sum + a.usage.totalCost,
          0,
        ),
      },
    };
  }

  async getWorkflowConnections(toolId: string) {
    const tool = await this.findOne(toolId);

    // Get workflows that use this tool
    const workflows = await this.workflowRepository
      .createQueryBuilder('workflow')
      .where('workflow.organizationId = :organizationId', {
        organizationId: tool.organizationId,
      })
      .andWhere('workflow.definition::text LIKE :toolId', {
        toolId: `%${toolId}%`,
      })
      .select([
        'workflow.id',
        'workflow.name',
        'workflow.description',
        'workflow.isActive',
        'workflow.createdAt',
        'workflow.definition',
      ])
      .getMany();

    // Get usage statistics for each workflow
    const workflowUsageStats = await Promise.all(
      workflows.map(async (workflow) => {
        const executions = await this.toolExecutionRepository
          .createQueryBuilder('execution')
          .where('execution.toolId = :toolId', { toolId })
          .andWhere('execution.context->>"callerId" = :workflowId', {
            workflowId: workflow.id,
          })
          .andWhere('execution.context->>"callerType" = :callerType', {
            callerType: 'workflow',
          })
          .andWhere('execution.createdAt >= :since', {
            since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          })
          .getMany();

        const totalExecutions = executions.length;
        const successfulExecutions = executions.filter(
          (e) => e.status === ExecutionStatus.COMPLETED,
        ).length;
        const avgExecutionTime =
          totalExecutions > 0
            ? executions.reduce((sum, e) => sum + (e.executionTimeMs || 0), 0) /
              totalExecutions
            : 0;
        const totalCost = executions.reduce((sum, e) => sum + (e.cost || 0), 0);

        // Extract tool usage context from workflow definition
        const toolSteps = this.extractToolStepsFromWorkflow(
          workflow.definition,
          toolId,
        );

        return {
          ...workflow,
          toolSteps,
          usage: {
            totalExecutions,
            successfulExecutions,
            successRate:
              totalExecutions > 0
                ? (successfulExecutions / totalExecutions) * 100
                : 0,
            avgExecutionTime,
            totalCost,
            lastExecution: executions[0]?.createdAt || null,
          },
        };
      }),
    );

    return {
      toolId,
      workflows: workflowUsageStats,
      summary: {
        totalWorkflows: workflows.length,
        activeWorkflows: workflows.filter((w) => w.isActive).length,
        totalExecutions: workflowUsageStats.reduce(
          (sum, w) => sum + w.usage.totalExecutions,
          0,
        ),
        totalCost: workflowUsageStats.reduce(
          (sum, w) => sum + w.usage.totalCost,
          0,
        ),
      },
    };
  }

  private extractToolStepsFromWorkflow(definition: any, toolId: string) {
    const steps = [];

    if (definition.steps && Array.isArray(definition.steps)) {
      definition.steps.forEach((step, index) => {
        if (step.toolId === toolId || step.tool === toolId) {
          steps.push({
            stepIndex: index,
            stepName: step.name || `Step ${index + 1}`,
            stepType: step.type || 'tool_execution',
            configuration: step.configuration || {},
            conditions: step.conditions || [],
          });
        }
      });
    }

    return steps;
  }

  async getUsageAnalytics(
    toolId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      groupBy: 'day' | 'week' | 'month';
    },
  ) {
    const { startDate, endDate, groupBy } = options;
    const tool = await this.findOne(toolId);

    const queryBuilder = this.toolExecutionRepository
      .createQueryBuilder('execution')
      .where('execution.toolId = :toolId', { toolId });

    if (startDate) {
      queryBuilder.andWhere('execution.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('execution.createdAt <= :endDate', { endDate });
    }

    const executions = await queryBuilder
      .orderBy('execution.createdAt', 'ASC')
      .getMany();

    // Group executions by time period
    const groupedData = this.groupExecutionsByPeriod(executions, groupBy);

    // Calculate caller patterns
    const callerPatterns = this.analyzeCallerPatterns(executions);

    // Calculate performance trends
    const performanceTrends = this.calculatePerformanceTrends(groupedData);

    // Calculate error patterns
    const errorPatterns = this.analyzeErrorPatterns(executions);

    return {
      toolId,
      period: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate || new Date(),
        groupBy,
      },
      summary: {
        totalExecutions: executions.length,
        successfulExecutions: executions.filter(
          (e) => e.status === ExecutionStatus.COMPLETED,
        ).length,
        failedExecutions: executions.filter(
          (e) => e.status === ExecutionStatus.FAILED,
        ).length,
        avgExecutionTime:
          executions.length > 0
            ? executions.reduce((sum, e) => sum + (e.executionTimeMs || 0), 0) /
              executions.length
            : 0,
        totalCost: executions.reduce((sum, e) => sum + (e.cost || 0), 0),
      },
      trends: performanceTrends,
      callerPatterns,
      errorPatterns,
      groupedData,
    };
  }

  private groupExecutionsByPeriod(
    executions: ToolExecution[],
    groupBy: 'day' | 'week' | 'month',
  ) {
    const grouped = executions.reduce(
      (acc, execution) => {
        let key: string;
        const date = new Date(execution.createdAt);

        switch (groupBy) {
          case 'day':
            key = date.toISOString().split('T')[0];
            break;
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
            break;
          case 'month':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
        }

        if (!acc[key]) {
          acc[key] = {
            period: key,
            executions: [],
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalTime: 0,
            totalCost: 0,
          };
        }

        acc[key].executions.push(execution);
        acc[key].totalExecutions++;

        if (execution.status === ExecutionStatus.COMPLETED) {
          acc[key].successfulExecutions++;
        } else if (execution.status === ExecutionStatus.FAILED) {
          acc[key].failedExecutions++;
        }

        acc[key].totalTime += execution.executionTimeMs || 0;
        acc[key].totalCost += execution.cost || 0;

        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(grouped).map((group: any) => ({
      ...group,
      avgExecutionTime:
        group.totalExecutions > 0 ? group.totalTime / group.totalExecutions : 0,
      successRate:
        group.totalExecutions > 0
          ? (group.successfulExecutions / group.totalExecutions) * 100
          : 0,
      executions: undefined, // Remove executions array to reduce payload size
    }));
  }

  private analyzeCallerPatterns(executions: ToolExecution[]) {
    const patterns = executions.reduce(
      (acc, execution) => {
        const callerType = execution.context?.callerType || 'unknown';
        const callerId = execution.context?.callerId || 'unknown';
        const key = `${callerType}:${callerId}`;

        if (!acc[key]) {
          acc[key] = {
            callerType,
            callerId,
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalTime: 0,
            totalCost: 0,
            lastExecution: null,
          };
        }

        acc[key].totalExecutions++;

        if (execution.status === ExecutionStatus.COMPLETED) {
          acc[key].successfulExecutions++;
        } else if (execution.status === ExecutionStatus.FAILED) {
          acc[key].failedExecutions++;
        }

        acc[key].totalTime += execution.executionTimeMs || 0;
        acc[key].totalCost += execution.cost || 0;
        acc[key].lastExecution = execution.createdAt;

        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(patterns)
      .map((pattern: any) => ({
        ...pattern,
        avgExecutionTime:
          pattern.totalExecutions > 0
            ? pattern.totalTime / pattern.totalExecutions
            : 0,
        successRate:
          pattern.totalExecutions > 0
            ? (pattern.successfulExecutions / pattern.totalExecutions) * 100
            : 0,
      }))
      .sort((a, b) => b.totalExecutions - a.totalExecutions);
  }

  private calculatePerformanceTrends(groupedData: any[]) {
    return groupedData.map((group, index) => {
      const prevGroup = index > 0 ? groupedData[index - 1] : null;

      return {
        period: group.period,
        executions: group.totalExecutions,
        successRate: group.successRate,
        avgExecutionTime: group.avgExecutionTime,
        totalCost: group.totalCost,
        trends: prevGroup
          ? {
              executionChange:
                ((group.totalExecutions - prevGroup.totalExecutions) /
                  (prevGroup.totalExecutions || 1)) *
                100,
              successRateChange: group.successRate - prevGroup.successRate,
              executionTimeChange:
                ((group.avgExecutionTime - prevGroup.avgExecutionTime) /
                  (prevGroup.avgExecutionTime || 1)) *
                100,
              costChange:
                ((group.totalCost - prevGroup.totalCost) /
                  (prevGroup.totalCost || 1)) *
                100,
            }
          : null,
      };
    });
  }

  private analyzeErrorPatterns(executions: ToolExecution[]) {
    const failedExecutions = executions.filter(
      (e) => e.status === ExecutionStatus.FAILED && e.error,
    );

    const errorCounts = failedExecutions.reduce(
      (acc, execution) => {
        const error = execution.error || 'Unknown error';
        const errorType = this.categorizeError(error);

        if (!acc[errorType]) {
          acc[errorType] = {
            errorType,
            count: 0,
            examples: [],
            firstOccurrence: execution.createdAt,
            lastOccurrence: execution.createdAt,
          };
        }

        acc[errorType].count++;

        if (acc[errorType].examples.length < 3) {
          acc[errorType].examples.push({
            error: execution.error,
            timestamp: execution.createdAt,
            context: execution.context,
          });
        }

        if (execution.createdAt > acc[errorType].lastOccurrence) {
          acc[errorType].lastOccurrence = execution.createdAt;
        }

        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(errorCounts)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10); // Top 10 error patterns
  }

  private categorizeError(error: string): string {
    const lowerError = error.toLowerCase();

    if (lowerError.includes('timeout') || lowerError.includes('etimedout')) {
      return 'Timeout Error';
    }
    if (
      lowerError.includes('network') ||
      lowerError.includes('enotfound') ||
      lowerError.includes('econnrefused')
    ) {
      return 'Network Error';
    }
    if (lowerError.includes('401') || lowerError.includes('unauthorized')) {
      return 'Authentication Error';
    }
    if (lowerError.includes('403') || lowerError.includes('forbidden')) {
      return 'Authorization Error';
    }
    if (lowerError.includes('404') || lowerError.includes('not found')) {
      return 'Not Found Error';
    }
    if (lowerError.includes('429') || lowerError.includes('rate limit')) {
      return 'Rate Limit Error';
    }
    if (lowerError.includes('500') || lowerError.includes('internal server')) {
      return 'Server Error';
    }
    if (lowerError.includes('validation') || lowerError.includes('invalid')) {
      return 'Validation Error';
    }

    return 'Other Error';
  }

  private extractAvailableVariables(
    definition: any,
    stepId?: string,
  ): string[] {
    const variables = [];

    if (definition?.steps && Array.isArray(definition.steps)) {
      definition.steps.forEach((step: any, index: number) => {
        if (
          !stepId ||
          step.id === stepId ||
          index < definition.steps.findIndex((s: any) => s.id === stepId)
        ) {
          if (step.outputs) {
            variables.push(...Object.keys(step.outputs));
          }
          if (step.variables) {
            variables.push(...Object.keys(step.variables));
          }
        }
      });
    }

    if (definition?.variables) {
      variables.push(...Object.keys(definition.variables));
    }

    return [...new Set(variables)];
  }

  async testInContext(
    toolId: string,
    testData: {
      workflowId?: string;
      agentId?: string;
      context: Record<string, any>;
      parameters: Record<string, any>;
    },
  ) {
    const tool = await this.findOne(toolId);
    const startTime = Date.now();

    try {
      // Create enhanced context for testing
      const enhancedContext = {
        ...testData.context,
        testMode: true,
        workflowId: testData.workflowId,
        agentId: testData.agentId,
        timestamp: new Date().toISOString(),
      };

      // Execute the tool with context
      const result = await this.performToolExecution(tool, {
        functionName: 'execute',
        parameters: testData.parameters,
        callerType: testData.workflowId
          ? 'workflow'
          : testData.agentId
            ? 'agent'
            : 'user',
        callerId: testData.workflowId || testData.agentId || 'test',
        timeout: 30000,
      });

      const executionTime = Date.now() - startTime;

      // Log test execution for analytics
      const execution = this.toolExecutionRepository.create({
        toolId,
        sessionId: require('uuid').v4(),
        input: testData.parameters,
        output: result,
        status: ExecutionStatus.COMPLETED,
        context: {
          ...enhancedContext,
          testExecution: true,
        },
        executionTimeMs: executionTime,
        cost: this.calculateCost(tool, executionTime),
        startedAt: new Date(startTime),
        completedAt: new Date(),
        createdAt: new Date(),
      });

      await this.toolExecutionRepository.save(execution);

      return {
        success: true,
        result,
        executionTime,
        cost: execution.cost,
        context: enhancedContext,
        recommendations: this.generateContextTestRecommendations(
          tool,
          testData,
          result,
          executionTime,
        ),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Log failed test execution
      const execution = this.toolExecutionRepository.create({
        toolId,
        sessionId: require('uuid').v4(),
        input: testData.parameters,
        status: ExecutionStatus.FAILED,
        error: error.message,
        context: {
          ...testData.context,
          testMode: true,
          testExecution: true,
        },
        executionTimeMs: executionTime,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        createdAt: new Date(),
      });

      await this.toolExecutionRepository.save(execution);

      return {
        success: false,
        error: error.message,
        executionTime,
        cost: 0,
        context: testData.context,
        recommendations: this.generateContextTestRecommendations(
          tool,
          testData,
          null,
          executionTime,
          error.message,
        ),
      };
    }
  }

  private generateContextTestRecommendations(
    tool: Tool,
    testData: any,
    result: any,
    executionTime: number,
    error?: string,
  ) {
    const recommendations = [];

    if (error) {
      recommendations.push({
        type: 'error',
        priority: 'high',
        title: 'Test Failed',
        description: `Tool execution failed: ${error}`,
        suggestion:
          'Check tool configuration, authentication, and input parameters',
      });
    }

    if (executionTime > 10000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Slow Execution',
        description: `Execution took ${executionTime}ms, which may impact workflow performance`,
        suggestion: 'Consider optimizing the API call or implementing caching',
      });
    }

    if (testData.workflowId) {
      recommendations.push({
        type: 'workflow',
        priority: 'low',
        title: 'Workflow Integration',
        description: 'Tool tested successfully in workflow context',
        suggestion:
          'Monitor performance when integrated into the full workflow',
      });
    }

    if (testData.agentId) {
      recommendations.push({
        type: 'agent',
        priority: 'low',
        title: 'Agent Integration',
        description: 'Tool tested successfully in agent context',
        suggestion: 'Ensure agent has proper error handling for this tool',
      });
    }

    return recommendations;
  }

  async getDashboardMetrics(
    organizationId: string,
    timeRange: '24h' | '7d' | '30d' | '90d',
  ) {
    const timeRangeMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };

    const startDate = new Date(Date.now() - timeRangeMs[timeRange]);

    // Get all tools for the organization
    const tools = await this.toolRepository.find({
      where: { organizationId },
      select: ['id', 'name', 'category', 'isActive', 'createdAt'],
    });

    const toolIds = tools.map((t) => t.id);

    // Get executions for all tools in the time range
    const executions = await this.toolExecutionRepository
      .createQueryBuilder('execution')
      .where('execution.toolId IN (:...toolIds)', { toolIds })
      .andWhere('execution.createdAt >= :startDate', { startDate })
      .getMany();

    // Calculate overall metrics
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(
      (e) => e.status === ExecutionStatus.COMPLETED,
    ).length;
    const failedExecutions = executions.filter(
      (e) => e.status === ExecutionStatus.FAILED,
    ).length;
    const totalCost = executions.reduce((sum, e) => sum + (e.cost || 0), 0);
    const avgExecutionTime =
      totalExecutions > 0
        ? executions.reduce((sum, e) => sum + (e.executionTimeMs || 0), 0) /
          totalExecutions
        : 0;

    // Calculate metrics by category
    const categoryMetrics = tools.reduce(
      (acc, tool) => {
        const category = tool.category || 'uncategorized';
        const toolExecutions = executions.filter((e) => e.toolId === tool.id);

        if (!acc[category]) {
          acc[category] = {
            category,
            toolCount: 0,
            executions: 0,
            successfulExecutions: 0,
            cost: 0,
          };
        }

        acc[category].toolCount++;
        acc[category].executions += toolExecutions.length;
        acc[category].successfulExecutions += toolExecutions.filter(
          (e) => e.status === ExecutionStatus.COMPLETED,
        ).length;
        acc[category].cost += toolExecutions.reduce(
          (sum, e) => sum + (e.cost || 0),
          0,
        );

        return acc;
      },
      {} as Record<string, any>,
    );

    // Get top performing tools
    const toolPerformance = tools
      .map((tool) => {
        const toolExecutions = executions.filter((e) => e.toolId === tool.id);
        const successful = toolExecutions.filter(
          (e) => e.status === ExecutionStatus.COMPLETED,
        ).length;

        return {
          id: tool.id,
          name: tool.name,
          category: tool.category,
          executions: toolExecutions.length,
          successRate:
            toolExecutions.length > 0
              ? (successful / toolExecutions.length) * 100
              : 0,
          avgExecutionTime:
            toolExecutions.length > 0
              ? toolExecutions.reduce(
                  (sum, e) => sum + (e.executionTimeMs || 0),
                  0,
                ) / toolExecutions.length
              : 0,
          cost: toolExecutions.reduce((sum, e) => sum + (e.cost || 0), 0),
        };
      })
      .sort((a, b) => b.executions - a.executions);

    // Calculate daily trends
    const dailyTrends = this.calculateDailyTrends(executions, timeRange);

    // Get health alerts
    const healthAlerts = await this.getActiveHealthAlerts(toolIds);

    return {
      timeRange,
      period: {
        startDate,
        endDate: new Date(),
      },
      overview: {
        totalTools: tools.length,
        activeTools: tools.filter((t) => t.isActive).length,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate:
          totalExecutions > 0
            ? (successfulExecutions / totalExecutions) * 100
            : 0,
        totalCost,
        avgExecutionTime,
      },
      categoryMetrics: Object.values(categoryMetrics),
      topTools: toolPerformance.slice(0, 10),
      dailyTrends,
      healthAlerts,
      recommendations: this.generateDashboardRecommendations(
        tools,
        executions,
        categoryMetrics,
      ),
    };
  }

  private calculateDailyTrends(executions: ToolExecution[], timeRange: string) {
    const days =
      timeRange === '24h'
        ? 1
        : timeRange === '7d'
          ? 7
          : timeRange === '30d'
            ? 30
            : 90;
    const trends = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayExecutions = executions.filter(
        (e) => e.createdAt >= dayStart && e.createdAt < dayEnd,
      );

      const successful = dayExecutions.filter(
        (e) => e.status === ExecutionStatus.COMPLETED,
      ).length;

      trends.push({
        date: dayStart.toISOString().split('T')[0],
        executions: dayExecutions.length,
        successful,
        failed: dayExecutions.length - successful,
        successRate:
          dayExecutions.length > 0
            ? (successful / dayExecutions.length) * 100
            : 0,
        cost: dayExecutions.reduce((sum, e) => sum + (e.cost || 0), 0),
        avgExecutionTime:
          dayExecutions.length > 0
            ? dayExecutions.reduce(
                (sum, e) => sum + (e.executionTimeMs || 0),
                0,
              ) / dayExecutions.length
            : 0,
      });
    }

    return trends;
  }

  private async getActiveHealthAlerts(toolIds: string[]) {
    // This would typically query a health monitoring table
    // For now, we'll simulate based on recent execution patterns
    const alerts = [];

    for (const toolId of toolIds) {
      const recentExecutions = await this.toolExecutionRepository
        .createQueryBuilder('execution')
        .where('execution.toolId = :toolId', { toolId })
        .andWhere('execution.createdAt >= :since', {
          since: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        })
        .getMany();

      if (recentExecutions.length > 0) {
        const failureRate =
          recentExecutions.filter((e) => e.status === ExecutionStatus.FAILED)
            .length / recentExecutions.length;

        const avgResponseTime =
          recentExecutions.reduce(
            (sum, e) => sum + (e.executionTimeMs || 0),
            0,
          ) / recentExecutions.length;

        if (failureRate > 0.5) {
          alerts.push({
            toolId,
            type: 'high_error_rate',
            severity: 'critical',
            message: `High error rate: ${(failureRate * 100).toFixed(1)}%`,
            timestamp: new Date(),
          });
        }

        if (avgResponseTime > 30000) {
          alerts.push({
            toolId,
            type: 'slow_response',
            severity: 'warning',
            message: `Slow response time: ${avgResponseTime.toFixed(0)}ms`,
            timestamp: new Date(),
          });
        }
      }
    }

    return alerts;
  }

  private generateDashboardRecommendations(
    tools: Tool[],
    executions: ToolExecution[],
    categoryMetrics: Record<string, any>,
  ) {
    const recommendations = [];

    // Check for unused tools
    const unusedTools = tools.filter(
      (tool) => !executions.some((e) => e.toolId === tool.id),
    );

    if (unusedTools.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'low',
        title: 'Unused Tools',
        description: `${unusedTools.length} tools haven't been used recently`,
        suggestion:
          'Consider deactivating or removing unused tools to reduce clutter',
      });
    }

    // Check for high-cost categories
    const highCostCategories = Object.values(categoryMetrics)
      .filter((cat: any) => cat.cost > 10)
      .sort((a: any, b: any) => b.cost - a.cost);

    if (highCostCategories.length > 0) {
      const topCategory = highCostCategories[0] as any;
      recommendations.push({
        type: 'cost',
        priority: 'medium',
        title: 'High Cost Category',
        description: `${topCategory.category} category has high costs: ${topCategory.cost.toFixed(2)}`,
        suggestion:
          'Review tools in this category for optimization opportunities',
      });
    }

    // Check overall success rate
    const overallSuccessRate =
      executions.length > 0
        ? (executions.filter((e) => e.status === ExecutionStatus.COMPLETED)
            .length /
            executions.length) *
          100
        : 100;

    if (overallSuccessRate < 90) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        title: 'Low Success Rate',
        description: `Overall success rate is ${overallSuccessRate.toFixed(1)}%`,
        suggestion: 'Investigate failing tools and improve error handling',
      });
    }

    return recommendations;
  }

  async getHealthMonitoring(toolId: string) {
    const tool = await this.findOne(toolId);

    // Get recent executions for health analysis
    const recentExecutions = await this.toolExecutionRepository
      .createQueryBuilder('execution')
      .where('execution.toolId = :toolId', { toolId })
      .andWhere('execution.createdAt >= :since', {
        since: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      })
      .orderBy('execution.createdAt', 'DESC')
      .getMany();

    // Calculate health metrics
    const totalExecutions = recentExecutions.length;
    const successfulExecutions = recentExecutions.filter(
      (e) => e.status === ExecutionStatus.COMPLETED,
    ).length;
    const failedExecutions = recentExecutions.filter(
      (e) => e.status === ExecutionStatus.FAILED,
    ).length;

    const availability =
      totalExecutions > 0
        ? (successfulExecutions / totalExecutions) * 100
        : 100;
    const errorRate =
      totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0;
    const avgResponseTime =
      totalExecutions > 0
        ? recentExecutions.reduce(
            (sum, e) => sum + (e.executionTimeMs || 0),
            0,
          ) / totalExecutions
        : 0;

    // Analyze error patterns
    const errorPatterns = this.analyzeErrorPatterns(recentExecutions);

    // Calculate uptime periods
    const uptimePeriods = this.calculateUptimePeriods(recentExecutions);

    // Generate health status
    const healthStatus = this.determineHealthStatus(
      availability,
      errorRate,
      avgResponseTime,
    );

    // Get configured alerts
    const alertConfig = await this.getAlertConfiguration(toolId);

    // Check for active alerts
    const activeAlerts = this.checkHealthAlerts(
      {
        availability,
        errorRate,
        avgResponseTime,
      },
      alertConfig,
    );

    return {
      toolId,
      healthStatus,
      metrics: {
        availability,
        errorRate,
        avgResponseTime,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        lastExecution: recentExecutions[0]?.createdAt || null,
      },
      errorPatterns,
      uptimePeriods,
      activeAlerts,
      alertConfig,
      recommendations: this.generateHealthRecommendations({
        availability,
        errorRate,
        avgResponseTime,
        errorPatterns,
      }),
    };
  }

  private calculateUptimePeriods(executions: ToolExecution[]) {
    const periods = [];
    let currentPeriod = null;

    // Sort executions by time
    const sortedExecutions = executions.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    for (const execution of sortedExecutions) {
      const isUp = execution.status === ExecutionStatus.COMPLETED;

      if (!currentPeriod || currentPeriod.status !== (isUp ? 'up' : 'down')) {
        if (currentPeriod) {
          currentPeriod.endTime = execution.createdAt;
          currentPeriod.duration =
            currentPeriod.endTime.getTime() - currentPeriod.startTime.getTime();
          periods.push(currentPeriod);
        }

        currentPeriod = {
          status: isUp ? 'up' : 'down',
          startTime: execution.createdAt,
          endTime: null,
          duration: 0,
        };
      }
    }

    // Close the last period
    if (currentPeriod) {
      currentPeriod.endTime = new Date();
      currentPeriod.duration =
        currentPeriod.endTime.getTime() - currentPeriod.startTime.getTime();
      periods.push(currentPeriod);
    }

    return periods;
  }

  private determineHealthStatus(
    availability: number,
    errorRate: number,
    avgResponseTime: number,
  ): 'healthy' | 'warning' | 'critical' | 'unknown' {
    if (availability >= 99 && errorRate <= 1 && avgResponseTime <= 5000) {
      return 'healthy';
    }

    if (availability >= 95 && errorRate <= 5 && avgResponseTime <= 15000) {
      return 'warning';
    }

    if (availability < 95 || errorRate > 5 || avgResponseTime > 15000) {
      return 'critical';
    }

    return 'unknown';
  }

  private async getAlertConfiguration(toolId: string) {
    // This would typically be stored in a database table
    // For now, return default configuration
    return {
      errorRateThreshold: 5, // 5%
      responseTimeThreshold: 10000, // 10 seconds
      availabilityThreshold: 95, // 95%
      notificationChannels: ['email'], // Default to email
    };
  }

  private checkHealthAlerts(
    metrics: {
      availability: number;
      errorRate: number;
      avgResponseTime: number;
    },
    alertConfig: any,
  ) {
    const alerts = [];

    if (metrics.errorRate > alertConfig.errorRateThreshold) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `Error rate ${metrics.errorRate.toFixed(1)}% exceeds threshold ${alertConfig.errorRateThreshold}%`,
        timestamp: new Date(),
        value: metrics.errorRate,
        threshold: alertConfig.errorRateThreshold,
      });
    }

    if (metrics.avgResponseTime > alertConfig.responseTimeThreshold) {
      alerts.push({
        type: 'slow_response',
        severity: 'warning',
        message: `Response time ${metrics.avgResponseTime.toFixed(0)}ms exceeds threshold ${alertConfig.responseTimeThreshold}ms`,
        timestamp: new Date(),
        value: metrics.avgResponseTime,
        threshold: alertConfig.responseTimeThreshold,
      });
    }

    if (metrics.availability < alertConfig.availabilityThreshold) {
      alerts.push({
        type: 'low_availability',
        severity: 'critical',
        message: `Availability ${metrics.availability.toFixed(1)}% below threshold ${alertConfig.availabilityThreshold}%`,
        timestamp: new Date(),
        value: metrics.availability,
        threshold: alertConfig.availabilityThreshold,
      });
    }

    return alerts;
  }

  private generateHealthRecommendations(healthData: {
    availability: number;
    errorRate: number;
    avgResponseTime: number;
    errorPatterns: any[];
  }) {
    const recommendations = [];

    if (healthData.errorRate > 5) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        title: 'High Error Rate',
        description: `Error rate is ${healthData.errorRate.toFixed(1)}%`,
        suggestion: 'Review error patterns and improve error handling',
      });
    }

    if (healthData.avgResponseTime > 10000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Slow Response Time',
        description: `Average response time is ${healthData.avgResponseTime.toFixed(0)}ms`,
        suggestion: 'Optimize API calls or implement caching',
      });
    }

    if (healthData.availability < 95) {
      recommendations.push({
        type: 'availability',
        priority: 'high',
        title: 'Low Availability',
        description: `Availability is ${healthData.availability.toFixed(1)}%`,
        suggestion: 'Investigate connectivity issues and implement retry logic',
      });
    }

    // Analyze error patterns for specific recommendations
    const topError = healthData.errorPatterns[0];
    if (topError && topError.count > 5) {
      recommendations.push({
        type: 'error_pattern',
        priority: 'medium',
        title: 'Recurring Error Pattern',
        description: `${topError.errorType} occurred ${topError.count} times`,
        suggestion: this.getErrorPatternSuggestion(topError.errorType),
      });
    }

    return recommendations;
  }

  private getErrorPatternSuggestion(errorType: string): string {
    const suggestions = {
      'Timeout Error': 'Increase timeout values or optimize API performance',
      'Network Error': 'Check network connectivity and DNS resolution',
      'Authentication Error': 'Verify API credentials and token expiration',
      'Authorization Error': 'Check API permissions and access rights',
      'Rate Limit Error': 'Implement rate limiting and retry with backoff',
      'Server Error': 'Contact API provider or check server status',
      'Validation Error': 'Review input parameters and data formats',
    };

    return (
      suggestions[errorType] ||
      'Review error details and contact support if needed'
    );
  }

  async configureHealthAlerts(
    toolId: string,
    alertConfig: {
      errorRateThreshold: number;
      responseTimeThreshold: number;
      availabilityThreshold: number;
      notificationChannels: string[];
    },
  ) {
    // In a real implementation, this would save to a database table
    // For now, we'll simulate the configuration

    const tool = await this.findOne(toolId);

    // Update tool metadata with alert configuration
    await this.toolRepository.update(toolId, {
      metadata: {
        ...tool.metadata,
        alertConfig: {
          ...alertConfig,
          updatedAt: new Date(),
        },
      },
    });

    return {
      success: true,
      message: 'Health monitoring alerts configured successfully',
      configuration: alertConfig,
    };
  }
}
