import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import {
  AIProvider,
  ProviderStatus,
  RoutingRule,
} from '@database/entities/ai-provider.entity';
import { ExecutionType } from '@database/entities/ai-provider-execution.entity';
import { ProviderRoutingRuleDto } from './dto';
import { v4 as uuidv4 } from 'uuid';

interface CircuitBreakerState {
  failures: number;
  lastFailure: Date;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  nextAttempt: Date;
}

@Injectable()
export class ProviderRoutingService {
  private readonly logger = new Logger(ProviderRoutingService.name);
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();
  private readonly failureThreshold = 5;
  private readonly timeoutMs = 60000; // 1 minute
  private readonly halfOpenMaxCalls = 3;

  constructor(
    @InjectRepository(AIProvider)
    private readonly providerRepository: Repository<AIProvider>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async selectProvider(
    organizationId: string,
    executionType: ExecutionType,
    model?: string,
    context?: Record<string, any>,
  ): Promise<AIProvider> {
    // Get all active providers for the organization
    const providers = await this.getActiveProviders(organizationId);

    if (providers.length === 0) {
      throw new Error('No active AI providers found');
    }

    // Get routing rules
    const routingRules = await this.getRoutingRules(organizationId);

    // Apply routing rules
    const selectedProvider = await this.applyRoutingRules(
      providers,
      routingRules,
      executionType,
      model,
      context,
    );

    if (selectedProvider) {
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(selectedProvider.id)) {
        // Try fallback providers
        const fallbackProvider = await this.selectFallbackProvider(
          providers,
          selectedProvider.id,
          executionType,
          model,
        );
        if (fallbackProvider) {
          this.logger.warn(
            `Using fallback provider ${fallbackProvider.id} due to circuit breaker`,
          );
          return fallbackProvider;
        }
      } else {
        return selectedProvider;
      }
    }

    // Fallback to load balancing
    return this.selectByLoadBalancing(providers, executionType, model);
  }

  async getRoutingRules(organizationId: string): Promise<RoutingRule[]> {
    const cacheKey = `routing-rules:${organizationId}`;
    let rules = await this.cacheManager.get<RoutingRule[]>(cacheKey);

    if (!rules) {
      const providers = await this.providerRepository.find({
        where: { organizationId, isActive: true },
      });

      rules = [];
      for (const provider of providers) {
        if (provider.routingRules) {
          rules.push(...provider.routingRules.filter((rule) => rule.isActive));
        }
      }

      // Sort by priority (higher priority first)
      rules.sort((a, b) => b.priority - a.priority);

      await this.cacheManager.set(cacheKey, rules, 300000); // 5 minutes
    }

    return rules;
  }

  async createRoutingRule(
    routingRuleDto: ProviderRoutingRuleDto,
    organizationId: string,
  ): Promise<RoutingRule> {
    // Find the target provider
    const targetProvider = await this.providerRepository.findOne({
      where: { id: routingRuleDto.targetProvider, organizationId },
    });

    if (!targetProvider) {
      throw new Error('Target provider not found');
    }

    const rule: RoutingRule = {
      id: uuidv4(),
      name: routingRuleDto.name,
      priority: routingRuleDto.priority,
      conditions: routingRuleDto.conditions,
      targetProvider: routingRuleDto.targetProvider,
      fallbackProviders: routingRuleDto.fallbackProviders || [],
      isActive: routingRuleDto.isActive !== false,
    };

    // Add rule to provider
    const currentRules = targetProvider.routingRules || [];
    currentRules.push(rule);
    targetProvider.routingRules = currentRules;

    await this.providerRepository.save(targetProvider);

    // Clear cache
    await this.cacheManager.del(`routing-rules:${organizationId}`);

    this.logger.log(
      `Created routing rule ${rule.id} for provider ${targetProvider.id}`,
    );

    return rule;
  }

  // Circuit breaker methods
  recordSuccess(providerId: string): void {
    const state = this.circuitBreakers.get(providerId);
    if (state) {
      if (state.state === 'HALF_OPEN') {
        // Reset circuit breaker
        this.circuitBreakers.set(providerId, {
          failures: 0,
          lastFailure: new Date(0),
          state: 'CLOSED',
          nextAttempt: new Date(0),
        });
        this.logger.log(`Circuit breaker closed for provider ${providerId}`);
      } else {
        state.failures = Math.max(0, state.failures - 1);
      }
    }
  }

  recordFailure(providerId: string): void {
    const now = new Date();
    let state = this.circuitBreakers.get(providerId);

    if (!state) {
      state = {
        failures: 0,
        lastFailure: new Date(0),
        state: 'CLOSED',
        nextAttempt: new Date(0),
      };
    }

    state.failures++;
    state.lastFailure = now;

    if (state.failures >= this.failureThreshold && state.state === 'CLOSED') {
      state.state = 'OPEN';
      state.nextAttempt = new Date(now.getTime() + this.timeoutMs);
      this.logger.warn(
        `Circuit breaker opened for provider ${providerId} after ${state.failures} failures`,
      );
    }

    this.circuitBreakers.set(providerId, state);
  }

  // Public method to check circuit breaker status
  checkCircuitBreakerOpen(providerId: string): boolean {
    return this.isCircuitBreakerOpen(providerId);
  }

  private isCircuitBreakerOpen(providerId: string): boolean {
    const state = this.circuitBreakers.get(providerId);
    if (!state || state.state === 'CLOSED') {
      return false;
    }

    const now = new Date();
    if (state.state === 'OPEN' && now >= state.nextAttempt) {
      // Transition to half-open
      state.state = 'HALF_OPEN';
      this.circuitBreakers.set(providerId, state);
      this.logger.log(`Circuit breaker half-opened for provider ${providerId}`);
      return false;
    }

    return state.state === 'OPEN';
  }

  private async getActiveProviders(
    organizationId: string,
  ): Promise<AIProvider[]> {
    return this.providerRepository.find({
      where: {
        organizationId,
        isActive: true,
        status: ProviderStatus.ACTIVE,
      },
      order: { priority: 'DESC' },
    });
  }

  private async applyRoutingRules(
    providers: AIProvider[],
    rules: RoutingRule[],
    executionType: ExecutionType,
    model?: string,
    context?: Record<string, any>,
  ): Promise<AIProvider | null> {
    for (const rule of rules) {
      if (this.matchesRule(rule, executionType, model, context)) {
        const provider = providers.find((p) => p.id === rule.targetProvider);
        if (provider && !this.isCircuitBreakerOpen(provider.id)) {
          this.logger.debug(
            `Selected provider ${provider.id} via routing rule ${rule.id}`,
          );
          return provider;
        }
      }
    }
    return null;
  }

  private matchesRule(
    rule: RoutingRule,
    executionType: ExecutionType,
    model?: string,
    context?: Record<string, any>,
  ): boolean {
    const { conditions } = rule;

    // Check execution type
    if (
      conditions.executionType &&
      conditions.executionType !== executionType
    ) {
      return false;
    }

    // Check model
    if (conditions.model && model && conditions.model !== model) {
      return false;
    }

    // Check organization ID
    if (
      conditions.organizationId &&
      context?.organizationId !== conditions.organizationId
    ) {
      return false;
    }

    // Check user ID
    if (conditions.userId && context?.userId !== conditions.userId) {
      return false;
    }

    // Check cost threshold
    if (
      conditions.costThreshold &&
      context?.estimatedCost > conditions.costThreshold
    ) {
      return false;
    }

    // Check performance threshold
    if (
      conditions.performanceThreshold &&
      context?.maxResponseTime < conditions.performanceThreshold
    ) {
      return false;
    }

    return true;
  }

  private async selectFallbackProvider(
    providers: AIProvider[],
    excludeProviderId: string,
    executionType: ExecutionType,
    model?: string,
  ): Promise<AIProvider | null> {
    const availableProviders = providers.filter(
      (p) => p.id !== excludeProviderId && !this.isCircuitBreakerOpen(p.id),
    );

    if (availableProviders.length === 0) {
      return null;
    }

    // Filter by model compatibility if specified
    if (model) {
      const compatibleProviders = availableProviders.filter(
        (p) => !p.config.models || p.config.models.includes(model),
      );
      if (compatibleProviders.length > 0) {
        return this.selectByLoadBalancing(
          compatibleProviders,
          executionType,
          model,
        );
      }
    }

    return this.selectByLoadBalancing(availableProviders, executionType, model);
  }

  private selectByLoadBalancing(
    providers: AIProvider[],
    executionType: ExecutionType,
    model?: string,
  ): AIProvider {
    if (providers.length === 1) {
      return providers[0];
    }

    // Filter by model compatibility
    let compatibleProviders = providers;
    if (model) {
      const filtered = providers.filter(
        (p) => !p.config.models || p.config.models.includes(model),
      );
      if (filtered.length > 0) {
        compatibleProviders = filtered;
      }
    }

    // Select based on weighted round-robin using priority and health
    const weights = compatibleProviders.map((provider) => {
      const healthScore = this.calculateHealthScore(provider);
      const priorityScore = provider.priority / 1000; // Normalize priority
      return healthScore * priorityScore;
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;

    let currentWeight = 0;
    for (let i = 0; i < compatibleProviders.length; i++) {
      currentWeight += weights[i];
      if (random <= currentWeight) {
        this.logger.debug(
          `Selected provider ${compatibleProviders[i].id} via load balancing`,
        );
        return compatibleProviders[i];
      }
    }

    // Fallback to first provider
    return compatibleProviders[0];
  }

  private calculateHealthScore(provider: AIProvider): number {
    const health = provider.healthCheck;
    if (!health) {
      return 0.5; // Default score for unknown health
    }

    let score = 1.0;

    // Penalize based on health status
    switch (health.status) {
      case 'healthy':
        score *= 1.0;
        break;
      case 'degraded':
        score *= 0.7;
        break;
      case 'unhealthy':
        score *= 0.3;
        break;
    }

    // Penalize based on error rate
    score *= Math.max(0.1, 1.0 - health.errorRate);

    // Penalize based on response time (prefer faster providers)
    const responseTimePenalty = Math.min(1.0, health.responseTime / 10000); // 10s max
    score *= Math.max(0.1, 1.0 - responseTimePenalty);

    // Consider uptime
    score *= Math.max(0.1, health.uptime / 100);

    return Math.max(0.1, score);
  }
}
