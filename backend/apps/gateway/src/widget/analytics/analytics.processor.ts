import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Widget } from '@database/entities/widget.entity';
import { WidgetAnalytics } from '@database/entities/widget-analytics.entity';
import { WebsocketService } from '../../websocket/websocket.service';

@Processor('analytics-processing')
@Injectable()
export class AnalyticsProcessor {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(
    @InjectRepository(Widget)
    private widgetRepository: Repository<Widget>,
    @InjectRepository(WidgetAnalytics)
    private widgetAnalyticsRepository: Repository<WidgetAnalytics>,
    private websocketService: WebsocketService,
  ) {}

  @Process('process-event')
  async processAnalyticsEvent(job: Job) {
    const { widgetId, analyticsId, eventType } = job.data;
    
    try {
      this.logger.log(`Processing analytics event: ${eventType} for widget: ${widgetId}`);

      // Get the analytics record
      const analytics = await this.widgetAnalyticsRepository.findOne({
        where: { id: analyticsId },
      });

      if (!analytics) {
        this.logger.warn(`Analytics record not found: ${analyticsId}`);
        return;
      }

      // Process real-time analytics
      await this.processRealTimeAnalytics(widgetId, analytics);

      // Update bounce rate if needed
      await this.updateBounceRate(analytics);

      // Emit real-time updates
      await this.emitRealTimeUpdates(widgetId, analytics);

      this.logger.log(`Successfully processed analytics event: ${analyticsId}`);
    } catch (error) {
      this.logger.error(`Failed to process analytics event: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('aggregate-analytics')
  async aggregateAnalytics(job: Job) {
    const { widgetId, period } = job.data;
    
    try {
      this.logger.log(`Aggregating analytics for widget: ${widgetId}, period: ${period}`);

      // Perform analytics aggregation
      await this.performAnalyticsAggregation(widgetId, period);

      this.logger.log(`Successfully aggregated analytics for widget: ${widgetId}`);
    } catch (error) {
      this.logger.error(`Failed to aggregate analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('calculate-retention')
  async calculateRetention(job: Job) {
    const { widgetId } = job.data;
    
    try {
      this.logger.log(`Calculating retention for widget: ${widgetId}`);

      // Calculate user retention metrics
      await this.calculateUserRetention(widgetId);

      this.logger.log(`Successfully calculated retention for widget: ${widgetId}`);
    } catch (error) {
      this.logger.error(`Failed to calculate retention: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async processRealTimeAnalytics(widgetId: string, analytics: WidgetAnalytics) {
    // Update real-time metrics cache
    const cacheKey = `realtime:${widgetId}`;
    
    // This would typically use Redis for caching
    // For now, we'll just log the processing
    this.logger.debug(`Processing real-time analytics for ${cacheKey}`);
    
    // Update session tracking
    await this.updateSessionTracking(analytics);
  }

  private async updateBounceRate(analytics: WidgetAnalytics) {
    // Check if this is a bounce (single page view with no interactions)
    const sessionEvents = await this.widgetAnalyticsRepository.count({
      where: { sessionId: analytics.sessionId },
    });

    if (sessionEvents === 1 && analytics.eventType === 'view') {
      // Mark as potential bounce - will be updated if more events come
      analytics.isBounce = true;
      await this.widgetAnalyticsRepository.save(analytics);
    } else if (sessionEvents > 1) {
      // Update previous events in this session to not be bounces
      await this.widgetAnalyticsRepository.update(
        { sessionId: analytics.sessionId },
        { isBounce: false }
      );
    }
  }

  private async emitRealTimeUpdates(widgetId: string, analytics: WidgetAnalytics) {
    // Get widget to find organization
    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId },
    });

    if (widget) {
      // Emit real-time analytics update to organization
      this.websocketService.emitToOrganization(
        widget.organizationId,
        'widget:analytics:realtime',
        {
          widgetId,
          eventType: analytics.eventType,
          timestamp: analytics.date,
          sessionId: analytics.sessionId,
          pageUrl: analytics.pageUrl,
          deviceType: analytics.deviceType,
          country: analytics.country,
        }
      );
    }
  }

  private async updateSessionTracking(analytics: WidgetAnalytics) {
    // Track session duration and activity
    const sessionEvents = await this.widgetAnalyticsRepository.find({
      where: { sessionId: analytics.sessionId },
      order: { date: 'ASC' },
    });

    if (sessionEvents.length > 1) {
      const firstEvent = sessionEvents[0];
      const lastEvent = sessionEvents[sessionEvents.length - 1];
      const sessionDuration = new Date(lastEvent.date).getTime() - new Date(firstEvent.date).getTime();

      // Update session duration in analytics records
      await this.widgetAnalyticsRepository.update(
        { sessionId: analytics.sessionId },
        { 
          properties: {
            ...analytics.properties,
            sessionDuration: Math.round(sessionDuration / 1000), // in seconds
          }
        }
      );
    }
  }

  private async performAnalyticsAggregation(widgetId: string, period: string) {
    // This would perform daily/hourly aggregations for better query performance
    // For now, we'll just log the aggregation
    this.logger.debug(`Performing analytics aggregation for widget ${widgetId}, period ${period}`);
    
    // In a real implementation, this would:
    // 1. Aggregate hourly/daily metrics
    // 2. Calculate conversion funnels
    // 3. Update performance metrics
    // 4. Generate insights
  }

  private async calculateUserRetention(widgetId: string) {
    // Calculate user retention cohorts
    this.logger.debug(`Calculating user retention for widget ${widgetId}`);
    
    // In a real implementation, this would:
    // 1. Group users by first visit date (cohorts)
    // 2. Calculate return rates for each cohort
    // 3. Update retention metrics
    // 4. Generate retention insights
  }
}