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
import {
  Agent,
  AgentExecution,
  AgentTestResult,
  PromptTemplate,
} from '@database/entities';
import { AgentRepository } from '@database/repositories/agent.repository';
import { SessionService } from '../session/session.service';
import { WebSocketService } from '../websocket/websocket.service';
import { ToolService } from '../tool/tool.service';
import {
  CreateAgentDto,
  UpdateAgentDto,
  ExecuteAgentDto,
  TestAgentDto,
  BatchTestAgentDto,
  TestType,
} from './dto';
import { AgentEventType, ExecutionStatus } from '@shared/enums';
import { ISessionContext } from '@shared/interfaces';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

export interface AgentExecutionResult {
  id: string;
  output: string;
  status: ExecutionStatus;
  tokensUsed?: number;
  cost?: number;
  executionTimeMs: number;
  toolCalls?: Array<{
    toolId: string;
    input: Record<string, any>;
    output: Record<string, any>;
    executionTime: number;
  }>;
  knowledgeSearches?: Array<{
    query: string;
    results: any[];
    sources: string[];
  }>;
  metadata?: Record<string, any>;
}

export interface AgentTestResult {
  testId: string;
  passed: boolean;
  score?: number;
  metrics: {
    responseTime: number;
    tokenUsage: number;
    cost: number;
    accuracy?: number;
    relevance?: number;
    coherence?: number;
  };
  actualOutput: Record<string, any>;
  errorMessage?: string;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly openai: OpenAI;
  private readonly cachePrefix = 'agent:';

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: AgentRepository,
    @InjectRepository(AgentExecution)
    private readonly agentExecutionRepository: Repository<AgentExecution>,
    @InjectRepository(AgentTestResult)
    private readonly agentTestResultRepository: Repository<AgentTestResult>,
    @InjectRepository(PromptTemplate)
    private readonly promptTemplateRepository: Repository<PromptTemplate>,
    private readonly sessionService: SessionService,
    private readonly websocketService: WebSocketService,
    private readonly toolService: ToolService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly agentExecutionEngine: AgentExecutionEngine,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async create(
    createAgentDto: CreateAgentDto,
    userId: string,
    organizationId: string,
  ): Promise<Agent> {
    // Validate prompt template if provided
    if (createAgentDto.promptTemplateId) {
      const template = await this.promptTemplateRepository.findOne({
        where: {
          id: createAgentDto.promptTemplateId,
          organizationId,
        },
      });
      if (!template) {
        throw new NotFoundException('Prompt template not found');
      }
    }

    // Create agent entity
    const agent = this.agentRepository.create({
      ...createAgentDto,
      userId,
      organizationId,
      version: createAgentDto.version || '1.0.0',
      performanceMetrics: {
        successRate: 0,
        averageResponseTime: 0,
        totalExecutions: 0,
        errorRate: 0,
        lastUpdated: new Date(),
      },
    });

    const savedAgent = await this.agentRepository.save(agent);

    // Cache the agent
    await this.cacheAgent(savedAgent);

    // Emit event
    this.eventEmitter.emit(AgentEventType.AGENT_CREATED, {
      agentId: savedAgent.id,
      userId,
      organizationId,
      agentData: savedAgent,
      timestamp: new Date(),
    });

    // Send real-time update
    await this.websocketService.broadcastToOrganization(
      organizationId,
      'agent_created',
      {
        agent: savedAgent,
        userId,
      },
    );

    this.logger.log(
      `Agent created: ${savedAgent.id} by user ${userId} in org ${organizationId}`,
    );

    return savedAgent;
  }

  async findAll(
    organizationId: string,
    options?: {
      userId?: string;
      includeInactive?: boolean;
      limit?: number;
      offset?: number;
      search?: string;
      category?: string;
      model?: string;
    },
  ): Promise<Agent[]> {
    if (options?.search) {
      return this.agentRepository.searchAgents(
        organizationId,
        options.search,
        {
          category: options.category,
          model: options.model,
          isActive: options.includeInactive ? undefined : true,
          userId: options.userId,
        },
        {
          limit: options.limit,
          offset: options.offset,
        },
      );
    }

    if (options?.userId) {
      return this.agentRepository.findByUser(organizationId, options.userId, {
        includeInactive: options.includeInactive,
        limit: options.limit,
        offset: options.offset,
      });
    }

    return this.agentRepository.findByOrganization(organizationId, {
      includeInactive: options?.includeInactive,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  async findOne(
    id: string,
    organizationId: string,
    options?: {
      includeExecutions?: boolean;
      includeTestResults?: boolean;
    },
  ): Promise<Agent> {
    // Try cache first
    const cacheKey = `${this.cachePrefix}${id}`;
    let agent = await this.cacheManager.get<Agent>(cacheKey);

    if (!agent) {
      if (options?.includeExecutions) {
        agent = await this.agentRepository.findWithExecutions(
          id,
          organizationId,
        );
      } else if (options?.includeTestResults) {
        agent = await this.agentRepository.findWithTestResults(
          id,
          organizationId,
        );
      } else {
        agent = await this.agentRepository.findOne({
          where: { id, organizationId },
          relations: ['promptTemplate', 'user'],
        });
      }

      if (agent) {
        await this.cacheAgent(agent);
      }
    }

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return agent;
  }

  async update(
    id: string,
    updateAgentDto: UpdateAgentDto,
    userId: string,
    organizationId: string,
  ): Promise<Agent> {
    const agent = await this.findOne(id, organizationId);

    // Check ownership or admin permissions
    if (agent.userId !== userId) {
      // In a real implementation, check if user has admin permissions
      throw new ForbiddenException('Not authorized to update this agent');
    }

    // Validate prompt template if being updated
    if (updateAgentDto.promptTemplateId) {
      const template = await this.promptTemplateRepository.findOne({
        where: {
          id: updateAgentDto.promptTemplateId,
          organizationId,
        },
      });
      if (!template) {
        throw new NotFoundException('Prompt template not found');
      }
    }

    // Update agent
    Object.assign(agent, updateAgentDto);
    agent.updatedAt = new Date();

    const updatedAgent = await this.agentRepository.save(agent);

    // Update cache
    await this.cacheAgent(updatedAgent);

    // Emit event
    this.eventEmitter.emit(AgentEventType.AGENT_UPDATED, {
      agentId: updatedAgent.id,
      userId,
      organizationId,
      changes: updateAgentDto,
      agentData: updatedAgent,
      timestamp: new Date(),
    });

    // Send real-time update
    await this.websocketService.broadcastToOrganization(
      organizationId,
      'agent_updated',
      {
        agent: updatedAgent,
        changes: updateAgentDto,
        userId,
      },
    );

    this.logger.log(`Agent updated: ${updatedAgent.id} by user ${userId}`);

    return updatedAgent;
  }

  async remove(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const agent = await this.findOne(id, organizationId);

    // Check ownership or admin permissions
    if (agent.userId !== userId) {
      throw new ForbiddenException('Not authorized to delete this agent');
    }

    // Soft delete by setting isActive to false
    agent.isActive = false;
    agent.updatedAt = new Date();
    await this.agentRepository.save(agent);

    // Remove from cache
    await this.cacheManager.del(`${this.cachePrefix}${id}`);

    // Emit event
    this.eventEmitter.emit(AgentEventType.AGENT_DELETED, {
      agentId: id,
      userId,
      organizationId,
      timestamp: new Date(),
    });

    // Send real-time update
    await this.websocketService.broadcastToOrganization(
      organizationId,
      'agent_deleted',
      {
        agentId: id,
        userId,
      },
    );

    this.logger.log(`Agent deleted: ${id} by user ${userId}`);
  }

  async execute(
    id: string,
    executeDto: ExecuteAgentDto,
    userId: string,
    organizationId: string,
  ): Promise<AgentExecutionResult> {
    const agent = await this.findOne(id, organizationId);

    if (!agent.isActive) {
      throw new BadRequestException('Agent is not active');
    }

    // Use the execution engine to execute the agent
    const result = await this.agentExecutionEngine.executeAgent(
      agent,
      {
        input: executeDto.input,
        sessionId: executeDto.sessionId,
        context: executeDto.context,
        metadata: executeDto.metadata,
        includeToolCalls: executeDto.includeToolCalls,
        includeKnowledgeSearch: executeDto.includeKnowledgeSearch,
      },
      userId,
      organizationId,
    );

    // Update agent performance metrics
    await this.updatePerformanceMetrics(id, {
      executionTime: result.executionTimeMs,
      success: result.status === ExecutionStatus.COMPLETED,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
    });

    return result;
  }

  async test(
    id: string,
    testDto: TestAgentDto,
    userId: string,
    organizationId: string,
  ): Promise<AgentTestResult> {
    const agent = await this.findOne(id, organizationId);
    const testId = uuidv4();
    const startTime = Date.now();

    // Create test result record
    const testResult = this.agentTestResultRepository.create({
      id: testId,
      agentId: id,
      testType: testDto.testType,
      testName: testDto.testName,
      testInput: testDto.testInput,
      expectedOutput: testDto.expectedOutput,
      status: ExecutionStatus.RUNNING,
      organizationId,
      startedAt: new Date(),
      metadata: testDto.metadata || {},
    });

    await this.agentTestResultRepository.save(testResult);

    try {
      // Execute the agent with test input
      const executionResult = await this.execute(
        id,
        {
          input: testDto.testInput.input || JSON.stringify(testDto.testInput),
          context: testDto.testInput.context,
          metadata: { testId, testType: testDto.testType },
        },
        userId,
        organizationId,
      );

      const executionTime = Date.now() - startTime;

      // Evaluate test result
      let passed = false;
      let score: number | undefined;
      let accuracy: number | undefined;
      let relevance: number | undefined;
      let coherence: number | undefined;

      if (testDto.expectedOutput) {
        // Simple string comparison for now
        // In a real implementation, you'd use more sophisticated comparison
        const expectedStr = JSON.stringify(
          testDto.expectedOutput,
        ).toLowerCase();
        const actualStr = executionResult.output.toLowerCase();

        if (testDto.testType === TestType.UNIT) {
          passed =
            actualStr.includes(expectedStr) || expectedStr.includes(actualStr);
          accuracy = passed ? 1.0 : 0.0;
        } else {
          // Use AI to evaluate the response quality
          const evaluation = await this.evaluateResponse(
            testDto.testInput,
            testDto.expectedOutput,
            executionResult.output,
            testDto.testType,
          );

          passed = evaluation.passed;
          score = evaluation.score;
          accuracy = evaluation.accuracy;
          relevance = evaluation.relevance;
          coherence = evaluation.coherence;
        }
      } else {
        // If no expected output, just check if execution was successful
        passed = executionResult.status === ExecutionStatus.COMPLETED;
        score = passed ? 1.0 : 0.0;
      }

      // Update test result
      testResult.actualOutput = {
        output: executionResult.output,
        status: executionResult.status,
        executionTime: executionResult.executionTimeMs,
        toolCalls: executionResult.toolCalls,
        knowledgeSearches: executionResult.knowledgeSearches,
      };
      testResult.status = ExecutionStatus.COMPLETED;
      testResult.passed = passed;
      testResult.score = score;
      testResult.metrics = {
        responseTime: executionTime,
        tokenUsage: executionResult.tokensUsed || 0,
        cost: executionResult.cost || 0,
        accuracy,
        relevance,
        coherence,
      };
      testResult.completedAt = new Date();

      await this.agentTestResultRepository.save(testResult);

      const result: AgentTestResult = {
        testId,
        passed,
        score,
        metrics: testResult.metrics,
        actualOutput: testResult.actualOutput,
      };

      this.logger.log(
        `Agent test completed: ${testId} for agent ${id} - ${passed ? 'PASSED' : 'FAILED'}`,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Update test result with error
      testResult.status = ExecutionStatus.FAILED;
      testResult.passed = false;
      testResult.errorMessage = error.message;
      testResult.metrics = {
        responseTime: executionTime,
        tokenUsage: 0,
        cost: 0,
      };
      testResult.completedAt = new Date();

      await this.agentTestResultRepository.save(testResult);

      this.logger.error(`Agent test failed: ${testId} for agent ${id}`, error);

      return {
        testId,
        passed: false,
        metrics: testResult.metrics,
        actualOutput: { error: error.message },
        errorMessage: error.message,
      };
    }
  }

  async batchTest(
    id: string,
    batchTestDto: BatchTestAgentDto,
    userId: string,
    organizationId: string,
  ): Promise<AgentTestResult[]> {
    const maxConcurrency = batchTestDto.maxConcurrency || 5;
    const results: AgentTestResult[] = [];

    // Process tests in batches
    for (let i = 0; i < batchTestDto.testCases.length; i += maxConcurrency) {
      const batch = batchTestDto.testCases.slice(i, i + maxConcurrency);

      const batchPromises = batch.map((testCase) =>
        this.test(id, testCase, userId, organizationId),
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    this.logger.log(
      `Batch test completed for agent ${id}: ${results.filter((r) => r.passed).length}/${results.length} passed`,
    );

    return results;
  }

  async getStatistics(
    organizationId: string,
    timeRange?: { from: Date; to: Date },
  ): Promise<{
    totalAgents: number;
    activeAgents: number;
    totalExecutions: number;
    averageSuccessRate: number;
    topPerformingAgents: Array<{
      id: string;
      name: string;
      successRate: number;
      totalExecutions: number;
    }>;
  }> {
    return this.agentRepository.getAgentStatistics(organizationId, timeRange);
  }

  async createVersion(
    id: string,
    newVersion: string,
    changes: Record<string, any>,
    userId: string,
    organizationId: string,
  ): Promise<Agent> {
    const agent = await this.findOne(id, organizationId);

    // Check ownership
    if (agent.userId !== userId) {
      throw new ForbiddenException(
        'Not authorized to create version of this agent',
      );
    }

    return this.agentRepository.createVersion(id, newVersion, changes);
  }

  async getVersionHistory(
    id: string,
    organizationId: string,
  ): Promise<Agent[]> {
    return this.agentRepository.getVersionHistory(id, organizationId);
  }

  // Private helper methods
  private async cacheAgent(agent: Agent): Promise<void> {
    const cacheKey = `${this.cachePrefix}${agent.id}`;
    await this.cacheManager.set(cacheKey, agent, 300000); // 5 minutes
  }

  private calculateCost(model: string, tokens: number): number {
    // Simplified cost calculation - in production, use actual pricing
    const costPerToken = {
      'gpt-4': 0.00003,
      'gpt-3.5-turbo': 0.000002,
      'claude-3-opus': 0.000015,
      'claude-3-sonnet': 0.000003,
    };

    return (costPerToken[model] || costPerToken['gpt-3.5-turbo']) * tokens;
  }

  private async updatePerformanceMetrics(
    agentId: string,
    execution: {
      executionTime: number;
      success: boolean;
      tokensUsed?: number;
      cost?: number;
      error?: string;
    },
  ): Promise<void> {
    const agent = await this.agentRepository.findOne({
      where: { id: agentId },
    });

    if (!agent) return;

    const currentMetrics = agent.performanceMetrics || {
      successRate: 0,
      averageResponseTime: 0,
      totalExecutions: 0,
      errorRate: 0,
      lastUpdated: new Date(),
    };

    const totalExecutions = currentMetrics.totalExecutions + 1;
    const successCount = execution.success
      ? Math.round(
          currentMetrics.successRate * currentMetrics.totalExecutions,
        ) + 1
      : Math.round(currentMetrics.successRate * currentMetrics.totalExecutions);

    const newMetrics = {
      successRate: successCount / totalExecutions,
      averageResponseTime:
        (currentMetrics.averageResponseTime * currentMetrics.totalExecutions +
          execution.executionTime) /
        totalExecutions,
      totalExecutions,
      errorRate: 1 - successCount / totalExecutions,
      lastUpdated: new Date(),
    };

    await this.agentRepository.updatePerformanceMetrics(agentId, newMetrics);

    // Emit performance update event
    this.eventEmitter.emit(AgentEventType.AGENT_PERFORMANCE_UPDATE, {
      agentId,
      metrics: newMetrics,
      timestamp: new Date(),
    });
  }

  private async evaluateResponse(
    input: Record<string, any>,
    expectedOutput: Record<string, any>,
    actualOutput: string,
    testType: TestType,
  ): Promise<{
    passed: boolean;
    score: number;
    accuracy: number;
    relevance: number;
    coherence: number;
  }> {
    try {
      const evaluation = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an AI response evaluator. Evaluate the quality of an AI agent's response based on the input and expected output. Return a JSON object with scores from 0.0 to 1.0 for accuracy, relevance, and coherence, plus an overall score and pass/fail determination.`,
          },
          {
            role: 'user',
            content: `Input: ${JSON.stringify(input)}\nExpected: ${JSON.stringify(expectedOutput)}\nActual: ${actualOutput}\n\nEvaluate this response and return JSON: {"passed": boolean, "score": 0.0-1.0, "accuracy": 0.0-1.0, "relevance": 0.0-1.0, "coherence": 0.0-1.0}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      });

      const content = evaluation.choices[0]?.message?.content;
      if (content) {
        const result = JSON.parse(content);
        return {
          passed: result.passed || result.score > 0.7,
          score: result.score || 0,
          accuracy: result.accuracy || 0,
          relevance: result.relevance || 0,
          coherence: result.coherence || 0,
        };
      }
    } catch (error) {
      this.logger.error('Response evaluation failed', error);
    }

    // Fallback evaluation
    return {
      passed: false,
      score: 0.5,
      accuracy: 0.5,
      relevance: 0.5,
      coherence: 0.5,
    };
  }
}
