import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WidgetAnalytics, WidgetInteractionData, WidgetSessionData, WidgetPerformanceData } from '@database/entities/widget-analytics.entity';
import { WidgetExecution } from '@database/entities/widget-execution.entity';
import { Widget } from '@database/entities/widget.entity';
import { Session } from '@database/entities/session.entity';

export interface ConversionFunnel {
  step: string;
  users: number;
  conversions: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface UserJourney {
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  totalDuration: number;
  steps: Array<{
    timestamp: Date;
    eventType: string;
    pageUrl: string;
    duration: number;
    metadata?: any;
  }>;
  conversionEvents: Array<{
    timestamp: Date;
    type: string;
    value?: number;
  }>;
  exitPoint?: string;
  isConverted: boolean;
  isBounced: boolean;
}

export interface PerformanceMetrics {
  averageLoadTime: number;
  averageRenderTime: number;
  averageFirstInteractionTime: number;
  errorRate: number;
  cacheHitRate: number;
  apiResponseTimes: {
    p50: number;
    p95: number;
    p99: number;
  };
  memoryUsage: {
    average: number;
    peak: number;
  };
}

export interface CrossDomainAnalytics {
  domain: string;
  views: number;
  interactions: number;
  conversions: number;
  bounceRate: number;
  averageSessionDuration: number;
  topPages: Array<{
    url: string;
    views: number;
    interactions: number;
  }>;
}

export interface RealTimeMetrics {
  activeUsers: number;
  currentSessions: number;
  eventsPerSecond: number;
  topPages: Array<{
    url: string;
    activeUsers: number;
  }>;
  recentEvents: Array<{
    timestamp: Date;
    eventType: string;
    sessionId: string;
    pageUrl: string;
    metadata?: any;
  }>;
}

@Injectable()
export class WidgetAnalyticsService {
  private readonly logger = new Logger(WidgetAnalyticsService.name);
  private readonly realTimeMetricsCache = new Map<string, any>();

  constructor(
    @InjectRepository(WidgetAnalytics)
    private readonly analyticsRepository: Repository<WidgetAnalytics>,
    @InjectRepository(WidgetExecution)
    private readonly executionRepository: Repository<WidgetExecution>,
    @InjectRepository(Widget)
    private readonly widgetRepository: Repository<Widget>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectQueue('analytics-processing')
    private readonly analyticsQueue: Queue,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeRealTimeTracking();
  }

  /**
   * Track real-time user interaction
   */
  async trackInteraction(data: {
    widgetId: string;
    sessionId: string;
    eventType: 'view' | 'interaction' | 'conversion' | 'error' | 'performance';
    pageUrl: string;
    userAgent: string;
    ipAddress: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    browserInfo: { name: string; version: string };
    geolocation?: { country: string; region: string; city: string };
    interactionData?: WidgetInteractionData;
    sessionData?: WidgetSessionData;
    performanceData?: WidgetPerformanceData;
    conversionValue?: number;
    conversionType?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): Promise<WidgetAnalytics> {
    try {
      // Privacy compliance check
      const sanitizedData = await this.sanitizeDataForPrivacy(data);

      // Determine if unique visitor
      const isUniqueVisitor = await this.isUniqueVisitor(data.widgetId, data.sessionId);
      const isReturningVisitor = await this.isReturningVisitor(data.widgetId, data.sessionId);

      // Create analytics record
      const analytics = this.analyticsRepository.create({
        widgetId: sanitizedData.widgetId,
        sessionId: sanitizedData.sessionId,
        eventType: sanitizedData.eventType,
        date: new Date(),
        pageUrl: sanitizedData.pageUrl,
        referrerUrl: sanitizedData.metadata?.referrer,
        userAgent: sanitizedData.userAgent,
        ipAddress: this.hashIPAddress(sanitizedData.ipAddress), // Hash for privacy
        deviceType: sanitizedData.deviceType,
        browserName: sanitizedData.browserInfo.name,
        browserVersion: sanitizedData.browserInfo.version,
        operatingSystem: this.extractOS(sanitizedData.userAgent),
        screenResolution: sanitizedData.metadata?.screenResolution,
        country: sanitizedData.geolocation?.country,
        region: sanitizedData.geolocation?.region,
        city: sanitizedData.geolocation?.city,
        timezone: sanitizedData.metadata?.timezone,
        interactionData: sanitizedData.interactionData,
        sessionData: sanitizedData.sessionData,
        performanceData: sanitizedData.performanceData,
        durationMs: sanitizedData.interactionData?.duration,
        conversionValue: sanitizedData.conversionValue,
        conversionType: sanitizedData.conversionType,
        errorMessage: sanitizedData.errorMessage,
        metadata: sanitizedData.metadata,
        isUniqueVisitor,
        isReturningVisitor,
        isBounce: await this.calculateBounceStatus(sanitizedData.sessionId),
        pageDepth: await this.calculatePageDepth(sanitizedData.sessionId),
        timeOnPageMs: sanitizedData.sessionData?.duration,
      });

      const savedAnalytics = await this.analyticsRepository.save(analytics);

      // Queue for real-time processing
      await this.analyticsQueue.add('process-real-time-event', {
        analyticsId: savedAnalytics.id,
        eventType: sanitizedData.eventType,
        widgetId: sanitizedData.widgetId,
        timestamp: new Date(),
      });

      // Emit real-time event
      this.eventEmitter.emit('widget.analytics.tracked', {
        widgetId: sanitizedData.widgetId,
        eventType: sanitizedData.eventType,
        analytics: savedAnalytics,
      });

      // Update real-time metrics cache
      await this.updateRealTimeMetrics(sanitizedData.widgetId, savedAnalytics);

      return savedAnalytics;
    } catch (error) {
      this.logger.error('Failed to track interaction', error);
      throw error;
    }
  }

  /**
   * Get conversion funnel analysis
   */
  async getConversionFunnel(
    widgetId: string,
    startDate: Date,
    endDate: Date,
    funnelSteps: string[] = ['view', 'interaction', 'conversion']
  ): Promise<ConversionFunnel[]> {
    const funnel: ConversionFunnel[] = [];
    let previousUsers = 0;

    for (let i = 0; i < funnelSteps.length; i++) {
      const step = funnelSteps[i];
      
      const stepData = await this.analyticsRepository
        .createQueryBuilder('analytics')
        .select('COUNT(DISTINCT analytics.sessionId)', 'users')
        .where('analytics.widgetId = :widgetId', { widgetId })
        .andWhere('analytics.date BETWEEN :startDate AND :endDate', { startDate, endDate })
        .andWhere('analytics.eventType = :eventType', { eventType: step })
        .getRawOne();

      const users = parseInt(stepData.users) || 0;
      const conversions = i === 0 ? users : users;
      const conversionRate = previousUsers > 0 ? (users / previousUsers) * 100 : 100;
      const dropoffRate = previousUsers > 0 ? ((previousUsers - users) / previousUsers) * 100 : 0;

      funnel.push({
        step,
        users,
        conversions,
        conversionRate,
        dropoffRate,
      });

      previousUsers = users;
    }

    return funnel;
  }

  /**
   * Get user journey mapping
   */
  async getUserJourneys(
    widgetId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ): Promise<UserJourney[]> {
    // Get all sessions for the widget in the date range
    const sessions = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('DISTINCT analytics.sessionId')
      .where('analytics.widgetId = :widgetId', { widgetId })
      .andWhere('analytics.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .limit(limit)
      .getRawMany();

    const journeys: UserJourney[] = [];

    for (const session of sessions) {
      const sessionId = session.analytics_session_id;
      
      // Get all events for this session
      const events = await this.analyticsRepository.find({
        where: {
          widgetId,
          sessionId,
          date: Between(startDate, endDate),
        },
        order: { createdAt: 'ASC' },
      });

      if (events.length === 0) continue;

      const firstEvent = events[0];
      const lastEvent = events[events.length - 1];
      const totalDuration = lastEvent.createdAt.getTime() - firstEvent.createdAt.getTime();

      // Map events to journey steps
      const steps = events.map((event, index) => ({
        timestamp: event.createdAt,
        eventType: event.eventType,
        pageUrl: event.pageUrl,
        duration: index < events.length - 1 
          ? events[index + 1].createdAt.getTime() - event.createdAt.getTime()
          : 0,
        metadata: event.metadata,
      }));

      // Extract conversion events
      const conversionEvents = events
        .filter(event => event.eventType === 'conversion')
        .map(event => ({
          timestamp: event.createdAt,
          type: event.conversionType || 'unknown',
          value: event.conversionValue,
        }));

      // Determine exit point and conversion status
      const exitPoint = lastEvent.pageUrl;
      const isConverted = conversionEvents.length > 0;
      const isBounced = events.length === 1 && totalDuration < 30000; // Less than 30 seconds

      journeys.push({
        sessionId,
        userId: firstEvent.userId,
        startTime: firstEvent.createdAt,
        endTime: lastEvent.createdAt,
        totalDuration,
        steps,
        conversionEvents,
        exitPoint,
        isConverted,
        isBounced,
      });
    }

    return journeys;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(
    widgetId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceMetrics> {
    const performanceEvents = await this.analyticsRepository.find({
      where: {
        widgetId,
        eventType: 'performance',
        date: Between(startDate, endDate),
      },
    });

    if (performanceEvents.length === 0) {
      return {
        averageLoadTime: 0,
        averageRenderTime: 0,
        averageFirstInteractionTime: 0,
        errorRate: 0,
        cacheHitRate: 0,
        apiResponseTimes: { p50: 0, p95: 0, p99: 0 },
        memoryUsage: { average: 0, peak: 0 },
      };
    }

    // Extract performance data
    const loadTimes = performanceEvents
      .map(e => e.performanceData?.loadTime)
      .filter(t => t !== undefined) as number[];
    
    const renderTimes = performanceEvents
      .map(e => e.performanceData?.renderTime)
      .filter(t => t !== undefined) as number[];
    
    const firstInteractionTimes = performanceEvents
      .map(e => e.performanceData?.firstInteractionTime)
      .filter(t => t !== undefined) as number[];

    const apiResponseTimes = performanceEvents
      .flatMap(e => e.performanceData?.apiResponseTimes || [])
      .sort((a, b) => a - b);

    const memoryUsages = performanceEvents
      .map(e => e.performanceData?.memoryUsage)
      .filter(m => m !== undefined) as number[];

    // Calculate error rate
    const totalEvents = await this.analyticsRepository.count({
      where: {
        widgetId,
        date: Between(startDate, endDate),
      },
    });

    const errorEvents = await this.analyticsRepository.count({
      where: {
        widgetId,
        eventType: 'error',
        date: Between(startDate, endDate),
      },
    });

    // Calculate cache hit rate from executions
    const executions = await this.executionRepository.find({
      where: {
        widgetId,
        createdAt: Between(startDate, endDate),
      },
    });

    const cacheHits = executions.filter(e => e.cacheHit).length;
    const cacheHitRate = executions.length > 0 ? (cacheHits / executions.length) * 100 : 0;

    return {
      averageLoadTime: this.calculateAverage(loadTimes),
      averageRenderTime: this.calculateAverage(renderTimes),
      averageFirstInteractionTime: this.calculateAverage(firstInteractionTimes),
      errorRate: totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0,
      cacheHitRate,
      apiResponseTimes: {
        p50: this.calculatePercentile(apiResponseTimes, 50),
        p95: this.calculatePercentile(apiResponseTimes, 95),
        p99: this.calculatePercentile(apiResponseTimes, 99),
      },
      memoryUsage: {
        average: this.calculateAverage(memoryUsages),
        peak: Math.max(...memoryUsages, 0),
      },
    };
  }

  /**
   * Get cross-domain analytics aggregation
   */
  async getCrossDomainAnalytics(
    widgetId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CrossDomainAnalytics[]> {
    const domainData = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.pageUrl')
      .addSelect('COUNT(CASE WHEN analytics.eventType = :viewType THEN 1 END)', 'views')
      .addSelect('COUNT(CASE WHEN analytics.eventType = :interactionType THEN 1 END)', 'interactions')
      .addSelect('COUNT(CASE WHEN analytics.eventType = :conversionType THEN 1 END)', 'conversions')
      .addSelect('COUNT(CASE WHEN analytics.isBounce = true THEN 1 END)', 'bounces')
      .addSelect('COUNT(*)', 'totalEvents')
      .addSelect('AVG(analytics.timeOnPageMs)', 'avgSessionDuration')
      .where('analytics.widgetId = :widgetId', { widgetId })
      .andWhere('analytics.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .setParameter('viewType', 'view')
      .setParameter('interactionType', 'interaction')
      .setParameter('conversionType', 'conversion')
      .groupBy('analytics.pageUrl')
      .getRawMany();

    const crossDomainAnalytics: CrossDomainAnalytics[] = [];

    for (const data of domainData) {
      const domain = this.extractDomain(data.analytics_page_url);
      const views = parseInt(data.views) || 0;
      const interactions = parseInt(data.interactions) || 0;
      const conversions = parseInt(data.conversions) || 0;
      const bounces = parseInt(data.bounces) || 0;
      const totalEvents = parseInt(data.totalEvents) || 0;
      const avgSessionDuration = parseFloat(data.avgSessionDuration) || 0;

      // Find existing domain entry or create new one
      let domainEntry = crossDomainAnalytics.find(entry => entry.domain === domain);
      if (!domainEntry) {
        domainEntry = {
          domain,
          views: 0,
          interactions: 0,
          conversions: 0,
          bounceRate: 0,
          averageSessionDuration: 0,
          topPages: [],
        };
        crossDomainAnalytics.push(domainEntry);
      }

      // Aggregate data
      domainEntry.views += views;
      domainEntry.interactions += interactions;
      domainEntry.conversions += conversions;
      domainEntry.bounceRate = totalEvents > 0 ? (bounces / totalEvents) * 100 : 0;
      domainEntry.averageSessionDuration = avgSessionDuration;

      // Add to top pages
      domainEntry.topPages.push({
        url: data.analytics_page_url,
        views,
        interactions,
      });
    }

    // Sort top pages for each domain
    crossDomainAnalytics.forEach(domain => {
      domain.topPages.sort((a, b) => b.views - a.views);
      domain.topPages = domain.topPages.slice(0, 10); // Top 10 pages
    });

    return crossDomainAnalytics.sort((a, b) => b.views - a.views);
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(widgetId: string): Promise<RealTimeMetrics> {
    const cacheKey = `realtime_${widgetId}`;
    const cached = this.realTimeMetricsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 30000) { // 30 seconds cache
      return cached.data;
    }

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Get recent events
    const recentEvents = await this.analyticsRepository.find({
      where: {
        widgetId,
        createdAt: Between(fiveMinutesAgo, now),
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    // Calculate active users (unique sessions in last 5 minutes)
    const activeSessions = new Set(recentEvents.map(e => e.sessionId));
    const activeUsers = activeSessions.size;

    // Calculate events per second
    const eventsPerSecond = recentEvents.length / 300; // 5 minutes = 300 seconds

    // Get top pages by active users
    const pageUsers = new Map<string, Set<string>>();
    recentEvents.forEach(event => {
      if (!pageUsers.has(event.pageUrl)) {
        pageUsers.set(event.pageUrl, new Set());
      }
      pageUsers.get(event.pageUrl)!.add(event.sessionId);
    });

    const topPages = Array.from(pageUsers.entries())
      .map(([url, sessions]) => ({
        url,
        activeUsers: sessions.size,
      }))
      .sort((a, b) => b.activeUsers - a.activeUsers)
      .slice(0, 10);

    const metrics: RealTimeMetrics = {
      activeUsers,
      currentSessions: activeUsers, // Same as active users for widgets
      eventsPerSecond,
      topPages,
      recentEvents: recentEvents.slice(0, 20).map(event => ({
        timestamp: event.createdAt,
        eventType: event.eventType,
        sessionId: event.sessionId,
        pageUrl: event.pageUrl,
        metadata: event.metadata,
      })),
    };

    // Cache the result
    this.realTimeMetricsCache.set(cacheKey, {
      data: metrics,
      timestamp: Date.now(),
    });

    return metrics;
  }

  /**
   * Export analytics data with privacy compliance
   */
  async exportAnalytics(
    widgetId: string,
    startDate: Date,
    endDate: Date,
    format: 'csv' | 'json',
    includePersonalData: boolean = false
  ): Promise<{ data: string; filename: string }> {
    const analytics = await this.analyticsRepository.find({
      where: {
        widgetId,
        date: Between(startDate, endDate),
      },
      order: { createdAt: 'ASC' },
    });

    // Sanitize data for export
    const sanitizedData = analytics.map(record => {
      const sanitized: any = {
        date: record.date,
        eventType: record.eventType,
        pageUrl: record.pageUrl,
        deviceType: record.deviceType,
        browserName: record.browserName,
        browserVersion: record.browserVersion,
        operatingSystem: record.operatingSystem,
        country: record.country,
        region: record.region,
        durationMs: record.durationMs,
        conversionValue: record.conversionValue,
        conversionType: record.conversionType,
        isUniqueVisitor: record.isUniqueVisitor,
        isReturningVisitor: record.isReturningVisitor,
        isBounce: record.isBounce,
        pageDepth: record.pageDepth,
        timeOnPageMs: record.timeOnPageMs,
      };

      // Include personal data only if explicitly requested and compliant
      if (includePersonalData) {
        sanitized.sessionId = record.sessionId;
        sanitized.city = record.city;
        sanitized.ipAddress = record.ipAddress; // Already hashed
      }

      return sanitized;
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `widget-analytics-${widgetId}-${timestamp}.${format}`;

    let data: string;
    if (format === 'csv') {
      data = this.convertToCSV(sanitizedData);
    } else {
      data = JSON.stringify(sanitizedData, null, 2);
    }

    return { data, filename };
  }

  // Private helper methods

  private async initializeRealTimeTracking(): Promise<void> {
    // Set up periodic cleanup of real-time cache
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.realTimeMetricsCache.entries()) {
        if (now - value.timestamp > 300000) { // 5 minutes
          this.realTimeMetricsCache.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  private async sanitizeDataForPrivacy(data: any): Promise<any> {
    // Implement privacy compliance measures
    const sanitized = { ...data };

    // Remove or hash sensitive data based on privacy settings
    if (sanitized.ipAddress) {
      sanitized.ipAddress = this.hashIPAddress(sanitized.ipAddress);
    }

    // Remove detailed location if not consented
    if (!sanitized.metadata?.locationConsent) {
      delete sanitized.geolocation?.city;
    }

    return sanitized;
  }

  private hashIPAddress(ip: string): string {
    // Simple hash for IP address privacy
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(ip + process.env.IP_HASH_SALT || 'default-salt').digest('hex').substring(0, 16);
  }

  private extractOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private async isUniqueVisitor(widgetId: string, sessionId: string): Promise<boolean> {
    const existingVisit = await this.analyticsRepository.findOne({
      where: { widgetId, sessionId },
    });
    return !existingVisit;
  }

  private async isReturningVisitor(widgetId: string, sessionId: string): Promise<boolean> {
    const visitCount = await this.analyticsRepository.count({
      where: { widgetId, sessionId },
    });
    return visitCount > 1;
  }

  private async calculateBounceStatus(sessionId: string): Promise<boolean> {
    const eventCount = await this.analyticsRepository.count({
      where: { sessionId },
    });
    return eventCount === 1;
  }

  private async calculatePageDepth(sessionId: string): Promise<number> {
    const uniquePages = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('COUNT(DISTINCT analytics.pageUrl)', 'count')
      .where('analytics.sessionId = :sessionId', { sessionId })
      .getRawOne();
    
    return parseInt(uniquePages.count) || 1;
  }

  private async updateRealTimeMetrics(widgetId: string, analytics: WidgetAnalytics): Promise<void> {
    // Update real-time metrics cache
    const cacheKey = `realtime_${widgetId}`;
    const cached = this.realTimeMetricsCache.get(cacheKey);
    
    if (cached) {
      // Update cached metrics with new event
      cached.data.recentEvents.unshift({
        timestamp: analytics.createdAt,
        eventType: analytics.eventType,
        sessionId: analytics.sessionId,
        pageUrl: analytics.pageUrl,
        metadata: analytics.metadata,
      });
      
      // Keep only last 20 events
      cached.data.recentEvents = cached.data.recentEvents.slice(0, 20);
      cached.timestamp = Date.now();
    }
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private calculatePercentile(sortedNumbers: number[], percentile: number): number {
    if (sortedNumbers.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedNumbers.length) - 1;
    return sortedNumbers[Math.max(0, index)] || 0;
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }
}