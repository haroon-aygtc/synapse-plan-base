import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bull';
import { WidgetService } from './widget.service';
import {
  Widget,
  WidgetExecution,
  WidgetAnalytics,
  Agent,
  Tool,
  Workflow,
  User,
  Organization,
  Session,
} from '@database/entities';
import { AgentService } from '../agent/agent.service';
import { ToolService } from '../tool/tool.service';
import { WorkflowService } from '../workflow/workflow.service';
import { SessionService } from '../session/session.service';
import { WebSocketService } from '../websocket/websocket.service';
import { ExecutionStatus } from '@libs/shared/enums';

describe('WidgetService', () => {
  let service: WidgetService;
  let widgetRepository: Repository<Widget>;
  let widgetExecutionRepository: Repository<WidgetExecution>;
  let widgetAnalyticsRepository: Repository<WidgetAnalytics>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getMany: jest.fn(),
      getRawOne: jest.fn(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    })),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  const mockWebSocketService = {
    broadcastToOrganization: jest.fn(),
    emitToOrganization: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        WIDGET_BASE_URL: 'https://widgets.synapseai.com',
        CDN_BASE_URL: 'https://cdn.synapseai.com',
        JWT_SECRET: 'test-secret',
        MAX_WIDGETS_PER_ORG: 100,
        MAX_EXECUTIONS_PER_MINUTE: 1000,
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WidgetService,
        {
          provide: getRepositoryToken(Widget),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(WidgetExecution),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(WidgetAnalytics),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Agent),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Tool),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Workflow),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Session),
          useValue: mockRepository,
        },
        {
          provide: getQueueToken('widget-processing'),
          useValue: mockQueue,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: AgentService,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ToolService,
          useValue: { execute: jest.fn() },
        },
        {
          provide: WorkflowService,
          useValue: { executeWorkflow: jest.fn() },
        },
        {
          provide: SessionService,
          useValue: {},
        },
        {
          provide: WebSocketService,
          useValue: mockWebSocketService,
        },
      ],
    }).compile();

    service = module.get<WidgetService>(WidgetService);
    widgetRepository = module.get<Repository<Widget>>(getRepositoryToken(Widget));
    widgetExecutionRepository = module.get<Repository<WidgetExecution>>(
      getRepositoryToken(WidgetExecution)
    );
    widgetAnalyticsRepository = module.get<Repository<WidgetAnalytics>>(
      getRepositoryToken(WidgetAnalytics)
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTemplates', () => {
    it('should handle SQL query correctly without syntax errors', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest.spyOn(widgetRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const options = {
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'ASC' as const,
        organizationId: 'test-org-id',
      };

      const result = await service.getTemplates(options);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'widget.isTemplate = true AND widget.isActive = true AND (widget.isPublicTemplate = true OR widget.organizationId = :organizationId)',
        { organizationId: 'test-org-id' }
      );
      expect(result).toEqual({
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });
    });
  });

  describe('execute', () => {
    it('should create execution with correct status format', async () => {
      const mockWidget = {
        id: 'widget-id',
        type: 'agent',
        sourceId: 'agent-id',
        isActive: true,
        isDeployed: true,
        organizationId: 'org-id',
        configuration: {
          security: { allowedDomains: [] },
        },
        analyticsData: { interactions: 0 },
        updateAnalytics: jest.fn(),
      };

      const mockExecution = {
        id: 'execution-id',
        markAsRunning: jest.fn(),
        markAsCompleted: jest.fn(),
        calculateCost: jest.fn(),
        costUsd: 0.001,
      };

      jest.spyOn(mockCacheManager, 'get').mockResolvedValue(mockWidget);
      jest.spyOn(widgetExecutionRepository, 'create').mockReturnValue(mockExecution as any);
      jest.spyOn(widgetExecutionRepository, 'save').mockResolvedValue(mockExecution as any);
      jest.spyOn(widgetRepository, 'save').mockResolvedValue(mockWidget as any);

      const agentService = module.get<AgentService>(AgentService);
      jest.spyOn(agentService, 'execute').mockResolvedValue({
        content: 'Test response',
        tokensUsed: 100,
        apiCalls: 1,
        cached: false,
      } as any);

      const executionData = {
        input: 'test input',
        sessionId: 'session-id',
        context: {
          userAgent: 'test-agent',
          ipAddress: '127.0.0.1',
        },
      };

      const result = await service.execute('widget-id', executionData, 'user-id', 'org-id');

      expect(widgetExecutionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
        })
      );
      expect(result.status).toBe('completed');
    });
  });

  describe('publishAsTemplate', () => {
    it('should handle public template duplicate check correctly', async () => {
      const mockWidget = {
        id: 'widget-id',
        isActive: true,
        isDeployed: true,
        userId: 'user-id',
        version: '1.0.0',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockWidget as any);
      jest.spyOn(widgetRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(widgetRepository, 'save').mockResolvedValue(mockWidget as any);
      jest.spyOn(mockCacheManager, 'set').mockResolvedValue(undefined);

      const templateData = {
        name: 'Test Template',
        description: 'Test Description',
        category: 'test',
        tags: ['test'],
        isPublic: true,
      };

      await service.publishAsTemplate('widget-id', templateData, 'org-id');

      expect(widgetRepository.findOne).toHaveBeenCalledWith({
        where: {
          name: 'Test Template',
          isTemplate: true,
          isPublicTemplate: true,
        },
      });
    });
  });
});
