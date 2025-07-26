import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Widget } from './widget.entity';
import { User } from './user.entity';

export interface WidgetInteractionData {
  type: 'view' | 'click' | 'message' | 'conversion' | 'error' | 'close';
  element?: string;
  value?: any;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface WidgetSessionData {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  interactions: number;
  conversions: number;
  bounced: boolean;
  userAgent: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browserInfo: {
    name: string;
    version: string;
  };
  geolocation?: {
    country: string;
    region: string;
    city: string;
  };
}

export interface WidgetPerformanceData {
  loadTime: number;
  renderTime: number;
  firstInteractionTime?: number;
  memoryUsage?: number;
  errorCount: number;
  apiResponseTimes: number[];
  cacheHitRate: number;
}

@Entity('widget_analytics')
@Index(['widgetId', 'date'])
@Index(['widgetId', 'eventType', 'date'])
@Index(['date', 'eventType'])
@Index(['userId', 'date'])
export class WidgetAnalytics extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'widget_id' })
  @Index()
  widgetId!: string;

  @ManyToOne(() => Widget, { eager: false })
  @JoinColumn({ name: 'widget_id' })
  widget!: Widget;

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId?: string;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'date' })
  @Index()
  date!: Date;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: ['view', 'interaction', 'conversion', 'error', 'performance', 'click', 'scroll', 'form_submit', 'session_start', 'session_end'],
  })
  @Index()
  eventType!: 'view' | 'interaction' | 'conversion' | 'error' | 'performance' | 'click' | 'scroll' | 'form_submit' | 'session_start' | 'session_end';

  @Column({ name: 'session_id' })
  @Index()
  sessionId!: string;

  @Column({ name: 'page_url', type: 'text' })
  pageUrl!: string;

  @Column({ name: 'referrer_url', type: 'text', nullable: true })
  referrerUrl?: string;

  @Column({ name: 'user_agent', type: 'text' })
  userAgent!: string;

  @Column({ name: 'ip_address', length: 45 })
  ipAddress!: string;

  @Column({
    name: 'device_type',
    type: 'enum',
    enum: ['desktop', 'mobile', 'tablet'],
  })
  @Index()
  deviceType!: 'desktop' | 'mobile' | 'tablet';

  @Column({ name: 'browser_name', length: 100 })
  @Index()
  browserName!: string;

  @Column({ name: 'browser_version', length: 50 })
  browserVersion!: string;

  @Column({ name: 'operating_system', length: 100 })
  operatingSystem!: string;

  @Column({ name: 'screen_resolution', length: 20, nullable: true })
  screenResolution?: string;

  @Column({ length: 100, nullable: true })
  country?: string;

  @Column({ length: 100, nullable: true })
  region?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ name: 'timezone', length: 50, nullable: true })
  timezone?: string;

  @Column({ type: 'jsonb', nullable: true })
  interactionData?: WidgetInteractionData;

  @Column({ type: 'jsonb', nullable: true })
  sessionData?: WidgetSessionData;

  @Column({ type: 'jsonb', nullable: true })
  performanceData?: WidgetPerformanceData;

  @Column({ name: 'duration_ms', nullable: true })
  durationMs?: number;

  @Column({
    name: 'conversion_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  conversionValue?: number;

  @Column({ name: 'conversion_type', length: 100, nullable: true })
  conversionType?: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  properties?: Record<string, any>;

  @Column({ name: 'is_unique_visitor', default: false })
  @Index()
  isUniqueVisitor!: boolean;

  @Column({ name: 'is_returning_visitor', default: false })
  @Index()
  isReturningVisitor!: boolean;

  @Column({ name: 'is_bounce', default: false })
  @Index()
  isBounce!: boolean;

  @Column({ name: 'page_depth', default: 1 })
  pageDepth!: number;

  @Column({ name: 'time_on_page_ms', nullable: true })
  timeOnPageMs?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Helper methods
  static createViewEvent(
    widgetId: string,
    sessionId: string,
    pageUrl: string,
    userAgent: string,
    ipAddress: string,
    additionalData?: Partial<WidgetAnalytics>
  ): Partial<WidgetAnalytics> {
    return {
      widgetId,
      sessionId,
      pageUrl,
      userAgent,
      ipAddress,
      eventType: 'view',
      date: new Date(),
      isUniqueVisitor: true, // This would be determined by business logic
      ...additionalData,
    };
  }

  static createInteractionEvent(
    widgetId: string,
    sessionId: string,
    pageUrl: string,
    interactionData: WidgetInteractionData,
    userAgent: string,
    ipAddress: string,
    additionalData?: Partial<WidgetAnalytics>
  ): Partial<WidgetAnalytics> {
    return {
      widgetId,
      sessionId,
      pageUrl,
      userAgent,
      ipAddress,
      eventType: 'interaction',
      date: new Date(),
      interactionData,
      durationMs: interactionData.duration,
      ...additionalData,
    };
  }

  static createConversionEvent(
    widgetId: string,
    sessionId: string,
    pageUrl: string,
    conversionType: string,
    conversionValue: number,
    userAgent: string,
    ipAddress: string,
    additionalData?: Partial<WidgetAnalytics>
  ): Partial<WidgetAnalytics> {
    return {
      widgetId,
      sessionId,
      pageUrl,
      userAgent,
      ipAddress,
      eventType: 'conversion',
      date: new Date(),
      conversionType,
      conversionValue,
      ...additionalData,
    };
  }

  static createErrorEvent(
    widgetId: string,
    sessionId: string,
    pageUrl: string,
    errorMessage: string,
    userAgent: string,
    ipAddress: string,
    additionalData?: Partial<WidgetAnalytics>
  ): Partial<WidgetAnalytics> {
    return {
      widgetId,
      sessionId,
      pageUrl,
      userAgent,
      ipAddress,
      eventType: 'error',
      date: new Date(),
      errorMessage,
      ...additionalData,
    };
  }

  static createPerformanceEvent(
    widgetId: string,
    sessionId: string,
    pageUrl: string,
    performanceData: WidgetPerformanceData,
    userAgent: string,
    ipAddress: string,
    additionalData?: Partial<WidgetAnalytics>
  ): Partial<WidgetAnalytics> {
    return {
      widgetId,
      sessionId,
      pageUrl,
      userAgent,
      ipAddress,
      eventType: 'performance',
      date: new Date(),
      performanceData,
      ...additionalData,
    };
  }

  isView(): boolean {
    return this.eventType === 'view';
  }

  isInteraction(): boolean {
    return this.eventType === 'interaction';
  }

  isConversion(): boolean {
    return this.eventType === 'conversion';
  }

  isError(): boolean {
    return this.eventType === 'error';
  }

  isPerformance(): boolean {
    return this.eventType === 'performance';
  }

  getDeviceInfo(): { type: string; browser: string; os: string } {
    return {
      type: this.deviceType,
      browser: `${this.browserName} ${this.browserVersion}`,
      os: this.operatingSystem,
    };
  }

  getLocationInfo(): { country?: string; region?: string; city?: string } {
    return {
      country: this.country,
      region: this.region,
      city: this.city,
    };
  }

  getDurationInSeconds(): number {
    return this.durationMs ? Math.round(this.durationMs / 1000) : 0;
  }
}
