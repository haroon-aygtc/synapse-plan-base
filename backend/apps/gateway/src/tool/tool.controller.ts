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
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/enums';
import { ToolService } from './tool.service';
import { ToolExecutionEngine } from './tool-execution.engine';
import { CreateToolDto, UpdateToolDto, ExecuteToolDto, TestToolDto } from './dto';

@ApiTags('tools')
@Controller('tools')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ToolController {
  constructor(
    private readonly toolService: ToolService,
    private readonly toolExecutionEngine: ToolExecutionEngine
  ) {}

  @Post()
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new tool' })
  @ApiResponse({ status: 201, description: 'Tool created successfully' })
  async create(@Body(ValidationPipe) createToolDto: CreateToolDto) {
    return this.toolService.create(createToolDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all tools' })
  @ApiResponse({ status: 200, description: 'Tools retrieved successfully' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean
  ) {
    return this.toolService.findAll({
      page,
      limit,
      search,
      category,
      isActive,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tool by ID' })
  @ApiResponse({ status: 200, description: 'Tool retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.toolService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update tool' })
  @ApiResponse({ status: 200, description: 'Tool updated successfully' })
  async update(@Param('id') id: string, @Body(ValidationPipe) updateToolDto: UpdateToolDto) {
    return this.toolService.update(id, updateToolDto);
  }

  @Delete(':id')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete tool' })
  @ApiResponse({ status: 200, description: 'Tool deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.toolService.remove(id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute tool' })
  @ApiResponse({ status: 200, description: 'Tool executed successfully' })
  async execute(@Param('id') id: string, @Body(ValidationPipe) executeToolDto: ExecuteToolDto) {
    return this.toolExecutionEngine.execute(id, executeToolDto);
  }

  @Post(':id/test')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Test tool' })
  @ApiResponse({ status: 200, description: 'Tool tested successfully' })
  async test(@Param('id') id: string, @Body(ValidationPipe) testToolDto: TestToolDto) {
    return this.toolService.test(id, testToolDto);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get tool execution history' })
  @ApiResponse({
    status: 200,
    description: 'Executions retrieved successfully',
  })
  async getExecutions(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string
  ) {
    return this.toolService.getExecutions(id, { page, limit, status });
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get tool analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.toolService.getAnalytics(id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Post('/validate-schema')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Validate tool schema' })
  @ApiResponse({ status: 200, description: 'Schema validated successfully' })
  async validateSchema(@Body() schema: any) {
    return this.toolService.validateSchema(schema);
  }

  @Get('/categories')
  @ApiOperation({ summary: 'Get tool categories' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  async getCategories() {
    return this.toolService.getCategories();
  }

  @Get('/search')
  @ApiOperation({ summary: 'Search tools' })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  async search(
    @Query('q') query: string,
    @Query('category') category?: string,
    @Query('tags') tags?: string,
    @Query('limit') limit: number = 20
  ) {
    return this.toolService.search(query, {
      category,
      tags: tags ? tags.split(',') : undefined,
      limit,
    });
  }

  @Get(':id/connections')
  @ApiOperation({
    summary: 'Get tool connections (agents and workflows using this tool)',
  })
  @ApiResponse({
    status: 200,
    description: 'Connections retrieved successfully',
  })
  async getConnections(@Param('id') id: string) {
    return this.toolService.getToolConnections(id);
  }

  @Get(':id/performance')
  @ApiOperation({ summary: 'Get tool performance metrics' })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
  })
  async getPerformanceMetrics(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const period = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date(),
    };
    return this.toolService.getToolPerformanceMetrics(id, period);
  }

  @Get('/marketplace')
  @ApiOperation({ summary: 'Get marketplace tools' })
  @ApiResponse({
    status: 200,
    description: 'Marketplace tools retrieved successfully',
  })
  async getMarketplaceTools(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'rating' | 'downloads' | 'name' | 'createdAt',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC'
  ) {
    return this.toolService.getMarketplaceTools({
      page,
      limit,
      category,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Post('/marketplace/:id/install')
  @ApiOperation({ summary: 'Install marketplace tool' })
  @ApiResponse({ status: 201, description: 'Tool installed successfully' })
  async installMarketplaceTool(
    @Param('id') toolId: string,
    @Body() installData: { organizationId: string; userId: string }
  ) {
    return this.toolService.installMarketplaceTool(
      toolId,
      installData.organizationId,
      installData.userId
    );
  }

  @Get('/templates')
  @ApiOperation({ summary: 'Get tool templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates() {
    return this.toolService.generateToolTemplates();
  }

  @Post('/detect-schema')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Detect API schema from endpoint' })
  @ApiResponse({ status: 200, description: 'Schema detected successfully' })
  async detectSchema(
    @Body()
    detectData: {
      endpoint: string;
      method: string;
      headers?: Record<string, string>;
    }
  ) {
    return this.toolService.detectAPIPatterns(
      detectData.endpoint,
      detectData.method,
      detectData.headers
    );
  }

  @Post('/ai-configure')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'AI-powered tool configuration from natural language',
  })
  @ApiResponse({
    status: 200,
    description: 'Tool configuration generated successfully',
  })
  async aiConfigure(
    @Body()
    configData: {
      description: string;
      apiUrl?: string;
      serviceType?: string;
    }
  ) {
    return this.toolService.generateAIConfiguration(
      configData.description,
      configData.apiUrl,
      configData.serviceType
    );
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Check tool health and connectivity' })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  async checkHealth(@Param('id') id: string) {
    return this.toolService.checkToolHealth(id);
  }

  @Get(':id/cost-analysis')
  @ApiOperation({
    summary: 'Get tool cost analysis and optimization recommendations',
  })
  @ApiResponse({
    status: 200,
    description: 'Cost analysis retrieved successfully',
  })
  async getCostAnalysis(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.toolService.getCostAnalysis(id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get(':id/agent-connections')
  @ApiOperation({ summary: 'Get agents connected to this tool' })
  @ApiResponse({
    status: 200,
    description: 'Agent connections retrieved successfully',
  })
  async getAgentConnections(@Param('id') id: string) {
    return this.toolService.getAgentConnections(id);
  }

  @Get(':id/workflow-connections')
  @ApiOperation({ summary: 'Get workflows connected to this tool' })
  @ApiResponse({
    status: 200,
    description: 'Workflow connections retrieved successfully',
  })
  async getWorkflowConnections(@Param('id') id: string) {
    return this.toolService.getWorkflowConnections(id);
  }

  @Get(':id/usage-analytics')
  @ApiOperation({ summary: 'Get detailed usage analytics for tool' })
  @ApiResponse({
    status: 200,
    description: 'Usage analytics retrieved successfully',
  })
  async getUsageAnalytics(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month'
  ) {
    return this.toolService.getUsageAnalytics(id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      groupBy: groupBy || 'day',
    });
  }

  @Post(':id/test-in-context')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Test tool within workflow execution context' })
  @ApiResponse({ status: 200, description: 'Context test completed' })
  async testInContext(
    @Param('id') id: string,
    @Body()
    testData: {
      workflowId?: string;
      agentId?: string;
      context: Record<string, any>;
      parameters: Record<string, any>;
    }
  ) {
    return this.toolService.testInContext(id, testData);
  }

  @Get('/dashboard-metrics')
  @ApiOperation({ summary: 'Get dashboard metrics for all tools' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics retrieved successfully',
  })
  async getDashboardMetrics(
    @Query('organizationId') organizationId: string,
    @Query('timeRange') timeRange?: '24h' | '7d' | '30d' | '90d'
  ) {
    return this.toolService.getDashboardMetrics(organizationId, timeRange || '30d');
  }

  @Get(':id/health-monitoring')
  @ApiOperation({ summary: 'Get health monitoring data with alerts' })
  @ApiResponse({
    status: 200,
    description: 'Health monitoring data retrieved successfully',
  })
  async getHealthMonitoring(@Param('id') id: string) {
    return this.toolService.getHealthMonitoring(id);
  }

  @Post(':id/alerts/configure')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Configure health monitoring alerts' })
  @ApiResponse({ status: 200, description: 'Alerts configured successfully' })
  async configureAlerts(
    @Param('id') id: string,
    @Body()
    alertConfig: {
      errorRateThreshold: number;
      responseTimeThreshold: number;
      availabilityThreshold: number;
      notificationChannels: string[];
    }
  ) {
    return this.toolService.configureHealthAlerts(id, alertConfig);
  }
}
