import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '@libs/shared/guards/roles.guard';
import { WidgetAnalyticsService } from './widget-analytics.service';
import {
  TrackEventDto,
  GetAnalyticsDto,
  GetConversionFunnelDto,
  GetUserJourneyDto,
  GetPerformanceMetricsDto,
} from './dto';

@ApiTags('widget-analytics')
@Controller('widgets/:widgetId/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WidgetAnalyticsController {
  constructor(
    private readonly widgetAnalyticsService: WidgetAnalyticsService,
  ) {}

  @Post('track')
  @ApiOperation({ summary: 'Track widget analytics event' })
  @ApiResponse({ status: 201, description: 'Event tracked successfully' })
  async trackEvent(
    @Param('widgetId') widgetId: string,
    @Body() trackEventDto: TrackEventDto,
    @Request() req: any,
  ) {
    try {
      const result = await this.widgetAnalyticsService.trackEvent(
        widgetId,
        trackEventDto,
        req.user.organizationId,
      );
      return {
        success: true,
        data: result,
        message: 'Event tracked successfully',
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'EVENT_TRACKING_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get widget analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics overview retrieved' })
  async getOverview(
    @Param('widgetId') widgetId: string,
    @Query() getAnalyticsDto: GetAnalyticsDto,
    @Request() req: any,
  ) {
    try {
      const analytics = await this.widgetAnalyticsService.getOverview(
        widgetId,
        getAnalyticsDto,
        req.user.organizationId,
      );
      return {
        success: true,
        data: analytics,
        message: 'Analytics overview retrieved successfully',
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'ANALYTICS_RETRIEVAL_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('real-time')
  @ApiOperation({ summary: 'Get real-time analytics data' })
  @ApiResponse({ status: 200, description: 'Real-time data retrieved' })
  async getRealTimeData(
    @Param('widgetId') widgetId: string,
    @Request() req: any,
  ) {
    try {
      const realTimeData = await this.widgetAnalyticsService.getRealTimeData(
        widgetId,
        req.user.organizationId,
      );
      return {
        success: true,
        data: realTimeData,
        message: 'Real-time data retrieved successfully',
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'REAL_TIME_DATA_RETRIEVAL_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('conversion-funnel')
  @ApiOperation({ summary: 'Get conversion funnel analysis' })
  @ApiResponse({ status: 200, description: 'Conversion funnel retrieved' })
  async getConversionFunnel(
    @Param('widgetId') widgetId: string,
    @Query() getConversionFunnelDto: GetConversionFunnelDto,
    @Request() req: any,
  ) {
    try {
      const funnel = await this.widgetAnalyticsService.getConversionFunnel(
        widgetId,
        getConversionFunnelDto,
        req.user.organizationId,
      );
      return {
        success: true,
        data: funnel,
        message: 'Conversion funnel retrieved successfully',
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'CONVERSION_FUNNEL_RETRIEVAL_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('user-journey')
  @ApiOperation({ summary: 'Get user journey analysis' })
  @ApiResponse({ status: 200, description: 'User journey retrieved' })
  async getUserJourney(
    @Param('widgetId') widgetId: string,
    @Query() getUserJourneyDto: GetUserJourneyDto,
    @Request() req: any,
  ) {
    try {
      const journey = await this.widgetAnalyticsService.getUserJourney(
        widgetId,
        getUserJourneyDto,
        req.user.organizationId,
      );
      return {
        success: true,
        data: journey,
        message: 'User journey retrieved successfully',
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'USER_JOURNEY_RETRIEVAL_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved' })
  async getPerformanceMetrics(
    @Param('widgetId') widgetId: string,
    @Query() getPerformanceMetricsDto: GetPerformanceMetricsDto,
    @Request() req: any,
  ) {
    try {
      const metrics = await this.widgetAnalyticsService.getPerformanceMetrics(
        widgetId,
        getPerformanceMetricsDto,
        req.user.organizationId,
      );
      return {
        success: true,
        data: metrics,
        message: 'Performance metrics retrieved successfully',
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'PERFORMANCE_METRICS_RETRIEVAL_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('cross-domain')
  @ApiOperation({ summary: 'Get cross-domain analytics aggregation' })
  @ApiResponse({ status: 200, description: 'Cross-domain analytics retrieved' })
  async getCrossDomainAnalytics(
    @Param('widgetId') widgetId: string,
    @Query() getAnalyticsDto: GetAnalyticsDto,
    @Request() req: any,
  ) {
    try {
      const analytics = await this.widgetAnalyticsService.getCrossDomainAnalytics(
        widgetId,
        getAnalyticsDto,
        req.user.organizationId,
      );
      return {
        success: true,
        data: analytics,
        message: 'Cross-domain analytics retrieved successfully',
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'CROSS_DOMAIN_ANALYTICS_RETRIEVAL_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('heatmap')
  @ApiOperation({ summary: 'Get interaction heatmap data' })
  @ApiResponse({ status: 200, description: 'Heatmap data retrieved' })
  async getHeatmapData(
    @Param('widgetId') widgetId: string,
    @Query() getAnalyticsDto: GetAnalyticsDto,
    @Request() req: any,
  ) {
    try {
      const heatmap = await this.widgetAnalyticsService.getHeatmapData(
        widgetId,
        getAnalyticsDto,
        req.user.organizationId,
      );
      return {
        success: true,
        data: heatmap,
        message: 'Heatmap data retrieved successfully',
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'HEATMAP_DATA_RETRIEVAL_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('retention')
  @ApiOperation({ summary: 'Get user retention analysis' })
  @ApiResponse({ status: 200, description: 'Retention analysis retrieved' })
  async getRetentionAnalysis(
    @Param('widgetId') widgetId: string,
    @Query() getAnalyticsDto: GetAnalyticsDto,
    @Request() req: any,
  ) {
    try {
      const retention = await this.widgetAnalyticsService.getRetentionAnalysis(
        widgetId,
        getAnalyticsDto,
        req.user.organizationId,
      );
      return {
        success: true,
        data: retention,
        message: 'Retention analysis retrieved successfully',
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'RETENTION_ANALYSIS_RETRIEVAL_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}