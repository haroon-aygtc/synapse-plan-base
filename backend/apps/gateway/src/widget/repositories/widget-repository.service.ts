import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Widget, WidgetExecution, WidgetAnalytics } from '@database/entities/widget.entity';
import { Agent } from '@database/entities/agent.entity';
import { Tool } from '@database/entities/tool.entity';
import { Workflow } from '@database/entities/workflow.entity';
import { User } from '@database/entities/user.entity';
import { Organization } from '@database/entities/organization.entity';
import { Session } from '@database/entities/session.entity';

@Injectable()
export class WidgetRepositoryService {
    constructor(
        @InjectRepository(Widget)
        private readonly widgetRepository: Repository<Widget>,
        @InjectRepository(WidgetExecution)
        private readonly widgetExecutionRepository: Repository<WidgetExecution>,
        @InjectRepository(WidgetAnalytics)
        private readonly widgetAnalyticsRepository: Repository<WidgetAnalytics>,
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @InjectRepository(Tool)
        private readonly toolRepository: Repository<Tool>,
        @InjectRepository(Workflow)
        private readonly workflowRepository: Repository<Workflow>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Organization)
        private readonly organizationRepository: Repository<Organization>,
        @InjectRepository(Session)
        private readonly sessionRepository: Repository<Session>,
    ) { }

    // Widget operations
    async createWidget(widget: Partial<Widget>): Promise<Widget> {
        return this.widgetRepository.save(this.widgetRepository.create(widget));
    }

    async findWidgetById(id: string, organizationId: string): Promise<Widget | null> {
        return this.widgetRepository.findOne({
            where: { id, organizationId },
            relations: ['user', 'organization'],
        });
    }

    async updateWidget(id: string, updates: Partial<Widget>): Promise<void> {
        await this.widgetRepository.update(id, updates);
    }

    async deleteWidget(id: string): Promise<void> {
        await this.widgetRepository.delete(id);
    }

    async findWidgetsByOrganization(
        organizationId: string,
        options: {
            page: number;
            limit: number;
            search?: string;
            type?: 'agent' | 'tool' | 'workflow';
            isActive?: boolean;
            sortBy: string;
            sortOrder: 'ASC' | 'DESC';
        }
    ) {
        const { page, limit, search, type, isActive, sortBy, sortOrder } = options;

        const queryBuilder = this.widgetRepository
            .createQueryBuilder('widget')
            .leftJoinAndSelect('widget.user', 'user')
            .where('widget.organizationId = :organizationId', { organizationId });

        if (search) {
            queryBuilder.andWhere('(widget.name ILIKE :search OR widget.description ILIKE :search)', {
                search: `%${search}%`,
            });
        }

        if (type) {
            queryBuilder.andWhere('widget.type = :type', { type });
        }

        if (isActive !== undefined) {
            queryBuilder.andWhere('widget.isActive = :isActive', { isActive });
        }

        const validSortFields = ['name', 'createdAt', 'updatedAt', 'usageCount', 'templateRating'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        queryBuilder.orderBy(`widget.${sortField}`, sortOrder);

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

    // Widget execution operations
    async createWidgetExecution(execution: Partial<WidgetExecution>): Promise<WidgetExecution> {
        return this.widgetExecutionRepository.save(this.widgetExecutionRepository.create(execution));
    }

    async updateWidgetExecution(id: string, updates: Partial<WidgetExecution>): Promise<void> {
        await this.widgetExecutionRepository.update(id, updates);
    }

    // Analytics operations
    async createWidgetAnalytics(analytics: Partial<WidgetAnalytics>): Promise<WidgetAnalytics> {
        return this.widgetAnalyticsRepository.save(this.widgetAnalyticsRepository.create(analytics));
    }

    async getWidgetAnalytics(
        widgetId: string,
        startDate: Date,
        endDate: Date
    ): Promise<WidgetAnalytics[]> {
        return this.widgetAnalyticsRepository
            .createQueryBuilder('analytics')
            .where('analytics.widgetId = :widgetId', { widgetId })
            .andWhere('analytics.date >= :start', { start: startDate })
            .andWhere('analytics.date <= :end', { end: endDate })
            .orderBy('analytics.date', 'ASC')
            .getMany();
    }

    // Source validation operations
    async validateAgentAccess(agentId: string, organizationId: string): Promise<Agent | null> {
        return this.agentRepository.findOne({
            where: { id: agentId, organizationId, isActive: true },
        });
    }

    async validateToolAccess(toolId: string, organizationId: string): Promise<Tool | null> {
        return this.toolRepository.findOne({
            where: { id: toolId, organizationId, isActive: true },
        });
    }

    async validateWorkflowAccess(workflowId: string, organizationId: string): Promise<Workflow | null> {
        return this.workflowRepository.findOne({
            where: { id: workflowId, organizationId, isActive: true },
        });
    }

    async validateUserAccess(userId: string, organizationId: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { id: userId, organizationId },
        });
    }

    async validateOrganizationAccess(organizationId: string): Promise<Organization | null> {
        return this.organizationRepository.findOne({
            where: { id: organizationId },
        });
    }

    // Template operations
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
        const { page, limit, category, type, search, sortBy, sortOrder, organizationId } = options;

        const queryBuilder = this.widgetRepository
            .createQueryBuilder('widget')
            .leftJoinAndSelect('widget.user', 'user')
            .leftJoinAndSelect('widget.organization', 'organization')
            .where(
                'widget.isTemplate = true AND widget.isActive = true AND (widget.isPublicTemplate = true OR widget.organizationId = :organizationId)',
                { organizationId }
            );

        if (search) {
            queryBuilder.andWhere(
                "(widget.name ILIKE :search OR widget.description ILIKE :search OR array_to_string(widget.templateTags, ',') ILIKE :search)",
                { search: `%${search}%` }
            );
        }

        if (category) {
            queryBuilder.andWhere('widget.templateCategory = :category', { category });
        }

        if (type) {
            queryBuilder.andWhere('widget.type = :type', { type });
        }

        const validSortFields: Record<string, string> = {
            name: 'widget.name',
            templateRating: 'widget.templateRating',
            templateDownloads: 'widget.templateDownloads',
            createdAt: 'widget.createdAt',
            updatedAt: 'widget.updatedAt',
            featured: 'widget.templateFeatured',
        };

        const sortField = validSortFields[sortBy] || validSortFields.templateRating;
        queryBuilder.addOrderBy('widget.templateFeatured', 'DESC').addOrderBy(sortField, sortOrder);

        const offset = (page - 1) * limit;
        queryBuilder.skip(offset).take(limit);

        const [rawData, total] = await queryBuilder.getManyAndCount();

        const data = rawData.map((widget) => ({
            id: widget.id,
            name: widget.name,
            description: widget.description,
            category: widget.templateCategory,
            type: widget.type,
            configuration: widget.configuration,
            preview: {
                image: widget.templatePreviewImage || this.generateDefaultPreviewImage(widget.type),
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

    private generateDefaultPreviewImage(type: 'agent' | 'tool' | 'workflow'): string {
        const baseUrl = process.env.CDN_BASE_URL || 'https://cdn.synapseai.com';
        const imageMap = {
            agent: `${baseUrl}/templates/previews/agent-default.png`,
            tool: `${baseUrl}/templates/previews/tool-default.png`,
            workflow: `${baseUrl}/templates/previews/workflow-default.png`,
        };
        return imageMap[type] || `${baseUrl}/templates/previews/default.png`;
    }
}
