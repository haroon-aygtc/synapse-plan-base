export interface WidgetTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontSize: number;
  fontFamily?: string;
  customCSS?: string;
}

export interface WidgetLayout {
  width: number;
  height: number;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center' | 'fullscreen';
  responsive: boolean;
  zIndex?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export interface WidgetBehavior {
  autoOpen: boolean;
  showWelcomeMessage: boolean;
  enableTypingIndicator: boolean;
  enableSoundNotifications: boolean;
  sessionTimeout?: number;
  maxMessages?: number;
  enableFileUpload?: boolean;
  enableVoiceInput?: boolean;
}

export interface WidgetBranding {
  showLogo: boolean;
  companyName?: string;
  logoUrl?: string;
  customHeader?: string;
  customFooter?: string;
  poweredByText?: string;
  showPoweredBy?: boolean;
}

export interface WidgetSecurity {
  allowedDomains: string[];
  requireAuth: boolean;
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit?: number;
  };
  enableCORS?: boolean;
  csrfProtection?: boolean;
  encryptData?: boolean;
}

export interface WidgetConfiguration {
  theme: WidgetTheme;
  layout: WidgetLayout;
  behavior: WidgetBehavior;
  branding: WidgetBranding;
  security: WidgetSecurity;
}

export interface Widget {
  id: string;
  name: string;
  description?: string;
  type: 'agent' | 'tool' | 'workflow';
  sourceId: string;
  sourceType: 'agent' | 'tool' | 'workflow';
  configuration: WidgetConfiguration;
  isActive: boolean;
  isDeployed: boolean;
  deploymentInfo?: WidgetDeploymentInfo;
  analyticsData: WidgetAnalyticsData;
  templateId?: string;
  isTemplate: boolean;
  templateCategory?: string;
  templateTags: string[];
  templateRating: number;
  templateDownloads: number;
  isPublicTemplate: boolean;
  version: string;
  metadata?: Record<string, any>;
  usageCount: number;
  lastUsedAt?: Date;
  performanceScore?: number;
  accessibilityScore?: number;
  seoScore?: number;
  userId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetDeploymentInfo {
  environment: 'staging' | 'production';
  customDomain?: string;
  enableAnalytics: boolean;
  enableCaching: boolean;
  deployedAt: Date;
  lastUpdated: Date;
  status: 'active' | 'inactive' | 'error';
  embedCode: {
    javascript: string;
    iframe: string;
    react: string;
    vue: string;
    angular: string;
  };
  urls: {
    standalone: string;
    embed: string;
    api: string;
  };
}

export interface WidgetAnalyticsData {
  views: number;
  interactions: number;
  conversions: number;
  averageSessionDuration: number;
  bounceRate: number;
  lastAccessed: Date;
  topPages: Array<{ url: string; views: number; interactions: number }>;
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  browserBreakdown: Record<string, number>;
  geographicData: Array<{
    country: string;
    views: number;
    interactions: number;
  }>;
}

export interface WidgetExecution {
  id: string;
  widgetId: string;
  sessionId: string;
  userId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  context: WidgetExecutionContext;
  input: WidgetExecutionInput;
  output?: WidgetExecutionOutput;
  metrics?: WidgetExecutionMetrics;
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  executionTimeMs?: number;
  tokensUsed: number;
  apiCallsMade: number;
  cacheHit: boolean;
  costUsd: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetExecutionContext {
  userAgent: string;
  ipAddress: string;
  referrer?: string;
  sessionId: string;
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

export interface WidgetExecutionInput {
  type: 'message' | 'action' | 'file_upload' | 'voice_input';
  content: any;
  metadata?: Record<string, any>;
}

export interface WidgetExecutionOutput {
  type: 'response' | 'action' | 'error' | 'redirect';
  content: any;
  metadata?: Record<string, any>;
}

export interface WidgetExecutionMetrics {
  startTime: Date;
  endTime: Date;
  duration: number;
  tokensUsed?: number;
  apiCalls: number;
  errorCount: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface WidgetAnalytics {
  id: string;
  widgetId: string;
  userId?: string;
  date: Date;
  eventType: 'view' | 'interaction' | 'conversion' | 'error' | 'performance';
  sessionId: string;
  pageUrl: string;
  referrerUrl?: string;
  userAgent: string;
  ipAddress: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browserName: string;
  browserVersion: string;
  operatingSystem: string;
  screenResolution?: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  interactionData?: WidgetInteractionData;
  sessionData?: WidgetSessionData;
  performanceData?: WidgetPerformanceData;
  durationMs?: number;
  conversionValue?: number;
  conversionType?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  isUniqueVisitor: boolean;
  isReturningVisitor: boolean;
  isBounce: boolean;
  pageDepth: number;
  timeOnPageMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

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

export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'agent' | 'tool' | 'workflow';
  configuration: WidgetConfiguration;
  preview: {
    image: string;
    demoUrl: string;
  };
  tags: string[];
  rating: number;
  downloads: number;
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetTestResult {
  success: boolean;
  performance: {
    loadTime: number;
    renderTime: number;
    interactionTime: number;
  };
  compatibility: {
    browsers: Record<string, boolean>;
    devices: Record<string, boolean>;
    frameworks: Record<string, boolean>;
  };
  accessibility: {
    score: number;
    issues: Array<{
      level: 'error' | 'warning' | 'info';
      message: string;
      element?: string;
    }>;
  };
  seo: {
    score: number;
    recommendations: string[];
  };
  errors: string[];
  warnings: string[];
}
