import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/interfaces';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  private handleError(error: unknown): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new HttpException(
      {
        success: false,
        message: errorMessage,
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'yesterday', 'week', 'month'],
  })
  async getDashboardStats(@Request() req: any, @Query('period') period: string = 'today') {
    try {
      const stats = await this.analyticsService.getDashboardStats(req.user.organizationId, period);
      return {
        success: true,
        data: stats,
        message: 'Dashboard statistics retrieved successfully',
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('dashboard/activities')
  @ApiOperation({ summary: 'Get dashboard activities' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard activities retrieved successfully',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'yesterday', 'week', 'month'],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getDashboardActivities(
    @Request() req: any,
    @Query('period') period: string = 'today',
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10
  ) {
    try {
      const activities = await this.analyticsService.getActivities(
        req.user.organizationId,
        period,
        limit
      );
      return {
        success: true,
        data: activities,
        message: 'Dashboard activities retrieved successfully',
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('detailed')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get detailed analytics' })
  @ApiResponse({
    status: 200,
    description: 'Detailed analytics retrieved successfully',
  })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async getDetailedAnalytics(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    try {
      const analytics = await this.analyticsService.getAnalytics(
        req.user.organizationId,
        new Date(startDate),
        new Date(endDate)
      );
      return {
        success: true,
        data: analytics,
        message: 'Detailed analytics retrieved successfully',
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('performance')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'yesterday', 'week', 'month'],
  })
  async getPerformanceMetrics(@Request() req: any, @Query('period') period: string = 'today') {
    try {
      const { startDate, endDate } = this.getPeriodDates(period);
      const analytics = await this.analyticsService.getAnalytics(
        req.user.organizationId,
        startDate,
        endDate
      );

      return {
        success: true,
        data: analytics.performanceMetrics,
        message: 'Performance metrics retrieved successfully',
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('costs')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get cost analysis' })
  @ApiResponse({
    status: 200,
    description: 'Cost analysis retrieved successfully',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'yesterday', 'week', 'month'],
  })
  async getCostAnalysis(@Request() req: any, @Query('period') period: string = 'month') {
    try {
      const { startDate, endDate } = this.getPeriodDates(period);
      const analytics = await this.analyticsService.getAnalytics(
        req.user.organizationId,
        startDate,
        endDate
      );

      return {
        success: true,
        data: analytics.costAnalysis,
        message: 'Cost analysis retrieved successfully',
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('engagement')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user engagement metrics' })
  @ApiResponse({
    status: 200,
    description: 'User engagement metrics retrieved successfully',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'yesterday', 'week', 'month'],
  })
  async getUserEngagement(@Request() req: any, @Query('period') period: string = 'week') {
    try {
      const { startDate, endDate } = this.getPeriodDates(period);
      const analytics = await this.analyticsService.getAnalytics(
        req.user.organizationId,
        startDate,
        endDate
      );

      return {
        success: true,
        data: analytics.userEngagement,
        message: 'User engagement metrics retrieved successfully',
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('trends')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get execution trends' })
  @ApiResponse({
    status: 200,
    description: 'Execution trends retrieved successfully',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'yesterday', 'week', 'month'],
  })
  async getExecutionTrends(@Request() req: any, @Query('period') period: string = 'week') {
    try {
      const { startDate, endDate } = this.getPeriodDates(period);
      const analytics = await this.analyticsService.getAnalytics(
        req.user.organizationId,
        startDate,
        endDate
      );

      return {
        success: true,
        data: analytics.executionTrends,
        message: 'Execution trends retrieved successfully',
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  private getPeriodDates(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    return { startDate, endDate };
  }
}
