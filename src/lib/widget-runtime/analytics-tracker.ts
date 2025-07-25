/**
 * Widget Analytics Tracker
 * Tracks user interactions and performance metrics for embedded widgets
 */

import { WidgetEvent, DeviceInfo, GeolocationData } from '@/lib/sdk/types';
import { apiClient } from '@/lib/api';

export interface AnalyticsConfig {
  widgetId: string;
  sessionId: string;
  userId?: string;
  enableGeolocation?: boolean;
  enablePerformanceTracking?: boolean;
  batchSize?: number;
  flushInterval?: number;
  debug?: boolean;
}

export interface UserSession {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  pageViews: number;
  interactions: number;
  conversions: number;
  deviceInfo: DeviceInfo;
  geolocation?: GeolocationData;
  referrer?: string;
  utmParams?: Record<string, string>;
}

export interface ConversionEvent {
  type: 'goal_completion' | 'form_submission' | 'button_click' | 'custom';
  value?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  memoryUsage?: number;
  errorCount: number;
  apiResponseTimes: number[];
}

export class WidgetAnalyticsTracker {
  private config: AnalyticsConfig = {
    widgetId: '',
    sessionId: '',
    enableGeolocation: false,
    enablePerformanceTracking: true,
    batchSize: 10,
    flushInterval: 30000,
    debug: false
  };
  private session: UserSession = {
    sessionId: '',
    startTime: new Date(),
    lastActivity: new Date(),
    pageViews: 0,
    interactions: 0,
    conversions: 0,
    deviceInfo: {
      type: 'desktop',
      userAgent: '',
      screenResolution: { width: 0, height: 0 },
      browserInfo: { name: '', version: '' },
      operatingSystem: ''
    },
    referrer: '',
    utmParams: {}
  };
  private eventQueue: WidgetEvent[] = [];
  private performanceMetrics: PerformanceMetrics = {
    loadTime: 0,
    renderTime: 0,
    interactionTime: 0,
    errorCount: 0,
    apiResponseTimes: []
  };
  private flushTimer?: NodeJS.Timeout;
  private isTracking: boolean = false;
  private observers: Map<string, IntersectionObserver | PerformanceObserver> = new Map();

  constructor(config: AnalyticsConfig) {
    this.config = {
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      enableGeolocation: false,
      enablePerformanceTracking: true,
      debug: false,
      ...config
    };

    this.performanceMetrics = {
      loadTime: 0,
      renderTime: 0,
      interactionTime: 0,
      errorCount: 0,
      apiResponseTimes: []
    };

    this.initializeSession();
    this.setupEventListeners();
    this.startTracking();
  }

  /**
   * Track a custom event
   */
  trackEvent(type: string, data: Record<string, any> = {}): void {
    if (!this.isTracking) return;

    const event: WidgetEvent = {
      type: type as any,
      widgetId: this.config.widgetId,
      sessionId: this.config.sessionId,
      timestamp: new Date(),
      data: {
        ...data,
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };

    this.eventQueue.push(event);
    this.session.lastActivity = new Date();

    if (type === 'interaction') {
      this.session.interactions++;
    }

    this.debugLog('Event tracked:', event);

    // Flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize!) {
      this.flushEvents();
    }
  }

  /**
   * Track page view
   */
  trackPageView(page?: string): void {
    this.session.pageViews++;
    this.trackEvent('view', {
      page: page || window.location.pathname,
      title: document.title,
      timestamp: Date.now()
    });
  }

  /**
   * Track user interaction
   */
  trackInteraction(element: string, action: string, value?: any): void {
    this.trackEvent('interaction', {
      element,
      action,
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Track conversion event
   */
  trackConversion(conversion: ConversionEvent): void {
    this.session.conversions++;
    this.trackEvent('conversion', {
      ...conversion,
      sessionDuration: Date.now() - this.session.startTime.getTime(),
      timestamp: Date.now()
    });
  }

  /**
   * Track error
   */
  trackError(error: Error | string, context?: Record<string, any>): void {
    this.performanceMetrics.errorCount++;
    
    const errorData = typeof error === 'string' ? 
      { message: error } : 
      {
        message: error.message,
        stack: error.stack,
        name: error.name
      };

    this.trackEvent('error', {
      ...errorData,
      context,
      timestamp: Date.now()
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metrics: Partial<PerformanceMetrics>): void {
    if (!this.config.enablePerformanceTracking) return;

    Object.assign(this.performanceMetrics, metrics);
    
    this.trackEvent('performance', {
      ...this.performanceMetrics,
      timestamp: Date.now()
    });
  }

  /**
   * Track API response time
   */
  trackAPIResponse(endpoint: string, responseTime: number, success: boolean): void {
    this.performanceMetrics.apiResponseTimes.push(responseTime);
    
    this.trackEvent('api_call', {
      endpoint,
      responseTime,
      success,
      timestamp: Date.now()
    });
  }

  /**
   * Set user identification
   */
  identifyUser(userId: string, traits?: Record<string, any>): void {
    this.config.userId = userId;
    
    this.trackEvent('identify', {
      userId,
      traits,
      timestamp: Date.now()
    });
  }

  /**
   * Start A/B test tracking
   */
  trackABTest(testName: string, variant: string): void {
    this.trackEvent('ab_test', {
      testName,
      variant,
      timestamp: Date.now()
    });
  }

  /**
   * Track form interactions
   */
  trackFormInteraction(formId: string, action: 'start' | 'complete' | 'abandon', data?: any): void {
    this.trackEvent('form_interaction', {
      formId,
      action,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Track scroll depth
   */
  trackScrollDepth(percentage: number): void {
    this.trackEvent('scroll', {
      depth: percentage,
      timestamp: Date.now()
    });
  }

  /**
   * Get current session data
   */
  getSession(): UserSession {
    return { ...this.session };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Flush events immediately
   */
  async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await apiClient.post('/analytics/widget-events', {
        widgetId: this.config.widgetId,
        sessionId: this.config.sessionId,
        events,
        session: this.session,
        performanceMetrics: this.performanceMetrics
      });

      this.debugLog(`Flushed ${events.length} events`);
    } catch (error) {
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
      console.warn('Failed to send analytics events:', error);
    }
  }

  /**
   * Stop tracking and cleanup
   */
  destroy(): void {
    this.isTracking = false;
    
    // Flush remaining events
    this.flushEvents();
    
    // Clear timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Disconnect observers
    this.observers.forEach(observer => {
      if ('disconnect' in observer) {
        observer.disconnect();
      }
    });
    
    this.observers.clear();
  }

  /**
   * Private methods
   */
  private initializeSession(): void {
    this.session = {
      sessionId: this.config.sessionId,
      startTime: new Date(),
      lastActivity: new Date(),
      pageViews: 0,
      interactions: 0,
      conversions: 0,
      deviceInfo: this.getDeviceInfo(),
      referrer: document.referrer,
      utmParams: this.getUTMParams()
    };

    // Get geolocation if enabled
    if (this.config.enableGeolocation) {
      this.getGeolocation().then(geo => {
        if (geo) {
          this.session.geolocation = geo;
        }
      });
    }
  }

  private setupEventListeners(): void {
    // Page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page_hidden', { timestamp: Date.now() });
        this.flushEvents(); // Flush before page becomes hidden
      } else {
        this.trackEvent('page_visible', { timestamp: Date.now() });
      }
    });

    // Page unload
    window.addEventListener('beforeunload', () => {
      this.trackEvent('page_unload', { 
        sessionDuration: Date.now() - this.session.startTime.getTime(),
        timestamp: Date.now()
      });
      this.flushEvents();
    });

    // Scroll tracking
    this.setupScrollTracking();
    
    // Click tracking
    this.setupClickTracking();
    
    // Form tracking
    this.setupFormTracking();
    
    // Performance tracking
    if (this.config.enablePerformanceTracking) {
      this.setupPerformanceTracking();
    }
  }

  private setupScrollTracking(): void {
    let maxScroll = 0;
    const scrollThresholds = [25, 50, 75, 90, 100];
    const trackedThresholds = new Set<number>();

    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      
      maxScroll = Math.max(maxScroll, scrollPercent);
      
      scrollThresholds.forEach(threshold => {
        if (scrollPercent >= threshold && !trackedThresholds.has(threshold)) {
          trackedThresholds.add(threshold);
          this.trackScrollDepth(threshold);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  private setupClickTracking(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const tagName = target.tagName.toLowerCase();
      const elementInfo = {
        tag: tagName,
        id: target.id,
        className: target.className,
        text: target.textContent?.slice(0, 100),
        href: tagName === 'a' ? (target as HTMLAnchorElement).href : undefined
      };

      this.trackInteraction('click', tagName, elementInfo);
    });
  }

  private setupFormTracking(): void {
    // Track form starts
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        const form = target.closest('form');
        if (form && !form.dataset.tracked) {
          form.dataset.tracked = 'true';
          this.trackFormInteraction(form.id || 'unnamed', 'start');
        }
      }
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.trackFormInteraction(form.id || 'unnamed', 'complete');
    });
  }

  private setupPerformanceTracking(): void {
    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.trackPerformance({
            loadTime: navigation.loadEventEnd - navigation.fetchStart,
            renderTime: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
          });
        }
      }, 0);
    });

    // Track long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.trackEvent('long_task', {
              duration: entry.duration,
              startTime: entry.startTime,
              timestamp: Date.now()
            });
          });
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        // Long task API not supported
      }
    }

    // Track memory usage (if available)
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.performanceMetrics.memoryUsage = memory.usedJSHeapSize;
      }, 30000);
    }
  }

  private startTracking(): void {
    this.isTracking = true;
    
    // Set up flush timer
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.config.flushInterval);

    // Track initial page view
    this.trackPageView();
  }

  private getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    const screen = window.screen;
    
    // Detect device type
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      deviceType = /iPad|tablet/i.test(userAgent) ? 'tablet' : 'mobile';
    }

    // Detect browser
    let browserName = 'Unknown';
    let browserVersion = '0.0';
    
    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    } else if (userAgent.includes('Safari')) {
      browserName = 'Safari';
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      if (match) browserVersion = match[1];
    }

    // Detect OS
    let operatingSystem = 'Unknown';
    if (userAgent.includes('Windows')) operatingSystem = 'Windows';
    else if (userAgent.includes('Mac')) operatingSystem = 'macOS';
    else if (userAgent.includes('Linux')) operatingSystem = 'Linux';
    else if (userAgent.includes('Android')) operatingSystem = 'Android';
    else if (userAgent.includes('iOS')) operatingSystem = 'iOS';

    return {
      type: deviceType,
      userAgent,
      screenResolution: {
        width: screen.width,
        height: screen.height
      },
      browserInfo: {
        name: browserName,
        version: browserVersion
      },
      operatingSystem
    };
  }

  private async getGeolocation(): Promise<GeolocationData | undefined> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => resolve(undefined),
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }

  private getUTMParams(): Record<string, string> {
    const params = new URLSearchParams(window.location.search);
    const utmParams: Record<string, string> = {};
    
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
      const value = params.get(param);
      if (value) {
        utmParams[param] = value;
      }
    });
    
    return utmParams;
  }

  private debugLog(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WidgetAnalytics]', ...args);
    }
  }
}

// Export factory function
export function createAnalyticsTracker(config: AnalyticsConfig): WidgetAnalyticsTracker {
  return new WidgetAnalyticsTracker(config);
}