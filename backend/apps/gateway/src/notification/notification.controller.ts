import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpStatus,
    HttpException,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '@shared/decorators/roles.decorator';
  import { NotificationService } from './notification.service';
  import { NotificationSchedulerService } from './notification-scheduler.service';
  import {
    CreateNotificationDto,
    UpdateNotificationDto,
    CreateNotificationTemplateDto,
    UpdateNotificationTemplateDto,
    CreateNotificationPreferenceDto,
    UpdateNotificationPreferenceDto,
  } from './dto';
  import { NotificationType, NotificationPriority } from '@shared/enums';
import { UserRole } from '@shared/interfaces';
  
  @ApiTags('notifications')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Controller('notifications')
  export class NotificationController {
    constructor(
      private readonly notificationService: NotificationService,
      private readonly schedulerService: NotificationSchedulerService,
    ) {}
  
    // Notification CRUD
    @Post()
    @ApiOperation({ summary: 'Create a new notification' })
    @ApiResponse({ status: 201, description: 'Notification created successfully' })
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DEVELOPER)
    async createNotification(
      @Body() createNotificationDto: CreateNotificationDto,
      @Request() req: any,
    ) {
      try {
        const notification = await this.notificationService.createNotification({
          ...createNotificationDto,
          userId: createNotificationDto.userId || req.user.id,
          organizationId: req.user.organizationId,
        });
  
        return {
          success: true,
          data: notification,
          message: 'Notification created successfully',
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    @Get()
    @ApiOperation({ summary: 'Get notifications for current user' })
    @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
    async getNotifications(
      @Request() req: any,
      @Query('page') page: number = 1,
      @Query('limit') limit: number = 20,
      @Query('type') type?: NotificationType,
      @Query('priority') priority?: NotificationPriority,
      @Query('unreadOnly') unreadOnly?: boolean,
    ) {
      try {
        const result = await this.notificationService.getNotificationsForUser(
          req.user.id,
          req.user.organizationId,
          {
            page: Math.max(1, page),
            limit: Math.min(100, Math.max(1, limit)),
            type,
            priority,
            unreadOnly: unreadOnly === true,
          },
        );
  
        return {
          success: true,
          data: result.notifications,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
          message: 'Notifications retrieved successfully',
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Get('stats')
    @ApiOperation({ summary: 'Get notification statistics' })
    @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
    async getNotificationStats(@Request() req: any) {
      try {
        const stats = await this.notificationService.getNotificationStats(
          req.user.id,
          req.user.organizationId,
        );
  
        return {
          success: true,
          data: stats,
          message: 'Statistics retrieved successfully',
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Put(':id/read')
    @ApiOperation({ summary: 'Mark notification as read' })
    @ApiResponse({ status: 200, description: 'Notification marked as read' })
    async markAsRead(@Param('id') id: string, @Request() req: any) {
      try {
        await this.notificationService.markAsRead(id, req.user.id);
  
        return {
          success: true,
          message: 'Notification marked as read',
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    @Put('read-all')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    @ApiResponse({ status: 200, description: 'All notifications marked as read' })
    async markAllAsRead(@Request() req: any) {
      try {
        const count = await this.notificationService.markAllAsRead(
          req.user.id,
          req.user.organizationId,
        );
  
        return {
          success: true,
          data: { markedCount: count },
          message: `${count} notifications marked as read`,
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a notification' })
    @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
    async deleteNotification(@Param('id') id: string, @Request() req: any) {
      try {
        await this.notificationService.deleteNotification(id, req.user.organizationId);
  
        return {
          success: true,
          message: 'Notification deleted successfully',
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    // Template Management
    @Post('templates')
    @ApiOperation({ summary: 'Create notification template' })
    @ApiResponse({ status: 201, description: 'Template created successfully' })
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
    async createTemplate(
      @Body() createTemplateDto: CreateNotificationTemplateDto,
      @Request() req: any,
    ) {
      try {
        const template = await this.notificationService.createTemplate({
          ...createTemplateDto,
          organizationId: req.user.organizationId,
          createdBy: req.user.id,
        });
  
        return {
          success: true,
          data: template,
          message: 'Template created successfully',
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    @Get('templates')
    @ApiOperation({ summary: 'Get notification templates' })
    @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
    async getTemplates(
      @Request() req: any,
      @Query('category') category?: string,
      @Query('type') type?: NotificationType,
    ) {
      try {
        const templates = await this.notificationService.getTemplates(
          req.user.organizationId,
          { category, type },
        );
  
        return {
          success: true,
          data: templates,
          message: 'Templates retrieved successfully',
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Put('templates/:id')
    @ApiOperation({ summary: 'Update notification template' })
    @ApiResponse({ status: 200, description: 'Template updated successfully' })
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
    async updateTemplate(
      @Param('id') id: string,
      @Body() updateTemplateDto: UpdateNotificationTemplateDto,
      @Request() req: any,
    ) {
      try {
        const template = await this.notificationService.updateTemplate(
          id,
          {
            ...updateTemplateDto,
            updatedBy: req.user.id,
          },
          req.user.organizationId,
        );
  
        return {
          success: true,
          data: template,
          message: 'Template updated successfully',
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    // Preference Management
    @Post('preferences')
    @ApiOperation({ summary: 'Create or update notification preference' })
    @ApiResponse({ status: 201, description: 'Preference saved successfully' })
    async createOrUpdatePreference(
      @Body() preferenceDto: CreateNotificationPreferenceDto,
      @Request() req: any,
    ) {
      try {
        const preference = await this.notificationService.createOrUpdatePreference({
          ...preferenceDto,
          userId: req.user.id,
          organizationId: req.user.organizationId,
        });
  
        return {
          success: true,
          data: preference,
          message: 'Preference saved successfully',
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    @Get('preferences')
    @ApiOperation({ summary: 'Get user notification preferences' })
    @ApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
    async getPreferences(@Request() req: any) {
      try {
        const preferences = await this.notificationService.getPreferences(
          req.user.id,
          req.user.organizationId,
        );
  
        return {
          success: true,
          data: preferences,
          message: 'Preferences retrieved successfully',
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Put('preferences/:id')
    @ApiOperation({ summary: 'Update notification preference' })
    @ApiResponse({ status: 200, description: 'Preference updated successfully' })
    async updatePreference(
      @Param('id') id: string,
      @Body() updatePreferenceDto: UpdateNotificationPreferenceDto,
      @Request() req: any,
    ) {
      try {
        const preference = await this.notificationService.updatePreference(
          id,
          updatePreferenceDto,
          req.user.id,
        );
  
        return {
          success: true,
          data: preference,
          message: 'Preference updated successfully',
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  
    // Admin endpoints
    @Get('admin/delivery-stats')
    @ApiOperation({ summary: 'Get delivery statistics (Admin only)' })
    @ApiResponse({ status: 200, description: 'Delivery stats retrieved successfully' })
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
    async getDeliveryStats(@Request() req: any) {
      try {
        const stats = await this.notificationService.getDeliveryStats(
          req.user.organizationId,
        );
  
        return {
          success: true,
          data: stats,
          message: 'Delivery statistics retrieved successfully',
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Get('admin/batching-stats')
    @ApiOperation({ summary: 'Get batching statistics (Admin only)' })
    @ApiResponse({ status: 200, description: 'Batching stats retrieved successfully' })
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
    async getBatchingStats() {
      try {
        const stats = await this.schedulerService.getBatchingStats();
  
        return {
          success: true,
          data: stats,
          message: 'Batching statistics retrieved successfully',
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    @Post('admin/flush-batches')
    @ApiOperation({ summary: 'Flush all batched notifications (Admin only)' })
    @ApiResponse({ status: 200, description: 'Batches flushed successfully' })
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)
    async flushBatches() {
      try {
        await this.schedulerService.flushAllBatches();
  
        return {
          success: true,
          message: 'All batched notifications flushed successfully',
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    // Test endpoint for development
    @Post('test')
    @ApiOperation({ summary: 'Send test notification' })
    @ApiResponse({ status: 200, description: 'Test notification sent' })
    @Roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.DEVELOPER)
    async sendTestNotification(@Request() req: any) {
      try {
        const notification = await this.notificationService.createNotification({
          title: 'Test Notification',
          message: 'This is a test notification from the SynapseAI platform.',
          type: NotificationType.IN_APP,
          priority: NotificationPriority.MEDIUM,
          userId: req.user.id,
          organizationId: req.user.organizationId,
          eventType: 'test',
          sourceModule: 'notification-system',
        });
  
        return {
          success: true,
          data: notification,
          message: 'Test notification sent successfully',
        };
      } catch (error) {
        throw new HttpException(
          {
            success: false,
            message: error.message,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }
  