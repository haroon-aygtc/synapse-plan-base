import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Widget } from '@database/entities/widget.entity';
import { WidgetExecution } from '@database/entities/widget-execution.entity';
import { WidgetAnalytics } from '@database/entities/widget-analytics.entity';
import { Agent } from '@database/entities/agent.entity';
import { Tool } from '@database/entities/tool.entity';
import { Workflow } from '@database/entities/workflow.entity';
import { User } from '@database/entities/user.entity';
import { Organization } from '@database/entities/organization.entity';
import { Session } from '@database/entities/session.entity';
import {
  CreateWidgetDto,
  UpdateWidgetDto,
  DeployWidgetDto,
  GenerateEmbedCodeDto,
  TestWidgetDto,
  PreviewWidgetDto,
  CloneWidgetDto,
  PublishTemplateDto,
} from './dto';
import { AgentService } from '../agent/agent.service';
import { ToolService } from '../tool/tool.service';
import { WorkflowService } from '../workflow/workflow.service';
import { SessionService } from '../session/session.service';
import { WebsocketService } from '../websocket/websocket.service';
import {
  WidgetConfiguration,
  WidgetDeploymentInfo,
  WidgetAnalyticsData,
} from '@libs/shared/interfaces/widget.interface';

@Injectable()
export class WidgetService {
  constructor(
    @InjectRepository(Widget)
    private widgetRepository: Repository<Widget>,
    @InjectRepository(WidgetExecution)
    private widgetExecutionRepository: Repository<WidgetExecution>,
    @InjectRepository(WidgetAnalytics)
    private widgetAnalyticsRepository: Repository<WidgetAnalytics>,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    @InjectRepository(Tool)
    private toolRepository: Repository<Tool>,
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectQueue('widget-processing')
    private widgetQueue: Queue,
    private agentService: AgentService,
    private toolService: ToolService,
    private workflowService: WorkflowService,
    private sessionService: SessionService,
    private websocketService: WebsocketService,
  ) {}

  async create(
    createWidgetData: CreateWidgetDto & {
      userId: string;
      organizationId: string;
    },
  ): Promise<Widget> {
    // Validate source exists
    await this.validateSource(createWidgetData.sourceId, createWidgetData.type);

    // Create default configuration if not provided
    const configuration =
      createWidgetData.configuration ||
      this.createDefaultConfiguration(createWidgetData.type);

    const widget = this.widgetRepository.create({
      name: createWidgetData.name,
      description: createWidgetData.description,
      type: createWidgetData.type,
      sourceId: createWidgetData.sourceId,
      sourceType: createWidgetData.type,
      configuration,
      isActive: createWidgetData.isActive ?? true,
      userId: createWidgetData.userId,
      organizationId: createWidgetData.organizationId,
      version: createWidgetData.version || '1.0.0',
      metadata: createWidgetData.metadata || {},
      analyticsData: {
        views: 0,
        interactions: 0,
        conversions: 0,
        averageSessionDuration: 0,
        bounceRate: 0,
        lastAccessed: new Date(),
        topPages: [],
        deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
        browserBreakdown: {},
        geographicData: [],
      },
    });

    const savedWidget = await this.widgetRepository.save(widget);

    // Emit widget created event
    this.websocketService.emitToOrganization(
      createWidgetData.organizationId,
      'widget:created',
      savedWidget,
    );

    return savedWidget;
  }

  async findAll(options: {
    organizationId: string;
    page: number;
    limit: number;
    search?: string;
    type?: 'agent' | 'tool' | 'workflow';
    isActive?: boolean;
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
  }) {
    const {
      organizationId,
      page,
      limit,
      search,
      type,
      isActive,
      sortBy,
      sortOrder,
    } = options;

    const queryBuilder = this.widgetRepository
      .createQueryBuilder('widget')
      .leftJoinAndSelect('widget.user', 'user')
      .where('widget.organizationId = :organizationId', { organizationId });

    if (search) {
      queryBuilder.andWhere(
        '(widget.name ILIKE :search OR widget.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (type) {
      queryBuilder.andWhere('widget.type = :type', { type });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('widget.isActive = :isActive', { isActive });
    }

    // Add sorting
    const validSortFields = [
      'name',
      'createdAt',
      'updatedAt',
      'usageCount',
      'templateRating',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`widget.${sortField}`, sortOrder);

    // Add pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string): Promise<Widget> {
    const widget = await this.widgetRepository.findOne({
      where: { id, organizationId },
      relations: ['user', 'organization'],
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    return widget;
  }

  async update(
    id: string,
    updateWidgetDto: UpdateWidgetDto,
    organizationId: string,
  ): Promise<Widget> {
    const widget = await this.findOne(id, organizationId);

    // Merge configuration if provided
    if (updateWidgetDto.configuration) {
      widget.configuration = {
        ...widget.configuration,
        ...updateWidgetDto.configuration,
      };
    }

    Object.assign(widget, {
      ...updateWidgetDto,
      updatedAt: new Date(),
    });

    const updatedWidget = await this.widgetRepository.save(widget);

    // Emit widget updated event
    this.websocketService.emitToOrganization(
      organizationId,
      'widget:updated',
      updatedWidget,
    );

    return updatedWidget;
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const widget = await this.findOne(id, organizationId);

    // If deployed, undeploy first
    if (widget.isDeployed) {
      await this.undeploy(id, organizationId);
    }

    await this.widgetRepository.remove(widget);

    // Emit widget deleted event
    this.websocketService.emitToOrganization(organizationId, 'widget:deleted', {
      id,
    });
  }

  async deploy(
    id: string,
    deployOptions: DeployWidgetDto,
    organizationId: string,
  ) {
    const widget = await this.findOne(id, organizationId);

    if (!widget.isActive) {
      throw new BadRequestException('Cannot deploy inactive widget');
    }

    const baseUrl =
      process.env.WIDGET_BASE_URL || 'https://widgets.synapseai.com';
    const environment = deployOptions.environment || 'production';
    const customDomain = deployOptions.customDomain;
    const enableAnalytics = deployOptions.enableAnalytics ?? true;
    const enableCaching = deployOptions.enableCaching ?? true;

    const deploymentInfo: WidgetDeploymentInfo = {
      environment,
      customDomain,
      enableAnalytics,
      enableCaching,
      deployedAt: new Date(),
      lastUpdated: new Date(),
      status: 'active',
      embedCode: {
        javascript: widget.generateEmbedCode('javascript'),
        iframe: widget.generateEmbedCode('iframe'),
        react: widget.generateEmbedCode('react'),
        vue: widget.generateEmbedCode('vue'),
        angular: widget.generateEmbedCode('angular'),
      },
      urls: {
        standalone: `${baseUrl}/widget/${widget.id}`,
        embed: `${baseUrl}/embed/${widget.id}`,
        api: `${baseUrl}/api/widgets/${widget.id}`,
      },
    };

    widget.isDeployed = true;
    widget.deploymentInfo = deploymentInfo;
    widget.updatedAt = new Date();

    const deployedWidget = await this.widgetRepository.save(widget);

    // Queue deployment tasks
    await this.widgetQueue.add('deploy-widget', {
      widgetId: widget.id,
      deploymentInfo,
    });

    // Emit deployment event
    this.websocketService.emitToOrganization(
      organizationId,
      'widget:deployed',
      deployedWidget,
    );

    return deploymentInfo;
  }

  async undeploy(id: string, organizationId: string) {
    const widget = await this.findOne(id, organizationId);

    if (!widget.isDeployed) {
      throw new BadRequestException('Widget is not deployed');
    }

    widget.isDeployed = false;
    widget.deploymentInfo = null;
    widget.updatedAt = new Date();

    await this.widgetRepository.save(widget);

    // Queue undeployment tasks
    await this.widgetQueue.add('undeploy-widget', {
      widgetId: widget.id,
    });

    // Emit undeployment event
    this.websocketService.emitToOrganization(
      organizationId,
      'widget:undeployed',
      { id, undeployedAt: new Date() },
    );

    return {
      success: true,
      undeployedAt: new Date(),
    };
  }

  async getDeployment(id: string, organizationId: string) {
    const widget = await this.findOne(id, organizationId);

    if (!widget.isDeployed || !widget.deploymentInfo) {
      throw new NotFoundException('Widget deployment not found');
    }

    return widget.deploymentInfo;
  }

  async generateEmbedCode(
    id: string,
    options: GenerateEmbedCodeDto,
    organizationId: string,
  ) {
    const widget = await this.findOne(id, organizationId);

    if (!widget.isDeployed) {
      throw new BadRequestException(
        'Widget must be deployed to generate embed code',
      );
    }

    const format = options.format || 'javascript';
    const code = widget.generateEmbedCode(format);

    const instructions = this.getEmbedInstructions(format, options);

    return {
      code,
      instructions,
      format,
      widgetId: widget.id,
      generatedAt: new Date(),
    };
  }

  async test(id: string, testOptions: TestWidgetDto, organizationId: string) {
    const widget = await this.findOne(id, organizationId);

    // Queue widget testing
    const testJob = await this.widgetQueue.add('test-widget', {
      widgetId: widget.id,
      testOptions: {
        browsers: testOptions.browsers || [
          'chrome',
          'firefox',
          'safari',
          'edge',
        ],
        devices: testOptions.devices || ['desktop', 'mobile', 'tablet'],
        checkAccessibility: testOptions.checkAccessibility ?? true,
        checkPerformance: testOptions.checkPerformance ?? true,
        checkSEO: testOptions.checkSEO ?? true,
      },
    });

    // Return test job ID for tracking
    return {
      testId: testJob.id,
      status: 'queued',
      estimatedDuration: '2-5 minutes',
      queuedAt: new Date(),
    };
  }

  async preview(
    id: string,
    previewOptions: PreviewWidgetDto,
    organizationId: string,
  ) {
    const widget = await this.findOne(id, organizationId);

    const previewId = `preview_${widget.id}_${Date.now()}`;
    const baseUrl =
      process.env.WIDGET_BASE_URL || 'https://widgets.synapseai.com';
    const previewUrl = `${baseUrl}/preview/${previewId}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store preview configuration temporarily
    await this.widgetQueue.add('create-preview', {
      previewId,
      widgetId: widget.id,
      configuration: {
        ...widget.configuration,
        ...previewOptions.theme,
      },
      device: previewOptions.device || 'desktop',
      mockData: previewOptions.mockData,
      expiresAt,
    });

    return {
      previewUrl,
      previewId,
      expiresAt,
      device: previewOptions.device || 'desktop',
    };
  }

  async clone(
    id: string,
    cloneData: CloneWidgetDto,
    userId: string,
    organizationId: string,
  ): Promise<Widget> {
    const originalWidget = await this.findOne(id, organizationId);

    const clonedWidget = this.widgetRepository.create({
      name: cloneData.name,
      description: `Cloned from ${originalWidget.name}`,
      type: originalWidget.type,
      sourceId: originalWidget.sourceId,
      sourceType: originalWidget.sourceType,
      configuration: {
        ...originalWidget.configuration,
        ...cloneData.configuration,
      },
      isActive: false, // Start as inactive
      userId,
      organizationId,
      version: '1.0.0',
      metadata: {
        ...originalWidget.metadata,
        clonedFrom: originalWidget.id,
        clonedAt: new Date(),
      },
      analyticsData: {
        views: 0,
        interactions: 0,
        conversions: 0,
        averageSessionDuration: 0,
        bounceRate: 0,
        lastAccessed: new Date(),
        topPages: [],
        deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
        browserBreakdown: {},
        geographicData: [],
      },
    });

    const savedWidget = await this.widgetRepository.save(clonedWidget);

    // Emit widget cloned event
    this.websocketService.emitToOrganization(organizationId, 'widget:cloned', {
      original: originalWidget,
      cloned: savedWidget,
    });

    return savedWidget;
  }

  async getAnalytics(
    id: string,
    period: { start: Date; end: Date },
    organizationId: string,
  ) {
    const widget = await this.findOne(id, organizationId);

    const analytics = await this.widgetAnalyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.widgetId = :widgetId', { widgetId: id })
      .andWhere('analytics.date >= :start', { start: period.start })
      .andWhere('analytics.date <= :end', { end: period.end })
      .orderBy('analytics.date', 'ASC')
      .getMany();

    // Aggregate analytics data
    const metrics = this.aggregateAnalytics(analytics);
    const trends = this.calculateTrends(analytics);
    const topPages = this.getTopPages(analytics);
    const deviceBreakdown = this.getDeviceBreakdown(analytics);
    const browserBreakdown = this.getBrowserBreakdown(analytics);
    const geographicData = this.getGeographicData(analytics);

    return {
      widgetId: id,
      period,
      metrics,
      trends,
      topPages,
      deviceBreakdown,
      browserBreakdown,
      geographicData,
    };
  }

  async exportAnalytics(
    id: string,
    period: { start: Date; end: Date },
    format: 'csv' | 'json' | 'xlsx',
    organizationId: string,
  ) {
    const analytics = await this.getAnalytics(id, period, organizationId);

    let data: string | Buffer;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'csv':
        data = this.convertToCSV(analytics);
        contentType = 'text/csv';
        filename = `widget-analytics-${id}-${Date.now()}.csv`;
        break;
      case 'json':
        data = JSON.stringify(analytics, null, 2);
        contentType = 'application/json';
        filename = `widget-analytics-${id}-${Date.now()}.json`;
        break;
      case 'xlsx':
        data = await this.convertToXLSX(analytics);
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `widget-analytics-${id}-${Date.now()}.xlsx`;
        break;
      default:
        throw new BadRequestException('Unsupported export format');
    }

    return {
      data,
      contentType,
      filename,
    };
  }

  async getTemplates(options: {
    page: number;
    limit: number;
    category?: string;
    type?: 'agent' | 'tool' | 'workflow';
    search?: string;
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
    organizationId: string;
  }) {
    const {
      page,
      limit,
      category,
      type,
      search,
      sortBy,
      sortOrder,
      organizationId,
    } = options;

    const queryBuilder = this.widgetRepository
      .createQueryBuilder('widget')
      .leftJoinAndSelect('widget.user', 'user')
      .where(
        '(widget.isTemplate = true AND (widget.isPublicTemplate = true OR widget.organizationId = :organizationId))',
        { organizationId },
      );

    if (search) {
      queryBuilder.andWhere(
        '(widget.name ILIKE :search OR widget.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (category) {
      queryBuilder.andWhere('widget.templateCategory = :category', {
        category,
      });
    }

    if (type) {
      queryBuilder.andWhere('widget.type = :type', { type });
    }

    // Add sorting
    const validSortFields = [
      'name',
      'templateRating',
      'templateDownloads',
      'createdAt',
    ];
    const sortField = validSortFields.includes(sortBy)
      ? sortBy
      : 'templateRating';
    queryBuilder.orderBy(`widget.${sortField}`, sortOrder);

    // Add pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTemplate(templateId: string): Promise<Widget> {
    const template = await this.widgetRepository.findOne({
      where: { id: templateId, isTemplate: true },
      relations: ['user'],
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async createFromTemplate(
    templateId: string,
    widgetData: {
      name: string;
      sourceId: string;
      configuration?: any;
      userId: string;
      organizationId: string;
    },
  ): Promise<Widget> {
    const template = await this.getTemplate(templateId);

    // Validate source exists
    await this.validateSource(widgetData.sourceId, template.type);

    const widget = this.widgetRepository.create({
      name: widgetData.name,
      description: `Created from template: ${template.name}`,
      type: template.type,
      sourceId: widgetData.sourceId,
      sourceType: template.type,
      configuration: {
        ...template.configuration,
        ...widgetData.configuration,
      },
      isActive: true,
      userId: widgetData.userId,
      organizationId: widgetData.organizationId,
      templateId: template.id,
      version: '1.0.0',
      metadata: {
        createdFromTemplate: template.id,
        templateName: template.name,
        createdAt: new Date(),
      },
      analyticsData: {
        views: 0,
        interactions: 0,
        conversions: 0,
        averageSessionDuration: 0,
        bounceRate: 0,
        lastAccessed: new Date(),
        topPages: [],
        deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
        browserBreakdown: {},
        geographicData: [],
      },
    });

    const savedWidget = await this.widgetRepository.save(widget);

    // Increment template downloads
    template.templateDownloads += 1;
    await this.widgetRepository.save(template);

    // Emit widget created from template event
    this.websocketService.emitToOrganization(
      widgetData.organizationId,
      'widget:created_from_template',
      { template, widget: savedWidget },
    );

    return savedWidget;
  }

  async publishAsTemplate(
    id: string,
    templateData: PublishTemplateDto,
    organizationId: string,
  ): Promise<Widget> {
    const widget = await this.findOne(id, organizationId);

    widget.isTemplate = true;
    widget.templateCategory = templateData.category;
    widget.templateTags = templateData.tags;
    widget.isPublicTemplate = templateData.isPublic ?? false;
    widget.templateRating = 0;
    widget.templateDownloads = 0;
    widget.updatedAt = new Date();

    // Update name and description for template
    widget.name = templateData.name;
    widget.description = templateData.description;

    const publishedTemplate = await this.widgetRepository.save(widget);

    // Emit template published event
    this.websocketService.emitToOrganization(
      organizationId,
      'widget:published_as_template',
      publishedTemplate,
    );

    return publishedTemplate;
  }

  async execute(
    id: string,
    executionData: {
      input: any;
      sessionId: string;
      context?: any;
    },
    userId?: string,
  ) {
    const widget = await this.widgetRepository.findOne({
      where: { id, isActive: true },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found or inactive');
    }

    if (!widget.isDeployed) {
      throw new BadRequestException('Widget is not deployed');
    }

    // Create execution record
    const execution = this.widgetExecutionRepository.create({
      widgetId: id,
      sessionId: executionData.sessionId,
      userId,
      status: 'pending',
      input: {
        type: 'message',
        content: executionData.input,
        metadata: executionData.context,
      },
      context: {
        userAgent: executionData.context?.userAgent || 'Unknown',
        ipAddress: executionData.context?.ipAddress || '0.0.0.0',
        sessionId: executionData.sessionId,
        deviceType: executionData.context?.deviceType || 'desktop',
        browserInfo: executionData.context?.browserInfo || {
          name: 'Unknown',
          version: '0.0',
        },
      },
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        apiCalls: 0,
        errorCount: 0,
        cacheHits: 0,
        cacheMisses: 0,
      },
    });

    const savedExecution = await this.widgetExecutionRepository.save(execution);

    try {
      // Execute based on widget type
      let result;
      switch (widget.type) {
        case 'agent':
          result = await this.executeAgent(
            widget.sourceId,
            executionData.input,
            executionData.sessionId,
          );
          break;
        case 'tool':
          result = await this.executeTool(
            widget.sourceId,
            executionData.input,
            executionData.sessionId,
          );
          break;
        case 'workflow':
          result = await this.executeWorkflow(
            widget.sourceId,
            executionData.input,
            executionData.sessionId,
          );
          break;
        default:
          throw new BadRequestException('Unsupported widget type');
      }

      // Update execution with result
      savedExecution.markAsCompleted(
        {
          type: 'response',
          content: result,
          metadata: { executedAt: new Date() },
        },
        {
          endTime: new Date(),
          tokensUsed: result.tokensUsed || 0,
          apiCalls: result.apiCalls || 1,
        },
      );

      await this.widgetExecutionRepository.save(savedExecution);

      // Update widget analytics
      widget.updateAnalytics({
        interactions: widget.analyticsData.interactions + 1,
      });
      await this.widgetRepository.save(widget);

      // Track analytics
      await this.trackAnalytics(
        widget.id,
        'interaction',
        executionData.context,
      );

      return {
        executionId: savedExecution.id,
        result: result.content || result,
        status: 'completed',
        tokensUsed: result.tokensUsed || 0,
        executionTime: savedExecution.executionTimeMs,
      };
    } catch (error) {
      // Update execution with error
      savedExecution.markAsFailed(error.message, { error: error.stack });
      await this.widgetExecutionRepository.save(savedExecution);

      // Track error analytics
      await this.trackAnalytics(
        widget.id,
        'error',
        executionData.context,
        error.message,
      );

      throw error;
    }
  }

  // Private helper methods

  private async validateSource(
    sourceId: string,
    type: 'agent' | 'tool' | 'workflow',
  ): Promise<void> {
    let source;
    switch (type) {
      case 'agent':
        source = await this.agentRepository.findOne({
          where: { id: sourceId },
        });
        break;
      case 'tool':
        source = await this.toolRepository.findOne({ where: { id: sourceId } });
        break;
      case 'workflow':
        source = await this.workflowRepository.findOne({
          where: { id: sourceId },
        });
        break;
    }

    if (!source) {
      throw new NotFoundException(`${type} with ID ${sourceId} not found`);
    }
  }

  private createDefaultConfiguration(
    type: 'agent' | 'tool' | 'workflow',
  ): WidgetConfiguration {
    return {
      theme: {
        primaryColor: '#3b82f6',
        secondaryColor: '#64748b',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        borderRadius: 8,
        fontSize: 14,
      },
      layout: {
        width: 400,
        height: 600,
        position: 'bottom-right',
        responsive: true,
      },
      behavior: {
        autoOpen: false,
        showWelcomeMessage: true,
        enableTypingIndicator: true,
        enableSoundNotifications: false,
      },
      branding: {
        showLogo: true,
        showPoweredBy: true,
      },
      security: {
        allowedDomains: [],
        requireAuth: false,
        rateLimiting: {
          enabled: true,
          requestsPerMinute: 60,
        },
      },
    };
  }

  private getEmbedInstructions(
    format: string,
    options: GenerateEmbedCodeDto,
  ): string {
    switch (format) {
      case 'javascript':
        return 'Copy and paste this code into your HTML page before the closing </body> tag.';
      case 'iframe':
        return 'Copy and paste this iframe code where you want the widget to appear on your page.';
      case 'react':
        return 'Install the @synapseai/react-widget package and use this component in your React app.';
      case 'vue':
        return 'Install the @synapseai/vue-widget package and use this component in your Vue app.';
      case 'angular':
        return 'Install the @synapseai/angular-widget package and use this component in your Angular app.';
      default:
        return 'Follow the integration guide for your platform.';
    }
  }

  private async executeAgent(agentId: string, input: any, sessionId: string) {
    return await this.agentService.execute({
      agentId,
      input,
      sessionId,
      context: { source: 'widget' },
    });
  }

  private async executeTool(toolId: string, input: any, sessionId: string) {
    return await this.toolService.execute({
      toolId,
      input,
      sessionId,
      context: { source: 'widget' },
    });
  }

  private async executeWorkflow(
    workflowId: string,
    input: any,
    sessionId: string,
  ) {
    return await this.workflowService.execute({
      workflowId,
      input,
      sessionId,
      context: { source: 'widget' },
    });
  }

  private async trackAnalytics(
    widgetId: string,
    eventType: 'view' | 'interaction' | 'conversion' | 'error',
    context?: any,
    errorMessage?: string,
  ) {
    const analyticsData = {
      widgetId,
      eventType,
      date: new Date(),
      sessionId: context?.sessionId || 'unknown',
      pageUrl: context?.pageUrl || 'unknown',
      userAgent: context?.userAgent || 'unknown',
      ipAddress: context?.ipAddress || '0.0.0.0',
      deviceType: context?.deviceType || 'desktop',
      browserName: context?.browserInfo?.name || 'unknown',
      browserVersion: context?.browserInfo?.version || '0.0',
      operatingSystem: context?.operatingSystem || 'unknown',
      country: context?.geolocation?.country,
      region: context?.geolocation?.region,
      city: context?.geolocation?.city,
      errorMessage,
      isUniqueVisitor: true, // This would be determined by more complex logic
      isReturningVisitor: false,
      isBounce: false,
      pageDepth: 1,
    };

    const analytics = this.widgetAnalyticsRepository.create(analyticsData);
    await this.widgetAnalyticsRepository.save(analytics);
  }

  private aggregateAnalytics(analytics: WidgetAnalytics[]) {
    const totalViews = analytics.filter((a) => a.eventType === 'view').length;
    const uniqueVisitors = new Set(analytics.map((a) => a.sessionId)).size;
    const interactions = analytics.filter(
      (a) => a.eventType === 'interaction'
    ).length;
    const conversions = analytics.filter(
      (a) => a.eventType === 'conversion'
    ).length;
    
    const totalDuration = analytics.reduce((sum, a) => {
      return sum + (a.sessionDuration || 0);
    }, 0);
    
    const averageSessionDuration = uniqueVisitors > 0 ? totalDuration / uniqueVisitors : 0;
    const bounceRate = uniqueVisitors > 0 ? 
      (analytics.filter(a => a.isBounce).length / uniqueVisitors) * 100 : 0;

    return {
      totalViews,
      uniqueVisitors,
      interactions,
      conversions,
      averageSessionDuration,
      bounceRate,
      conversionRate: totalViews > 0 ? (conversions / totalViews) * 100 : 0
    };
  }

  private calculateTrends(analytics: WidgetAnalytics[]) {
    const dailyData = new Map<string, { views: number; interactions: number; conversions: number }>();
    
    analytics.forEach(event => {
      const date = event.date.toISOString().split('T')[0];
      const existing = dailyData.get(date) || { views: 0, interactions: 0, conversions: 0 };
      
      if (event.eventType === 'view') existing.views++;
      else if (event.eventType === 'interaction') existing.interactions++;
      else if (event.eventType === 'conversion') existing.conversions++;
      
      dailyData.set(date, existing);
    });

    return Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      ...data
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  private getTopPages(analytics: WidgetAnalytics[]) {
    const pageData = new Map<string, { views: number; interactions: number }>();
    
    analytics.forEach(event => {
      const url = event.pageUrl || 'unknown';
      const existing = pageData.get(url) || { views: 0, interactions: 0 };
      
      if (event.eventType === 'view') existing.views++;
      else if (event.eventType === 'interaction') existing.interactions++;
      
      pageData.set(url, existing);
    });

    return Array.from(pageData.entries())
      .map(([url, data]) => ({ url, ...data }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }

  private getDeviceBreakdown(analytics: WidgetAnalytics[]) {
    const deviceData = { desktop: 0, mobile: 0, tablet: 0 };
    
    analytics.forEach(event => {
      const deviceType = event.deviceType || 'desktop';
      if (deviceType in deviceData) {
        deviceData[deviceType as keyof typeof deviceData]++;
      }
    });

    return deviceData;
  }

  private getBrowserBreakdown(analytics: WidgetAnalytics[]) {
    const browserData: Record<string, number> = {};
    
    analytics.forEach(event => {
      const browser = event.browserName || 'Unknown';
      browserData[browser] = (browserData[browser] || 0) + 1;
    });

    return browserData;
  }

  private getGeographicData(analytics: WidgetAnalytics[]) {
    const geoData = new Map<string, { views: number; interactions: number }>();
    
    analytics.forEach(event => {
      const country = event.country || 'Unknown';
      const existing = geoData.get(country) || { views: 0, interactions: 0 };
      
      if (event.eventType === 'view') existing.views++;
      else if (event.eventType === 'interaction') existing.interactions++;
      
      geoData.set(country, existing);
    });

    return Array.from(geoData.entries())
      .map(([country, data]) => ({ country, ...data }))
      .sort((a, b) => b.views - a.views);
  }

  private convertToCSV(analytics: any): string {
    const headers = ['Date', 'Views', 'Interactions', 'Conversions', 'Unique Visitors'];
    const rows = analytics.trends.map((trend: any) => [
      trend.date,
      trend.views,
      trend.interactions,
      trend.conversions,
      0 // Placeholder for unique visitors per day
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private async convertToXLSX(analytics: any): Promise<Buffer> {
    // This would typically use a library like xlsx to generate Excel files
    // For now, return a simple buffer with CSV data
    const csvData = this.convertToCSV(analytics);
    return Buffer.from(csvData, 'utf-8');= 'interaction',
    ).length;
    const conversions = analytics.filter(
      (a) => a.eventType === 'conversion',
    ).length;
    const errors = analytics.filter((a) => a.eventType === 'error').length;

    const sessionDurations = analytics
      .filter((a) => a.timeOnPageMs)
      .map((a) => a.timeOnPageMs);
    const averageSessionDuration =
      sessionDurations.length > 0
        ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
        : 0;

    const bounces = analytics.filter((a) => a.isBounce).length;
    const bounceRate = totalViews > 0 ? (bounces / totalViews) * 100 : 0;

    return {
      totalViews,
      uniqueVisitors,
      interactions,
      conversions,
      averageSessionDuration: Math.round(averageSessionDuration / 1000), // Convert to seconds
      bounceRate: Math.round(bounceRate * 100) / 100,
      errorRate:
        totalViews > 0 ? Math.round((errors / totalViews) * 10000) / 100 : 0,
    };
  }

  private calculateTrends(analytics: WidgetAnalytics[]) {
    const dailyData = new Map();

    analytics.forEach((item) => {
      const date = item.date.toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, { views: 0, interactions: 0, conversions: 0 });
      }

      const data = dailyData.get(date);
      if (item.eventType === 'view') data.views++;
      if (item.eventType === 'interaction') data.interactions++;
      if (item.eventType === 'conversion') data.conversions++;
    });

    return Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  private getTopPages(analytics: WidgetAnalytics[]) {
    const pageData = new Map();

    analytics.forEach((item) => {
      if (!pageData.has(item.pageUrl)) {
        pageData.set(item.pageUrl, { views: 0, interactions: 0 });
      }

      const data = pageData.get(item.pageUrl);
      if (item.eventType === 'view') data.views++;
      if (item.eventType === 'interaction') data.interactions++;
    });

    return Array.from(pageData.entries())
      .map(([url, data]) => ({ url, ...data }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }

  private getDeviceBreakdown(analytics: WidgetAnalytics[]) {
    const deviceData = { desktop: 0, mobile: 0, tablet: 0 };

    analytics.forEach((item) => {
      if (item.eventType === 'view') {
        deviceData[item.deviceType]++;
      }
    });

    return deviceData;
  }

  private getBrowserBreakdown(analytics: WidgetAnalytics[]) {
    const browserData = new Map();

    analytics.forEach((item) => {
      if (item.eventType === 'view') {
        const browser = item.browserName;
        browserData.set(browser, (browserData.get(browser) || 0) + 1);
      }
    });

    return Object.fromEntries(browserData);
  }

  private getGeographicData(analytics: WidgetAnalytics[]) {
    const geoData = new Map();

    analytics.forEach((item) => {
      if (item.eventType === 'view' && item.country) {
        if (!geoData.has(item.country)) {
          geoData.set(item.country, { views: 0, interactions: 0 });
        }

        const data = geoData.get(item.country);
        data.views++;
        if (item.eventType === 'interaction') data.interactions++;
      }
    });

    return Array.from(geoData.entries())
      .map(([country, data]) => ({ country, ...data }))
      .sort((a, b) => b.views - a.views);
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - in production, use a proper CSV library
    const headers = Object.keys(data.metrics);
    const csvHeaders = headers.join(',');
    const csvData = headers.map((header) => data.metrics[header]).join(',');
    return `${csvHeaders}\n${csvData}`;
  }

  private async convertToXLSX(data: any): Promise<Buffer> {
    // In production, use a library like xlsx or exceljs
    // For now, return JSON as buffer
    return Buffer.from(JSON.stringify(data, null, 2));
  }
}
