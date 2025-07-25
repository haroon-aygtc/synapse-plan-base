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
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/interfaces';
import { ExecutionType } from '@database/entities';
import { AIProviderService } from './ai-provider.service';
import { ProviderHealthService } from './provider-health.service';
import { ProviderCostService } from './provider-cost.service';
import {
  CreateProviderDto,
  UpdateProviderDto,
  ProviderConfigDto,
  ProviderRoutingRuleDto,
} from './dto';

@ApiTags('ai-providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-providers')
export class AIProviderController {
  constructor(
    private readonly aiProviderService: AIProviderService,
    private readonly providerHealthService: ProviderHealthService,
    private readonly providerCostService: ProviderCostService,
  ) {}

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create AI provider configuration' })
  @ApiResponse({ status: 201, description: 'Provider created successfully' })
  async createProvider(
    @Body(ValidationPipe) createProviderDto: CreateProviderDto,
    @Request() req: any,
  ) {
    return this.aiProviderService.createProvider(
      createProviderDto,
      req.user.organizationId,
      req.user.sub,
    );
  }

  @Get()
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get all AI providers' })
  @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
  async getProviders(
    @Request() req: any,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.aiProviderService.getProviders(req.user.organizationId, {
      includeInactive,
    });
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available provider types' })
  @ApiResponse({ status: 200, description: 'Available providers retrieved' })
  async getAvailableProviders() {
    return this.aiProviderService.getAvailableProviders();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get provider health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved' })
  async getProviderHealth(@Request() req: any) {
    return this.providerHealthService.getOrganizationHealth(
      req.user.organizationId,
    );
  }

  @Get('costs')
  @ApiOperation({ summary: 'Get provider cost analytics' })
  @ApiResponse({ status: 200, description: 'Cost analytics retrieved' })
  async getProviderCosts(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.providerCostService.getCostAnalytics(req.user.organizationId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('routing-rules')
  @ApiOperation({ summary: 'Get provider routing rules' })
  @ApiResponse({ status: 200, description: 'Routing rules retrieved' })
  async getRoutingRules(@Request() req: any) {
    return this.aiProviderService.getRoutingRules(req.user.organizationId);
  }

  @Post('routing-rules')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create provider routing rule' })
  @ApiResponse({ status: 201, description: 'Routing rule created' })
  async createRoutingRule(
    @Body(ValidationPipe) routingRuleDto: ProviderRoutingRuleDto,
    @Request() req: any,
  ) {
    return this.aiProviderService.createRoutingRule(
      routingRuleDto,
      req.user.organizationId,
    );
  }

  @Get('usage-stats')
  @ApiOperation({ summary: 'Get provider usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage stats retrieved' })
  async getUsageStats(
    @Request() req: any,
    @Query('period') period: 'day' | 'week' | 'month' = 'week',
  ) {
    return this.aiProviderService.getUsageStats(
      req.user.organizationId,
      period,
    );
  }

  @Get('optimization-suggestions')
  @ApiOperation({ summary: 'Get provider optimization suggestions' })
  @ApiResponse({ status: 200, description: 'Suggestions retrieved' })
  async getOptimizationSuggestions(@Request() req: any) {
    return this.aiProviderService.getOptimizationSuggestions(
      req.user.organizationId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get AI provider by ID' })
  @ApiResponse({ status: 200, description: 'Provider retrieved successfully' })
  async getProvider(@Param('id') id: string, @Request() req: any) {
    return this.aiProviderService.getProvider(id, req.user.organizationId);
  }

  @Put(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update AI provider' })
  @ApiResponse({ status: 200, description: 'Provider updated successfully' })
  async updateProvider(
    @Param('id') id: string,
    @Body(ValidationPipe) updateProviderDto: UpdateProviderDto,
    @Request() req: any,
  ) {
    return this.aiProviderService.updateProvider(
      id,
      updateProviderDto,
      req.user.organizationId,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete AI provider' })
  @ApiResponse({ status: 200, description: 'Provider deleted successfully' })
  async deleteProvider(@Param('id') id: string, @Request() req: any) {
    return this.aiProviderService.deleteProvider(id, req.user.organizationId);
  }

  @Post(':id/test')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Test AI provider connection' })
  @ApiResponse({ status: 200, description: 'Provider test completed' })
  async testProvider(@Param('id') id: string, @Request() req: any) {
    return this.aiProviderService.testProvider(id, req.user.organizationId);
  }

  @Post(':id/rotate-key')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Rotate provider API key' })
  @ApiResponse({ status: 200, description: 'API key rotated successfully' })
  async rotateApiKey(
    @Param('id') id: string,
    @Body() body: { newApiKey: string },
    @Request() req: any,
  ) {
    return this.aiProviderService.rotateApiKey(
      id,
      body.newApiKey,
      req.user.organizationId,
    );
  }

  @Get(':id/metrics')
  @ApiOperation({ summary: 'Get provider performance metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getProviderMetrics(
    @Param('id') id: string,
    @Request() req: any,
    @Query('period') period: 'hour' | 'day' | 'week' | 'month' = 'day',
  ) {
    return this.aiProviderService.getProviderMetrics(
      id,
      req.user.organizationId,
      period,
    );
  }

  @Post('bulk-configure')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Bulk configure multiple providers' })
  @ApiResponse({ status: 200, description: 'Bulk configuration completed' })
  async bulkConfigureProviders(
    @Body() body: { providers: ProviderConfigDto[] },
    @Request() req: any,
  ) {
    return this.aiProviderService.bulkConfigureProviders(
      body.providers,
      req.user.organizationId,
      req.user.sub,
    );
  }

  @Post('ai/complete')
  @ApiOperation({ summary: 'Unified AI completion endpoint' })
  @ApiResponse({ status: 200, description: 'Completion executed successfully' })
  async executeCompletion(
    @Body()
    body: {
      messages: Array<{
        role: 'system' | 'user' | 'assistant' | 'tool';
        content: string;
        tool_calls?: any[];
      }>;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      tools?: any[];
      executionType: ExecutionType;
      resourceId: string;
      sessionId?: string;
      streamResponse?: boolean;
    },
    @Request() req: any,
  ) {
    return this.aiProviderService.executeCompletion(
      body,
      req.user.organizationId,
      req.user.sub,
    );
  }

  @Get('models')
  @ApiOperation({ summary: 'Get available models filtered by org policy' })
  @ApiResponse({ status: 200, description: 'Available models retrieved' })
  async getAvailableModels(@Request() req: any) {
    return this.aiProviderService.getAvailableModels(req.user.organizationId);
  }

  @Get('cost-alerts')
  @ApiOperation({ summary: 'Get cost alerts for organization' })
  @ApiResponse({ status: 200, description: 'Cost alerts retrieved' })
  async getCostAlerts(
    @Request() req: any,
    @Query('dailyLimit') dailyLimit?: number,
    @Query('weeklyLimit') weeklyLimit?: number,
    @Query('monthlyLimit') monthlyLimit?: number,
  ) {
    return this.providerCostService.getCostAlerts(req.user.organizationId, {
      dailyLimit,
      weeklyLimit,
      monthlyLimit,
    });
  }

  @Get('cost-comparison')
  @ApiOperation({ summary: 'Get provider cost comparison' })
  @ApiResponse({ status: 200, description: 'Cost comparison retrieved' })
  async getProviderCostComparison(
    @Request() req: any,
    @Query('model') model: string,
    @Query('executionType')
    executionType: 'agent' | 'tool' | 'workflow' | 'knowledge',
    @Query('period') period: 'day' | 'week' | 'month' = 'week',
  ) {
    return this.providerCostService.getProviderCostComparison(
      req.user.organizationId,
      model,
      executionType as any,
      period,
    );
  }
}
