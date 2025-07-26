import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, MoreThan, LessThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrivacyService } from './privacy.service';
import { Widget } from '@database/entities/widget.entity';
import { WidgetAnalytics } from '@database/entities/widget-analytics.entity';
import { WidgetExecution } from '@database/entities/widget-execution.entity';
import {
  TrackEventDto,
  GetAnalyticsDto,
  GetConversionFunnelDto,
  GetUserJourneyDto,
  GetPerformanceMetricsDto,
  AnalyticsTimeRange,
  AnalyticsGroupBy,
} from './dto';

@Injectable()
export class WidgetAnalyticsService {
  constructor(
    @InjectRepository(Widget)
    private widgetRepository: Repository<Widget>,
    @InjectRepository(WidgetAnalytics)
    private widgetAnalyticsRepository: Repository<WidgetAnalytics>,
    @InjectRepository(WidgetExecution)
    private widgetExecutionRepository: Repository<WidgetExecution>,
    @InjectQueue('analytics-processing')
    private analyticsQueue: Queue,
    private privacyService: PrivacyService,
  ) {}

  async trackEvent(
    widgetId: string,
    trackEventDto: TrackEventDto,
    organizationId: string,
  ) {
    // Verify widget exists and belongs to organization
    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, organizationId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    // Prepare analytics data
    const rawAnalyticsData: Partial<WidgetAnalytics> = {
      widgetId,
      eventType: trackEventDto.eventType,
      sessionId: trackEventDto.sessionId,
      pageUrl: trackEventDto.pageUrl || 'unknown',
      userAgent: trackEventDto.userAgent || 'unknown',
      ipAddress: trackEventDto.ipAddress || '0.0.0.0',
      deviceType: (trackEventDto.deviceType as 'desktop' | 'mobile' | 'tablet') || 'desktop',
      browserName: trackEventDto.browserInfo?.name || 'unknown',
      browserVersion: trackEventDto.browserInfo?.version || '0.0',
      operatingSystem: trackEventDto.operatingSystem || 'unknown',
      country: trackEventDto.geolocation?.country,
      region: trackEventDto.geolocation?.region,
      city: trackEventDto.geolocation?.city,
      errorMessage: trackEventDto.errorMessage,
      isUniqueVisitor: trackEventDto.isUniqueVisitor ?? true,
      isReturningVisitor: trackEventDto.isReturningVisitor ?? false,
      isBounce: false, // Will be calculated later
      pageDepth: trackEventDto.pageDepth || 1,
      date: new Date(),
      properties: trackEventDto.properties || {},
      conversionValue: trackEventDto.value,
    };

    // Apply privacy compliance
    const privacyCompliantData =
      await this.privacyService.processDataWithPrivacyCompliance(
        rawAnalyticsData,
        organizationId,
        trackEventDto.properties?.userConsent,
      );

    // Create analytics record
    const analyticsData =
      this.widgetAnalyticsRepository.create(privacyCompliantData);
    const savedAnalytics =
      await this.widgetAnalyticsRepository.save(analyticsData);

    // Queue real-time processing
    await this.analyticsQueue.add('process-event', {
      widgetId,
      analyticsId: savedAnalytics.id,
      eventType: trackEventDto.eventType,
    });

    // Update widget analytics summary
    await this.updateWidgetAnalyticsSummary(widgetId, trackEventDto.eventType);

    return {
      id: savedAnalytics.id,
      tracked: true,
      timestamp: savedAnalytics.date,
    };
  }

  async getOverview(
    widgetId: string,
    getAnalyticsDto: GetAnalyticsDto,
    organizationId: string,
  ) {
    // Verify widget exists
    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, organizationId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    const { startDate, endDate } = this.getDateRange(getAnalyticsDto);

    // Build query conditions
    const whereConditions: any = {
      widgetId,
      date: Between(startDate, endDate),
    };

    if (getAnalyticsDto.eventTypes?.length) {
      whereConditions.eventType = In(getAnalyticsDto.eventTypes);
    }

    if (getAnalyticsDto.deviceTypes?.length) {
      whereConditions.deviceType = In(getAnalyticsDto.deviceTypes);
    }

    if (getAnalyticsDto.countries?.length) {
      whereConditions.country = In(getAnalyticsDto.countries);
    }

    if (getAnalyticsDto.pageUrls?.length) {
      whereConditions.pageUrl = In(getAnalyticsDto.pageUrls);
    }

    // Get analytics data
    const analytics = await this.widgetAnalyticsRepository.find({
      where: whereConditions,
      order: { date: 'ASC' },
    });

    // Calculate metrics
    const metrics = this.calculateOverviewMetrics(analytics);
    const trends = this.calculateTrends(analytics, getAnalyticsDto.groupBy);
    const topPages = this.getTopPages(analytics);
    const deviceBreakdown = this.getDeviceBreakdown(analytics);
    const browserBreakdown = this.getBrowserBreakdown(analytics);
    const geographicData = this.getGeographicData(analytics);

    return {
      widgetId,
      period: { startDate, endDate },
      metrics,
      trends,
      topPages,
      deviceBreakdown,
      browserBreakdown,
      geographicData,
      totalEvents: analytics.length,
    };
  }

  async getRealTimeData(widgetId: string, organizationId: string) {
    // Verify widget exists
    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, organizationId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    // Get real-time analytics (last hour)
    const realtimeAnalytics = await this.widgetAnalyticsRepository.find({
      where: {
        widgetId,
        date: MoreThan(lastHour),
      },
      order: { date: 'DESC' },
      take: 1000, // Limit for performance
    });

    // Get active sessions (last 30 minutes)
    const activeSessions = await this.getActiveSessions(widgetId);

    // Calculate real-time metrics
    const currentVisitors = new Set(realtimeAnalytics.map((a) => a.sessionId))
      .size;
    const eventsPerMinute = this.calculateEventsPerMinute(realtimeAnalytics);
    const topCountries = this.getTopCountries(realtimeAnalytics, 5);
    const topPages = this.getTopPages(realtimeAnalytics, 5);

    return {
      widgetId,
      timestamp: new Date(),
      currentVisitors,
      activeSessions: activeSessions.length,
      eventsPerMinute,
      topCountries,
      topPages,
      recentEvents: realtimeAnalytics.slice(0, 20),
    };
  }

  async getConversionFunnel(
    widgetId: string,
    getConversionFunnelDto: GetConversionFunnelDto,
    organizationId: string,
  ) {
    // Verify widget exists
    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, organizationId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    const { startDate, endDate } = this.getDateRange(getConversionFunnelDto);
    const timeWindow = getConversionFunnelDto.timeWindow || 1440; // 24 hours default

    // Default funnel steps if not provided
    const steps = getConversionFunnelDto.steps || [
      { name: 'View', eventType: 'view' },
      { name: 'Interaction', eventType: 'interaction' },
      { name: 'Conversion', eventType: 'conversion' },
    ];

    // Calculate funnel metrics
    const funnelData = await this.calculateFunnelMetrics(
      widgetId,
      steps,
      startDate,
      endDate,
      timeWindow,
      getConversionFunnelDto,
    );

    return {
      widgetId,
      period: { startDate, endDate },
      timeWindow,
      steps: funnelData.steps,
      totalUsers: funnelData.totalUsers,
      conversionRate: funnelData.conversionRate,
      dropoffPoints: funnelData.dropoffPoints,
      segments: getConversionFunnelDto.includeSegments
        ? funnelData.segments
        : undefined,
    };
  }

  async getUserJourney(
    widgetId: string,
    getUserJourneyDto: GetUserJourneyDto,
    organizationId: string,
  ) {
    // Verify widget exists
    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, organizationId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    const { startDate, endDate } = this.getDateRange(getUserJourneyDto);

    // Build query for user journeys
    const queryBuilder = this.widgetAnalyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.widgetId = :widgetId', { widgetId })
      .andWhere('analytics.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (getUserJourneyDto.sessionId) {
      queryBuilder.andWhere('analytics.sessionId = :sessionId', {
        sessionId: getUserJourneyDto.sessionId,
      });
    }

    if (getUserJourneyDto.deviceTypes?.length) {
      queryBuilder.andWhere('analytics.deviceType IN (:...deviceTypes)', {
        deviceTypes: getUserJourneyDto.deviceTypes,
      });
    }

    if (getUserJourneyDto.countries?.length) {
      queryBuilder.andWhere('analytics.country IN (:...countries)', {
        countries: getUserJourneyDto.countries,
      });
    }

    if (!getUserJourneyDto.includeErrors) {
      queryBuilder.andWhere('analytics.eventType != :errorType', {
        errorType: 'error',
      });
    }

    queryBuilder
      .orderBy('analytics.sessionId', 'ASC')
      .addOrderBy('analytics.date', 'ASC')
      .limit(getUserJourneyDto.limit || 100)
      .offset(getUserJourneyDto.offset || 0);

    const analytics = await queryBuilder.getMany();

    // Group by session and build journeys
    const journeys = this.buildUserJourneys(
      analytics,
      getUserJourneyDto.minSessionDuration,
      getUserJourneyDto.maxSessionDuration,
      getUserJourneyDto.includeConversions,
    );

    return {
      widgetId,
      period: { startDate, endDate },
      journeys,
      totalJourneys: journeys.length,
      averageJourneyLength:
        journeys.reduce((sum, j) => sum + j.steps.length, 0) / journeys.length,
      averageSessionDuration:
        journeys.reduce((sum, j) => sum + j.totalDuration, 0) / journeys.length,
    };
  }

  async getPerformanceMetrics(
    widgetId: string,
    getPerformanceMetricsDto: GetPerformanceMetricsDto,
    organizationId: string,
  ) {
    // Verify widget exists
    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, organizationId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    const { startDate, endDate } = this.getDateRange(getPerformanceMetricsDto);

    // Get widget executions for performance data
    const executions = await this.widgetExecutionRepository.find({
      where: {
        widgetId,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'ASC' },
    });

    // Calculate performance metrics
    const metrics = this.calculatePerformanceMetrics(
      executions,
      getPerformanceMetricsDto.metricTypes,
      getPerformanceMetricsDto.aggregation,
    );

    // Get trends if requested
    const trends = getPerformanceMetricsDto.includeTrends
      ? this.calculatePerformanceTrends(executions)
      : undefined;

    // Get alerts if requested
    const alerts = getPerformanceMetricsDto.includeAlerts
      ? await this.getPerformanceAlerts(widgetId, metrics)
      : undefined;

    return {
      widgetId,
      period: { startDate, endDate },
      metrics,
      trends,
      alerts,
      totalExecutions: executions.length,
    };
  }

  async getCrossDomainAnalytics(
    widgetId: string,
    getAnalyticsDto: GetAnalyticsDto,
    organizationId: string,
  ) {
    // Verify widget exists
    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, organizationId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    const { startDate, endDate } = this.getDateRange(getAnalyticsDto);

    // Get analytics grouped by domain
    const analytics = await this.widgetAnalyticsRepository
      .createQueryBuilder('analytics')
      .select([
        'analytics.pageUrl',
        'COUNT(*) as eventCount',
        'COUNT(DISTINCT analytics.sessionId) as uniqueVisitors',
        'analytics.deviceType',
        'analytics.country',
      ])
      .where('analytics.widgetId = :widgetId', { widgetId })
      .andWhere('analytics.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('analytics.pageUrl, analytics.deviceType, analytics.country')
      .getRawMany();

    // Process and aggregate cross-domain data
    const domainData = this.processCrossDomainData(analytics);

    return {
      widgetId,
      period: { startDate, endDate },
      domains: domainData.domains,
      totalDomains: domainData.totalDomains,
      topPerformingDomains: domainData.topPerformingDomains,
      crossDomainInsights: domainData.insights,
    };
  }

  async getHeatmapData(
    widgetId: string,
    getAnalyticsDto: GetAnalyticsDto,
    organizationId: string,
  ) {
    // Verify widget exists
    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, organizationId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    const { startDate, endDate } = this.getDateRange(getAnalyticsDto);

    // Get click and interaction events
    const interactions = await this.widgetAnalyticsRepository.find({
      where: {
        widgetId,
        eventType: In(['click', 'interaction']),
        date: Between(startDate, endDate),
      },
    });

    // Process heatmap data
    const heatmapData = this.processHeatmapData(interactions);

    return {
      widgetId,
      period: { startDate, endDate },
      heatmapPoints: heatmapData.points,
      clickDensity: heatmapData.density,
      hotspots: heatmapData.hotspots,
      totalInteractions: interactions.length,
    };
  }

  async getRetentionAnalysis(
    widgetId: string,
    getAnalyticsDto: GetAnalyticsDto,
    organizationId: string,
  ) {
    // Verify widget exists
    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, organizationId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    const { startDate, endDate } = this.getDateRange(getAnalyticsDto);

    // Get user sessions for retention analysis
    const sessions = await this.widgetAnalyticsRepository
      .createQueryBuilder('analytics')
      .select([
        'analytics.sessionId',
        'MIN(analytics.date) as firstVisit',
        'MAX(analytics.date) as lastVisit',
        'COUNT(*) as eventCount',
      ])
      .where('analytics.widgetId = :widgetId', { widgetId })
      .andWhere('analytics.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('analytics.sessionId')
      .getRawMany();

    // Calculate retention metrics
    const retentionData = this.calculateRetentionMetrics(sessions);

    return {
      widgetId,
      period: { startDate, endDate },
      retentionCohorts: retentionData.cohorts,
      retentionRates: retentionData.rates,
      averageRetention: retentionData.averageRetention,
      churnRate: retentionData.churnRate,
      totalSessions: sessions.length,
    };
  }

  // Private helper methods

  private getDateRange(dto: any): { startDate: Date; endDate: Date } {
    if (dto.startDate && dto.endDate) {
      return {
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      };
    }

    const now = new Date();
    let startDate: Date;

    switch (dto.timeRange) {
      case AnalyticsTimeRange.LAST_HOUR:
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case AnalyticsTimeRange.LAST_24_HOURS:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case AnalyticsTimeRange.LAST_7_DAYS:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case AnalyticsTimeRange.LAST_30_DAYS:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case AnalyticsTimeRange.LAST_90_DAYS:
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days
    }

    return { startDate, endDate: now };
  }

  private async updateWidgetAnalyticsSummary(
    widgetId: string,
    eventType: string,
  ) {
    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId },
    });
    if (!widget) return;

    // Update analytics summary based on event type
    const updates: any = {};

    switch (eventType) {
      case 'view':
        updates.views = (widget.analyticsData?.views || 0) + 1;
        break;
      case 'interaction':
        updates.interactions = (widget.analyticsData?.interactions || 0) + 1;
        break;
      case 'conversion':
        updates.conversions = (widget.analyticsData?.conversions || 0) + 1;
        break;
    }

    if (Object.keys(updates).length > 0) {
      widget.analyticsData = {
        ...widget.analyticsData,
        ...updates,
        lastAccessed: new Date(),
      };
      await this.widgetRepository.save(widget);
    }
  }

  private calculateOverviewMetrics(analytics: WidgetAnalytics[]) {
    const totalEvents = analytics.length;
    const uniqueVisitors = new Set(analytics.map((a) => a.sessionId)).size;
    const views = analytics.filter((a) => a.eventType === 'view').length;
    const interactions = analytics.filter(
      (a) => a.eventType === 'interaction',
    ).length;
    const conversions = analytics.filter(
      (a) => a.eventType === 'conversion',
    ).length;
    const errors = analytics.filter((a) => a.eventType === 'error').length;

    const conversionRate = views > 0 ? (conversions / views) * 100 : 0;
    const errorRate = totalEvents > 0 ? (errors / totalEvents) * 100 : 0;
    const engagementRate = views > 0 ? (interactions / views) * 100 : 0;

    return {
      totalEvents,
      uniqueVisitors,
      views,
      interactions,
      conversions,
      errors,
      conversionRate: Math.round(conversionRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      engagementRate: Math.round(engagementRate * 100) / 100,
    };
  }

  private calculateTrends(
    analytics: WidgetAnalytics[],
    groupBy?: AnalyticsGroupBy,
  ) {
    // Group analytics by time period
    const groupedData = new Map();

    analytics.forEach((event) => {
      let key: string;
      const date = new Date(event.date);

      switch (groupBy) {
        case AnalyticsGroupBy.HOUR:
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case AnalyticsGroupBy.WEEK:
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case AnalyticsGroupBy.MONTH:
          key = `${date.getFullYear()}-${date.getMonth()}`;
          break;
        default: // DAY
          key = date.toISOString().split('T')[0];
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          views: 0,
          interactions: 0,
          conversions: 0,
          errors: 0,
        });
      }

      const data = groupedData.get(key);
      data[event.eventType] = (data[event.eventType] || 0) + 1;
    });

    return Array.from(groupedData.entries()).map(([period, data]) => ({
      period,
      ...data,
    }));
  }

  private getTopPages(analytics: WidgetAnalytics[], limit = 10) {
    const pageStats = new Map();

    analytics.forEach((event) => {
      const page = event.pageUrl || 'unknown';
      if (!pageStats.has(page)) {
        pageStats.set(page, { views: 0, interactions: 0, conversions: 0 });
      }

      const stats = pageStats.get(page);
      if (event.eventType === 'view') stats.views++;
      if (event.eventType === 'interaction') stats.interactions++;
      if (event.eventType === 'conversion') stats.conversions++;
    });

    return Array.from(pageStats.entries())
      .map(([page, stats]) => ({ page, ...stats }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  private getDeviceBreakdown(analytics: WidgetAnalytics[]) {
    const deviceStats = new Map();

    analytics.forEach((event) => {
      const device = event.deviceType || 'unknown';
      deviceStats.set(device, (deviceStats.get(device) || 0) + 1);
    });

    return Object.fromEntries(deviceStats);
  }

  private getBrowserBreakdown(analytics: WidgetAnalytics[]) {
    const browserStats = new Map();

    analytics.forEach((event) => {
      const browser = event.browserName || 'unknown';
      browserStats.set(browser, (browserStats.get(browser) || 0) + 1);
    });

    return Object.fromEntries(browserStats);
  }

  private getGeographicData(analytics: WidgetAnalytics[]) {
    const geoStats = new Map();

    analytics.forEach((event) => {
      if (event.country) {
        const key = `${event.country}-${event.region || 'unknown'}`;
        if (!geoStats.has(key)) {
          geoStats.set(key, {
            country: event.country,
            region: event.region,
            count: 0,
            cities: new Set(),
          });
        }

        const stats = geoStats.get(key);
        stats.count++;
        if (event.city) stats.cities.add(event.city);
      }
    });

    return Array.from(geoStats.values()).map((stats) => ({
      ...stats,
      cities: Array.from(stats.cities),
    }));
  }

  private getTopCountries(analytics: WidgetAnalytics[], limit = 5) {
    const countryStats = new Map();

    analytics.forEach((event) => {
      if (event.country) {
        countryStats.set(
          event.country,
          (countryStats.get(event.country) || 0) + 1,
        );
      }
    });

    return Array.from(countryStats.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private calculateEventsPerMinute(analytics: WidgetAnalytics[]) {
    const now = new Date();
    const minuteAgo = new Date(now.getTime() - 60 * 1000);

    const recentEvents = analytics.filter(
      (event) => new Date(event.date) >= minuteAgo,
    );

    return recentEvents.length;
  }

  private async getActiveSessions(widgetId: string) {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const activeSessions = await this.widgetAnalyticsRepository
      .createQueryBuilder('analytics')
      .select('DISTINCT analytics.sessionId')
      .where('analytics.widgetId = :widgetId', { widgetId })
      .andWhere('analytics.date > :thirtyMinutesAgo', { thirtyMinutesAgo })
      .getRawMany();

    return activeSessions;
  }

  private async calculateFunnelMetrics(
    widgetId: string,
    steps: any[],
    startDate: Date,
    endDate: Date,
    timeWindow: number,
    filters: any,
  ) {
    // Implementation for funnel calculation
    // This is a simplified version - real implementation would be more complex
    const stepResults: any[] = [];
    let previousStepUsers = new Set<string>();

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepAnalytics = await this.widgetAnalyticsRepository.find({
        where: {
          widgetId,
          eventType: step.eventType,
          date: Between(startDate, endDate),
        },
      });

      const stepUsers = new Set(stepAnalytics.map((a) => a.sessionId));

      if (i === 0) {
        previousStepUsers = stepUsers;
      } else {
        // Filter users who completed previous step
        const qualifiedUsers = new Set(
          [...stepUsers].filter((user) => previousStepUsers.has(user)),
        );
        previousStepUsers = qualifiedUsers;
      }

      stepResults.push({
        name: step.name,
        eventType: step.eventType,
        users: previousStepUsers.size,
        conversionRate:
          i === 0 ? 100 : (previousStepUsers.size / stepResults[0].users) * 100,
      });
    }

    const totalUsers = stepResults[0]?.users || 0;
    const finalUsers = stepResults[stepResults.length - 1]?.users || 0;
    const conversionRate = totalUsers > 0 ? (finalUsers / totalUsers) * 100 : 0;

    return {
      steps: stepResults,
      totalUsers,
      conversionRate,
      dropoffPoints: this.calculateDropoffPoints(stepResults),
      segments: {}, // Placeholder for segment analysis
    };
  }

  private calculateDropoffPoints(stepResults: any[]) {
    const dropoffs = [];

    for (let i = 1; i < stepResults.length; i++) {
      const current = stepResults[i];
      const previous = stepResults[i - 1];
      const dropoffRate =
        previous.users > 0
          ? ((previous.users - current.users) / previous.users) * 100
          : 0;

      dropoffs.push({
        fromStep: previous.name,
        toStep: current.name,
        dropoffRate: Math.round(dropoffRate * 100) / 100,
        usersLost: previous.users - current.users,
      });
    }

    return dropoffs;
  }

  private buildUserJourneys(
    analytics: WidgetAnalytics[],
    minDuration?: number,
    maxDuration?: number,
    includeConversions?: boolean,
  ): Array<{
    sessionId: string;
    steps: Array<{
      eventType: string;
      timestamp: Date;
      pageUrl: string;
      properties: Record<string, any>;
    }>;
    totalDuration: number;
    conversionEvents: WidgetAnalytics[];
    dropoffPoints: any[];
  }> {
    const sessionMap = new Map<string, WidgetAnalytics[]>();

    // Group events by session
    analytics.forEach((event) => {
      if (!sessionMap.has(event.sessionId)) {
        sessionMap.set(event.sessionId, []);
      }
      sessionMap.get(event.sessionId)?.push(event);
    });

    const journeys: Array<{
      sessionId: string;
      steps: Array<{
        eventType: string;
        timestamp: Date;
        pageUrl: string;
        properties: Record<string, any>;
      }>;
      totalDuration: number;
      conversionEvents: WidgetAnalytics[];
      dropoffPoints: any[];
    }> = [];

    sessionMap.forEach((events, sessionId) => {
      events.sort(
        (a: WidgetAnalytics, b: WidgetAnalytics) =>
          new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      const firstEvent = events[0];
      const lastEvent = events[events.length - 1];
      const duration =
        new Date(lastEvent.date).getTime() -
        new Date(firstEvent.date).getTime();

      // Apply duration filters
      if (minDuration && duration < minDuration * 1000) return;
      if (maxDuration && duration > maxDuration * 1000) return;

      const steps = events.map((event: WidgetAnalytics) => ({
        eventType: event.eventType,
        timestamp: event.date,
        pageUrl: event.pageUrl,
        properties: event.properties || {},
      }));

      const conversions = events.filter(
        (e: WidgetAnalytics) => e.eventType === 'conversion',
      );

      journeys.push({
        sessionId,
        steps,
        totalDuration: Math.round(duration / 1000), // in seconds
        conversionEvents: includeConversions ? conversions : [],
        dropoffPoints: [], // Could be calculated based on expected flow
      });
    });

    return journeys;
  }

  private calculatePerformanceMetrics(
    executions: any[],
    metricTypes?: string[],
    aggregation?: string,
  ) {
    if (!executions.length) return {};

    const metrics: any = {};

    // Calculate load time metrics
    const loadTimes = executions
      .filter((e) => e.metrics?.duration)
      .map((e) => e.metrics.duration);

    if (loadTimes.length > 0) {
      metrics.loadTime = this.aggregateValues(loadTimes, aggregation);
    }

    // Calculate error rate
    const errorCount = executions.filter((e) => e.status === 'failed').length;
    metrics.errorRate =
      executions.length > 0 ? (errorCount / executions.length) * 100 : 0;

    // Calculate throughput (executions per hour)
    const timeSpan =
      executions.length > 1
        ? (new Date(executions[executions.length - 1].createdAt).getTime() -
            new Date(executions[0].createdAt).getTime()) /
          (1000 * 60 * 60)
        : 1;
    metrics.throughput = executions.length / timeSpan;

    // Calculate API calls
    const apiCalls = executions
      .filter((e) => e.metrics?.apiCalls)
      .map((e) => e.metrics.apiCalls);

    if (apiCalls.length > 0) {
      metrics.apiCalls = this.aggregateValues(apiCalls, aggregation);
    }

    return metrics;
  }

  private aggregateValues(values: number[], aggregation?: string) {
    if (!values.length) return 0;

    switch (aggregation) {
      case 'median':
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      case 'p95':
        const sorted95 = [...values].sort((a, b) => a - b);
        const index95 = Math.floor(sorted95.length * 0.95);
        return sorted95[index95];
      case 'p99':
        const sorted99 = [...values].sort((a, b) => a - b);
        const index99 = Math.floor(sorted99.length * 0.99);
        return sorted99[index99];
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'count':
        return values.length;
      default: // average
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
  }

  private calculatePerformanceTrends(executions: any[]) {
    // Group executions by hour and calculate trends
    const hourlyData = new Map();

    executions.forEach((execution) => {
      const hour = new Date(execution.createdAt).toISOString().slice(0, 13);
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, { executions: [], errors: 0 });
      }

      const data = hourlyData.get(hour);
      data.executions.push(execution);
      if (execution.status === 'failed') data.errors++;
    });

    return Array.from(hourlyData.entries()).map(([hour, data]) => ({
      hour,
      executionCount: data.executions.length,
      errorRate: (data.errors / data.executions.length) * 100,
      averageLoadTime:
        data.executions
          .filter((e: any) => e.metrics?.duration)
          .reduce((sum: number, e: any) => sum + e.metrics.duration, 0) /
        data.executions.length,
    }));
  }

  private async getPerformanceAlerts(widgetId: string, metrics: any) {
    const alerts = [];

    // Check for high error rate
    if (metrics.errorRate > 5) {
      alerts.push({
        type: 'error_rate',
        severity: metrics.errorRate > 10 ? 'critical' : 'warning',
        message: `Error rate is ${metrics.errorRate.toFixed(2)}%`,
        threshold: 5,
        currentValue: metrics.errorRate,
      });
    }

    // Check for slow load times
    if (metrics.loadTime?.average > 2000) {
      alerts.push({
        type: 'load_time',
        severity: metrics.loadTime.average > 5000 ? 'critical' : 'warning',
        message: `Average load time is ${metrics.loadTime.average.toFixed(0)}ms`,
        threshold: 2000,
        currentValue: metrics.loadTime.average,
      });
    }

    return alerts;
  }

  private processCrossDomainData(analytics: any[]) {
    const domainMap = new Map();

    analytics.forEach((row) => {
      try {
        const url = new URL(row.pageUrl);
        const domain = url.hostname;

        if (!domainMap.has(domain)) {
          domainMap.set(domain, {
            domain,
            eventCount: 0,
            uniqueVisitors: 0,
            devices: new Set(),
            countries: new Set(),
          });
        }

        const data = domainMap.get(domain);
        data.eventCount += parseInt(row.eventCount);
        data.uniqueVisitors += parseInt(row.uniqueVisitors);
        data.devices.add(row.deviceType);
        data.countries.add(row.country);
      } catch (error) {
        // Invalid URL, skip
      }
    });

    const domains = Array.from(domainMap.values()).map((data) => ({
      ...data,
      devices: Array.from(data.devices),
      countries: Array.from(data.countries),
    }));

    const topPerformingDomains = domains
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    return {
      domains,
      totalDomains: domains.length,
      topPerformingDomains,
      insights: this.generateCrossDomainInsights(domains),
    };
  }

  private generateCrossDomainInsights(domains: any[]) {
    const insights = [];

    if (domains.length > 1) {
      const totalEvents = domains.reduce((sum, d) => sum + d.eventCount, 0);
      const topDomain = domains.sort((a, b) => b.eventCount - a.eventCount)[0];
      const topDomainPercentage = (topDomain.eventCount / totalEvents) * 100;

      insights.push({
        type: 'top_domain',
        message: `${topDomain.domain} accounts for ${topDomainPercentage.toFixed(1)}% of all events`,
        data: { domain: topDomain.domain, percentage: topDomainPercentage },
      });
    }

    return insights;
  }

  private processHeatmapData(interactions: WidgetAnalytics[]) {
    const points: any[] = [];
    const densityMap = new Map<string, number>();

    interactions.forEach((interaction) => {
      // Extract coordinates from properties if available
      const x =
        interaction.properties?.x !== undefined
          ? interaction.properties.x
          : Math.random() * 100;
      const y =
        interaction.properties?.y !== undefined
          ? interaction.properties.y
          : Math.random() * 100;
      const key = `${Math.floor(x / 10)}-${Math.floor(y / 10)}`;

      points.push({ x, y, intensity: 1 });
      densityMap.set(key, (densityMap.get(key) || 0) + 1);
    });

    // Find hotspots (areas with high density)
    const hotspots = Array.from(densityMap.entries())
      .filter(([key, count]) => count > 5)
      .map(([key, count]) => {
        const [x, y] = key.split('-').map(Number);
        return { x: x * 10, y: y * 10, intensity: count };
      })
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 10);

    return {
      points,
      density: Object.fromEntries(densityMap),
      hotspots,
    };
  }

  private calculateRetentionMetrics(
    sessions: Array<{
      sessionId: string;
      firstVisit: string | Date;
      lastVisit: string | Date;
      eventCount: number;
    }>,
  ) {
    // Group sessions by first visit date
    const cohorts = new Map<
      string,
      Array<{
        sessionId: string;
        firstVisit: string | Date;
        lastVisit: string | Date;
        eventCount: number;
      }>
    >();

    sessions.forEach((session) => {
      const firstVisit = new Date(session.firstVisit);
      const cohortKey = firstVisit.toISOString().split('T')[0];

      if (!cohorts.has(cohortKey)) {
        cohorts.set(cohortKey, []);
      }

      cohorts.get(cohortKey)?.push(session);
    });

    // Calculate retention rates for each cohort
    const retentionRates: number[] = [];
    const cohortData: Array<{
      cohortDate: string;
      totalUsers: number;
      returningUsers: number;
      retentionRate: number;
    }> = [];

    cohorts.forEach((cohortSessions, cohortDate) => {
      const totalUsers = cohortSessions.length;
      const returningUsers = cohortSessions.filter(
        (s) =>
          new Date(s.lastVisit).getTime() >
          new Date(s.firstVisit).getTime() + 24 * 60 * 60 * 1000,
      ).length;

      const retentionRate =
        totalUsers > 0 ? (returningUsers / totalUsers) * 100 : 0;

      cohortData.push({
        cohortDate,
        totalUsers,
        returningUsers,
        retentionRate,
      });

      retentionRates.push(retentionRate);
    });

    const averageRetention =
      retentionRates.length > 0
        ? retentionRates.reduce((sum: number, rate: number) => sum + rate, 0) /
          retentionRates.length
        : 0;

    const churnRate = 100 - averageRetention;

    return {
      cohorts: cohortData,
      rates: retentionRates,
      averageRetention,
      churnRate,
    };
  }
}
