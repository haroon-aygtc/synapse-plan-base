import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  AgentExecution,
  ToolExecution,
  WorkflowExecution,
  KnowledgeSearch,
  EventLog,
  Organization,
  User,
} from '@database/entities';
import { ExecutionStatus } from '@shared/enums';

export interface DashboardStats {
  activeAgents: {
    count: number;
    trend?: { value: number; isPositive: boolean };
  };
  toolExecutions: {
    count: number;
    cost: number;
    trend?: { value: number; isPositive: boolean };
  };
  workflowCompletions: {
    count: number;
    successRate: number;
    trend?: { value: number; isPositive: boolean };
  };
  knowledgeBase: {
    documentCount: number;
    searchCount: number;
    trend?: { value: number; isPositive: boolean };
  };
}

export interface ActivityItem {
  id: string;
  type: 'agent' | 'workflow' | 'tool' | 'system';
  title: string;
  message?: string;
  status: 'completed' | 'in_progress' | 'failed';
  timestamp: string;
  duration?: string;
}

export interface AnalyticsData {
  executionTrends: Array<{
    date: string;
    agentExecutions: number;
    toolExecutions: number;
    workflowExecutions: number;
  }>;
  performanceMetrics: {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
    throughput: number;
  };
  costAnalysis: {
    totalCost: number;
    costByModule: {
      agents: number;
      tools: number;
      workflows: number;
      knowledge: number;
    };
    costTrends: Array<{
      date: string;
      cost: number;
    }>;
  };
  userEngagement: {
    activeUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
    topFeatures: Array<{
      feature: string;
      usage: number;
    }>;
  };
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AgentExecution)
    private readonly agentExecutionRepository: Repository<AgentExecution>,
    @InjectRepository(ToolExecution)
    private readonly toolExecutionRepository: Repository<ToolExecution>,
    @InjectRepository(WorkflowExecution)
    private readonly workflowExecutionRepository: Repository<WorkflowExecution>,
    @InjectRepository(KnowledgeSearch)
    private readonly knowledgeSearchRepository: Repository<KnowledgeSearch>,
    @InjectRepository(EventLog)
    private readonly eventLogRepository: Repository<EventLog>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async getDashboardStats(
    organizationId: string,
    period: string = 'today'
  ): Promise<DashboardStats> {
    const { startDate, endDate } = this.getPeriodDates(period);
    const previousPeriod = this.getPreviousPeriodDates(period);

    // Get active agents count
    const activeAgentsCount = await this.agentExecutionRepository
      .createQueryBuilder('execution')
      .select('COUNT(DISTINCT execution.agentId)', 'count')
      .where('execution.organizationId = :organizationId', { organizationId })
      .andWhere('execution.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const previousActiveAgentsCount = await this.agentExecutionRepository
      .createQueryBuilder('execution')
      .select('COUNT(DISTINCT execution.agentId)', 'count')
      .where('execution.organizationId = :organizationId', { organizationId })
      .andWhere('execution.createdAt BETWEEN :startDate AND :endDate', {
        startDate: previousPeriod.startDate,
        endDate: previousPeriod.endDate,
      })
      .getRawOne();

    // Get tool executions
    const toolExecutions = await this.toolExecutionRepository
      .createQueryBuilder('execution')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(execution.cost)', 'totalCost')
      .where('execution.organizationId = :organizationId', { organizationId })
      .andWhere('execution.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const previousToolExecutions = await this.toolExecutionRepository
      .createQueryBuilder('execution')
      .select('COUNT(*)', 'count')
      .where('execution.organizationId = :organizationId', { organizationId })
      .andWhere('execution.createdAt BETWEEN :startDate AND :endDate', {
        startDate: previousPeriod.startDate,
        endDate: previousPeriod.endDate,
      })
      .getRawOne();

    // Get workflow completions
    const workflowExecutions = await this.workflowExecutionRepository
      .createQueryBuilder('execution')
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(CASE WHEN execution.status = :completedStatus THEN 1 END)', 'completed')
      .where('execution.organizationId = :organizationId', { organizationId })
      .andWhere('execution.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .setParameter('completedStatus', ExecutionStatus.COMPLETED)
      .getRawOne();

    const previousWorkflowExecutions = await this.workflowExecutionRepository
      .createQueryBuilder('execution')
      .select('COUNT(*)', 'total')
      .where('execution.organizationId = :organizationId', { organizationId })
      .andWhere('execution.createdAt BETWEEN :startDate AND :endDate', {
        startDate: previousPeriod.startDate,
        endDate: previousPeriod.endDate,
      })
      .getRawOne();

    // Get knowledge base stats
    const knowledgeStats = await this.knowledgeSearchRepository
      .createQueryBuilder('search')
      .select('COUNT(*)', 'searchCount')
      .where('search.organizationId = :organizationId', { organizationId })
      .andWhere('search.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const previousKnowledgeStats = await this.knowledgeSearchRepository
      .createQueryBuilder('search')
      .select('COUNT(*)', 'searchCount')
      .where('search.organizationId = :organizationId', { organizationId })
      .andWhere('search.createdAt BETWEEN :startDate AND :endDate', {
        startDate: previousPeriod.startDate,
        endDate: previousPeriod.endDate,
      })
      .getRawOne();

    // Calculate trends
    const activeAgentsTrend = this.calculateTrend(
      parseInt(activeAgentsCount.count) || 0,
      parseInt(previousActiveAgentsCount.count) || 0
    );

    const toolExecutionsTrend = this.calculateTrend(
      parseInt(toolExecutions.count) || 0,
      parseInt(previousToolExecutions.count) || 0
    );

    const workflowTrend = this.calculateTrend(
      parseInt(workflowExecutions.total) || 0,
      parseInt(previousWorkflowExecutions.total) || 0
    );

    const knowledgeTrend = this.calculateTrend(
      parseInt(knowledgeStats.searchCount) || 0,
      parseInt(previousKnowledgeStats.searchCount) || 0
    );

    return {
      activeAgents: {
        count: parseInt(activeAgentsCount.count) || 0,
        trend: activeAgentsTrend,
      },
      toolExecutions: {
        count: parseInt(toolExecutions.count) || 0,
        cost: parseFloat(toolExecutions.totalCost) || 0,
        trend: toolExecutionsTrend,
      },
      workflowCompletions: {
        count: parseInt(workflowExecutions.completed) || 0,
        successRate:
          parseInt(workflowExecutions.total) > 0
            ? (parseInt(workflowExecutions.completed) / parseInt(workflowExecutions.total)) * 100
            : 0,
        trend: workflowTrend,
      },
      knowledgeBase: {
        documentCount: 0, // This would come from a documents table
        searchCount: parseInt(knowledgeStats.searchCount) || 0,
        trend: knowledgeTrend,
      },
    };
  }

  async getActivities(
    organizationId: string,
    period: string = 'today',
    limit: number = 10
  ): Promise<ActivityItem[]> {
    const { startDate, endDate } = this.getPeriodDates(period);

    const activities = await this.eventLogRepository
      .createQueryBuilder('event')
      .where('event.organizationId = :organizationId', { organizationId })
      .andWhere('event.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('event.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    return activities.map((event) => ({
      id: event.id,
      type: this.mapEventTypeToActivityType(event.eventType),
      title: this.generateActivityTitle(event),
      message: event.eventData?.message || '',
      status: this.mapEventStatusToActivityStatus(event.eventData?.status),
      timestamp: this.formatTimestamp(event.createdAt),
      duration: event.eventData?.duration
        ? this.formatDuration(event.eventData.duration)
        : undefined,
    }));
  }

  async getAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsData> {
    // Get execution trends
    const executionTrends = await this.getExecutionTrends(organizationId, startDate, endDate);

    // Get performance metrics
    const performanceMetrics = await this.getPerformanceMetrics(organizationId, startDate, endDate);

    // Get cost analysis
    const costAnalysis = await this.getCostAnalysis(organizationId, startDate, endDate);

    // Get user engagement
    const userEngagement = await this.getUserEngagement(organizationId, startDate, endDate);

    return {
      executionTrends,
      performanceMetrics,
      costAnalysis,
      userEngagement,
    };
  }

  private async getExecutionTrends(organizationId: string, startDate: Date, endDate: Date) {
    // This would typically involve more complex queries to get daily/hourly trends
    // For now, returning sample data structure
    return [
      {
        date: startDate.toISOString().split('T')[0],
        agentExecutions: 10,
        toolExecutions: 25,
        workflowExecutions: 5,
      },
    ];
  }

  private async getPerformanceMetrics(organizationId: string, startDate: Date, endDate: Date) {
    const agentMetrics = await this.agentExecutionRepository
      .createQueryBuilder('execution')
      .select('AVG(execution.executionTimeMs)', 'avgTime')
      .addSelect('COUNT(CASE WHEN execution.status = :completed THEN 1 END)', 'successful')
      .addSelect('COUNT(*)', 'total')
      .where('execution.organizationId = :organizationId', { organizationId })
      .andWhere('execution.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .setParameter('completed', ExecutionStatus.COMPLETED)
      .getRawOne();

    const total = parseInt(agentMetrics.total) || 0;
    const successful = parseInt(agentMetrics.successful) || 0;

    return {
      averageResponseTime: parseFloat(agentMetrics.avgTime) || 0,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      errorRate: total > 0 ? ((total - successful) / total) * 100 : 0,
      throughput: total,
    };
  }

  private async getCostAnalysis(organizationId: string, startDate: Date, endDate: Date) {
    const agentCosts = await this.agentExecutionRepository
      .createQueryBuilder('execution')
      .select('SUM(execution.cost)', 'total')
      .where('execution.organizationId = :organizationId', { organizationId })
      .andWhere('execution.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const toolCosts = await this.toolExecutionRepository
      .createQueryBuilder('execution')
      .select('SUM(execution.cost)', 'total')
      .where('execution.organizationId = :organizationId', { organizationId })
      .andWhere('execution.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const agentCost = parseFloat(agentCosts.total) || 0;
    const toolCost = parseFloat(toolCosts.total) || 0;
    const workflowCost = 0; // Would be calculated from workflow executions
    const knowledgeCost = 0; // Would be calculated from knowledge operations

    return {
      totalCost: agentCost + toolCost + workflowCost + knowledgeCost,
      costByModule: {
        agents: agentCost,
        tools: toolCost,
        workflows: workflowCost,
        knowledge: knowledgeCost,
      },
      costTrends: [
        {
          date: startDate.toISOString().split('T')[0],
          cost: agentCost + toolCost,
        },
      ],
    };
  }

  private async getUserEngagement(organizationId: string, startDate: Date, endDate: Date) {
    const activeUsers = await this.eventLogRepository
      .createQueryBuilder('event')
      .select('COUNT(DISTINCT event.userId)', 'count')
      .where('event.organizationId = :organizationId', { organizationId })
      .andWhere('event.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return {
      activeUsers: parseInt(activeUsers.count) || 0,
      totalSessions: 0, // Would be calculated from session data
      averageSessionDuration: 0, // Would be calculated from session data
      topFeatures: [
        { feature: 'Agent Builder', usage: 45 },
        { feature: 'Tool Manager', usage: 32 },
        { feature: 'Workflow Designer', usage: 28 },
        { feature: 'Knowledge Base', usage: 15 },
      ],
    };
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

  private getPreviousPeriodDates(period: string): {
    startDate: Date;
    endDate: Date;
  } {
    const { startDate, endDate } = this.getPeriodDates(period);
    const duration = endDate.getTime() - startDate.getTime();

    return {
      startDate: new Date(startDate.getTime() - duration),
      endDate: new Date(startDate.getTime()),
    };
  }

  private calculateTrend(
    current: number,
    previous: number
  ): { value: number; isPositive: boolean } | undefined {
    if (previous === 0) return undefined;

    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      isPositive: change >= 0,
    };
  }

  private mapEventTypeToActivityType(eventType: string): 'agent' | 'workflow' | 'tool' | 'system' {
    if (eventType.includes('agent')) return 'agent';
    if (eventType.includes('workflow')) return 'workflow';
    if (eventType.includes('tool')) return 'tool';
    return 'system';
  }

  private generateActivityTitle(event: any): string {
    const eventType = event.eventType;
    if (eventType.includes('execution')) {
      return `${eventType.split('_')[0]} execution`;
    }
    return eventType.replace('_', ' ');
  }

  private mapEventStatusToActivityStatus(status: string): 'completed' | 'in_progress' | 'failed' {
    switch (status) {
      case ExecutionStatus.COMPLETED:
        return 'completed';
      case ExecutionStatus.RUNNING:
        return 'in_progress';
      case ExecutionStatus.FAILED:
        return 'failed';
      default:
        return 'completed';
    }
  }

  private formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}
