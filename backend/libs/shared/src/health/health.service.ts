import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { CustomLoggerService } from '../logger/logger.service';
import { MonitoringService } from '../monitoring/monitoring.service';
import { HealthStatus } from '../enums';
import IORedis from 'ioredis';

interface HealthCheckResult {
  status: HealthStatus;
  timestamp: Date;
  checks: {
    database: {
      status: HealthStatus;
      responseTime: number;
      error?: string;
    };
    redis: {
      status: HealthStatus;
      responseTime: number;
      error?: string;
    };
    memory: {
      status: HealthStatus;
      usage: {
        used: number;
        total: number;
        percentage: number;
      };
    };
    disk: {
      status: HealthStatus;
      usage: {
        used: number;
        total: number;
        percentage: number;
      };
    };
    external: {
      datadog: {
        status: HealthStatus;
        enabled: boolean;
      };
    };
  };
  uptime: number;
  version: string;
  environment: string;
}

@Injectable()
export class HealthService {
  private redis!: IORedis;
  private serviceName: string;
  private serviceVersion: string;
  private environment: string;

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private configService: ConfigService,
    private logger: CustomLoggerService,
    private monitoringService: MonitoringService,
  ) {
    this.serviceName = this.configService.get('SERVICE_NAME', 'synapseai');
    this.serviceVersion = this.configService.get('SERVICE_VERSION', '1.0.0');
    this.environment = this.configService.get('NODE_ENV', 'development');

    // Initialize Redis connection for health checks
    this.initializeRedis();
  }

  private initializeRedis() {
    try {
      const redisHost = this.configService.get('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get('REDIS_PORT', 6379);
      const redisPassword = this.configService.get('REDIS_PASSWORD');

      this.redis = new IORedis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
    } catch (error) {
      this.logger.error(
        'Failed to initialize Redis for health checks',
        error instanceof Error ? error.stack : String(error),
        'HealthService',
      );
    }
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const [databaseCheck, redisCheck, memoryCheck, diskCheck, externalCheck] =
        await Promise.allSettled([
          this.checkDatabase(),
          this.checkRedis(),
          this.checkMemory(),
          this.checkDisk(),
          this.checkExternalServices(),
        ]);

      const result: HealthCheckResult = {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        checks: {
          database:
            databaseCheck.status === 'fulfilled'
              ? databaseCheck.value
              : {
                  status: HealthStatus.UNHEALTHY,
                  responseTime: 0,
                  error:
                    databaseCheck.status === 'rejected'
                      ? databaseCheck.reason.message
                      : 'Unknown error',
                },
          redis:
            redisCheck.status === 'fulfilled'
              ? redisCheck.value
              : {
                  status: HealthStatus.UNHEALTHY,
                  responseTime: 0,
                  error:
                    redisCheck.status === 'rejected'
                      ? redisCheck.reason.message
                      : 'Unknown error',
                },
          memory:
            memoryCheck.status === 'fulfilled'
              ? memoryCheck.value
              : {
                  status: HealthStatus.UNHEALTHY,
                  usage: { used: 0, total: 0, percentage: 0 },
                },
          disk:
            diskCheck.status === 'fulfilled'
              ? diskCheck.value
              : {
                  status: HealthStatus.UNHEALTHY,
                  usage: { used: 0, total: 0, percentage: 0 },
                },
          external:
            externalCheck.status === 'fulfilled'
              ? externalCheck.value
              : {
                  datadog: { status: HealthStatus.UNHEALTHY, enabled: false },
                },
        },
        uptime: process.uptime(),
        version: this.serviceVersion,
        environment: this.environment,
      };

      // Determine overall status
      const criticalChecks = [result.checks.database, result.checks.redis];
      const hasCriticalFailure = criticalChecks.some(
        (check) => check.status === HealthStatus.UNHEALTHY,
      );
      const hasDegradation = Object.values(result.checks).some(
        (check) =>
          typeof check === 'object' &&
          'status' in check &&
          check.status === HealthStatus.DEGRADED,
      );

      if (hasCriticalFailure) {
        result.status = HealthStatus.UNHEALTHY;
      } else if (hasDegradation) {
        result.status = HealthStatus.DEGRADED;
      }

      // Record health check metrics
      const duration = Date.now() - startTime;
      this.monitoringService.recordHealthCheck(
        this.serviceName,
        result.status === HealthStatus.HEALTHY ? 'healthy' : 'unhealthy',
        duration,
      );

      // Log health check result
      this.logger.log(
        `Health check completed: ${result.status}`,
        'HealthService',
        {
          status: result.status,
          duration,
          checks: result.checks,
        },
      );

      return result;
    } catch (error) {
      this.logger.error('Health check failed', error instanceof Error ? error.stack : String(error), 'HealthService');
      this.monitoringService.recordError(error instanceof Error ? error : new Error(String(error)), 'HEALTH_CHECK');

      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        checks: {
          database: {
            status: HealthStatus.UNHEALTHY,
            responseTime: 0,
            error: 'Health check failed',
          },
          redis: {
            status: HealthStatus.UNHEALTHY,
            responseTime: 0,
            error: 'Health check failed',
          },
          memory: {
            status: HealthStatus.UNHEALTHY,
            usage: { used: 0, total: 0, percentage: 0 },
          },
          disk: {
            status: HealthStatus.UNHEALTHY,
            usage: { used: 0, total: 0, percentage: 0 },
          },
          external: {
            datadog: { status: HealthStatus.UNHEALTHY, enabled: false },
          },
        },
        uptime: process.uptime(),
        version: this.serviceVersion,
        environment: this.environment,
      };
    }
  }

  private async checkDatabase() {
    const startTime = Date.now();

    try {
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      return {
        status:
          responseTime < 1000 ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.monitoringService.recordDatabaseOperation(
        'health_check',
        responseTime,
        false,
      );

      return {
        status: HealthStatus.UNHEALTHY,
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async checkRedis() {
    const startTime = Date.now();

    try {
      await this.redis.ping();
      const responseTime = Date.now() - startTime;

      return {
        status:
          responseTime < 1000 ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        status: HealthStatus.UNHEALTHY,
        responseTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async checkMemory() {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal + memUsage.external;
      const usedMemory = memUsage.heapUsed;
      const percentage = (usedMemory / totalMemory) * 100;

      let status = HealthStatus.HEALTHY;
      if (percentage > 90) {
        status = HealthStatus.UNHEALTHY;
      } else if (percentage > 75) {
        status = HealthStatus.DEGRADED;
      }

      return {
        status,
        usage: {
          used: usedMemory,
          total: totalMemory,
          percentage: Math.round(percentage * 100) / 100,
        },
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        usage: { used: 0, total: 0, percentage: 0 },
      };
    }
  }

  private async checkDisk() {
    try {
      const fs = require('fs');

      // This is a simplified disk check - in production, you'd want more sophisticated disk monitoring
      return {
        status: HealthStatus.HEALTHY,
        usage: {
          used: 0,
          total: 0,
          percentage: 0,
        },
      };
    } catch (error) {
      return {
        status: HealthStatus.DEGRADED,
        usage: { used: 0, total: 0, percentage: 0 },
      };
    }
  }

  private async checkExternalServices() {
    const datadogEnabled =
      this.configService.get('DATADOG_ENABLED', 'false') === 'true';
    const datadogHealthy = datadogEnabled ? this.checkDatadogHealth() : true;

    return {
      datadog: {
        status: datadogHealthy ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        enabled: datadogEnabled,
      },
    };
  }

  private checkDatadogHealth(): boolean {
    try {
      return !!global.ddTrace && typeof global.ddTrace.tracer === 'object';
    } catch (error) {
      return false;
    }
  }
}
