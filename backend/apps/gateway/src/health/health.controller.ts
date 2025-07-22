import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from '@shared/health/health.service';
import { HealthStatus } from '@shared/enums';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get service health status' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async getHealth() {
    const health = await this.healthService.checkHealth();

    // Return appropriate HTTP status based on health
    const statusCode =
      health.status === HealthStatus.HEALTHY
        ? 200
        : health.status === HealthStatus.DEGRADED
          ? 200
          : 503;

    return {
      statusCode,
      ...health,
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check if service is ready to accept traffic' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async getReadiness() {
    const health = await this.healthService.checkHealth();

    // Service is ready if database and redis are healthy
    const isReady =
      health.checks.database.status !== HealthStatus.UNHEALTHY &&
      health.checks.redis.status !== HealthStatus.UNHEALTHY;

    return {
      statusCode: isReady ? 200 : 503,
      ready: isReady,
      timestamp: new Date(),
      checks: {
        database: health.checks.database.status,
        redis: health.checks.redis.status,
      },
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Check if service is alive' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async getLiveness() {
    return {
      statusCode: 200,
      alive: true,
      timestamp: new Date(),
      uptime: process.uptime(),
      version: process.env.SERVICE_VERSION || '1.0.0',
    };
  }
}
