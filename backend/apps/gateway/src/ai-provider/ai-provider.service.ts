import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import {
  AIProvider,
  AIProviderExecution,
  AIProviderMetrics,
  ProviderType,
  ProviderStatus,
  RoutingRule,
} from '@database/entities';
import { ExecutionType } from '@database/entities/ai-provider-execution.entity';
import { ProviderAdapterService } from './provider-adapter.service';
import { ProviderRoutingService } from './provider-routing.service';
import { ProviderHealthService } from './provider-health.service';
import { ProviderCostService } from './provider-cost.service';
import {
  CreateProviderDto,
  UpdateProviderDto,
  ProviderConfigDto,
  ProviderRoutingRuleDto,
} from './dto';
import { EventType } from '@shared/enums';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AIProviderService {
  private readonly logger = new Logger(AIProviderService.name);
  private readonly cachePrefix = 'ai-provider:';

  constructor(
    @InjectRepository(AIProvider)
    private readonly providerRepository: Repository<AIProvider>,
    @InjectRepository(AIProviderExecution)
    private readonly executionRepository: Repository<AIProviderExecution>,
    @InjectRepository(AIProviderMetrics)
    private readonly metricsRepository: Repository<AIProviderMetrics>,
    private readonly providerAdapter: ProviderAdapterService,
    private readonly providerRouting: ProviderRoutingService,
    private readonly providerHealth: ProviderHealthService,
    private readonly providerCost: ProviderCostService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async createProvider(
    createProviderDto: CreateProviderDto,
    organizationId: string,
    userId: string,
  ): Promise<AIProvider> {
    // Check if provider with same type already exists
    const existingProvider = await this.providerRepository.findOne({
      where: {
        organizationId,
        type: createProviderDto.type,
        isActive: true,
      },
    });

    if (existingProvider) {
      throw new ConflictException(
        `Provider of type ${createProviderDto.type} already exists`,
      );
    }

    // Test provider connection before creating
    const testResult = await this.providerAdapter.testConnection(
      createProviderDto.type,
      createProviderDto.config,
    );

    if (!testResult.success) {
      throw new BadRequestException(
        `Provider connection test failed: ${testResult.error}`,
      );
    }

    const provider = this.providerRepository.create({
      ...createProviderDto,
      organizationId,
      userId,
      status: ProviderStatus.ACTIVE,
      healthCheck: {
        lastCheck: new Date(),
        status: 'healthy',
        responseTime: testResult.responseTime || 0,
        errorRate: 0,
        uptime: 100,
      },
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        totalCost: 0,
        lastUpdated: new Date(),
      },
    });

    const savedProvider = await this.providerRepository.save(provider);

    // Cache the provider
    await this.cacheProvider(savedProvider);

    // Start health monitoring
    this.providerHealth.startMonitoring(savedProvider.id, organizationId);

    // Emit event
    this.eventEmitter.emit(EventType.AI_PROVIDER_CREATED, {
      providerId: savedProvider.id,
      organizationId,
      userId,
      providerType: savedProvider.type,
      timestamp: new Date(),
    });

    this.logger.log(
      `AI Provider created: ${savedProvider.id} (${savedProvider.type}) for org ${organizationId}`,
    );

    return savedProvider;
  }

  async getProviders(
    organizationId: string,
    options?: { includeInactive?: boolean },
  ): Promise<AIProvider[]> {
    const where: any = { organizationId };
    if (!options?.includeInactive) {
      where.isActive = true;
    }

    return this.providerRepository.find({
      where,
      order: { priority: 'DESC', createdAt: 'DESC' },
      relations: ['user'],
    });
  }

  async getProvider(id: string, organizationId: string): Promise<AIProvider> {
    // Try cache first
    const cacheKey = `${this.cachePrefix}${id}`;
    let provider = await this.cacheManager.get<AIProvider>(cacheKey);

    if (!provider) {
      provider = await this.providerRepository.findOne({
        where: { id, organizationId },
        relations: ['user'],
      });

      if (provider) {
        await this.cacheProvider(provider);
      }
    }

    if (!provider) {
      throw new NotFoundException('AI Provider not found');
    }

    return provider;
  }

  async updateProvider(
    id: string,
    updateProviderDto: UpdateProviderDto,
    organizationId: string,
  ): Promise<AIProvider> {
    const provider = await this.getProvider(id, organizationId);

    // If config is being updated, test the connection
    if (updateProviderDto.config) {
      const testResult = await this.providerAdapter.testConnection(
        provider.type,
        { ...provider.config, ...updateProviderDto.config },
      );

      if (!testResult.success) {
        throw new BadRequestException(
          `Provider connection test failed: ${testResult.error}`,
        );
      }
    }

    Object.assign(provider, updateProviderDto);
    provider.updatedAt = new Date();

    const updatedProvider = await this.providerRepository.save(provider);

    // Update cache
    await this.cacheProvider(updatedProvider);

    // Emit event
    this.eventEmitter.emit(EventType.AI_PROVIDER_UPDATED, {
      providerId: updatedProvider.id,
      organizationId,
      changes: updateProviderDto,
      timestamp: new Date(),
    });

    this.logger.log(`AI Provider updated: ${updatedProvider.id}`);

    return updatedProvider;
  }

  async deleteProvider(id: string, organizationId: string): Promise<void> {
    const provider = await this.getProvider(id, organizationId);

    // Soft delete
    provider.isActive = false;
    provider.status = ProviderStatus.INACTIVE;
    provider.updatedAt = new Date();

    await this.providerRepository.save(provider);

    // Remove from cache
    await this.cacheManager.del(`${this.cachePrefix}${id}`);

    // Stop health monitoring
    this.providerHealth.stopMonitoring(id);

    // Emit event
    this.eventEmitter.emit(EventType.AI_PROVIDER_DELETED, {
      providerId: id,
      organizationId,
      timestamp: new Date(),
    });

    this.logger.log(`AI Provider deleted: ${id}`);
  }

  async testProvider(
    id: string,
    organizationId: string,
  ): Promise<{ success: boolean; responseTime?: number; error?: string }> {
    const provider = await this.getProvider(id, organizationId);

    return this.providerAdapter.testConnection(provider.type, provider.config);
  }

  async rotateApiKey(
    id: string,
    newApiKey: string,
    organizationId: string,
  ): Promise<AIProvider> {
    const provider = await this.getProvider(id, organizationId);

    // Test new API key
    const testConfig = { ...provider.config, apiKey: newApiKey };
    const testResult = await this.providerAdapter.testConnection(
      provider.type,
      testConfig,
    );

    if (!testResult.success) {
      throw new BadRequestException(
        `New API key test failed: ${testResult.error}`,
      );
    }

    // Update API key
    provider.config = { ...provider.config, apiKey: newApiKey };
    provider.updatedAt = new Date();

    const updatedProvider = await this.providerRepository.save(provider);

    // Update cache
    await this.cacheProvider(updatedProvider);

    // Emit event
    this.eventEmitter.emit(EventType.AI_PROVIDER_KEY_ROTATED, {
      providerId: updatedProvider.id,
      organizationId,
      timestamp: new Date(),
    });

    this.logger.log(`API key rotated for provider: ${updatedProvider.id}`);

    return updatedProvider;
  }

  async getAvailableProviders(): Promise<
    {
      type: ProviderType;
      name: string;
      description: string;
      models: string[];
      features: string[];
    }[]
  > {
    return [
      {
        type: ProviderType.OPENAI,
        name: 'OpenAI',
        description: 'GPT models from OpenAI',
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        features: ['Chat', 'Completions', 'Function Calling', 'Vision'],
      },
      {
        type: ProviderType.CLAUDE,
        name: 'Anthropic Claude',
        description: 'Claude models from Anthropic',
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        features: ['Chat', 'Long Context', 'Code Generation'],
      },
      {
        type: ProviderType.GEMINI,
        name: 'Google Gemini',
        description: 'Gemini models from Google',
        models: ['gemini-pro', 'gemini-pro-vision'],
        features: ['Chat', 'Vision', 'Code Generation'],
      },
      {
        type: ProviderType.MISTRAL,
        name: 'Mistral AI',
        description: 'Mistral models',
        models: ['mistral-large', 'mistral-medium', 'mistral-small'],
        features: ['Chat', 'Code Generation', 'Multilingual'],
      },
      {
        type: ProviderType.GROQ,
        name: 'Groq',
        description: 'High-speed inference with Groq',
        models: ['llama2-70b-4096', 'mixtral-8x7b-32768'],
        features: ['High Speed', 'Chat', 'Long Context'],
      },
      {
        type: ProviderType.OPENROUTER,
        name: 'OpenRouter',
        description: 'Access to multiple AI models through OpenRouter',
        models: [
          'openai/gpt-4-turbo',
          'openai/gpt-3.5-turbo',
          'anthropic/claude-3-opus',
          'anthropic/claude-3-sonnet',
          'google/gemini-pro',
          'meta-llama/llama-2-70b-chat',
          'mistralai/mistral-7b-instruct',
        ],
        features: [
          'Multi-Provider',
          'Chat',
          'Cost Optimization',
          'Model Variety',
        ],
      },
    ];
  }

  async getRoutingRules(organizationId: string): Promise<RoutingRule[]> {
    return this.providerRouting.getRoutingRules(organizationId);
  }

  async createRoutingRule(
    routingRuleDto: ProviderRoutingRuleDto,
    organizationId: string,
  ): Promise<RoutingRule> {
    return this.providerRouting.createRoutingRule(
      routingRuleDto,
      organizationId,
    );
  }

  async getUsageStats(
    organizationId: string,
    period: 'day' | 'week' | 'month',
  ): Promise<{
    totalRequests: number;
    totalCost: number;
    averageResponseTime: number;
    errorRate: number;
    providerBreakdown: Array<{
      providerId: string;
      providerName: string;
      requests: number;
      cost: number;
      avgResponseTime: number;
      errorRate: number;
    }>;
    modelBreakdown: Array<{
      model: string;
      requests: number;
      cost: number;
      avgResponseTime: number;
    }>;
    executionTypeBreakdown: Array<{
      type: ExecutionType;
      requests: number;
      cost: number;
      avgResponseTime: number;
    }>;
  }> {
    const startDate = this.getStartDateForPeriod(period);
    const endDate = new Date();

    const executions = await this.executionRepository.find({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        } as any,
      },
      relations: ['provider'],
    });

    const totalRequests = executions.length;
    const totalCost = executions.reduce(
      (sum, exec) => sum + (exec.cost || 0),
      0,
    );
    const avgResponseTime =
      executions.reduce((sum, exec) => sum + (exec.responseTimeMs || 0), 0) /
        totalRequests || 0;
    const errorRate =
      executions.filter((exec) => exec.error).length / totalRequests || 0;

    // Provider breakdown
    const providerStats = new Map();
    executions.forEach((exec) => {
      const key = exec.providerId;
      if (!providerStats.has(key)) {
        providerStats.set(key, {
          providerId: exec.providerId,
          providerName: exec.provider?.name || 'Unknown',
          requests: 0,
          cost: 0,
          totalResponseTime: 0,
          errors: 0,
        });
      }
      const stats = providerStats.get(key);
      stats.requests++;
      stats.cost += exec.cost || 0;
      stats.totalResponseTime += exec.responseTimeMs || 0;
      if (exec.error) stats.errors++;
    });

    const providerBreakdown = Array.from(providerStats.values()).map(
      (stats) => ({
        providerId: stats.providerId,
        providerName: stats.providerName,
        requests: stats.requests,
        cost: stats.cost,
        avgResponseTime: stats.totalResponseTime / stats.requests || 0,
        errorRate: stats.errors / stats.requests || 0,
      }),
    );

    // Model breakdown
    const modelStats = new Map();
    executions.forEach((exec) => {
      const key = exec.model;
      if (!modelStats.has(key)) {
        modelStats.set(key, {
          model: exec.model,
          requests: 0,
          cost: 0,
          totalResponseTime: 0,
        });
      }
      const stats = modelStats.get(key);
      stats.requests++;
      stats.cost += exec.cost || 0;
      stats.totalResponseTime += exec.responseTimeMs || 0;
    });

    const modelBreakdown = Array.from(modelStats.values()).map((stats) => ({
      model: stats.model,
      requests: stats.requests,
      cost: stats.cost,
      avgResponseTime: stats.totalResponseTime / stats.requests || 0,
    }));

    // Execution type breakdown
    const typeStats = new Map();
    executions.forEach((exec) => {
      const key = exec.executionType;
      if (!typeStats.has(key)) {
        typeStats.set(key, {
          type: exec.executionType,
          requests: 0,
          cost: 0,
          totalResponseTime: 0,
        });
      }
      const stats = typeStats.get(key);
      stats.requests++;
      stats.cost += exec.cost || 0;
      stats.totalResponseTime += exec.responseTimeMs || 0;
    });

    const executionTypeBreakdown = Array.from(typeStats.values()).map(
      (stats) => ({
        type: stats.type,
        requests: stats.requests,
        cost: stats.cost,
        avgResponseTime: stats.totalResponseTime / stats.requests || 0,
      }),
    );

    return {
      totalRequests,
      totalCost,
      averageResponseTime: avgResponseTime,
      errorRate,
      providerBreakdown,
      modelBreakdown,
      executionTypeBreakdown,
    };
  }

  async getOptimizationSuggestions(organizationId: string): Promise<{
    costOptimizations: Array<{
      type: 'switch_provider' | 'adjust_routing' | 'model_downgrade';
      description: string;
      potentialSavings: number;
      impact: 'low' | 'medium' | 'high';
      recommendation: string;
    }>;
    performanceOptimizations: Array<{
      type: 'switch_provider' | 'adjust_routing' | 'load_balance';
      description: string;
      expectedImprovement: string;
      impact: 'low' | 'medium' | 'high';
      recommendation: string;
    }>;
  }> {
    const providers = await this.getProviders(organizationId);
    const usageStats = await this.getUsageStats(organizationId, 'week');

    const costOptimizations = [];
    const performanceOptimizations = [];

    // Analyze cost optimizations
    for (const providerStat of usageStats.providerBreakdown) {
      if (providerStat.cost > 100 && providerStat.errorRate < 0.05) {
        // Suggest cheaper alternatives
        costOptimizations.push({
          type: 'switch_provider' as const,
          description: `High cost provider ${providerStat.providerName} could be replaced for non-critical tasks`,
          potentialSavings: providerStat.cost * 0.3,
          impact: 'medium' as const,
          recommendation:
            'Consider using a more cost-effective provider for routine tasks',
        });
      }
    }

    // Analyze performance optimizations
    for (const providerStat of usageStats.providerBreakdown) {
      if (providerStat.avgResponseTime > 5000) {
        performanceOptimizations.push({
          type: 'switch_provider' as const,
          description: `Slow response times from ${providerStat.providerName}`,
          expectedImprovement: '40% faster response times',
          impact: 'high' as const,
          recommendation:
            'Switch to a faster provider or implement load balancing',
        });
      }
    }

    return {
      costOptimizations,
      performanceOptimizations,
    };
  }

  async getProviderMetrics(
    id: string,
    organizationId: string,
    period: 'hour' | 'day' | 'week' | 'month',
  ): Promise<{
    current: {
      requests: number;
      successRate: number;
      avgResponseTime: number;
      cost: number;
      errorRate: number;
    };
    historical: Array<{
      timestamp: Date;
      requests: number;
      successRate: number;
      avgResponseTime: number;
      cost: number;
      errorRate: number;
    }>;
  }> {
    const provider = await this.getProvider(id, organizationId);
    const startDate = this.getStartDateForPeriod(period);
    const endDate = new Date();

    const executions = await this.executionRepository.find({
      where: {
        providerId: id,
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        } as any,
      },
    });

    const current = {
      requests: executions.length,
      successRate:
        executions.filter((e) => !e.error).length / executions.length || 0,
      avgResponseTime:
        executions.reduce((sum, e) => sum + (e.responseTimeMs || 0), 0) /
          executions.length || 0,
      cost: executions.reduce((sum, e) => sum + (e.cost || 0), 0),
      errorRate:
        executions.filter((e) => e.error).length / executions.length || 0,
    };

    const metrics = await this.metricsRepository.find({
      where: {
        providerId: id,
        organizationId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        } as any,
      },
      order: { timestamp: 'ASC' },
    });

    const historical = metrics.map((metric) => ({
      timestamp: metric.timestamp,
      requests: metric.totalRequests,
      successRate: metric.successfulRequests / metric.totalRequests || 0,
      avgResponseTime: metric.averageResponseTime,
      cost: metric.totalCost,
      errorRate: metric.errorRate,
    }));

    return { current, historical };
  }

  async bulkConfigureProviders(
    providers: ProviderConfigDto[],
    organizationId: string,
    userId: string,
  ): Promise<AIProvider[]> {
    const results = [];

    for (const providerConfig of providers) {
      try {
        const createDto: CreateProviderDto = {
          name: providerConfig.name,
          type: providerConfig.type,
          config: {
            apiKey: providerConfig.apiKey,
            baseUrl: providerConfig.baseUrl,
            models: providerConfig.models,
          },
          priority: providerConfig.priority,
          costMultiplier: providerConfig.costMultiplier,
          isActive: providerConfig.isActive,
        };

        const provider = await this.createProvider(
          createDto,
          organizationId,
          userId,
        );
        results.push(provider);
      } catch (error) {
        this.logger.error(
          `Failed to create provider ${providerConfig.name}: ${error.message}`,
        );
        // Continue with other providers
      }
    }

    return results;
  }

  // Provider selection for execution modules
  async selectProvider(
    organizationId: string,
    executionType: ExecutionType,
    model?: string,
    context?: Record<string, any>,
  ): Promise<AIProvider> {
    return this.providerRouting.selectProvider(
      organizationId,
      executionType,
      model,
      context,
    );
  }

  // Record execution for metrics
  async recordExecution(
    providerId: string,
    executionType: ExecutionType,
    resourceId: string,
    model: string,
    input: Record<string, any>,
    output: Record<string, any>,
    tokensUsed: number,
    cost: number,
    responseTimeMs: number,
    organizationId: string,
    userId: string,
    error?: string,
  ): Promise<void> {
    const execution = this.executionRepository.create({
      providerId,
      executionType,
      resourceId,
      model,
      input,
      output,
      tokensUsed,
      cost,
      responseTimeMs,
      organizationId,
      userId,
      error,
      status: error ? 'FAILED' : 'COMPLETED',
      startedAt: new Date(Date.now() - responseTimeMs),
      completedAt: new Date(),
    });

    await this.executionRepository.save(execution);

    // Update provider metrics
    await this.updateProviderMetrics(providerId, {
      requests: 1,
      successful: error ? 0 : 1,
      failed: error ? 1 : 0,
      responseTime: responseTimeMs,
      cost,
      tokens: tokensUsed,
    });
  }

  // Private helper methods
  private async cacheProvider(provider: AIProvider): Promise<void> {
    const cacheKey = `${this.cachePrefix}${provider.id}`;
    await this.cacheManager.set(cacheKey, provider, 300000); // 5 minutes
  }

  private getStartDateForPeriod(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private async updateProviderMetrics(
    providerId: string,
    metrics: {
      requests: number;
      successful: number;
      failed: number;
      responseTime: number;
      cost: number;
      tokens: number;
    },
  ): Promise<void> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!provider) return;

    const currentMetrics = provider.metrics || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalCost: 0,
      lastUpdated: new Date(),
    };

    const newMetrics = {
      totalRequests: currentMetrics.totalRequests + metrics.requests,
      successfulRequests:
        currentMetrics.successfulRequests + metrics.successful,
      failedRequests: currentMetrics.failedRequests + metrics.failed,
      averageResponseTime:
        (currentMetrics.averageResponseTime * currentMetrics.totalRequests +
          metrics.responseTime * metrics.requests) /
        (currentMetrics.totalRequests + metrics.requests),
      totalCost: currentMetrics.totalCost + metrics.cost,
      lastUpdated: new Date(),
    };

    provider.metrics = newMetrics;
    await this.providerRepository.save(provider);

    // Update cache
    await this.cacheProvider(provider);
  }
}
