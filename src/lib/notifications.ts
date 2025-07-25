
import { apiClient } from './api';
import { wsService } from './websocket';
import { getUser } from './auth';

// Types based on backend entities and DTOs
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: ExecutionStatus;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  eventType?: string;
  sourceModule?: string;
  correlationId?: string;
  scheduledFor?: string;
  sentAt?: string;
  readAt?: string;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  userId: string;
  organizationId: string;
  templateId?: string;
  deliveryConfig?: DeliveryConfig;
  createdAt: string;
  updatedAt: string;
  deliveries?: NotificationDelivery[];
  template?: NotificationTemplate;
}

export interface NotificationDelivery {
  id: string;
  type: NotificationType;
  status: ExecutionStatus;
  recipient: string;
  deliveryData?: DeliveryData;
  providerResponse?: Record<string, any>;
  providerId?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  nextRetryAt?: string;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  errorCode?: string;
  responseTime?: number;
  cost?: number;
  currency?: string;
  notificationId: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  type: NotificationType;
  subject: string;
  body: string;
  htmlBody?: string;
  variables?: TemplateVariable[];
  styling?: TemplateStyling;
  deliverySettings?: TemplateDeliverySettings;
  isActive: boolean;
  isSystem: boolean;
  version: number;
  organizationId: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id: string;
  eventType: string;
  type: NotificationType;
  isEnabled: boolean;
  settings?: NotificationSettings;
  userId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  recentActivity: RecentActivity[];
}

// Enums
export enum NotificationType {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WEBHOOK = 'WEBHOOK',
  PUSH = 'PUSH'
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

// Supporting interfaces
export interface DeliveryConfig {
  email?: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
  };
  sms?: {
    to: string[];
  };
  webhook?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
  };
  push?: {
    tokens: string[];
    badge?: number;
    sound?: string;
  };
}

export interface DeliveryData {
  email?: {
    messageId?: string;
    subject?: string;
    fromAddress?: string;
    toAddresses?: string[];
    ccAddresses?: string[];
    bccAddresses?: string[];
  };
  sms?: {
    messageId?: string;
    fromNumber?: string;
    toNumber?: string;
    segments?: number;
  };
  webhook?: {
    url?: string;
    method?: string;
    statusCode?: number;
    responseTime?: number;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
  };
  push?: {
    messageId?: string;
    deviceTokens?: string[];
    badge?: number;
    sound?: string;
  };
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface TemplateStyling {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: string;
  logo?: string;
  headerImage?: string;
  footerText?: string;
}

export interface TemplateDeliverySettings {
  email?: {
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
    priority?: 'high' | 'normal' | 'low';
  };
  sms?: {
    fromNumber?: string;
  };
  webhook?: {
    timeout?: number;
    retryPolicy?: {
      maxRetries: number;
      retryDelay: number;
      backoffMultiplier: number;
    };
  };
  push?: {
    badge?: number;
    sound?: string;
    category?: string;
  };
}

export interface NotificationSettings {
  frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  batching?: {
    enabled: boolean;
    maxBatchSize: number;
    batchWindow: number;
  };
  filters?: {
    priority?: NotificationPriority[];
    sources?: string[];
    keywords?: string[];
  };
  delivery?: {
    email?: {
      address?: string;
      format?: 'text' | 'html';
    };
    sms?: {
      number?: string;
    };
    webhook?: {
      url?: string;
      secret?: string;
    };
    push?: {
      deviceTokens?: string[];
    };
  };
}

export interface RecentActivity {
  id: string;
  title: string;
  type: NotificationType;
  status: ExecutionStatus;
  createdAt: string;
}

// Request/Response interfaces
export interface CreateNotificationRequest {
  title: string;
  message: string;
  type: NotificationType;
  priority?: NotificationPriority;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  eventType?: string;
  sourceModule?: string;
  correlationId?: string;
  scheduledFor?: string;
  maxRetries?: number;
  userId: string;
  templateId?: string;
  deliveryConfig?: DeliveryConfig;
}

export interface CreateBulkNotificationRequest {
  notifications: CreateNotificationRequest[];
  skipDuplicates?: boolean;
  batchId?: string;
}

export interface CreateNotificationFromTemplateRequest {
  templateId: string;
  variables: Record<string, any>;
  userId: string;
  priority?: NotificationPriority;
  scheduledFor?: string;
  correlationId?: string;
  deliveryConfig?: DeliveryConfig;
}

export interface UpdateNotificationRequest {
  title?: string;
  message?: string;
  priority?: NotificationPriority;
  status?: ExecutionStatus;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  scheduledFor?: string;
  maxRetries?: number;
  errorMessage?: string;
}

export interface CreateNotificationTemplateRequest {
  name: string;
  description?: string;
  category: string;
  type: NotificationType;
  subject: string;
  body: string;
  htmlBody?: string;
  variables?: TemplateVariable[];
  styling?: TemplateStyling;
  deliverySettings?: TemplateDeliverySettings;
  isActive?: boolean;
}

export interface UpdateNotificationTemplateRequest {
  name?: string;
  description?: string;
  category?: string;
  subject?: string;
  body?: string;
  htmlBody?: string;
  variables?: TemplateVariable[];
  styling?: TemplateStyling;
  deliverySettings?: TemplateDeliverySettings;
  isActive?: boolean;
}

export interface CreateNotificationPreferenceRequest {
  eventType: string;
  type: NotificationType;
  isEnabled?: boolean;
  settings?: NotificationSettings;
}

export interface UpdateNotificationPreferenceRequest {
  isEnabled?: boolean;
  settings?: NotificationSettings;
}

export interface GetNotificationsQuery {
  page?: number;
  limit?: number;
  type?: NotificationType;
  status?: ExecutionStatus;
  priority?: NotificationPriority;
  unreadOnly?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface GetNotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetTemplatesQuery {
  page?: number;
  limit?: number;
  category?: string;
  type?: NotificationType;
  isActive?: boolean;
}

export interface GetTemplatesResponse {
  templates: NotificationTemplate[];
  total: number;
}

export interface TestNotificationTemplateRequest {
  variables: Record<string, any>;
  testRecipient?: string;
}

export interface BatchingStats {
  totalQueues: number;
  totalPendingNotifications: number;
  queueDetails: Array<{
    key: string;
    count: number;
    oldestNotification: string;
  }>;
}

// Real-time notification events
export interface NotificationEvent {
  type: 'new_notification' | 'notification_read' | 'all_notifications_read' | 'notification_processed';
  notificationId?: string;
  notification?: Notification;
  readAt?: string;
  timestamp?: string;
  status?: ExecutionStatus;
  deliveryCount?: number;
}

/**
 * NotificationService - Main service class for managing notifications
 */
export class NotificationService {
  private static instance: NotificationService;
  private eventListeners: Map<string, Array<(event: NotificationEvent) => void>> = new Map();
  private isInitialized = false;

  private constructor() {
    this.initializeRealTimeUpdates();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize real-time notification updates via WebSocket
   */
  private initializeRealTimeUpdates(): void {
    if (this.isInitialized) return;

    // Subscribe to notification events
    wsService.subscribe('notification.sent', (data: any) => {
      this.handleNotificationEvent({
        type: 'new_notification',
        notification: data.notification,
        notificationId: data.notificationId,
      });
    });

    wsService.subscribe('notification.read', (data: any) => {
      this.handleNotificationEvent({
        type: 'notification_read',
        notificationId: data.notificationId,
        readAt: data.readAt,
      });
    });

    wsService.subscribe('notification.all_read', (data: any) => {
      this.handleNotificationEvent({
        type: 'all_notifications_read',
        timestamp: data.timestamp,
      });
    });

    wsService.subscribe('notification.processed', (data: any) => {
      this.handleNotificationEvent({
        type: 'notification_processed',
        notificationId: data.notificationId,
        status: data.status,
        deliveryCount: data.deliveryCount,
      });
    });

    this.isInitialized = true;
  }

  /**
   * Handle incoming notification events and notify listeners
   */
  private handleNotificationEvent(event: NotificationEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in notification event listener:', error);
        }
      });
    }

    // Also notify generic listeners
    const genericListeners = this.eventListeners.get('*');
    if (genericListeners) {
      genericListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in generic notification event listener:', error);
        }
      });
    }
  }

  /**
   * Subscribe to notification events
   */
  public addEventListener(
    eventType: string | '*',
    listener: (event: NotificationEvent) => void
  ): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  // Notification CRUD Operations
  /**
   * Create a new notification
   */
  public async createNotification(request: CreateNotificationRequest): Promise<Notification> {
    const response = await apiClient.post<Notification>('/notifications', request);
    return response.data;
  }

  /**
   * Create multiple notifications in bulk
   */
  public async createBulkNotifications(request: CreateBulkNotificationRequest): Promise<Notification[]> {
    const response = await apiClient.post<Notification[]>('/notifications/bulk', request);
    return response.data;
  }

  /**
   * Create notification from template
   */
  public async createNotificationFromTemplate(request: CreateNotificationFromTemplateRequest): Promise<Notification> {
    const response = await apiClient.post<Notification>('/notifications/from-template', request);
    return response.data;
  }

  /**
   * Get notifications with pagination and filtering
   */
  public async getNotifications(query: GetNotificationsQuery = {}): Promise<GetNotificationsResponse> {
    const response = await apiClient.get<GetNotificationsResponse>('/notifications', { params: query });
    return response.data;
  }

  /**
   * Get a specific notification by ID
   */
  public async getNotificationById(id: string): Promise<Notification> {
    const response = await apiClient.get<Notification>(`/notifications/${id}`);
    return response.data;
  }

  /**
   * Update a notification
   */
  public async updateNotification(id: string, request: UpdateNotificationRequest): Promise<Notification> {
    const response = await apiClient.put<Notification>(`/notifications/${id}`, request);
    return response.data;
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(id: string): Promise<void> {
    await apiClient.put(`/notifications/${id}/read`);
  }

  /**
   * Mark all notifications as read
   */
  public async markAllAsRead(): Promise<{ markedCount: number }> {
    const response = await apiClient.put<{ markedCount: number }>('/notifications/read-all');
    return response.data;
  }

  /**
   * Delete a notification
   */
  public async deleteNotification(id: string): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  }

  /**
   * Get notification statistics
   */
  public async getNotificationStats(): Promise<NotificationStats> {
    const response = await apiClient.get<NotificationStats>('/notifications/stats');
    return response.data;
  }

  // Template Management
  /**
   * Create a notification template
   */
  public async createTemplate(request: CreateNotificationTemplateRequest): Promise<NotificationTemplate> {
    const response = await apiClient.post<NotificationTemplate>('/notifications/templates', request);
    return response.data;
  }

  /**
   * Get notification templates
   */
  public async getTemplates(query: GetTemplatesQuery = {}): Promise<GetTemplatesResponse> {
    const response = await apiClient.get<GetTemplatesResponse>('/notifications/templates', { params: query });
    return response.data;
  }

  /**
   * Get a specific template by ID
   */
  public async getTemplateById(id: string): Promise<NotificationTemplate> {
    const response = await apiClient.get<NotificationTemplate>(`/notifications/templates/${id}`);
    return response.data;
  }

  /**
   * Update a notification template
   */
  public async updateTemplate(id: string, request: UpdateNotificationTemplateRequest): Promise<NotificationTemplate> {
    const response = await apiClient.put<NotificationTemplate>(`/notifications/templates/${id}`, request);
    return response.data;
  }

  /**
   * Delete a notification template
   */
  public async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/notifications/templates/${id}`);
  }

  /**
   * Test a notification template
   */
  public async testTemplate(id: string, request: TestNotificationTemplateRequest): Promise<void> {
    await apiClient.post(`/notifications/templates/${id}/test`, request);
  }

  // Preference Management
  /**
   * Create or update notification preference
   */
  public async createOrUpdatePreference(request: CreateNotificationPreferenceRequest): Promise<NotificationPreference> {
    const response = await apiClient.post<NotificationPreference>('/notifications/preferences', request);
    return response.data;
  }

  /**
   * Get user notification preferences
   */
  public async getPreferences(): Promise<NotificationPreference[]> {
    const response = await apiClient.get<NotificationPreference[]>('/notifications/preferences');
    return response.data;
  }

  /**
   * Update a notification preference
   */
  public async updatePreference(id: string, request: UpdateNotificationPreferenceRequest): Promise<NotificationPreference> {
    const response = await apiClient.put<NotificationPreference>(`/notifications/preferences/${id}`, request);
    return response.data;
  }

  /**
   * Delete a notification preference
   */
  public async deletePreference(id: string): Promise<void> {
    await apiClient.delete(`/notifications/preferences/${id}`);
  }

  // Delivery Management
  /**
   * Get delivery history for a notification
   */
  public async getDeliveryHistory(notificationId: string): Promise<NotificationDelivery[]> {
    const response = await apiClient.get<NotificationDelivery[]>(`/notifications/${notificationId}/deliveries`);
    return response.data;
  }

  /**
   * Retry failed deliveries for a notification
   */
  public async retryFailedDeliveries(notificationId: string): Promise<{ retriedCount: number }> {
    const response = await apiClient.post<{ retriedCount: number }>(`/notifications/${notificationId}/retry`);
    return response.data;
  }

  // Admin Operations
  /**
   * Get delivery statistics (Admin only)
   */
  public async getDeliveryStats(): Promise<NotificationStats> {
    const response = await apiClient.get<NotificationStats>('/notifications/admin/delivery-stats');
    return response.data;
  }

  /**
   * Get batching statistics (Admin only)
   */
  public async getBatchingStats(): Promise<BatchingStats> {
    const response = await apiClient.get<BatchingStats>('/notifications/admin/batching-stats');
    return response.data;
  }

  /**
   * Flush all batched notifications (Admin only)
   */
  public async flushBatches(): Promise<void> {
    await apiClient.post('/notifications/admin/flush-batches');
  }

  /**
   * Send test notification
   */
  public async sendTestNotification(): Promise<Notification> {
    const response = await apiClient.post<Notification>('/notifications/test');
    return response.data;
  }

  // Utility Methods
  /**
   * Check if notification is read
   */
  public isNotificationRead(notification: Notification): boolean {
    return !!notification.readAt;
  }

  /**
   * Check if notification is sent
   */
  public isNotificationSent(notification: Notification): boolean {
    return notification.status === ExecutionStatus.COMPLETED;
  }

  /**
   * Check if notification failed
   */
  public isNotificationFailed(notification: Notification): boolean {
    return notification.status === ExecutionStatus.FAILED;
  }

  /**
   * Check if notification can be retried
   */
  public canRetryNotification(notification: Notification): boolean {
    return notification.retryCount < notification.maxRetries && this.isNotificationFailed(notification);
  }

  /**
   * Get priority color for UI display
   */
  public getPriorityColor(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.CRITICAL:
        return 'bg-red-500';
      case NotificationPriority.HIGH:
        return 'bg-orange-500';
      case NotificationPriority.MEDIUM:
        return 'bg-blue-500';
      case NotificationPriority.LOW:
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  }

  /**
   * Get priority label for UI display
   */
  public getPriorityLabel(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.CRITICAL:
        return 'Critical';
      case NotificationPriority.HIGH:
        return 'High';
      case NotificationPriority.MEDIUM:
        return 'Medium';
      case NotificationPriority.LOW:
        return 'Low';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get source module icon for UI display
   */
  public getSourceModuleIcon(sourceModule?: string): string {
    switch (sourceModule) {
      case 'agent':
        return '🤖';
      case 'tool':
        return '🔧';
      case 'workflow':
        return '⚡';
      case 'knowledge':
        return '📚';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  }

  /**
   * Format notification time for display
   */
  public formatNotificationTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  }

  /**
   * Validate template variables
   */
  public validateTemplateVariables(
    template: NotificationTemplate,
    variables: Record<string, any>
  ): {
    isValid: boolean;
    missingRequired: string[];
    invalidTypes: string[];
  } {
    const missingRequired: string[] = [];
    const invalidTypes: string[] = [];

    if (template.variables) {
      for (const variable of template.variables) {
        const value = variables[variable.name];

        if (variable.required && (value === undefined || value === null)) {
          missingRequired.push(variable.name);
          continue;
        }

        if (value !== undefined && !this.isValidVariableType(value, variable.type)) {
          invalidTypes.push(variable.name);
        }
      }
    }

    return {
      isValid: missingRequired.length === 0 && invalidTypes.length === 0,
      missingRequired,
      invalidTypes,
    };
  }

  /**
   * Check if variable value matches expected type
   */
  private isValidVariableType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));
      case 'object':
        return typeof value === 'object' && value !== null;
      default:
        return true;
    }
  }

  /**
   * Get current user ID for notifications
   */
  private getCurrentUserId(): string {
    const user = getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  /**
   * Create a quick notification for current user
   */
  public async createQuickNotification(
    title: string,
    message: string,
    type: NotificationType = NotificationType.IN_APP,
    priority: NotificationPriority = NotificationPriority.MEDIUM
  ): Promise<Notification> {
    return this.createNotification({
      title,
      message,
      type,
      priority,
      userId: this.getCurrentUserId(),
    });
  }

  /**
   * Create system notification
   */
  public async createSystemNotification(
    title: string,
    message: string,
    userId: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    data?: Record<string, any>
  ): Promise<Notification> {
    return this.createNotification({
      title,
      message,
      type: NotificationType.IN_APP,
      priority,
      userId,
      eventType: 'system.notification',
      sourceModule: 'system',
      data,
    });
  }

  /**
   * Cleanup - remove event listeners
   */
  public cleanup(): void {
    this.eventListeners.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Export utility functions for backward compatibility
export const {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats,
  createTemplate,
  getTemplates,
  updateTemplate,
  deleteTemplate,
  createOrUpdatePreference,
  getPreferences,
  updatePreference,
  deletePreference,
  sendTestNotification,
  addEventListener,
  isNotificationRead,
  isNotificationSent,
  isNotificationFailed,
  canRetryNotification,
  getPriorityColor,
  getPriorityLabel,
  getSourceModuleIcon,
  formatNotificationTime,
  createQuickNotification,
  createSystemNotification,
} = notificationService;

// Export default service
export default notificationService;
