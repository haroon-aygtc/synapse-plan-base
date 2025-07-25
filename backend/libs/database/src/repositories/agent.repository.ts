import { Injectable } from '@nestjs/common';
import { Repository, DataSource, FindOptionsWhere } from 'typeorm';
import { Agent } from '../entities/agent.entity';
import { AgentExecution } from '../entities/agent-execution.entity';

@Injectable()
export class AgentRepository extends Repository<Agent> {
  constructor(private dataSource: DataSource) {
    super(Agent, dataSource.createEntityManager());
  }

  async findByOrganization(
    organizationId: string,
    options?: {
      includeInactive?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<Agent[]> {
    const query = this.createQueryBuilder('agent')
      .leftJoinAndSelect('agent.promptTemplate', 'promptTemplate')
      .leftJoinAndSelect('agent.user', 'user')
      .where('agent.organizationId = :organizationId', { organizationId });

    if (!options?.includeInactive) {
      query.andWhere('agent.isActive = :isActive', { isActive: true });
    }

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    return query.orderBy('agent.updatedAt', 'DESC').getMany();
  }

  async findByUser(
    userId: string,
    organizationId: string,
    options?: {
      includeInactive?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<Agent[]> {
    const query = this.createQueryBuilder('agent')
      .leftJoinAndSelect('agent.promptTemplate', 'promptTemplate')
      .where('agent.userId = :userId', { userId })
      .andWhere('agent.organizationId = :organizationId', { organizationId });

    if (!options?.includeInactive) {
      query.andWhere('agent.isActive = :isActive', { isActive: true });
    }

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    return query.orderBy('agent.updatedAt', 'DESC').getMany();
  }

  async findWithExecutions(
    agentId: string,
    organizationId: string,
    executionLimit = 10
  ): Promise<Agent | null> {
    return this.createQueryBuilder('agent')
      .leftJoinAndSelect('agent.promptTemplate', 'promptTemplate')
      .leftJoinAndSelect('agent.user', 'user')
      .leftJoinAndSelect(
        'agent.executions',
        'execution',
        'execution.createdAt >= :since',
        { since: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      )
      .where('agent.id = :agentId', { agentId })
      .andWhere('agent.organizationId = :organizationId', { organizationId })
      .orderBy('execution.createdAt', 'DESC')
      .limit(executionLimit)
      .getOne();
  }

  async findWithTestResults(
    agentId: string,
    organizationId: string,
    testLimit = 20
  ): Promise<Agent | null> {
    return this.createQueryBuilder('agent')
      .leftJoinAndSelect('agent.promptTemplate', 'promptTemplate')
      .leftJoinAndSelect('agent.user', 'user')
      .leftJoinAndSelect(
        'agent.testResults',
        'testResult',
        'testResult.createdAt >= :since',
        { since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      )
      .where('agent.id = :agentId', { agentId })
      .andWhere('agent.organizationId = :organizationId', { organizationId })
      .orderBy('testResult.createdAt', 'DESC')
      .limit(testLimit)
      .getOne();
  }

  async updatePerformanceMetrics(
    agentId: string,
    metrics: {
      successRate?: number;
      averageResponseTime?: number;
      totalExecutions?: number;
      errorRate?: number;
    }
  ): Promise<void> {
    await this.update(
      { id: agentId },
      {
        performanceMetrics: {
          ...metrics,
          lastUpdated: new Date(),
        },
      }
    );
  }

  async incrementUsageCount(agentId: string): Promise<void> {
    await this.increment({ id: agentId }, 'usageCount', 1);
  }

  async searchAgents(
    organizationId: string,
    searchTerm: string,
    filters?: {
      category?: string;
      model?: string;
      isActive?: boolean;
      userId?: string;
    },
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Agent[]> {
    const query = this.createQueryBuilder('agent')
      .leftJoinAndSelect('agent.promptTemplate', 'promptTemplate')
      .leftJoinAndSelect('agent.user', 'user')
      .where('agent.organizationId = :organizationId', { organizationId })
      .andWhere('(agent.name ILIKE :searchTerm OR agent.description ILIKE :searchTerm)', {
        searchTerm: `%${searchTerm}%`,
      });

    if (filters?.category) {
      query.andWhere('agent.metadata->>"category" = :category', {
        category: filters.category,
      });
    }

    if (filters?.model) {
      query.andWhere('agent.model = :model', { model: filters.model });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('agent.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.userId) {
      query.andWhere('agent.userId = :userId', { userId: filters.userId });
    }

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    return query.orderBy('agent.updatedAt', 'DESC').getMany();
  }

  async getAgentStatistics(
    organizationId: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<{
    totalAgents: number;
    activeAgents: number;
    totalExecutions: number;
    averageSuccessRate: number;
    topPerformingAgents: Array<{
      id: string;
      name: string;
      successRate: number;
      totalExecutions: number;
    }>;
  }> {
    const baseQuery = this.createQueryBuilder('agent').where(
      'agent.organizationId = :organizationId',
      { organizationId }
    );

    const totalAgents = await baseQuery.getCount();
    const activeAgents = await baseQuery
      .andWhere('agent.isActive = :isActive', { isActive: true })
      .getCount();

    // Get execution statistics
    const executionQuery = this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'totalExecutions')
      .addSelect("AVG(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END)", 'avgSuccessRate')
      .from(AgentExecution, 'execution')
      .innerJoin('execution.agent', 'agent')
      .where('agent.organizationId = :organizationId', { organizationId });

    if (timeRange) {
      executionQuery
        .andWhere('execution.createdAt >= :from', { from: timeRange.from })
        .andWhere('execution.createdAt <= :to', { to: timeRange.to });
    }

    const executionStats = await executionQuery.getRawOne();

    // Get top performing agents
    const topPerformingAgents = await this.createQueryBuilder('agent')
      .select('agent.id', 'id')
      .addSelect('agent.name', 'name')
      .addSelect('agent.performanceMetrics', 'performanceMetrics')
      .where('agent.organizationId = :organizationId', { organizationId })
      .andWhere('agent.isActive = :isActive', { isActive: true })
      .andWhere('agent.performanceMetrics IS NOT NULL')
      .orderBy('(agent.performanceMetrics->>"successRate")::numeric', 'DESC')
      .limit(5)
      .getRawMany()
      .then((results) =>
        results.map((result) => ({
          id: result.id,
          name: result.name,
          successRate: result.performanceMetrics?.successRate || 0,
          totalExecutions: result.performanceMetrics?.totalExecutions || 0,
        }))
      );

    return {
      totalAgents,
      activeAgents,
      totalExecutions: parseInt(executionStats.totalExecutions) || 0,
      averageSuccessRate: parseFloat(executionStats.avgSuccessRate) || 0,
      topPerformingAgents,
    };
  }

  async createVersion(
    agentId: string,
    newVersion: string,
    changes: Record<string, any>
  ): Promise<Agent> {
    const originalAgent = await this.findOne({
      where: { id: agentId },
      relations: ['promptTemplate'],
    });

    if (!originalAgent) {
      throw new Error('Agent not found');
    }

    // Create new version with changes
    const newAgent = this.create({
      ...originalAgent,
      id: undefined, // Let TypeORM generate new ID
      version: newVersion,
      ...changes,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.save(newAgent);
  }

  async getVersionHistory(agentId: string, organizationId: string): Promise<Agent[]> {
    // In a full implementation, you'd have a separate versions table
    // For now, we'll return agents with the same name but different versions
    const baseAgent = await this.findOne({
      where: { id: agentId, organizationId },
    });

    if (!baseAgent) {
      return [];
    }

    return this.find({
      where: {
        name: baseAgent.name,
        organizationId,
      },
      order: { createdAt: 'DESC' },
    });
  }
}
