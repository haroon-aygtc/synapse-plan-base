import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { APXMessageType } from '@shared/enums';

interface MessageMetrics {
  messageType: APXMessageType;
  organizationId: string;
  userId: string;
  timestamp: Date;
  latency: number;
  payloadSize: number;
  success: boolean;
  errorCode?: string;
}

interface ConnectionMetrics {
  organizationId: string;
  userId: string;
  connectionId: string;
  connectedAt: Date;
  disconnectedAt?: Date;
  duration?: number;
  disconnectReason?: string;
  messageCount: number;
  errorCount: number;
}

interface PerformanceMetrics {
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  errorRate: number;
  connectionCount: number;
  messageCount: number;
}

@Injectable()
export class APXMonitoringService {
  private readonly logger = new Logger(APXMonitoringService.name);
  private readonly messageMetrics: MessageMetrics[] = [];
  private readonly connectionMetrics = new Map<string, ConnectionMetrics>();
  private readonly METRICS_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly METRICS_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  private cleanupTimer: NodeJS.Timeout;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.startMetricsCleanup();
  }

  // Message-level monitoring
  recordMessageStart(messageType: APXMessageType, organizationId: string, userId: string): string {
    const traceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store start time in Redis for distributed tracing
    this.redis
      .setex(
        `apix:trace:${traceId}`,
        300, // 5 minutes TTL
        JSON.stringify({
          messageType,
          organizationId,
          userId,
          startTime: Date.now(),
        })
      )
      .catch((error) => {
        this.logger.warn(`Failed to store trace start: ${error.message}`);
      });

    return traceId;
  }

  async recordMessageEnd(
    traceId: string,
    success: boolean,
    payloadSize: number,
    errorCode?: string
  ): Promise<void> {
    try {
      const traceData = await this.redis.get(`apix:trace:${traceId}`);
      if (!traceData) {
        this.logger.warn(`Trace data not found for ID: ${traceId}`);
        return;
      }

      const trace = JSON.parse(traceData);
      const latency = Date.now() - trace.startTime;

      const metrics: MessageMetrics = {
        messageType: trace.messageType,
        organizationId: trace.organizationId,
        userId: trace.userId,
        timestamp: new Date(),
        latency,
        payloadSize,
        success,
        errorCode,
      };

      // Store in memory for real-time metrics
      this.messageMetrics.push(metrics);

      // Store in Redis for persistence and cross-instance aggregation
      await this.redis.lpush(
        `apix:metrics:messages:${trace.organizationId}`,
        JSON.stringify(metrics)
      );
      await this.redis.expire(
        `apix:metrics:messages:${trace.organizationId}`,
        86400 // 24 hours
      );

      // Emit event for real-time monitoring
      this.eventEmitter.emit('apix.message.metrics', metrics);

      // Clean up trace
      await this.redis.del(`apix:trace:${traceId}`);

      // Log high latency or errors
      if (latency > 5000) {
        this.logger.warn(
          `High latency detected: ${trace.messageType} took ${latency}ms for org ${trace.organizationId}`
        );
      }

      if (!success) {
        this.logger.error(
          `Message failed: ${trace.messageType} for org ${trace.organizationId} - ${errorCode}`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to record message end: ${error.message}`);
    }
  }

  // Connection-level monitoring
  recordConnectionStart(connectionId: string, organizationId: string, userId: string): void {
    const metrics: ConnectionMetrics = {
      organizationId,
      userId,
      connectionId,
      connectedAt: new Date(),
      messageCount: 0,
      errorCount: 0,
    };

    this.connectionMetrics.set(connectionId, metrics);
    this.eventEmitter.emit('apix.connection.started', metrics);
  }

  recordConnectionEnd(connectionId: string, reason?: string): void {
    const metrics = this.connectionMetrics.get(connectionId);
    if (!metrics) return;

    metrics.disconnectedAt = new Date();
    metrics.duration = metrics.disconnectedAt.getTime() - metrics.connectedAt.getTime();
    metrics.disconnectReason = reason;

    // Store final metrics in Redis
    this.redis
      .lpush(`apix:metrics:connections:${metrics.organizationId}`, JSON.stringify(metrics))
      .catch((error) => {
        this.logger.warn(`Failed to store connection metrics: ${error.message}`);
      });

    this.eventEmitter.emit('apix.connection.ended', metrics);
    this.connectionMetrics.delete(connectionId);
  }

  recordMessageForConnection(connectionId: string, success: boolean): void {
    const metrics = this.connectionMetrics.get(connectionId);
    if (!metrics) return;

    metrics.messageCount++;
    if (!success) {
      metrics.errorCount++;
    }
  }

  // Performance metrics aggregation
  getPerformanceMetrics(
    organizationId?: string,
    timeWindowMs: number = 300000
  ): PerformanceMetrics {
    const cutoff = new Date(Date.now() - timeWindowMs);

    let relevantMetrics = this.messageMetrics.filter((m) => m.timestamp >= cutoff);

    if (organizationId) {
      relevantMetrics = relevantMetrics.filter((m) => m.organizationId === organizationId);
    }

    if (relevantMetrics.length === 0) {
      return {
        avgLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        throughput: 0,
        errorRate: 0,
        connectionCount: 0,
        messageCount: 0,
      };
    }

    // Calculate latency metrics
    const latencies = relevantMetrics.map((m) => m.latency).sort((a, b) => a - b);
    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);
    const p95Latency = latencies[p95Index] || 0;
    const p99Latency = latencies[p99Index] || 0;

    // Calculate throughput (messages per second)
    const throughput = (relevantMetrics.length / timeWindowMs) * 1000;

    // Calculate error rate
    const errorCount = relevantMetrics.filter((m) => !m.success).length;
    const errorRate = errorCount / relevantMetrics.length;

    // Get current connection count
    const connectionCount = organizationId
      ? Array.from(this.connectionMetrics.values()).filter(
          (c) => c.organizationId === organizationId
        ).length
      : this.connectionMetrics.size;

    return {
      avgLatency,
      p95Latency,
      p99Latency,
      throughput,
      errorRate,
      connectionCount,
      messageCount: relevantMetrics.length,
    };
  }

  // Real-time alerts
  checkAlerts(organizationId: string): void {
    const metrics = this.getPerformanceMetrics(organizationId, 60000); // 1 minute window

    // High latency alert
    if (metrics.p95Latency > 10000) {
      // 10 seconds
      this.eventEmitter.emit('apix.alert.high_latency', {
        organizationId,
        p95Latency: metrics.p95Latency,
        threshold: 10000,
      });
    }

    // High error rate alert
    if (metrics.errorRate > 0.1) {
      // 10%
      this.eventEmitter.emit('apix.alert.high_error_rate', {
        organizationId,
        errorRate: metrics.errorRate,
        threshold: 0.1,
      });
    }

    // Low throughput alert (if expected throughput is known)
    if (metrics.throughput < 1 && metrics.connectionCount > 0) {
      this.eventEmitter.emit('apix.alert.low_throughput', {
        organizationId,
        throughput: metrics.throughput,
        connectionCount: metrics.connectionCount,
      });
    }
  }

  // Health check
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: PerformanceMetrics;
    issues: string[];
  }> {
    const metrics = this.getPerformanceMetrics();
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check Redis connectivity
    try {
      await this.redis.ping();
    } catch (error) {
      issues.push('Redis connectivity issue');
      status = 'unhealthy';
    }

    // Check performance thresholds
    if (metrics.p95Latency > 5000) {
      issues.push(`High P95 latency: ${metrics.p95Latency}ms`);
      status = status === 'healthy' ? 'degraded' : status;
    }

    if (metrics.errorRate > 0.05) {
      issues.push(`High error rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
      status = status === 'healthy' ? 'degraded' : status;
    }

    if (metrics.errorRate > 0.2) {
      status = 'unhealthy';
    }

    return { status, metrics, issues };
  }

  // Debug information
  getDebugInfo(organizationId?: string): {
    activeConnections: number;
    recentMessages: number;
    memoryUsage: {
      messageMetrics: number;
      connectionMetrics: number;
    };
    topMessageTypes: Array<{ type: string; count: number }>;
    topErrorCodes: Array<{ code: string; count: number }>;
  } {
    const cutoff = new Date(Date.now() - 300000); // 5 minutes
    let relevantMetrics = this.messageMetrics.filter((m) => m.timestamp >= cutoff);
    let relevantConnections = Array.from(this.connectionMetrics.values());

    if (organizationId) {
      relevantMetrics = relevantMetrics.filter((m) => m.organizationId === organizationId);
      relevantConnections = relevantConnections.filter((c) => c.organizationId === organizationId);
    }

    // Top message types
    const messageTypeCounts = new Map<string, number>();
    relevantMetrics.forEach((m) => {
      messageTypeCounts.set(m.messageType, (messageTypeCounts.get(m.messageType) || 0) + 1);
    });
    const topMessageTypes = Array.from(messageTypeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top error codes
    const errorCodeCounts = new Map<string, number>();
    relevantMetrics
      .filter((m) => !m.success && m.errorCode)
      .forEach((m) => {
        errorCodeCounts.set(m.errorCode!, (errorCodeCounts.get(m.errorCode!) || 0) + 1);
      });
    const topErrorCodes = Array.from(errorCodeCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      activeConnections: relevantConnections.length,
      recentMessages: relevantMetrics.length,
      memoryUsage: {
        messageMetrics: this.messageMetrics.length,
        connectionMetrics: this.connectionMetrics.size,
      },
      topMessageTypes,
      topErrorCodes,
    };
  }

  private startMetricsCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const cutoff = new Date(Date.now() - this.METRICS_RETENTION_MS);

      // Clean up old message metrics
      const initialLength = this.messageMetrics.length;
      let index = 0;
      while (index < this.messageMetrics.length) {
        if (this.messageMetrics[index].timestamp < cutoff) {
          this.messageMetrics.splice(index, 1);
        } else {
          index++;
        }
      }

      const cleaned = initialLength - this.messageMetrics.length;
      if (cleaned > 0) {
        this.logger.debug(`Cleaned up ${cleaned} old message metrics`);
      }
    }, this.METRICS_CLEANUP_INTERVAL);
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}
