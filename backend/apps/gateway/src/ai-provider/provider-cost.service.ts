import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AIProviderExecution, AIProviderMetrics } from '@database/entities';
import { ExecutionType } from '@database/entities/ai-provider-execution.entity';

export interface CostAnalysis {
  totalCost: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
  costByExecutionType: Record<string, number>;
  trends: Array<{
    date: string;
    cost: number;
    requests: number;
  }>;
  projections: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  recommendations: Array<{
    type: 'cost_reduction' | 'optimization' | 'alert';
    description: string;
    potentialSavings: number;
    priority: 'low' | 'medium' | 'high';
  }>;
}

@Injectable()
export class ProviderCostService {
  private readonly logger = new Logger(ProviderCostService.name);

  constructor(
    @InjectRepository(AIProviderExecution)
    private readonly executionRepository: Repository<AIProviderExecution>,
    @InjectRepository(AIProviderMetrics)
    private readonly metricsRepository: Repository<AIProviderMetrics>,
  ) {}

  async getCostAnalytics(
    organizationId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<CostAnalysis> {
    const endDate = options.endDate || new Date();
    const startDate =
      options.startDate ||
      new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    return this.analyzeCosts(organizationId, startDate, endDate);
  }

  async analyzeCosts(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CostAnalysis> {
    const executions = await this.executionRepository.find({
      where: {
        organizationId,
        createdAt: Between(startDate, endDate),
      },
      relations: ['provider'],
    });

    const totalCost = executions.reduce(
      (sum, exec) => sum + (exec.cost || 0),
      0,
    );

    // Cost by provider
    const costByProvider = executions.reduce(
      (acc, exec) => {
        const providerName = exec.provider?.name || 'Unknown';
        acc[providerName] = (acc[providerName] || 0) + (exec.cost || 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Cost by model
    const costByModel = executions.reduce(
      (acc, exec) => {
        acc[exec.model] = (acc[exec.model] || 0) + (exec.cost || 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Cost by execution type
    const costByExecutionType = executions.reduce(
      (acc, exec) => {
        acc[exec.executionType] =
          (acc[exec.executionType] || 0) + (exec.cost || 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Daily trends
    const trends = this.calculateDailyTrends(executions);

    // Projections
    const projections = this.calculateProjections(trends);

    // Recommendations
    const recommendations = this.generateRecommendations(
      executions,
      costByProvider,
      costByModel,
      totalCost,
    );

    return {
      totalCost,
      costByProvider,
      costByModel,
      costByExecutionType,
      trends,
      projections,
      recommendations,
    };
  }

  async getProviderCostComparison(
    organizationId: string,
    model: string,
    executionType: ExecutionType,
    period: 'day' | 'week' | 'month',
  ): Promise<{
    providers: Array<{
      providerId: string;
      providerName: string;
      totalCost: number;
      averageCostPerRequest: number;
      requestCount: number;
      efficiency: number;
    }>;
    recommendations: string[];
  }> {
    const startDate = this.getStartDateForPeriod(period);
    const endDate = new Date();

    const executions = await this.executionRepository.find({
      where: {
        organizationId,
        model,
        executionType,
        createdAt: Between(startDate, endDate),
      },
      relations: ['provider'],
    });

    const providerStats = executions.reduce(
      (acc, exec) => {
        const key = exec.providerId;
        if (!acc[key]) {
          acc[key] = {
            providerId: exec.providerId,
            providerName: exec.provider?.name || 'Unknown',
            totalCost: 0,
            requestCount: 0,
            totalResponseTime: 0,
          };
        }
        acc[key].totalCost += exec.cost || 0;
        acc[key].requestCount += 1;
        acc[key].totalResponseTime += exec.responseTimeMs || 0;
        return acc;
      },
      {} as Record<string, any>,
    );

    const providers = Object.values(providerStats).map((stats: any) => ({
      providerId: stats.providerId,
      providerName: stats.providerName,
      totalCost: stats.totalCost,
      averageCostPerRequest: stats.totalCost / stats.requestCount,
      requestCount: stats.requestCount,
      efficiency: this.calculateEfficiency(
        stats.totalCost,
        stats.requestCount,
        stats.totalResponseTime,
      ),
    }));

    const recommendations = this.generateProviderRecommendations(providers);

    return { providers, recommendations };
  }

  async getCostAlerts(
    organizationId: string,
    thresholds: {
      dailyLimit?: number;
      weeklyLimit?: number;
      monthlyLimit?: number;
      costPerRequestLimit?: number;
    },
  ): Promise<
    Array<{
      type: 'daily' | 'weekly' | 'monthly' | 'per_request';
      current: number;
      threshold: number;
      severity: 'warning' | 'critical';
      message: string;
    }>
  > {
    const alerts = [];
    const now = new Date();

    // Daily cost check
    if (thresholds.dailyLimit) {
      const dayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const dailyCost = await this.getCostForPeriod(
        organizationId,
        dayStart,
        now,
      );

      if (dailyCost >= thresholds.dailyLimit) {
        alerts.push({
          type: 'daily',
          current: dailyCost,
          threshold: thresholds.dailyLimit,
          severity:
            dailyCost >= thresholds.dailyLimit * 1.2 ? 'critical' : 'warning',
          message: `Daily cost limit ${dailyCost >= thresholds.dailyLimit * 1.2 ? 'exceeded' : 'approaching'}`,
        });
      }
    }

    // Weekly cost check
    if (thresholds.weeklyLimit) {
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weeklyCost = await this.getCostForPeriod(
        organizationId,
        weekStart,
        now,
      );

      if (weeklyCost >= thresholds.weeklyLimit) {
        alerts.push({
          type: 'weekly',
          current: weeklyCost,
          threshold: thresholds.weeklyLimit,
          severity:
            weeklyCost >= thresholds.weeklyLimit * 1.2 ? 'critical' : 'warning',
          message: `Weekly cost limit ${weeklyCost >= thresholds.weeklyLimit * 1.2 ? 'exceeded' : 'approaching'}`,
        });
      }
    }

    // Monthly cost check
    if (thresholds.monthlyLimit) {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyCost = await this.getCostForPeriod(
        organizationId,
        monthStart,
        now,
      );

      if (monthlyCost >= thresholds.monthlyLimit) {
        alerts.push({
          type: 'monthly',
          current: monthlyCost,
          threshold: thresholds.monthlyLimit,
          severity:
            monthlyCost >= thresholds.monthlyLimit * 1.2
              ? 'critical'
              : 'warning',
          message: `Monthly cost limit ${monthlyCost >= thresholds.monthlyLimit * 1.2 ? 'exceeded' : 'approaching'}`,
        });
      }
    }

    return alerts;
  }

  private calculateDailyTrends(
    executions: AIProviderExecution[],
  ): Array<{ date: string; cost: number; requests: number }> {
    const dailyData = executions.reduce(
      (acc, exec) => {
        const date = exec.createdAt.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { cost: 0, requests: 0 };
        }
        acc[date].cost += exec.cost || 0;
        acc[date].requests += 1;
        return acc;
      },
      {} as Record<string, { cost: number; requests: number }>,
    );

    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateProjections(
    trends: Array<{ date: string; cost: number; requests: number }>,
  ): {
    daily: number;
    weekly: number;
    monthly: number;
  } {
    if (trends.length === 0) {
      return { daily: 0, weekly: 0, monthly: 0 };
    }

    // Calculate average daily cost from recent trends
    const recentTrends = trends.slice(-7); // Last 7 days
    const avgDailyCost =
      recentTrends.reduce((sum, trend) => sum + trend.cost, 0) /
      recentTrends.length;

    return {
      daily: avgDailyCost,
      weekly: avgDailyCost * 7,
      monthly: avgDailyCost * 30,
    };
  }

  private generateRecommendations(
    executions: AIProviderExecution[],
    costByProvider: Record<string, number>,
    costByModel: Record<string, number>,
    totalCost: number,
  ): Array<{
    type: 'cost_reduction' | 'optimization' | 'alert';
    description: string;
    potentialSavings: number;
    priority: 'low' | 'medium' | 'high';
  }> {
    const recommendations = [];

    // High-cost provider recommendation
    const sortedProviders = Object.entries(costByProvider).sort(
      ([, a], [, b]) => b - a,
    );
    if (sortedProviders.length > 1 && sortedProviders[0][1] > totalCost * 0.6) {
      recommendations.push({
        type: 'cost_reduction' as const,
        description: `Provider "${sortedProviders[0][0]}" accounts for ${((sortedProviders[0][1] / totalCost) * 100).toFixed(1)}% of total costs. Consider load balancing.`,
        potentialSavings: sortedProviders[0][1] * 0.3,
        priority: 'high' as const,
      });
    }

    // Expensive model recommendation
    const sortedModels = Object.entries(costByModel).sort(
      ([, a], [, b]) => b - a,
    );
    if (sortedModels.length > 0 && sortedModels[0][1] > totalCost * 0.4) {
      recommendations.push({
        type: 'optimization' as const,
        description: `Model "${sortedModels[0][0]}" is generating high costs. Consider using it selectively for complex tasks only.`,
        potentialSavings: sortedModels[0][1] * 0.2,
        priority: 'medium' as const,
      });
    }

    // High error rate cost impact
    const failedExecutions = executions.filter((exec) => exec.error);
    const errorCost = failedExecutions.reduce(
      (sum, exec) => sum + (exec.cost || 0),
      0,
    );
    if (errorCost > totalCost * 0.1) {
      recommendations.push({
        type: 'alert' as const,
        description: `Failed executions are costing ${((errorCost / totalCost) * 100).toFixed(1)}% of total budget. Improve error handling.`,
        potentialSavings: errorCost,
        priority: 'high' as const,
      });
    }

    return recommendations;
  }

  private generateProviderRecommendations(providers: any[]): string[] {
    const recommendations = [];

    if (providers.length > 1) {
      const sortedByEfficiency = providers.sort(
        (a, b) => b.efficiency - a.efficiency,
      );
      const mostEfficient = sortedByEfficiency[0];
      const leastEfficient = sortedByEfficiency[sortedByEfficiency.length - 1];

      if (mostEfficient.efficiency > leastEfficient.efficiency * 1.5) {
        recommendations.push(
          `Consider using ${mostEfficient.providerName} more frequently for better cost efficiency`,
        );
      }

      const sortedByCost = providers.sort(
        (a, b) => a.averageCostPerRequest - b.averageCostPerRequest,
      );
      const cheapest = sortedByCost[0];
      const mostExpensive = sortedByCost[sortedByCost.length - 1];

      if (
        mostExpensive.averageCostPerRequest >
        cheapest.averageCostPerRequest * 2
      ) {
        recommendations.push(
          `${mostExpensive.providerName} costs ${(mostExpensive.averageCostPerRequest / cheapest.averageCostPerRequest).toFixed(1)}x more than ${cheapest.providerName} per request`,
        );
      }
    }

    return recommendations;
  }

  private calculateEfficiency(
    totalCost: number,
    requestCount: number,
    totalResponseTime: number,
  ): number {
    if (requestCount === 0) return 0;

    const avgCostPerRequest = totalCost / requestCount;
    const avgResponseTime = totalResponseTime / requestCount;

    // Efficiency score: lower cost and faster response = higher efficiency
    // Normalize to 0-100 scale
    const costScore = Math.max(0, 100 - avgCostPerRequest * 10000); // Assuming $0.01 = 0 score
    const speedScore = Math.max(0, 100 - avgResponseTime / 100); // Assuming 10s = 0 score

    return (costScore + speedScore) / 2;
  }

  private async getCostForPeriod(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const executions = await this.executionRepository.find({
      where: {
        organizationId,
        createdAt: Between(startDate, endDate),
      },
    });

    return executions.reduce((sum, exec) => sum + (exec.cost || 0), 0);
  }

  private getStartDateForPeriod(period: 'day' | 'week' | 'month'): Date {
    const now = new Date();
    switch (period) {
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
}
