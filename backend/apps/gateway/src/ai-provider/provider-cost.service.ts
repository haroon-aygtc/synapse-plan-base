import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import {
  AIProvider,
  AIProviderExecution,
  AIProviderMetrics,
} from '@database/entities';
import { ExecutionType } from '@database/entities/ai-provider-execution.entity';

interface CostAnalytics {
  totalCost: number;
  totalRequests: number;
  averageCostPerRequest: number;
  costByProvider: Array<{
    providerId: string;
    providerName: string;
    providerType: string;
    cost: number;
    requests: number;
    averageCostPerRequest: number;
    percentage: number;
  }>;
  costByModel: Array<{
    model: string;
    cost: number;
    requests: number;
    averageCostPerRequest: number;
    percentage: number;
  }>;
  costByExecutionType: Array<{
    executionType: ExecutionType;
    cost: number;
    requests: number;
    averageCostPerRequest: number;
    percentage: number;
  }>;
  dailyTrend: Array<{
    date: string;
    cost: number;
    requests: number;
  }>;
  projectedMonthlyCost: number;
  costOptimizationSuggestions: Array<{
    type: 'provider_switch' | 'model_downgrade' | 'usage_reduction';
    description: string;
    potentialSavings: number;
    impact: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
}

interface CostForecast {
  period: 'daily' | 'weekly' | 'monthly';
  projectedCost: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  factors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
}

interface BudgetAlert {
  id: string;
  organizationId: string;
  threshold: number;
  currentSpend: number;
  percentage: number;
  alertType: 'warning' | 'critical' | 'exceeded';
  period: 'daily' | 'weekly' | 'monthly';
  createdAt: Date;
}

@Injectable()
export class ProviderCostService {
  private readonly logger = new Logger(ProviderCostService.name);
  private readonly cachePrefix = 'cost:';

  constructor(
    @InjectRepository(AIProvider)
    private readonly providerRepository: Repository<AIProvider>,
    @InjectRepository(AIProviderExecution)
    private readonly executionRepository: Repository<AIProviderExecution>,
    @InjectRepository(AIProviderMetrics)
    private readonly metricsRepository: Repository<AIProviderMetrics>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getCostAnalytics(
    organizationId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      providerId?: string;
      executionType?: ExecutionType;
    } = {},
  ): Promise<CostAnalytics> {
    const cacheKey = `${this.cachePrefix}analytics:${organizationId}:${JSON.stringify(options)}`;
    let analytics = await this.cacheManager.get<CostAnalytics>(cacheKey);

    if (!analytics) {
      analytics = await this.calculateCostAnalytics(organizationId, options);
      await this.cacheManager.set(cacheKey, analytics, 300000); // 5 minutes
    }

    return analytics;
  }

  private async calculateCostAnalytics(
    organizationId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      providerId?: string;
      executionType?: ExecutionType;
    },
  ): Promise<CostAnalytics> {
    const startDate = options.startDate || this.getStartOfMonth();
    const endDate = options.endDate || new Date();

    const whereConditions: any = {
      organizationId,
      createdAt: Between(startDate, endDate),
    };

    if (options.providerId) {
      whereConditions.providerId = options.providerId;
    }

    if (options.executionType) {
      whereConditions.executionType = options.executionType;
    }

    const executions = await this.executionRepository.find({
      where: whereConditions,
      relations: ['provider'],
    });

    const totalCost = executions.reduce(
      (sum, exec) => sum + (exec.cost || 0),
      0,
    );
    const totalRequests = executions.length;
    const averageCostPerRequest =
      totalRequests > 0 ? totalCost / totalRequests : 0;

    // Cost by provider
    const providerCosts = new Map<
      string,
      {
        providerId: string;
        providerName: string;
        providerType: string;
        cost: number;
        requests: number;
      }
    >();

    executions.forEach((exec) => {
      const key = exec.providerId;
      if (!providerCosts.has(key)) {
        providerCosts.set(key, {
          providerId: exec.providerId,
          providerName: exec.provider?.name || 'Unknown',
          providerType: exec.provider?.type || 'Unknown',
          cost: 0,
          requests: 0,
        });
      }
      const stats = providerCosts.get(key)!;
      stats.cost += exec.cost || 0;
      stats.requests++;
    });

    const costByProvider = Array.from(providerCosts.values())
      .map((stats) => ({
        ...stats,
        averageCostPerRequest:
          stats.requests > 0 ? stats.cost / stats.requests : 0,
        percentage: totalCost > 0 ? (stats.cost / totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost);

    // Cost by model
    const modelCosts = new Map<string, { cost: number; requests: number }>();
    executions.forEach((exec) => {
      const key = exec.model;
      if (!modelCosts.has(key)) {
        modelCosts.set(key, { cost: 0, requests: 0 });
      }
      const stats = modelCosts.get(key)!;
      stats.cost += exec.cost || 0;
      stats.requests++;
    });

    const costByModel = Array.from(modelCosts.entries())
      .map(([model, stats]) => ({
        model,
        cost: stats.cost,
        requests: stats.requests,
        averageCostPerRequest:
          stats.requests > 0 ? stats.cost / stats.requests : 0,
        percentage: totalCost > 0 ? (stats.cost / totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost);

    // Cost by execution type
    const typeCosts = new Map<
      ExecutionType,
      { cost: number; requests: number }
    >();
    executions.forEach((exec) => {
      const key = exec.executionType;
      if (!typeCosts.has(key)) {
        typeCosts.set(key, { cost: 0, requests: 0 });
      }
      const stats = typeCosts.get(key)!;
      stats.cost += exec.cost || 0;
      stats.requests++;
    });

    const costByExecutionType = Array.from(typeCosts.entries())
      .map(([executionType, stats]) => ({
        executionType,
        cost: stats.cost,
        requests: stats.requests,
        averageCostPerRequest:
          stats.requests > 0 ? stats.cost / stats.requests : 0,
        percentage: totalCost > 0 ? (stats.cost / totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost);

    // Daily trend
    const dailyTrend = await this.calculateDailyTrend(
      organizationId,
      startDate,
      endDate,
    );

    // Projected monthly cost
    const projectedMonthlyCost =
      await this.calculateProjectedMonthlyCost(organizationId);

    // Cost optimization suggestions
    const costOptimizationSuggestions =
      await this.generateCostOptimizationSuggestions(
        organizationId,
        costByProvider,
        costByModel,
      );

    return {
      totalCost,
      totalRequests,
      averageCostPerRequest,
      costByProvider,
      costByModel,
      costByExecutionType,
      dailyTrend,
      projectedMonthlyCost,
      costOptimizationSuggestions,
    };
  }

  private async calculateDailyTrend(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; cost: number; requests: number }>> {
    const dailyStats = new Map<string, { cost: number; requests: number }>();

    // Initialize all dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyStats.set(dateKey, { cost: 0, requests: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const executions = await this.executionRepository.find({
      where: {
        organizationId,
        createdAt: Between(startDate, endDate),
      },
    });

    executions.forEach((exec) => {
      const dateKey = exec.createdAt.toISOString().split('T')[0];
      const stats = dailyStats.get(dateKey);
      if (stats) {
        stats.cost += exec.cost || 0;
        stats.requests++;
      }
    });

    return Array.from(dailyStats.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async calculateProjectedMonthlyCost(
    organizationId: string,
  ): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const daysPassed = now.getDate();

    const monthToDateCost = await this.executionRepository
      .createQueryBuilder('execution')
      .select('SUM(execution.cost)', 'totalCost')
      .where('execution.organizationId = :organizationId', { organizationId })
      .andWhere('execution.createdAt >= :startOfMonth', { startOfMonth })
      .getRawOne();

    const currentCost = parseFloat(monthToDateCost.totalCost) || 0;
    const dailyAverage = daysPassed > 0 ? currentCost / daysPassed : 0;
    const projectedCost = dailyAverage * daysInMonth;

    return projectedCost;
  }

  private async generateCostOptimizationSuggestions(
    organizationId: string,
    costByProvider: any[],
    costByModel: any[],
  ): Promise<
    Array<{
      type: 'provider_switch' | 'model_downgrade' | 'usage_reduction';
      description: string;
      potentialSavings: number;
      impact: 'low' | 'medium' | 'high';
      recommendation: string;
    }>
  > {
    const suggestions = [];

    // Analyze expensive providers
    const expensiveProviders = costByProvider.filter(
      (provider) => provider.averageCostPerRequest > 0.01, // $0.01 per request
    );

    for (const provider of expensiveProviders) {
      if (provider.percentage > 30) {
        suggestions.push({
          type: 'provider_switch' as const,
          description: `${provider.providerName} accounts for ${provider.percentage.toFixed(1)}% of costs`,
          potentialSavings: provider.cost * 0.3, // Assume 30% savings
          impact: 'high' as const,
          recommendation:
            'Consider switching to a more cost-effective provider for routine tasks',
        });
      }
    }

    // Analyze expensive models
    const expensiveModels = costByModel.filter(
      (model) => model.averageCostPerRequest > 0.005, // $0.005 per request
    );

    for (const model of expensiveModels) {
      if (model.percentage > 20) {
        suggestions.push({
          type: 'model_downgrade' as const,
          description: `${model.model} is expensive and accounts for ${model.percentage.toFixed(1)}% of costs`,
          potentialSavings: model.cost * 0.4, // Assume 40% savings
          impact: 'medium' as const,
          recommendation:
            'Consider using a smaller, more efficient model for simpler tasks',
        });
      }
    }

    // General usage reduction suggestions
    const totalMonthlyCost =
      await this.calculateProjectedMonthlyCost(organizationId);
    if (totalMonthlyCost > 1000) {
      suggestions.push({
        type: 'usage_reduction' as const,
        description: `High monthly spend projected at $${totalMonthlyCost.toFixed(2)}`,
        potentialSavings: totalMonthlyCost * 0.2, // Assume 20% reduction possible
        impact: 'high' as const,
        recommendation:
          'Implement caching, optimize prompts, and review usage patterns',
      });
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  async getCostForecast(
    organizationId: string,
    period: 'daily' | 'weekly' | 'monthly',
  ): Promise<CostForecast> {
    const cacheKey = `${this.cachePrefix}forecast:${organizationId}:${period}`;
    let forecast = await this.cacheManager.get<CostForecast>(cacheKey);

    if (!forecast) {
      forecast = await this.calculateCostForecast(organizationId, period);
      await this.cacheManager.set(cacheKey, forecast, 3600000); // 1 hour
    }

    return forecast;
  }

  private async calculateCostForecast(
    organizationId: string,
    period: 'daily' | 'weekly' | 'monthly',
  ): Promise<CostForecast> {
    const now = new Date();
    let startDate: Date;
    let periodDays: number;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
        periodDays = 1;
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        periodDays = 7;
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // Last 90 days
        periodDays = 30;
        break;
    }

    const dailyTrend = await this.calculateDailyTrend(
      organizationId,
      startDate,
      now,
    );

    if (dailyTrend.length < 3) {
      return {
        period,
        projectedCost: 0,
        confidence: 0,
        trend: 'stable',
        factors: [],
      };
    }

    // Calculate trend using linear regression
    const costs = dailyTrend.map((d) => d.cost);
    const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
    const recentAvg = costs.slice(-3).reduce((sum, cost) => sum + cost, 0) / 3;
    const olderAvg = costs.slice(0, 3).reduce((sum, cost) => sum + cost, 0) / 3;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (recentAvg > olderAvg * 1.1) {
      trend = 'increasing';
    } else if (recentAvg < olderAvg * 0.9) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    const projectedCost = avgCost * periodDays;
    const confidence = Math.min(0.9, dailyTrend.length / 30); // Higher confidence with more data

    const factors = [
      {
        factor: 'Historical Usage',
        impact: 0.6,
        description: 'Based on recent usage patterns',
      },
      {
        factor: 'Trend Analysis',
        impact: trend === 'stable' ? 0.2 : 0.4,
        description: `Usage is ${trend}`,
      },
      {
        factor: 'Seasonal Variation',
        impact: 0.2,
        description: 'Accounting for typical usage variations',
      },
    ];

    return {
      period,
      projectedCost,
      confidence,
      trend,
      factors,
    };
  }

  async getBudgetAlerts(organizationId: string): Promise<BudgetAlert[]> {
    // This would typically be stored in a database table
    // For now, we'll calculate based on current spend vs typical patterns
    const alerts: BudgetAlert[] = [];

    const monthlyForecast = await this.getCostForecast(
      organizationId,
      'monthly',
    );
    const currentMonthSpend = await this.getCurrentMonthSpend(organizationId);

    // Example budget thresholds (these would be configurable per organization)
    const budgetThresholds = {
      monthly: 1000, // $1000 monthly budget
      weekly: 250, // $250 weekly budget
      daily: 50, // $50 daily budget
    };

    // Check monthly budget
    const monthlyPercentage =
      (currentMonthSpend / budgetThresholds.monthly) * 100;
    if (monthlyPercentage > 80) {
      alerts.push({
        id: `monthly-${organizationId}`,
        organizationId,
        threshold: budgetThresholds.monthly,
        currentSpend: currentMonthSpend,
        percentage: monthlyPercentage,
        alertType:
          monthlyPercentage > 100
            ? 'exceeded'
            : monthlyPercentage > 90
              ? 'critical'
              : 'warning',
        period: 'monthly',
        createdAt: new Date(),
      });
    }

    return alerts;
  }

  private async getCurrentMonthSpend(organizationId: string): Promise<number> {
    const startOfMonth = this.getStartOfMonth();
    const result = await this.executionRepository
      .createQueryBuilder('execution')
      .select('SUM(execution.cost)', 'totalCost')
      .where('execution.organizationId = :organizationId', { organizationId })
      .andWhere('execution.createdAt >= :startOfMonth', { startOfMonth })
      .getRawOne();

    return parseFloat(result.totalCost) || 0;
  }

  private getStartOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  async getProviderCostComparison(
    organizationId: string,
    model: string,
  ): Promise<
    Array<{
      providerId: string;
      providerName: string;
      providerType: string;
      averageCost: number;
      responseTime: number;
      reliability: number;
      recommendation: 'best_cost' | 'best_performance' | 'best_balance';
    }>
  > {
    const providers = await this.providerRepository.find({
      where: { organizationId, isActive: true },
    });

    const comparisons = [];

    for (const provider of providers) {
      const executions = await this.executionRepository.find({
        where: {
          organizationId,
          providerId: provider.id,
          model,
        },
        take: 100, // Last 100 executions
        order: { createdAt: 'DESC' },
      });

      if (executions.length > 0) {
        const averageCost =
          executions.reduce((sum, exec) => sum + (exec.cost || 0), 0) /
          executions.length;
        const averageResponseTime =
          executions.reduce(
            (sum, exec) => sum + (exec.responseTimeMs || 0),
            0,
          ) / executions.length;
        const successRate =
          executions.filter((exec) => !exec.error).length / executions.length;

        comparisons.push({
          providerId: provider.id,
          providerName: provider.name,
          providerType: provider.type,
          averageCost,
          responseTime: averageResponseTime,
          reliability: successRate,
          recommendation: 'best_balance' as const, // Will be calculated below
        });
      }
    }

    // Determine recommendations
    if (comparisons.length > 0) {
      const lowestCost = Math.min(...comparisons.map((c) => c.averageCost));
      const fastestResponse = Math.min(
        ...comparisons.map((c) => c.responseTime),
      );
      const highestReliability = Math.max(
        ...comparisons.map((c) => c.reliability),
      );

      comparisons.forEach((comparison) => {
        if (comparison.averageCost === lowestCost) {
          comparison.recommendation = 'best_cost';
        } else if (
          comparison.responseTime === fastestResponse &&
          comparison.reliability >= 0.95
        ) {
          comparison.recommendation = 'best_performance';
        } else {
          // Calculate balance score
          const costScore =
            1 - (comparison.averageCost - lowestCost) / lowestCost;
          const performanceScore =
            1 - (comparison.responseTime - fastestResponse) / fastestResponse;
          const reliabilityScore = comparison.reliability;
          const balanceScore =
            (costScore + performanceScore + reliabilityScore) / 3;

          if (balanceScore > 0.8) {
            comparison.recommendation = 'best_balance';
          }
        }
      });
    }

    return comparisons.sort((a, b) => a.averageCost - b.averageCost);
  }
}
