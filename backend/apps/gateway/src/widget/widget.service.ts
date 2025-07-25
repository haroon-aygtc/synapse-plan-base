import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, Between } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Widget,
  WidgetConfiguration,
  WidgetDeploymentInfo,
  WidgetAnalyticsData,
} from '@database/entities/widget.entity';
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
import { WebSocketService } from '../websocket/websocket.service';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import '../websocket/websocket-extension';

@Injectable()
export class WidgetService {
  private readonly logger = new Logger(WidgetService.name);
  private readonly baseURL: string;
  private readonly cdnURL: string;
  private readonly jwtSecret: string;
  private readonly maxWidgetsPerOrg: number;
  private readonly maxExecutionsPerMinute: number;

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
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private agentService: AgentService,
    private toolService: ToolService,
    private workflowService: WorkflowService,
    private sessionService: SessionService,
    private websocketService: WebSocketService,
  ) {
    this.baseURL = this.configService.get(
      'WIDGET_BASE_URL',
      'https://widgets.synapseai.com',
    );
    this.cdnURL = this.configService.get(
      'CDN_BASE_URL',
      'https://cdn.synapseai.com',
    );
    this.jwtSecret = this.configService.get('JWT_SECRET', 'default-secret-key');
    this.maxWidgetsPerOrg = this.configService.get('MAX_WIDGETS_PER_ORG', 100);
    this.maxExecutionsPerMinute = this.configService.get(
      'MAX_EXECUTIONS_PER_MINUTE',
      1000,
    );
  }

  async create(
    createWidgetData: CreateWidgetDto & {
      userId: string;
      organizationId: string;
    },
  ): Promise<Widget> {
    this.logger.log(
      `Creating widget: ${createWidgetData.name} for user ${createWidgetData.userId}`,
    );

    // Check organization widget limits
    await this.checkOrganizationLimits(createWidgetData.organizationId);

    // Validate source exists and user has access
    await this.validateSourceAccess(
      createWidgetData.sourceId,
      createWidgetData.type,
      createWidgetData.userId,
      createWidgetData.organizationId,
    );

    // Check for duplicate names within organization
    const existingWidget = await this.widgetRepository.findOne({
      where: {
        name: createWidgetData.name,
        organizationId: createWidgetData.organizationId,
      },
    });

    if (existingWidget) {
      throw new ConflictException(
        `Widget with name '${createWidgetData.name}' already exists in this organization`,
      );
    }

    // Create configuration with security defaults
    const configuration = createWidgetData.configuration
      ? this.mergeWithDefaults(
          createWidgetData.configuration,
          createWidgetData.type,
        )
      : this.createDefaultConfiguration(createWidgetData.type);

    // Validate configuration
    this.validateConfiguration(configuration);

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
      metadata: {
        ...createWidgetData.metadata,
        createdBy: createWidgetData.userId,
        createdAt: new Date(),
        lastModified: new Date(),
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

    // Cache widget for quick access
    await this.cacheManager.set(
      `widget:${savedWidget.id}`,
      savedWidget,
      300000, // 5 minutes
    );

    // Emit widget created event
    await this.websocketService.broadcastToOrganization(
      createWidgetData.organizationId,
      'widget:created',
      {
        widget: savedWidget,
        createdBy: createWidgetData.userId,
        timestamp: new Date(),
      },
    );

    // Track analytics event
    this.eventEmitter.emit('widget.created', {
      widgetId: savedWidget.id,
      userId: createWidgetData.userId,
      organizationId: createWidgetData.organizationId,
      type: savedWidget.type,
      timestamp: new Date(),
    });

    this.logger.log(`Widget created successfully: ${savedWidget.id}`);
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
    userId: string,
  ) {
    this.logger.log(
      `Deploying widget: ${id} to ${deployOptions.environment || 'production'}`,
    );

    const widget = await this.findOne(id, organizationId);

    if (!widget.isActive) {
      throw new BadRequestException('Cannot deploy inactive widget');
    }

    if (widget.isDeployed) {
      throw new ConflictException(
        'Widget is already deployed. Undeploy first to redeploy.',
      );
    }

    // Validate deployment permissions
    await this.validateDeploymentPermissions(widget, userId);

    // Validate custom domain if provided
    if (deployOptions.customDomain) {
      await this.validateCustomDomain(
        deployOptions.customDomain,
        organizationId,
      );
    }

    const environment = deployOptions.environment || 'production';
    const enableAnalytics = deployOptions.enableAnalytics ?? true;
    const enableCaching = deployOptions.enableCaching ?? true;

    // Generate secure deployment tokens
    const deploymentToken = this.generateDeploymentToken(
      widget.id,
      organizationId,
    );
    const apiKey = this.generateAPIKey(widget.id);

    // Create deployment URLs
    const baseUrl = deployOptions.customDomain
      ? `https://${deployOptions.customDomain}`
      : this.baseURL;

    const deploymentInfo: WidgetDeploymentInfo = {
      environment,
      customDomain: deployOptions.customDomain,
      enableAnalytics,
      enableCaching,
      deployedAt: new Date(),
      lastUpdated: new Date(),
      status: 'active',
      embedCode: {
        javascript: this.generateSecureEmbedCode(
          widget,
          'javascript',
          deploymentToken,
        ),
        iframe: this.generateSecureEmbedCode(widget, 'iframe', deploymentToken),
        react: this.generateSecureEmbedCode(widget, 'react', deploymentToken),
        vue: this.generateSecureEmbedCode(widget, 'vue', deploymentToken),
        angular: this.generateSecureEmbedCode(
          widget,
          'angular',
          deploymentToken,
        ),
      },
      urls: {
        standalone: `${baseUrl}/widget/${widget.id}?token=${deploymentToken}`,
        embed: `${baseUrl}/embed/${widget.id}?token=${deploymentToken}`,
        api: `${baseUrl}/api/widgets/${widget.id}`,
      },
    };

    // Update widget with deployment info
    widget.isDeployed = true;
    widget.deploymentInfo = deploymentInfo;
    widget.updatedAt = new Date();
    widget.metadata = {
      ...widget.metadata,
      deployedBy: userId,
      deploymentToken,
      apiKey,
      lastDeployment: new Date(),
    };

    const deployedWidget = await this.widgetRepository.save(widget);

    // Cache deployment info
    await this.cacheManager.set(
      `widget:deployment:${widget.id}`,
      deploymentInfo,
      3600000, // 1 hour
    );

    // Queue deployment tasks
    await this.widgetQueue.add(
      'deploy-widget',
      {
        widgetId: widget.id,
        deploymentInfo,
        userId,
        organizationId,
        environment,
      },
      {
        priority: environment === 'production' ? 1 : 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    // Set up monitoring and health checks
    await this.setupWidgetMonitoring(widget.id, deploymentInfo);

    // Emit deployment event
    await this.websocketService.broadcastToOrganization(
      organizationId,
      'widget:deployed',
      {
        widget: deployedWidget,
        deploymentInfo,
        deployedBy: userId,
        timestamp: new Date(),
      },
    );

    // Track deployment analytics
    this.eventEmitter.emit('widget.deployed', {
      widgetId: widget.id,
      userId,
      organizationId,
      environment,
      customDomain: deployOptions.customDomain,
      timestamp: new Date(),
    });

    this.logger.log(
      `Widget deployed successfully: ${widget.id} to ${environment}`,
    );
    return deploymentInfo;
  }

  async undeploy(id: string, organizationId: string) {
    const widget = await this.findOne(id, organizationId);

    if (!widget.isDeployed) {
      throw new BadRequestException('Widget is not deployed');
    }

    widget.isDeployed = false;
    widget.deploymentInfo = undefined;
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

    this.logger.log(
      `Fetching widget templates with options: ${JSON.stringify(options)}`,
    );

    const queryBuilder = this.widgetRepository
      .createQueryBuilder('widget')
      .leftJoinAndSelect('widget.user', 'user')
      .leftJoinAndSelect('widget.organization', 'organization')
      .where(
        '(widget.isTemplate = true AND widget.isActive = true AND (widget.isPublicTemplate = true OR widget.organizationId = :organizationId)',
        { organizationId },
      );

    if (search) {
      queryBuilder.andWhere(
        "(widget.name ILIKE :search OR widget.description ILIKE :search OR array_to_string(widget.templateTags, ',') ILIKE :search)",
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

    // Add sorting with enhanced options
    const validSortFields: Record<string, string> = {
      name: 'widget.name',
      templateRating: 'widget.templateRating',
      templateDownloads: 'widget.templateDownloads',
      createdAt: 'widget.createdAt',
      updatedAt: 'widget.updatedAt',
      featured: 'widget.templateFeatured',
    };

    const sortField = validSortFields[sortBy] || validSortFields.templateRating;

    // Featured templates first, then by selected sort
    queryBuilder
      .addOrderBy('widget.templateFeatured', 'DESC')
      .addOrderBy(sortField, sortOrder);

    // Add pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [rawData, total] = await queryBuilder.getManyAndCount();

    // Transform data to include template-specific fields
    const data = rawData.map((widget) => ({
      id: widget.id,
      name: widget.name,
      description: widget.description,
      category: widget.templateCategory,
      type: widget.type,
      configuration: widget.configuration,
      preview: {
        image:
          widget.templatePreviewImage ||
          this.generateDefaultPreviewImage(widget.type),
        demoUrl: widget.templateDemoUrl,
      },
      tags: widget.templateTags || [],
      rating: Number(widget.templateRating) || 0,
      ratingCount: widget.templateRatingCount || 0,
      downloads: widget.templateDownloads || 0,
      featured: widget.templateFeatured || false,
      createdBy: {
        id: widget.user?.id || 'system',
        name: widget.user?.name || 'System',
        avatar: widget.user?.avatar,
      },
      organization: {
        id: widget.organization?.id,
        name: widget.organization?.name,
      },
      createdAt: widget.createdAt,
      updatedAt: widget.updatedAt,
      isPublic: widget.isPublicTemplate,
    }));

    this.logger.log(
      `Found ${total} widget templates, returning ${data.length} for page ${page}`,
    );

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

  async getTemplate(templateId: string): Promise<any> {
    this.logger.log(`Fetching widget template: ${templateId}`);

    const template = await this.widgetRepository.findOne({
      where: {
        id: templateId,
        isTemplate: true,
        isActive: true,
      },
      relations: ['user', 'organization'],
    });

    if (!template) {
      throw new NotFoundException(
        `Widget template with ID ${templateId} not found`,
      );
    }

    // Get template statistics
    const stats = await this.getTemplateStatistics(templateId);

    // Transform to template format
    const templateData = {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.templateCategory,
      type: template.type,
      configuration: template.configuration,
      preview: {
        image:
          template.templatePreviewImage ||
          this.generateDefaultPreviewImage(template.type),
        demoUrl: template.templateDemoUrl,
      },
      tags: template.templateTags || [],
      rating: Number(template.templateRating) || 0,
      ratingCount: template.templateRatingCount || 0,
      downloads: template.templateDownloads || 0,
      featured: template.templateFeatured || false,
      createdBy: {
        id: template.user?.id || 'system',
        name: template.user?.name || 'System',
        avatar: template.user?.avatar,
      },
      organization: {
        id: template.organization?.id,
        name: template.organization?.name,
      },
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      isPublic: template.isPublicTemplate,
      statistics: stats,
      metadata: {
        ...template.metadata,
        templateVersion: template.version,
        lastUsed: template.lastUsedAt,
        performanceScore: template.performanceScore,
        accessibilityScore: template.accessibilityScore,
        seoScore: template.seoScore,
      },
    };

    this.logger.log(`Template fetched successfully: ${template.name}`);
    return templateData;
  }

  async createFromTemplate(
    templateId: string,
    widgetData: {
      name: string;
      sourceId: string;
      description?: string;
      configuration?: any;
      userId: string;
      organizationId: string;
    },
  ): Promise<Widget> {
    this.logger.log(
      `Creating widget from template: ${templateId} for user ${widgetData.userId}`,
    );

    const template = await this.widgetRepository.findOne({
      where: {
        id: templateId,
        isTemplate: true,
        isActive: true,
      },
      relations: ['user', 'organization'],
    });

    if (!template) {
      throw new NotFoundException(
        `Widget template with ID ${templateId} not found`,
      );
    }

    // Check organization widget limits
    await this.checkOrganizationLimits(widgetData.organizationId);

    // Validate source exists and user has access
    await this.validateSourceAccess(
      widgetData.sourceId,
      template.type,
      widgetData.userId,
      widgetData.organizationId,
    );

    // Check for duplicate names within organization
    const existingWidget = await this.widgetRepository.findOne({
      where: {
        name: widgetData.name,
        organizationId: widgetData.organizationId,
      },
    });

    if (existingWidget) {
      throw new ConflictException(
        `Widget with name '${widgetData.name}' already exists in this organization`,
      );
    }

    // Merge template configuration with user overrides
    const mergedConfiguration = {
      ...template.configuration,
      ...widgetData.configuration,
    };

    // Validate the merged configuration
    this.validateConfiguration(mergedConfiguration);

    const widget = this.widgetRepository.create({
      name: widgetData.name,
      description:
        widgetData.description || `Created from template: ${template.name}`,
      type: template.type,
      sourceId: widgetData.sourceId,
      sourceType: template.type,
      configuration: mergedConfiguration,
      isActive: true,
      userId: widgetData.userId,
      organizationId: widgetData.organizationId,
      templateId: template.id,
      version: '1.0.0',
      metadata: {
        createdFromTemplate: template.id,
        templateName: template.name,
        templateCategory: template.templateCategory,
        templateVersion: template.version,
        createdAt: new Date(),
        createdBy: widgetData.userId,
        lastModified: new Date(),
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

    // Increment template downloads atomically
    await this.widgetRepository.increment(
      { id: templateId },
      'templateDownloads',
      1,
    );

    // Update template last used timestamp
    await this.widgetRepository.update(
      { id: templateId },
      { lastUsedAt: new Date() },
    );

    // Cache the new widget
    await this.cacheManager.set(
      `widget:${savedWidget.id}`,
      savedWidget,
      300000, // 5 minutes
    );

    // Track template usage analytics
    await this.trackTemplateUsage(
      templateId,
      widgetData.userId,
      widgetData.organizationId,
    );

    // Emit widget created from template event
    await this.websocketService.broadcastToOrganization(
      widgetData.organizationId,
      'widget:created_from_template',
      {
        template: {
          id: template.id,
          name: template.name,
          category: template.templateCategory,
        },
        widget: savedWidget,
        createdBy: widgetData.userId,
        timestamp: new Date(),
      },
    );

    // Track analytics event
    this.eventEmitter.emit('template.used', {
      templateId: template.id,
      widgetId: savedWidget.id,
      userId: widgetData.userId,
      organizationId: widgetData.organizationId,
      timestamp: new Date(),
    });

    this.logger.log(
      `Widget created from template successfully: ${savedWidget.id} from template ${templateId}`,
    );

    return savedWidget;
  }

  async publishAsTemplate(
    id: string,
    templateData: PublishTemplateDto,
    organizationId: string,
  ): Promise<Widget> {
    this.logger.log(
      `Publishing widget as template: ${id} by organization ${organizationId}`,
    );

    const widget = await this.findOne(id, organizationId);

    // Validate widget is suitable for template publishing
    if (!widget.isActive) {
      throw new BadRequestException(
        'Cannot publish inactive widget as template',
      );
    }

    if (!widget.isDeployed) {
      throw new BadRequestException(
        'Widget must be deployed before publishing as template',
      );
    }

    // Check if template name already exists
    const existingTemplate = await this.widgetRepository.findOne({
      where: {
        name: templateData.name,
        isTemplate: true,
        organizationId: templateData.isPublic ? undefined : organizationId,
      },
    });

    if (existingTemplate && existingTemplate.id !== id) {
      throw new ConflictException(
        `Template with name '${templateData.name}' already exists`,
      );
    }

    // Generate preview image if not provided
    const previewImage =
      templateData.previewImage || (await this.generateTemplatePreview(widget));

    // Update widget to template
    widget.isTemplate = true;
    widget.templateCategory = templateData.category;
    widget.templateTags = templateData.tags || [];
    widget.isPublicTemplate = templateData.isPublic ?? false;
    widget.templateRating = 0;
    widget.templateRatingCount = 0;
    widget.templateDownloads = 0;
    widget.templateFeatured = false;
    widget.templatePreviewImage = previewImage;
    widget.templateDemoUrl = templateData.demoUrl || null;
    widget.updatedAt = new Date();

    // Update name and description for template
    widget.name = templateData.name;
    widget.description = templateData.description;

    // Add template metadata
    widget.metadata = {
      ...widget.metadata,
      publishedAsTemplate: true,
      publishedAt: new Date(),
      templateVersion: widget.version,
      originalWidgetId: id,
      publishedBy: widget.userId,
    };

    const publishedTemplate = await this.widgetRepository.save(widget);

    // Cache the template
    await this.cacheManager.set(
      `template:${publishedTemplate.id}`,
      publishedTemplate,
      3600000, // 1 hour
    );

    // If public template, add to featured templates cache
    if (templateData.isPublic) {
      await this.updateFeaturedTemplatesCache();
    }

    // Emit template published event
    await this.websocketService.broadcastToOrganization(
      organizationId,
      'widget:published_as_template',
      {
        template: publishedTemplate,
        publishedBy: widget.userId,
        isPublic: templateData.isPublic,
        timestamp: new Date(),
      },
    );

    // Track analytics event
    this.eventEmitter.emit('template.published', {
      templateId: publishedTemplate.id,
      widgetId: id,
      userId: widget.userId,
      organizationId,
      isPublic: templateData.isPublic,
      category: templateData.category,
      timestamp: new Date(),
    });

    this.logger.log(
      `Widget published as template successfully: ${publishedTemplate.id}`,
    );

    return publishedTemplate;
  }

  async execute(
    id: string,
    executionData: {
      input: any;
      sessionId: string;
      context?: any;
      token?: string;
    },
    userId?: string,
    organizationId?: string,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `Executing widget: ${id} for session ${executionData.sessionId}`,
    );

    // Get widget with caching
    let widget = await this.cacheManager.get<Widget>(`widget:${id}`);
    if (!widget) {
      widget = await this.widgetRepository.findOne({
        where: { id, isActive: true },
        relations: ['user', 'organization', 'template', 'template.user', 'template.organization'],
      });

      if (widget) {
        await this.cacheManager.set(`widget:${id}`, widget, 300000); // 5 minutes
      }
    }

    if (!widget) {
      throw new NotFoundException('Widget not found or inactive');
    }

    if (!widget.isDeployed) {
      throw new BadRequestException('Widget is not deployed');
    }

    // Validate execution token if provided
    if (executionData.token) {
      await this.validateExecutionToken(executionData.token, widget.id);
    }

    // Check rate limiting
    await this.checkRateLimit(
      widget.id,
      executionData.sessionId,
      organizationId,
    );

    // Validate origin if security settings exist
    if (widget.configuration.security.allowedDomains.length > 0) {
      const origin = executionData.context?.origin;
      if (
        !this.validateOrigin(
          origin,
          widget.configuration.security.allowedDomains,
        )
      ) {
        throw new ForbiddenException('Origin not allowed for this widget');
      }
    }

    // Create execution record with enhanced context
    const execution = this.widgetExecutionRepository.create({
      widgetId: id,
      sessionId: executionData.sessionId,
      userId,
      status: ExecutionStatus.PENDING,
      input: {
        type: this.detectInputType(executionData.input),
        content: executionData.input,
        metadata: {
          ...executionData.context,
          timestamp: new Date(),
          inputSize: JSON.stringify(executionData.input).length,
        },
      },
      context: {
        userAgent: executionData.context?.userAgent || 'Unknown',
        ipAddress: executionData.context?.ipAddress || '0.0.0.0',
        referrer: executionData.context?.referrer,
        sessionId: executionData.sessionId,
        deviceType: this.detectDeviceType(executionData.context?.userAgent),
        browserInfo: this.parseBrowserInfo(executionData.context?.userAgent),
        geolocation: executionData.context?.geolocation,
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
      message: 'Executing widget',
      action: 'execute',
      fileUpload: null,
      voiceInput: null,
    });

    const savedExecution = await this.widgetExecutionRepository.save(execution) as WidgetExecution;

    // Mark execution as running
    savedExecution.markAsRunning();
    await this.widgetExecutionRepository.save(savedExecution);

    try {
      // Execute based on widget type with enhanced context
      let result;
      const executionContext = {
        executionId: savedExecution.id,
        widgetId: widget.id,
        sessionId: executionData.sessionId,
        userId,
        organizationId: organizationId,
        context: executionData.context,
      };

      switch (widget.type) {
        case 'agent':
          result = await this.executeAgent(
            widget.sourceId,
            executionData.input,
            executionContext,
          );
          break;
        case 'tool':
          result = await this.executeTool(
            widget.sourceId,
            executionData.input,
            executionContext,
          );
          break;
        case 'workflow':
          result = await this.executeWorkflow(
            widget.sourceId,
            executionData.input,
            executionContext,
          );
          break;
        default:
          throw new BadRequestException('Unsupported widget type');
      }

      const executionTime = Date.now() - startTime;

      // Update execution with result
      savedExecution.markAsCompleted(
        {
          type: 'response',
          content: result.content || result,
          metadata: {
            executedAt: new Date(),
            provider: result.provider,
            model: result.model,
            cached: result.cached || false,
          },
        },
        {
          endTime: new Date(),
          tokensUsed: result.tokensUsed || 0,
          apiCalls: result.apiCalls || 1,
          duration: executionTime,
        },
      );

      // Calculate cost
      savedExecution.calculateCost();
      await this.widgetExecutionRepository.save(savedExecution);

      // Update widget analytics
      widget.updateAnalytics({
        interactions: widget.analyticsData.interactions + 1,
        lastAccessed: new Date(),
      });
      await this.widgetRepository.save(widget);

      // Track detailed analytics
      await this.trackAnalytics(widget.id, 'interaction', {
        ...executionData.context,
        executionId: savedExecution.id,
        executionTime,
        tokensUsed: result.tokensUsed || 0,
        cost: savedExecution.costUsd,
        cached: result.cached || false,
      });

      // Emit real-time execution update
      await this.websocketService.broadcastToOrganization(
        widget.organizationId,
        'widget:execution:completed',
        {
          widgetId: widget.id,
          executionId: savedExecution.id,
          result: result.content || result,
          metrics: {
            executionTime,
            tokensUsed: result.tokensUsed || 0,
            cost: savedExecution.costUsd,
          },
          timestamp: new Date(),
        },
      );

      this.logger.log(
        `Widget execution completed: ${savedExecution.id} in ${executionTime}ms`,
      );

      return {
        executionId: savedExecution.id,
        result: result.content || result,
        status: ExecutionStatus.COMPLETED,
        tokensUsed: result.tokensUsed || 0,
        executionTime,
        cost: savedExecution.costUsd,
        cached: result.cached || false,
        metadata: {
          provider: result.provider,
          model: result.model,
          apiCalls: result.apiCalls || 1,
        },
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      // Update execution with error
      savedExecution.markAsFailed(error.message || 'Unknown error', {
        error: error.stack || '',
        errorType: error.constructor?.name || 'Error',
        executionTime,
      });
      await this.widgetExecutionRepository.save(savedExecution);

      // Track error analytics
      await this.trackAnalytics(widget.id, 'error', {
        ...executionData.context,
        executionId: savedExecution.id,
        errorMessage: error.message || 'Unknown error',
        errorType: error.constructor?.name || 'Error',
        executionTime,
      });

      // Emit error event
      await this.websocketService.broadcastToOrganization(
        widget.organizationId,
        'widget:execution:failed',
        {
          widgetId: widget.id,
          executionId: savedExecution.id,
          error: error.message || 'Unknown error',
          timestamp: new Date(),
        },
      );

      this.logger.error(
        `Widget execution failed: ${savedExecution.id} - ${error.message || 'Unknown error'}`,
      );
      throw error;
    }
  }

  // Private helper methods

  private async checkOrganizationLimits(organizationId: string): Promise<void> {
    const widgetCount = await this.widgetRepository.count({
      where: { organizationId, isActive: true },
    });

    if (widgetCount >= this.maxWidgetsPerOrg) {
      throw new BadRequestException(
        `Organization has reached the maximum limit of ${this.maxWidgetsPerOrg} widgets`,
      );
    }
  }

  private async validateSourceAccess(
    sourceId: string,
    type: 'agent' | 'tool' | 'workflow',
    userId: string,
    organizationId: string,
  ): Promise<void> {
    let source;
    switch (type) {
      case 'agent':
        source = await this.agentRepository.findOne({
          where: { id: sourceId, organizationId, isActive: true },
        });
        break;
      case 'tool':
        source = await this.toolRepository.findOne({
          where: { id: sourceId, organizationId, isActive: true },
        });
        break;
      case 'workflow':
        source = await this.workflowRepository.findOne({
          where: { id: sourceId, organizationId, isActive: true },
        });
        break;
    }

    if (!source) {
      throw new NotFoundException(
        `${type} with ID ${sourceId} not found or not accessible`,
      );
    }

    // Check if user has access to the source
    if (source.userId !== userId && source.organizationId !== organizationId) {
      throw new ForbiddenException(`Access denied to ${type} ${sourceId}`);
    }
  }

  private validateConfiguration(configuration: WidgetConfiguration): void {
    // Validate security settings
    if (configuration.security.allowedDomains) {
      for (const domain of configuration.security.allowedDomains) {
        if (!this.isValidDomain(domain)) {
          throw new BadRequestException(`Invalid domain: ${domain}`);
        }
      }
    }

    // Validate rate limiting
    if (configuration.security.rateLimiting.requestsPerMinute > 10000) {
      throw new BadRequestException(
        'Rate limit cannot exceed 10,000 requests per minute',
      );
    }

    // Validate layout dimensions
    if (configuration.layout.width < 200 || configuration.layout.width > 2000) {
      throw new BadRequestException(
        'Widget width must be between 200 and 2000 pixels',
      );
    }

    if (
      configuration.layout.height < 300 ||
      configuration.layout.height > 2000
    ) {
      throw new BadRequestException(
        'Widget height must be between 300 and 2000 pixels',
      );
    }
  }

  private isValidDomain(domain: string): boolean {
    const domainRegex =
      /^(?:\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }

  private mergeWithDefaults(
    configuration: Partial<WidgetConfiguration>,
    type: 'agent' | 'tool' | 'workflow',
  ): WidgetConfiguration {
    const defaults = this.createDefaultConfiguration(type);
    return {
      theme: { ...defaults.theme, ...configuration.theme },
      layout: { ...defaults.layout, ...configuration.layout },
      behavior: { ...defaults.behavior, ...configuration.behavior },
      branding: { ...defaults.branding, ...configuration.branding },
      security: {
        ...defaults.security,
        ...configuration.security,
        rateLimiting: {
          ...defaults.security.rateLimiting,
          ...configuration.security?.rateLimiting,
        },
      },
    };
  }

  private async validateDeploymentPermissions(
    widget: Widget,
    userId: string,
  ): Promise<void> {
    // Check if user is owner or has deployment permissions
    if (widget.userId !== userId) {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user || (user.role !== 'ORG_ADMIN' && user.role !== 'SUPER_ADMIN')) {
        throw new ForbiddenException(
          'Insufficient permissions to deploy widget',
        );
      }
    }
  }

  private async validateCustomDomain(
    domain: string,
    organizationId: string,
  ): Promise<void> {
    if (!this.isValidDomain(domain)) {
      throw new BadRequestException('Invalid custom domain format');
    }

    // Check if domain is already in use
    const existingWidget = await this.widgetRepository.findOne({
      where: {
        organizationId,
        isDeployed: true,
      },
    });

    if (existingWidget?.deploymentInfo?.customDomain === domain) {
      throw new ConflictException('Custom domain is already in use');
    }
  }

  private generateDeploymentToken(
    widgetId: string,
    organizationId: string,
  ): string {
    const payload = {
      widgetId,
      organizationId,
      type: 'deployment',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  private generateAPIKey(widgetId: string): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(16).toString('hex');
    return `wapi_${Buffer.from(`${widgetId}:${timestamp}:${random}`).toString('base64')}`;
  }

  private generateSecureEmbedCode(
    widget: Widget,
    format: 'javascript' | 'iframe' | 'react' | 'vue' | 'angular',
    token: string,
  ): string {
    const baseUrl = widget.deploymentInfo?.customDomain
      ? `https://${widget.deploymentInfo.customDomain}`
      : this.baseURL;

    const config = {
      widgetId: widget.id,
      token,
      baseUrl,
      cdnUrl: this.cdnURL,
      configuration: widget.configuration,
    };

    switch (format) {
      case 'javascript':
        return this.generateJavaScriptEmbed(config);
      case 'iframe':
        return this.generateIframeEmbed(config);
      case 'react':
        return this.generateReactEmbed(config);
      case 'vue':
        return this.generateVueEmbed(config);
      case 'angular':
        return this.generateAngularEmbed(config);
      default:
        return '';
    }
  }

  private generateJavaScriptEmbed(config: any): string {
    return `
<!-- SynapseAI Widget -->
<script>
(function() {
  var script = document.createElement('script');
  script.src = '${config.cdnUrl}/widget-loader.js';
  script.setAttribute('data-widget-id', '${config.widgetId}');
  script.setAttribute('data-token', '${config.token}');
  script.setAttribute('data-base-url', '${config.baseUrl}');
  script.setAttribute('data-config', '${JSON.stringify(config.configuration)}');
  script.async = true;
  document.head.appendChild(script);
})();
</script>`;
  }

  private generateIframeEmbed(config: any): string {
    const { width, height } = config.configuration.layout;
    return `<iframe
  src="${config.baseUrl}/embed/${config.widgetId}?token=${config.token}"
  width="${width}"
  height="${height}"
  frameborder="0"
  allow="microphone; camera; geolocation"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
  title="SynapseAI Widget"
></iframe>`;
  }

  private generateReactEmbed(config: any): string {
    return `import { SynapseWidget } from '@synapseai/react-widget';

function MyComponent() {
  return (
    <SynapseWidget
      widgetId="${config.widgetId}"
      token="${config.token}"
      baseUrl="${config.baseUrl}"
      config={${JSON.stringify(config.configuration, null, 6)}}
    />
  );
}`;
  }

  private generateVueEmbed(config: any): string {
    return `<template>
  <SynapseWidget
    :widget-id="'${config.widgetId}'"
    :token="'${config.token}'"
    :base-url="'${config.baseUrl}'"
    :config="widgetConfig"
  />
</template>

<script>
import { SynapseWidget } from '@synapseai/vue-widget';

export default {
  components: { SynapseWidget },
  data() {
    return {
      widgetConfig: ${JSON.stringify(config.configuration, null, 6)}
    };
  }
};
</script>`;
  }

  private generateAngularEmbed(config: any): string {
    return `import { Component } from '@angular/core';

@Component({
  selector: 'app-widget',
  template: \`
    <synapse-widget
      widgetId="${config.widgetId}"
      token="${config.token}"
      baseUrl="${config.baseUrl}"
      [config]="widgetConfig">
    </synapse-widget>
  \`
})
export class WidgetComponent {
  widgetConfig = ${JSON.stringify(config.configuration, null, 2)};
}`;
  }

  private async setupWidgetMonitoring(
    widgetId: string,
    deploymentInfo: WidgetDeploymentInfo,
  ): Promise<void> {
    // Set up health check monitoring
    await this.widgetQueue.add(
      'setup-monitoring',
      {
        widgetId,
        urls: deploymentInfo.urls,
        environment: deploymentInfo.environment,
      },
      {
        repeat: { cron: '*/5 * * * *' }, // Every 5 minutes
      },
    );
  }

  private async checkRateLimit(
    widgetId: string,
    sessionId: string,
    organizationId: string,
  ): Promise<void> {
    const key = `rate_limit:${widgetId}:${sessionId}`;
    const orgKey = `rate_limit:org:${organizationId}`;
    const now = Date.now();
    const window = 60 * 1000; // 1 minute

    // Check session-level rate limit
    const sessionCount = (await this.cacheManager.get<number>(key)) || 0;
    if (sessionCount >= 60) {
      // 60 requests per minute per session
      throw new BadRequestException('Rate limit exceeded for this session');
    }

    // Check organization-level rate limit
    const orgCount = (await this.cacheManager.get<number>(orgKey)) || 0;
    if (orgCount >= this.maxExecutionsPerMinute) {
      throw new BadRequestException('Organization rate limit exceeded');
    }

    // Increment counters
    await this.cacheManager.set(key, sessionCount + 1, window);
    await this.cacheManager.set(orgKey, orgCount + 1, window);
  }

  private validateOrigin(origin: string, allowedDomains: string[]): boolean {
    if (!origin || allowedDomains.length === 0) {
      return true;
    }

    try {
      const url = new URL(origin);
      const domain = url.hostname;

      return allowedDomains.some((allowed) => {
        if (allowed.startsWith('*.')) {
          const baseDomain = allowed.substring(2);
          return domain.endsWith(baseDomain);
        }
        return domain === allowed;
      });
    } catch {
      return false;
    }
  }

  private async validateExecutionToken(
    token: string,
    widgetId: string,
  ): Promise<void> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      if (decoded.widgetId !== widgetId || decoded.type !== 'deployment') {
        throw new ForbiddenException('Invalid execution token');
      }
    } catch (error) {
      throw new ForbiddenException('Invalid or expired execution token');
    }
  }

  private detectInputType(input: any): string {
    if (typeof input === 'string') {
      return 'message';
    } else if (input && typeof input === 'object') {
      if (input.type) {
        return input.type;
      } else if (input.file) {
        return 'file_upload';
      } else if (input.action) {
        return 'action';
      }
    }
    return 'unknown';
  }

  private detectDeviceType(
    userAgent?: string,
  ): 'desktop' | 'mobile' | 'tablet' {
    if (!userAgent) return 'desktop';

    if (/Mobile|Android|iPhone/.test(userAgent)) {
      return /iPad|tablet/i.test(userAgent) ? 'tablet' : 'mobile';
    }
    return 'desktop';
  }

  private parseBrowserInfo(userAgent?: string): {
    name: string;
    version: string;
  } {
    if (!userAgent) return { name: 'Unknown', version: '0.0' };

    let name = 'Unknown';
    let version = '0.0';

    if (userAgent.includes('Chrome')) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      if (match) version = match[1];
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      if (match) version = match[1];
    } else if (userAgent.includes('Safari')) {
      name = 'Safari';
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      if (match) version = match[1];
    }

    return { name, version };
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

  private async executeAgent(agentId: string, input: any, context: any) {
    // Execute agent using real agent service with production logic
    return await this.agentService.execute(
      agentId,
      {
        input,
        sessionId: context.sessionId,
        context: {
          source: 'widget',
          widgetId: context.widgetId,
          executionId: context.executionId,
          userId: context.userId,
          organizationId: context.organizationId,
          ...context.context,
        },
        metadata: {
          widgetExecution: true,
          widgetId: context.widgetId,
          executionId: context.executionId,
        },
        includeToolCalls: true,
        includeKnowledgeSearch: true,
      },
      context.userId,
      context.organizationId,
    );
  }

  private async executeTool(toolId: string, input: any, context: any) {
    // Execute tool using real tool service with production logic
    return await this.toolService.execute(
      toolId,
      {
        functionName: 'execute',
        parameters: input,
        callerType: 'widget',
        callerId: context.widgetId,
        toolCallId: context.executionId,
        timeout: 30000,
      },
      context.userId,
      context.organizationId,
      context.sessionId,
    );
  }

  private async executeWorkflow(workflowId: string, input: any, context: any) {
    // Execute workflow using real workflow service with production logic
    return await this.workflowService.executeWorkflow(
      {
        workflowId,
        input,
        sessionId: context.sessionId,
        context: {
          source: 'widget',
          widgetId: context.widgetId,
          executionId: context.executionId,
          userId: context.userId,
          organizationId: context.organizationId,
          ...context.context,
        },
        metadata: {
          widgetExecution: true,
          widgetId: context.widgetId,
          executionId: context.executionId,
        },
        timeout: 30000,
      },
      context.userId,
      context.organizationId,
    );
  }

  private async trackAnalytics(
    widgetId: string,
    eventType: 'view' | 'interaction' | 'conversion' | 'error',
    context?: any,
    errorMessage?: string,
  ) {
    try {
      // Determine visitor status
      const sessionKey = `visitor:${widgetId}:${context?.sessionId}`;
      const isReturningVisitor =
        (await this.cacheManager.get(sessionKey)) !== null;
      const isUniqueVisitor = !isReturningVisitor;

      // Cache visitor for 24 hours
      if (isUniqueVisitor) {
        await this.cacheManager.set(sessionKey, true, 86400000); // 24 hours
      }

      // Determine bounce status (simplified logic)
      const isBounce = eventType === 'view' && !isReturningVisitor;

      const analyticsData = {
        widgetId,
        eventType,
        date: new Date(),
        sessionId: context?.sessionId || 'unknown',
        pageUrl: context?.pageUrl || context?.referrer || 'unknown',
        referrerUrl: context?.referrer,
        userAgent: context?.userAgent || 'unknown',
        ipAddress: this.anonymizeIP(context?.ipAddress || '0.0.0.0'),
        deviceType:
          context?.deviceType || this.detectDeviceType(context?.userAgent),
        browserName:
          context?.browserInfo?.name ||
          this.parseBrowserInfo(context?.userAgent).name,
        browserVersion:
          context?.browserInfo?.version ||
          this.parseBrowserInfo(context?.userAgent).version,
        operatingSystem: this.detectOS(context?.userAgent),
        screenResolution: context?.screenResolution,
        country: context?.geolocation?.country,
        region: context?.geolocation?.region,
        city: context?.geolocation?.city,
        timezone: context?.timezone,
        errorMessage,
        isUniqueVisitor,
        isReturningVisitor,
        isBounce,
        pageDepth: context?.pageDepth || 1,
        durationMs: context?.executionTime,
        conversionValue:
          eventType === 'conversion' ? context?.conversionValue : null,
        conversionType:
          eventType === 'conversion' ? context?.conversionType : null,
        metadata: {
          executionId: context?.executionId,
          tokensUsed: context?.tokensUsed,
          cost: context?.cost,
          cached: context?.cached,
          errorType: context?.errorType,
        },
      };

      const analytics = this.widgetAnalyticsRepository.create(analyticsData);
      await this.widgetAnalyticsRepository.save(analytics);

      // Queue analytics processing for real-time updates
      await this.widgetQueue.add(
        'process-analytics',
        {
          widgetId,
          eventType,
          analyticsData,
        },
        {
          priority: 10,
          delay: 1000, // 1 second delay for batching
        },
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to track analytics: ${error.message || 'Unknown error'}`,
        error.stack || '',
      );
      // Don't throw error to avoid breaking widget execution
    }
  }

  private anonymizeIP(ipAddress: string): string {
    // Anonymize IP address for privacy compliance
    const parts = ipAddress.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    return ipAddress;
  }

  private detectOS(userAgent?: string): string {
    if (!userAgent) return 'Unknown';

    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';

    return 'Unknown';
  }

  private aggregateAnalytics(analytics: WidgetAnalytics[]) {
    const totalViews = analytics.filter((a) => a.eventType === 'view').length;
    const uniqueVisitors = new Set(analytics.map((a) => a.sessionId)).size;
    const interactions = analytics.filter(
      (a) => a.eventType === 'interaction',
    ).length;
    const conversions = analytics.filter(
      (a) => a.eventType === 'conversion',
    ).length;

    const totalDuration = analytics.reduce((sum, a) => {
      return sum + (a.durationMs || 0);
    }, 0);

    const averageSessionDuration =
      uniqueVisitors > 0 ? totalDuration / uniqueVisitors : 0;
    const bounceRate =
      uniqueVisitors > 0
        ? (analytics.filter((a) => a.isBounce).length / uniqueVisitors) * 100
        : 0;

    return {
      totalViews,
      uniqueVisitors,
      interactions,
      conversions,
      averageSessionDuration,
      bounceRate,
      conversionRate: totalViews > 0 ? (conversions / totalViews) * 100 : 0,
    };
  }

  private calculateTrends(analytics: WidgetAnalytics[]) {
    const dailyData = new Map<
      string,
      { views: number; interactions: number; conversions: number }
    >();

    analytics.forEach((event) => {
      const date = event.date.toISOString().split('T')[0];
      const existing = dailyData.get(date) || {
        views: 0,
        interactions: 0,
        conversions: 0,
      };

      if (event.eventType === 'view') existing.views++;
      else if (event.eventType === 'interaction') existing.interactions++;
      else if (event.eventType === 'conversion') existing.conversions++;

      dailyData.set(date, existing);
    });

    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private getTopPages(analytics: WidgetAnalytics[]) {
    const pageData = new Map<string, { views: number; interactions: number }>();

    analytics.forEach((event) => {
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

    analytics.forEach((event) => {
      const deviceType = event.deviceType || 'desktop';
      if (deviceType in deviceData) {
        deviceData[deviceType as keyof typeof deviceData]++;
      }
    });

    return deviceData;
  }

  private getBrowserBreakdown(analytics: WidgetAnalytics[]) {
    const browserData: Record<string, number> = {};

    analytics.forEach((event) => {
      const browser = event.browserName || 'Unknown';
      browserData[browser] = (browserData[browser] || 0) + 1;
    });

    return browserData;
  }

  private getGeographicData(analytics: WidgetAnalytics[]) {
    const geoData = new Map<string, { views: number; interactions: number }>();

    analytics.forEach((event) => {
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
    const headers = [
      'Date',
      'Views',
      'Interactions',
      'Conversions',
      'Unique Visitors',
    ];
    const rows = analytics.trends.map((trend: any) => [
      trend.date,
      trend.views,
      trend.interactions,
      trend.conversions,
      0, // Placeholder for unique visitors per day
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  private async convertToXLSX(analytics: any): Promise<Buffer> {
    // This would typically use a library like xlsx to generate Excel files
    // For now, return a simple buffer with CSV data
    const csvData = this.convertToCSV(analytics);
    return Promise.resolve(Buffer.from(csvData, 'utf-8'));
  }

  // Template-specific helper methods

  private generateDefaultPreviewImage(
    type: 'agent' | 'tool' | 'workflow',
  ): string {
    const baseUrl = this.cdnURL;
    const imageMap = {
      agent: `${baseUrl}/templates/previews/agent-default.png`,
      tool: `${baseUrl}/templates/previews/tool-default.png`,
      workflow: `${baseUrl}/templates/previews/workflow-default.png`,
    };
    return imageMap[type] || `${baseUrl}/templates/previews/default.png`;
  }

  private async generateTemplatePreview(widget: Widget): Promise<string> {
    try {
      // Queue preview generation job
      const previewJob = await this.widgetQueue.add(
        'generate-template-preview',
        {
          widgetId: widget.id,
          configuration: widget.configuration,
          type: widget.type,
        },
        {
          priority: 5,
          attempts: 3,
        },
      );

      // For now, return default preview
      return this.generateDefaultPreviewImage(widget.type);
    } catch (error: any) {
      this.logger.error(
        `Failed to generate template preview for widget ${widget.id}: ${error.message || 'Unknown error'}`,
      );
      return this.generateDefaultPreviewImage(widget.type);
    }
  }

  private async getTemplateStatistics(templateId: string) {
    try {
      // Get usage statistics from analytics
      const usageStats = await this.widgetAnalyticsRepository
        .createQueryBuilder('analytics')
        .select([
          'COUNT(DISTINCT analytics.sessionId) as uniqueUsers',
          'COUNT(*) as totalInteractions',
          'AVG(analytics.durationMs) as avgDuration',
        ])
        .where('analytics.widgetId = :templateId', { templateId })
        .andWhere('analytics.eventType = :eventType', {
          eventType: 'interaction',
        })
        .andWhere('analytics.date >= :date', {
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        })
        .getRawOne();

      // Get widgets created from this template
      const derivedWidgets = await this.widgetRepository.count({
        where: { templateId },
      });

      return {
        uniqueUsers: parseInt(usageStats?.uniqueUsers) || 0,
        totalInteractions: parseInt(usageStats?.totalInteractions) || 0,
        avgDuration: parseFloat(usageStats?.avgDuration) || 0,
        derivedWidgets,
        lastUsed: new Date(),
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get template statistics for ${templateId}: ${error.message || 'Unknown error'}`,
      );
      return {
        uniqueUsers: 0,
        totalInteractions: 0,
        avgDuration: 0,
        derivedWidgets: 0,
        lastUsed: new Date(),
      };
    }
  }

  private async trackTemplateUsage(
    templateId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      // Track template usage in analytics
      const analyticsData = {
        widgetId: templateId,
        eventType: 'conversion' as const,
        date: new Date(),
        sessionId: `template_usage_${Date.now()}`,
        pageUrl: 'template_marketplace',
        userAgent: 'template_system',
        ipAddress: '0.0.0.0',
        deviceType: 'desktop' as const,
        browserName: 'system',
        browserVersion: '1.0',
        operatingSystem: 'system',
        conversionType: 'template_used',
        conversionValue: 1,
        userId,
        metadata: {
          templateUsage: true,
          organizationId,
          timestamp: new Date(),
        },
      };

      const analytics = this.widgetAnalyticsRepository.create(analyticsData);
      await this.widgetAnalyticsRepository.save(analytics);
    } catch (error: any) {
      this.logger.error(
        `Failed to track template usage for ${templateId}: ${error.message || 'Unknown error'}`,
      );
      // Don't throw error to avoid breaking widget creation
    }
  }

  private async updateFeaturedTemplatesCache(): Promise<void> {
    try {
      const featuredTemplates = await this.widgetRepository.find({
        where: {
          isTemplate: true,
          isPublicTemplate: true,
          templateFeatured: true,
          isActive: true,
        },
        relations: ['user', 'organization'],
        order: {
          templateRating: 'DESC',
          templateDownloads: 'DESC',
        },
        take: 10,
      });

      await this.cacheManager.set(
        'featured_templates',
        featuredTemplates,
        3600000, // 1 hour
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to update featured templates cache: ${error.message || 'Unknown error'}`,
      );
    }
  }

  private async validateSource(
    sourceId: string,
    type: 'agent' | 'tool' | 'workflow',
  ): Promise<void> {
    let source;
    switch (type) {
      case 'agent':
        source = await this.agentRepository.findOne({
          where: { id: sourceId, isActive: true },
        });
        break;
      case 'tool':
        source = await this.toolRepository.findOne({
          where: { id: sourceId, isActive: true },
        });
        break;
      case 'workflow':
        source = await this.workflowRepository.findOne({
          where: { id: sourceId, isActive: true },
        });
        break;
    }

    if (!source) {
      throw new NotFoundException(
        `${type} with ID ${sourceId} not found or not active`,
      );
    }
  }

  async getTemplateCategoryCounts(): Promise<Record<string, number>> {
    try {
      const result = await this.widgetRepository
        .createQueryBuilder('widget')
        .select('widget.templateCategory', 'category')
        .addSelect('COUNT(*)', 'count')
        .where('widget.isTemplate = true')
        .andWhere('widget.isActive = true')
        .andWhere('widget.isPublicTemplate = true')
        .groupBy('widget.templateCategory')
        .getRawMany();

      const counts: Record<string, number> = {};
      result.forEach((row) => {
        if (row.category) {
          counts[row.category] = parseInt(row.count) || 0;
        }
      });

      return counts;
    } catch (error: any) {
      this.logger.error(
        `Failed to get template category counts: ${error.message || 'Unknown error'}`,
      );
      return {};
    }
  }

  async rateTemplate(
    templateId: string,
    rating: number,
    userId: string,
    review?: string,
  ): Promise<any> {
    this.logger.log(
      `Rating template ${templateId} with ${rating} stars by user ${userId}`,
    );

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const template = await this.widgetRepository.findOne({
      where: { id: templateId, isTemplate: true, isActive: true },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // For now, we'll update the template rating directly
    // In a production system, you'd want a separate ratings table
    const currentRating = Number(template.templateRating) || 0;
    const currentCount = template.templateRatingCount || 0;

    // Calculate new average rating
    const newCount = currentCount + 1;
    const newRating = (currentRating * currentCount + rating) / newCount;

    await this.widgetRepository.update(
      { id: templateId },
      {
        templateRating: newRating,
        templateRatingCount: newCount,
        updatedAt: new Date(),
      },
    );

    // Track rating analytics
    await this.trackAnalytics(templateId, 'interaction', {
      sessionId: `rating_${Date.now()}`,
      pageUrl: 'template_rating',
      userAgent: 'rating_system',
      ipAddress: '0.0.0.0',
      deviceType: 'desktop',
      userId,
      metadata: {
        rating,
        review,
        templateRating: true,
      },
    });

    this.logger.log(
      `Template ${templateId} rated successfully. New rating: ${newRating.toFixed(2)}`,
    );

    return {
      templateId,
      newRating: Number(newRating.toFixed(2)),
      ratingCount: newCount,
      userRating: rating,
      review,
    };
  }

  async getTemplateReviews(
    templateId: string,
    options: { page: number; limit: number },
  ): Promise<any> {

    const reviews = await this.widgetRepository.find({
      where: { id: templateId, isTemplate: true, isActive: true },
      order: { createdAt: 'DESC' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      relations: ['user', 'organization', 'template', 'template.user', 'template.organization', 'template.templateReviews', 'template.templateReviews.user', 'template.templateReviews.organization'],
    });

    const totalReviews = await this.widgetRepository.count({
      where: { id: templateId, isTemplate: true, isActive: true },
      relations: ['user', 'organization', 'template', 'template.user', 'template.organization', 'template.templateReviews', 'template.templateReviews.user', 'template.templateReviews.organization'],  
    });

    return {
      data: reviews,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: totalReviews,
        totalPages: Math.ceil(totalReviews / options.limit),
      },
    };
  }
}