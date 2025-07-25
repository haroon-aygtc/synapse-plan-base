import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { AIProvider, AIProviderMetrics, ProviderStatus } from '@database/entities';
import { ProviderAdapterService } from './provider-adapter.service';
import { AgentEventType } from '@shared/enums';

interface HealthCheckResult {
  providerId: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  errorRate: number;
  uptime: number;
  lastCheck: Date;
  error?: string;
}

interface ProviderHealthStats {
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageResponseTime: number;
  uptime: number;
  lastSuccessfulCheck: Date;
  lastFailedCheck?: Date;
  consecutiveFailures: number;
}

@Injectable()
export class ProviderHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProviderHealthService.name);
  private readonly healthStats = new Map<string, ProviderHealthStats>();
  private readonly monitoringIntervals = new Map<string, NodeJS.Timeout>();
  private readonly healthThresholds = {
    responseTimeWarning: 5000, // 5 seconds
    responseTimeError: 15000, // 15 seconds
    errorRateWarning: 0.1, // 10%
    errorRateError: 0.25, // 25%
    uptimeWarning: 0.95, // 95%
    uptimeError: 0.9, // 90%
    maxConsecutiveFailures: 3,
  };

  constructor(
    @InjectRepository(AIProvider)
    private readonly providerRepository: Repository<AIProvider>,
    @InjectRepository(AIProviderMetrics)
    private readonly metricsRepository: Repository<AIProviderMetrics>,
    private readonly providerAdapter: ProviderAdapterService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Provider Health Service');
    await this.initializeHealthMonitoring();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down Provider Health Service');
    this.stopAllMonitoring();
  }

  async initializeHealthMonitoring(): Promise<void> {
    const activeProviders = await this.providerRepository.find({
      where: { isActive: true, status: ProviderStatus.ACTIVE },
    });

    for (const provider of activeProviders) {
      await this.startMonitoring(provider.id, provider.organizationId);
    }

    this.logger.log(`Started health monitoring for ${activeProviders.length} providers`);
  }

  async startMonitoring(providerId: string, organizationId: string): Promise<void> {
    if (this.monitoringIntervals.has(providerId)) {
      this.logger.warn(`Health monitoring already active for provider ${providerId}`);
      return;
    }

    // Initialize health stats
    this.healthStats.set(providerId, {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageResponseTime: 0,
      uptime: 1.0,
      lastSuccessfulCheck: new Date(),
      consecutiveFailures: 0,
    });

    // Start periodic health checks (every 2 minutes)
    const interval = setInterval(async () => {
      await this.performHealthCheck(providerId, organizationId);
    }, 120000);

    this.monitoringIntervals.set(providerId, interval);

    // Perform initial health check
    await this.performHealthCheck(providerId, organizationId);

    this.logger.log(`Started health monitoring for provider ${providerId}`);
  }

  stopMonitoring(providerId: string): void {
    const interval = this.monitoringIntervals.get(providerId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(providerId);
      this.healthStats.delete(providerId);
      this.logger.log(`Stopped health monitoring for provider ${providerId}`);
    }
  }

  private stopAllMonitoring(): void {
    for (const [providerId, interval] of this.monitoringIntervals) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();
    this.healthStats.clear();
  }

  async performHealthCheck(providerId: string, organizationId: string): Promise<HealthCheckResult> {
    const provider = await this.providerRepository.findOne({
      where: { id: providerId, organizationId },
    });

    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const startTime = Date.now();
    let result: HealthCheckResult;

    try {
      // Perform connection test
      const testResult = await this.providerAdapter.testConnection(provider.type, provider.config);

      const responseTime = Date.now() - startTime;
      const stats = this.healthStats.get(providerId);

      if (testResult.success) {
        // Update success stats
        if (stats) {
          stats.totalChecks++;
          stats.successfulChecks++;
          stats.consecutiveFailures = 0;
          stats.lastSuccessfulCheck = new Date();
          stats.averageResponseTime =
            (stats.averageResponseTime * (stats.totalChecks - 1) + responseTime) /
            stats.totalChecks;
          stats.uptime = stats.successfulChecks / stats.totalChecks;
        }

        result = {
          providerId,
          status: this.determineHealthStatus(responseTime, 0, stats?.uptime || 1),
          responseTime,
          errorRate: 0,
          uptime: stats?.uptime || 1,
          lastCheck: new Date(),
        };
      } else {
        // Update failure stats
        if (stats) {
          stats.totalChecks++;
          stats.failedChecks++;
          stats.consecutiveFailures++;
          stats.lastFailedCheck = new Date();
          stats.uptime = stats.successfulChecks / stats.totalChecks;
        }

        result = {
          providerId,
          status: 'unhealthy',
          responseTime,
          errorRate: stats ? stats.failedChecks / stats.totalChecks : 1,
          uptime: stats?.uptime || 0,
          lastCheck: new Date(),
          error: testResult.error,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const stats = this.healthStats.get(providerId);

      if (stats) {
        stats.totalChecks++;
        stats.failedChecks++;
        stats.consecutiveFailures++;
        stats.lastFailedCheck = new Date();
        stats.uptime = stats.successfulChecks / stats.totalChecks;
      }

      result = {
        providerId,
        status: 'unhealthy',
        responseTime,
        errorRate: stats ? stats.failedChecks / stats.totalChecks : 1,
        uptime: stats?.uptime || 0,
        lastCheck: new Date(),
        error: error.message,
      };
    }

    // Update provider health in database
    await this.updateProviderHealth(provider, result);

    // Cache the result
    await this.cacheManager.set(
      `health:${providerId}`,
      result,
      300000 // 5 minutes
    );

    // Emit health check event
    this.eventEmitter.emit(AgentEventType.AI_PROVIDER_HEALTH_CHECK, {
      providerId,
      organizationId,
      healthStatus: result.status,
      responseTime: result.responseTime,
      errorRate: result.errorRate,
      uptime: result.uptime,
      timestamp: new Date(),
    });

    // Check if provider needs to be marked as unhealthy
    await this.handleUnhealthyProvider(provider, result);

    return result;
  }

  private determineHealthStatus(
    responseTime: number,
    errorRate: number,
    uptime: number
  ): 'healthy' | 'unhealthy' | 'degraded' {
    if (
      responseTime > this.healthThresholds.responseTimeError ||
      errorRate > this.healthThresholds.errorRateError ||
      uptime < this.healthThresholds.uptimeError
    ) {
      return 'unhealthy';
    }

    if (
      responseTime > this.healthThresholds.responseTimeWarning ||
      errorRate > this.healthThresholds.errorRateWarning ||
      uptime < this.healthThresholds.uptimeWarning
    ) {
      return 'degraded';
    }

    return 'healthy';
  }

  private async updateProviderHealth(
    provider: AIProvider,
    result: HealthCheckResult
  ): Promise<void> {
    provider.healthCheck = {
      lastCheck: result.lastCheck,
      status: result.status,
      responseTime: result.responseTime,
      errorRate: result.errorRate,
      uptime: result.uptime,
    };

    await this.providerRepository.save(provider);
  }

  private async handleUnhealthyProvider(
    provider: AIProvider,
    result: HealthCheckResult
  ): Promise<void> {
    const stats = this.healthStats.get(provider.id);

    if (
      result.status === 'unhealthy' &&
      stats &&
      stats.consecutiveFailures >= this.healthThresholds.maxConsecutiveFailures
    ) {
      // Mark provider as inactive if too many consecutive failures
      if (provider.status === ProviderStatus.ACTIVE) {
        provider.status = ProviderStatus.ERROR;
        await this.providerRepository.save(provider);

        this.eventEmitter.emit(AgentEventType.AI_PROVIDER_STATUS_CHANGED, {
          providerId: provider.id,
          organizationId: provider.organizationId,
          oldStatus: ProviderStatus.ACTIVE,
          newStatus: ProviderStatus.ERROR,
          reason: 'Consecutive health check failures',
          timestamp: new Date(),
        });

        this.logger.error(
          `Provider ${provider.id} marked as ERROR due to ${stats.consecutiveFailures} consecutive failures`
        );
      }
    } else if (result.status === 'healthy' && provider.status === ProviderStatus.ERROR) {
      // Restore provider if it becomes healthy again
      provider.status = ProviderStatus.ACTIVE;
      await this.providerRepository.save(provider);

      this.eventEmitter.emit(AgentEventType.AI_PROVIDER_STATUS_CHANGED, {
        providerId: provider.id,
        organizationId: provider.organizationId,
        oldStatus: ProviderStatus.ERROR,
        newStatus: ProviderStatus.ACTIVE,
        reason: 'Health check recovered',
        timestamp: new Date(),
      });

      this.logger.log(`Provider ${provider.id} restored to ACTIVE status after recovery`);
    }
  }

  async getProviderHealth(
    providerId: string,
    organizationId: string
  ): Promise<HealthCheckResult | null> {
    // Try cache first
    const cached = await this.cacheManager.get<HealthCheckResult>(`health:${providerId}`);
    if (cached) {
      return cached;
    }

    // Perform fresh health check
    try {
      return await this.performHealthCheck(providerId, organizationId);
    } catch (error) {
      this.logger.error(`Failed to get health for provider ${providerId}: ${error.message}`);
      return null;
    }
  }

  async getOrganizationHealth(organizationId: string): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    providers: Array<{
      id: string;
      name: string;
      type: string;
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime: number;
      errorRate: number;
      uptime: number;
      lastCheck: Date;
    }>;
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
      averageResponseTime: number;
      averageUptime: number;
    };
  }> {
    const providers = await this.providerRepository.find({
      where: { organizationId, isActive: true },
    });

    const healthResults = [];
    let totalResponseTime = 0;
    let totalUptime = 0;
    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;

    for (const provider of providers) {
      const health = await this.getProviderHealth(provider.id, organizationId);
      if (health) {
        healthResults.push({
          id: provider.id,
          name: provider.name,
          type: provider.type,
          status: health.status,
          responseTime: health.responseTime,
          errorRate: health.errorRate,
          uptime: health.uptime,
          lastCheck: health.lastCheck,
        });

        totalResponseTime += health.responseTime;
        totalUptime += health.uptime;

        switch (health.status) {
          case 'healthy':
            healthyCount++;
            break;
          case 'degraded':
            degradedCount++;
            break;
          case 'unhealthy':
            unhealthyCount++;
            break;
        }
      }
    }

    const total = healthResults.length;
    const averageResponseTime = total > 0 ? totalResponseTime / total : 0;
    const averageUptime = total > 0 ? totalUptime / total : 0;

    // Determine overall health
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > total * 0.5) {
      overall = 'unhealthy';
    } else if (unhealthyCount > 0 || degradedCount > total * 0.3) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      providers: healthResults,
      summary: {
        total,
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
        averageResponseTime,
        averageUptime,
      },
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldMetrics(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days of metrics

    try {
      const result = await this.metricsRepository
        .createQueryBuilder()
        .delete()
        .where('timestamp < :cutoffDate', { cutoffDate })
        .execute();

      this.logger.log(`Cleaned up ${result.affected} old health metrics records`);
    } catch (error) {
      this.logger.error(`Failed to cleanup old metrics: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async aggregateHealthMetrics(): Promise<void> {
    const providers = await this.providerRepository.find({
      where: { isActive: true },
    });

    for (const provider of providers) {
      const stats = this.healthStats.get(provider.id);
      if (stats && stats.totalChecks > 0) {
        const metric = this.metricsRepository.create({
          providerId: provider.id,
          organizationId: provider.organizationId,
          timestamp: new Date(),
          totalRequests: stats.totalChecks,
          successfulRequests: stats.successfulChecks,
          failedRequests: stats.failedChecks,
          averageResponseTime: stats.averageResponseTime,
          errorRate: stats.failedChecks / stats.totalChecks,
          throughput: stats.successfulChecks / (stats.totalChecks || 1),
          additionalMetrics: {
            uptime: stats.uptime,
            consecutiveFailures: stats.consecutiveFailures,
            lastSuccessfulCheck: stats.lastSuccessfulCheck,
            lastFailedCheck: stats.lastFailedCheck,
          },
        });

        await this.metricsRepository.save(metric);
      }
    }
  }
}
