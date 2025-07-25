import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, FindOptionsWhere } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import {
  Notification,
  NotificationTemplate,
  NotificationPreference,
  NotificationDelivery,
} from '@database/entities';
import { NotificationType, NotificationPriority, ExecutionStatus, EventType } from '@shared/enums';
import {
  CreateNotificationDto,
  CreateBulkNotificationDto,
  CreateNotificationFromTemplateDto,
  UpdateNotificationDto,
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
} from './dto';
import { WebSocketService } from '../websocket/websocket.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationSchedulerService } from './notification-scheduler.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(NotificationDelivery)
    private readonly deliveryRepository: Repository<NotificationDelivery>,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly webSocketService: WebSocketService,
    private readonly deliveryService: NotificationDeliveryService,
    private readonly schedulerService: NotificationSchedulerService
  ) {}

  // Notification CRUD Operations
  async createNotification(
    createNotificationDto: CreateNotificationDto,
    organizationId: string
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...createNotificationDto,
      organizationId,
      priority: createNotificationDto.priority || NotificationPriority.MEDIUM,
      status: ExecutionStatus.PENDING,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Check user preferences and schedule delivery
    await this.processNotificationForDelivery(savedNotification);

    // Emit event for real-time updates
    this.eventEmitter.emit(EventType.NOTIFICATION_SENT, {
      notificationId: savedNotification.id,
      userId: savedNotification.userId,
      organizationId: savedNotification.organizationId,
      type: savedNotification.type,
      priority: savedNotification.priority,
    });

    return savedNotification;
  }

  async createBulkNotifications(
    createBulkDto: CreateBulkNotificationDto,
    organizationId: string
  ): Promise<Notification[]> {
    const notifications = createBulkDto.notifications.map((dto) =>
      this.notificationRepository.create({
        ...dto,
        organizationId,
        priority: dto.priority || NotificationPriority.MEDIUM,
        status: ExecutionStatus.PENDING,
      })
    );

    const savedNotifications = await this.notificationRepository.save(notifications);

    // Process each notification for delivery
    for (const notification of savedNotifications) {
      await this.processNotificationForDelivery(notification);
    }

    return savedNotifications;
  }

  async createNotificationFromTemplate(
    createFromTemplateDto: CreateNotificationFromTemplateDto,
    organizationId: string
  ): Promise<Notification> {
    const template = await this.templateRepository.findOne({
      where: {
        id: createFromTemplateDto.templateId,
        organizationId,
        isActive: true,
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Validate template variables
    const validation = template.validateVariables(createFromTemplateDto.variables);
    if (!validation.isValid) {
      throw new BadRequestException(
        `Template validation failed: Missing required variables: ${validation.missingRequired.join(', ')}, Invalid types: ${validation.invalidTypes.join(', ')}`
      );
    }

    // Render template content
    const title = template.renderSubject(createFromTemplateDto.variables);
    const message = template.renderBody(createFromTemplateDto.variables);

    const notification = this.notificationRepository.create({
      title,
      message,
      type: template.type,
      priority: createFromTemplateDto.priority || NotificationPriority.MEDIUM,
      userId: createFromTemplateDto.userId,
      organizationId,
      templateId: template.id,
      data: createFromTemplateDto.variables,
      scheduledFor: createFromTemplateDto.scheduledFor
        ? new Date(createFromTemplateDto.scheduledFor)
        : undefined,
      correlationId: createFromTemplateDto.correlationId,
      deliveryConfig: createFromTemplateDto.deliveryConfig,
      status: ExecutionStatus.PENDING,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    await this.processNotificationForDelivery(savedNotification);

    return savedNotification;
  }

  async getNotifications(
    userId: string,
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      type?: NotificationType;
      status?: ExecutionStatus;
      priority?: NotificationPriority;
      unreadOnly?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    const {
      page = 1,
      limit = 50,
      type,
      status,
      priority,
      unreadOnly,
      startDate,
      endDate,
    } = options;

    const where: FindOptionsWhere<Notification> = {
      userId,
      organizationId,
    };

    if (type) where.type = type;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (unreadOnly) where.readAt = null as any;
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate) as any;
    }

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['template', 'deliveries'],
    });

    const unreadCount = await this.notificationRepository.count({
      where: {
        userId,
        organizationId,
        readAt: null as any,
      },
    });

    return { notifications, total, unreadCount };
  }

  async getNotificationById(
    id: string,
    userId: string,
    organizationId: string
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId, organizationId },
      relations: ['template', 'deliveries'],
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async updateNotification(
    id: string,
    updateDto: UpdateNotificationDto,
    userId: string,
    organizationId: string
  ): Promise<Notification> {
    const notification = await this.getNotificationById(id, userId, organizationId);

    Object.assign(notification, updateDto);

    if (updateDto.scheduledFor) {
      notification.scheduledFor = new Date(updateDto.scheduledFor);
    }

    return this.notificationRepository.save(notification);
  }

  async markAsRead(id: string, userId: string, organizationId: string): Promise<Notification> {
    const notification = await this.getNotificationById(id, userId, organizationId);

    notification.markAsRead();
    const updatedNotification = await this.notificationRepository.save(notification);

    // Send real-time update
    await this.webSocketService.publishEvent(EventType.NOTIFICATION_SENT, {
      type: 'notification_read',
      notificationId: id,
      readAt: notification.readAt,
    });

    return updatedNotification;
  }

  async markAllAsRead(userId: string, organizationId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepository.update(
      {
        userId,
        organizationId,
        readAt: null as any,
      },
      {
        readAt: new Date(),
      }
    );

    // Send real-time update
    await this.webSocketService.publishEvent(EventType.NOTIFICATION_SENT, {
      type: 'all_notifications_read',
      timestamp: new Date(),
    });

    return { updated: result.affected || 0 };
  }

  async deleteNotification(id: string, userId: string, organizationId: string): Promise<void> {
    const notification = await this.getNotificationById(id, userId, organizationId);

    await this.notificationRepository.remove(notification);
  }

  // Template Management
  async createTemplate(
    createTemplateDto: CreateNotificationTemplateDto,
    organizationId: string,
    createdBy: string
  ): Promise<NotificationTemplate> {
    // Check for duplicate template name
    const existingTemplate = await this.templateRepository.findOne({
      where: {
        name: createTemplateDto.name,
        organizationId,
        isActive: true,
      },
    });

    if (existingTemplate) {
      throw new ConflictException('Template with this name already exists');
    }

    const template = this.templateRepository.create({
      ...createTemplateDto,
      organizationId,
      createdBy,
      isActive: createTemplateDto.isActive ?? true,
    });

    return this.templateRepository.save(template);
  }

  async getTemplates(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      category?: string;
      type?: NotificationType;
      isActive?: boolean;
    } = {}
  ): Promise<{ templates: NotificationTemplate[]; total: number }> {
    const { page = 1, limit = 50, category, type, isActive } = options;

    const where: FindOptionsWhere<NotificationTemplate> = {
      organizationId,
    };

    if (category) where.category = category;
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive;

    const [templates, total] = await this.templateRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['creator', 'updater'],
    });

    return { templates, total };
  }

  async getTemplateById(id: string, organizationId: string): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id, organizationId },
      relations: ['creator', 'updater'],
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async updateTemplate(
    id: string,
    updateDto: UpdateNotificationTemplateDto,
    organizationId: string,
    updatedBy: string
  ): Promise<NotificationTemplate> {
    const template = await this.getTemplateById(id, organizationId);

    Object.assign(template, updateDto, { updatedBy, updatedAt: new Date() });

    return this.templateRepository.save(template);
  }

  async deleteTemplate(id: string, organizationId: string): Promise<void> {
    const template = await this.getTemplateById(id, organizationId);
    await this.templateRepository.remove(template);
  }

  // Preference Management
  async createOrUpdatePreference(
    createPreferenceDto: CreateNotificationPreferenceDto,
    userId: string,
    organizationId: string
  ): Promise<NotificationPreference> {
    const existingPreference = await this.preferenceRepository.findOne({
      where: {
        userId,
        organizationId,
        eventType: createPreferenceDto.eventType,
        type: createPreferenceDto.type,
      },
    });

    if (existingPreference) {
      Object.assign(existingPreference, createPreferenceDto);
      return this.preferenceRepository.save(existingPreference);
    }

    const preference = this.preferenceRepository.create({
      ...createPreferenceDto,
      userId,
      organizationId,
      isEnabled: createPreferenceDto.isEnabled ?? true,
    });

    return this.preferenceRepository.save(preference);
  }

  async getPreferences(
    userId: string,
    organizationId: string,
    eventType?: string,
    type?: NotificationType
  ): Promise<NotificationPreference[]> {
    const where: FindOptionsWhere<NotificationPreference> = {
      userId,
      organizationId,
    };

    if (eventType) where.eventType = eventType;
    if (type) where.type = type;

    return this.preferenceRepository.find({
      where,
      order: { eventType: 'ASC', type: 'ASC' },
    });
  }

  async updatePreference(
    id: string,
    updateDto: UpdateNotificationPreferenceDto,
    userId: string,
    organizationId: string
  ): Promise<NotificationPreference> {
    const preference = await this.preferenceRepository.findOne({
      where: { id, userId, organizationId },
    });

    if (!preference) {
      throw new NotFoundException('Preference not found');
    }

    Object.assign(preference, updateDto);
    return this.preferenceRepository.save(preference);
  }

  // Delivery Management
  async getDeliveryHistory(
    notificationId: string,
    userId: string,
    organizationId: string
  ): Promise<NotificationDelivery[]> {
    const notification = await this.getNotificationById(notificationId, userId, organizationId);

    return this.deliveryRepository.find({
      where: { notificationId: notification.id },
      order: { createdAt: 'DESC' },
    });
  }

  async retryFailedDeliveries(
    notificationId: string,
    userId: string,
    organizationId: string
  ): Promise<{ retriedCount: number }> {
    const notification = await this.getNotificationById(notificationId, userId, organizationId);

    const failedDeliveries = await this.deliveryRepository.find({
      where: {
        notificationId: notification.id,
        status: ExecutionStatus.FAILED,
      },
    });

    const retriableDeliveries = failedDeliveries.filter((delivery) => delivery.canRetry());

    for (const delivery of retriableDeliveries) {
      delivery.status = ExecutionStatus.PENDING;
      delivery.nextRetryAt = new Date();
      await this.deliveryRepository.save(delivery);

      // Schedule retry
      await this.deliveryService.scheduleDelivery(delivery);
    }

    return { retriedCount: retriableDeliveries.length };
  }

  // Analytics and Statistics
  async getNotificationStats(
    organizationId: string,
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<NotificationPriority, number>;
    recentActivity: any[];
  }> {
    const where: FindOptionsWhere<Notification> = { organizationId };
    if (userId) where.userId = userId;
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate) as any;
    }

    const [notifications, totalSent] = await this.notificationRepository.findAndCount({
      where,
      relations: ['deliveries'],
    });

    let totalDelivered = 0;
    let totalFailed = 0;
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const notification of notifications) {
      // Count by type
      byType[notification.type] = (byType[notification.type] || 0) + 1;

      // Count by priority
      byPriority[notification.priority] = (byPriority[notification.priority] || 0) + 1;

      // Count delivery status
      const hasSuccessfulDelivery = notification.deliveries.some(
        (d) => d.status === ExecutionStatus.COMPLETED
      );
      const hasFailedDelivery = notification.deliveries.some(
        (d) => d.status === ExecutionStatus.FAILED
      );

      if (hasSuccessfulDelivery) totalDelivered++;
      if (hasFailedDelivery && !hasSuccessfulDelivery) totalFailed++;
    }

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

    // Get recent activity
    const recentActivity = await this.notificationRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: 10,
      select: ['id', 'title', 'type', 'status', 'createdAt'],
    });

    return {
      totalSent,
      totalDelivered,
      totalFailed,
      deliveryRate,
      byType: byType as any,
      byPriority: byPriority as any,
      recentActivity,
    };
  }

  // Private helper methods
  private async processNotificationForDelivery(notification: Notification): Promise<void> {
    try {
      // Get user preferences
      const preferences = await this.getPreferences(
        notification.userId,
        notification.organizationId,
        notification.eventType,
        notification.type
      );

      const preference = preferences.find(
        (p) => p.eventType === notification.eventType && p.type === notification.type
      );

      // Check if notifications are enabled for this event type
      if (preference && !preference.isEnabled) {
        notification.status = ExecutionStatus.CANCELLED;
        await this.notificationRepository.save(notification);
        return;
      }

      // Check quiet hours
      if (preference?.isInQuietHours()) {
        // Schedule for after quiet hours
        const quietHours = preference.settings?.quietHours;
        if (quietHours) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const [endHour, endMin] = quietHours.endTime.split(':').map(Number);
          tomorrow.setHours(endHour, endMin, 0, 0);
          notification.scheduledFor = tomorrow;
        }
      }

      // Schedule delivery
      if (notification.scheduledFor && notification.scheduledFor > new Date()) {
        await this.schedulerService.scheduleNotification(notification);
      } else {
        await this.deliveryService.processNotification(notification);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process notification ${notification.id}: ${error.message}`,
        error.stack
      );

      notification.status = ExecutionStatus.FAILED;
      notification.errorMessage = error.message;
      await this.notificationRepository.save(notification);
    }
  }

  // Event handlers for cross-module integration
  @OnEvent('agent.execution.failed')
  async handleAgentExecutionFailed(payload: any): Promise<void> {
    await this.createCrossModuleNotification({
      eventType: 'agent.execution.failed',
      sourceModule: 'agent',
      title: 'Agent Execution Failed',
      message: `Agent "${payload.agentName}" failed to execute: ${payload.error}`,
      priority: NotificationPriority.HIGH,
      userId: payload.userId,
      organizationId: payload.organizationId,
      data: payload,
    });
  }

  @OnEvent('tool.execution.failed')
  async handleToolExecutionFailed(payload: any): Promise<void> {
    await this.createCrossModuleNotification({
      eventType: 'tool.execution.failed',
      sourceModule: 'tool',
      title: 'Tool Execution Failed',
      message: `Tool "${payload.toolName}" failed to execute: ${payload.error}`,
      priority: NotificationPriority.HIGH,
      userId: payload.userId,
      organizationId: payload.organizationId,
      data: payload,
    });
  }

  @OnEvent('workflow.approval.requested')
  async handleWorkflowApprovalRequested(payload: any): Promise<void> {
    await this.createCrossModuleNotification({
      eventType: 'workflow.approval.requested',
      sourceModule: 'workflow',
      title: 'Workflow Approval Required',
      message: `Workflow "${payload.workflowName}" requires your approval to continue`,
      priority: NotificationPriority.HIGH,
      userId: payload.approverId,
      organizationId: payload.organizationId,
      data: payload,
    });
  }

  @OnEvent('billing.quota.exceeded')
  async handleQuotaExceeded(payload: any): Promise<void> {
    await this.createCrossModuleNotification({
      eventType: 'billing.quota.exceeded',
      sourceModule: 'billing',
      title: 'Usage Quota Exceeded',
      message: `Your ${payload.resourceType} quota has been exceeded. Please upgrade your plan or contact support.`,
      priority: NotificationPriority.CRITICAL,
      userId: payload.userId,
      organizationId: payload.organizationId,
      data: payload,
    });
  }

  private async createCrossModuleNotification(data: {
    eventType: string;
    sourceModule: string;
    title: string;
    message: string;
    priority: NotificationPriority;
    userId: string;
    organizationId: string;
    data: any;
  }): Promise<void> {
    try {
      await this.createNotification(
        {
          title: data.title,
          message: data.message,
          type: NotificationType.IN_APP,
          priority: data.priority,
          eventType: data.eventType,
          sourceModule: data.sourceModule,
          userId: data.userId,
          data: data.data,
        },
        data.organizationId
      );
    } catch (error) {
      this.logger.error(
        `Failed to create cross-module notification: ${error.message}`,
        error.stack
      );
    }
  }
}
