import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  KnowledgeDocument,
  KnowledgeSearch,
  KnowledgeSearchFeedback,
  KnowledgeAnalytics,
} from '@database/entities';

export interface AnalyticsReport {
  period: {
    start: Date;
    end: Date;
  };
  documents: {
    total: number;
    processed: number;
    failed: number;
    averageProcessingTime: number;
    topDocuments: Array<{
      id: string;
      title: string;
      accessCount: number;
      averageRelevance: number;
    }>;
  };
  searches: {
    total: number;
    successful: number;
    averageLatency: number;
    topQueries: Array<{
      query: string;
      count: number;
      averageScore: number;
    }>;
  };
  usage: {
    uniqueUsers: number;
    totalTokensUsed: number;
    costEstimate: number;
    peakUsageHours: number[];
  };
  performance: {
    averageRelevanceScore: number;
    userSatisfactionRate: number;
    documentUtilizationRate: number;
  };
}

@Injectable()
export class KnowledgeAnalyticsService {
  private readonly logger = new Logger(KnowledgeAnalyticsService.name);

  constructor(
    @InjectRepository(KnowledgeDocument)
    private readonly documentRepository: Repository<KnowledgeDocument>,
    @InjectRepository(KnowledgeSearch)
    private readonly searchRepository: Repository<KnowledgeSearch>,
    @InjectRepository(KnowledgeSearchFeedback)
    private readonly feedbackRepository: Repository<KnowledgeSearchFeedback>,
    @InjectRepository(KnowledgeAnalytics)
    private readonly analyticsRepository: Repository<KnowledgeAnalytics>
  ) {}

  async generateReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsReport> {
    this.logger.log(`Generating analytics report for org ${organizationId}`);

    const [documentStats, searchStats, usageStats, performanceStats] = await Promise.all([
      this.getDocumentStats(organizationId, startDate, endDate),
      this.getSearchStats(organizationId, startDate, endDate),
      this.getUsageStats(organizationId, startDate, endDate),
      this.getPerformanceStats(organizationId, startDate, endDate),
    ]);

    return {
      period: { start: startDate, end: endDate },
      documents: documentStats,
      searches: searchStats,
      usage: usageStats,
      performance: performanceStats,
    };
  }

  private async getDocumentStats(organizationId: string, startDate: Date, endDate: Date) {
    const documents = await this.documentRepository
      .createQueryBuilder('doc')
      .select([
        'COUNT(*) as total',
        "COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed",
        "COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed",
        'AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time',
      ])
      .where('doc.organizationId = :organizationId', { organizationId })
      .andWhere('doc.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const topDocuments = await this.documentRepository
      .createQueryBuilder('doc')
      .select(['doc.id', 'doc.title', 'doc.accessCount'])
      .where('doc.organizationId = :organizationId', { organizationId })
      .andWhere('doc.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('doc.accessCount', 'DESC')
      .limit(10)
      .getMany();

    // Get average relevance for top documents
    const topDocumentsWithRelevance = await Promise.all(
      topDocuments.map(async (doc) => {
        const avgRelevance = await this.feedbackRepository
          .createQueryBuilder('feedback')
          .select('AVG(feedback.relevanceScore)', 'avgRelevance')
          .where('feedback.documentId = :documentId', { documentId: doc.id })
          .getRawOne();

        return {
          id: doc.id,
          title: doc.title,
          accessCount: doc.accessCount,
          averageRelevance: parseFloat(avgRelevance?.avgRelevance || '0'),
        };
      })
    );

    return {
      total: parseInt(documents.total || '0'),
      processed: parseInt(documents.processed || '0'),
      failed: parseInt(documents.failed || '0'),
      averageProcessingTime: parseFloat(documents.avg_processing_time || '0'),
      topDocuments: topDocumentsWithRelevance,
    };
  }

  private async getSearchStats(organizationId: string, startDate: Date, endDate: Date) {
    const searches = await this.searchRepository
      .createQueryBuilder('search')
      .select([
        'COUNT(*) as total',
        "COUNT(CASE WHEN status = 'success' THEN 1 END) as successful",
        'AVG(execution_time_ms) as avg_latency',
      ])
      .where('search.organizationId = :organizationId', { organizationId })
      .andWhere('search.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const topQueries = await this.searchRepository
      .createQueryBuilder('search')
      .select(['search.query', 'COUNT(*) as count', 'AVG(search.averageScore) as avg_score'])
      .where('search.organizationId = :organizationId', { organizationId })
      .andWhere('search.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('search.query')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      total: parseInt(searches.total || '0'),
      successful: parseInt(searches.successful || '0'),
      averageLatency: parseFloat(searches.avg_latency || '0'),
      topQueries: topQueries.map((q) => ({
        query: q.query,
        count: parseInt(q.count),
        averageScore: parseFloat(q.avg_score || '0'),
      })),
    };
  }

  private async getUsageStats(organizationId: string, startDate: Date, endDate: Date) {
    const usage = await this.searchRepository
      .createQueryBuilder('search')
      .select([
        'COUNT(DISTINCT search.userId) as unique_users',
        "SUM(COALESCE((search.performance_metrics->'tokenCount')::int, 0)) as total_tokens",
      ])
      .where('search.organizationId = :organizationId', { organizationId })
      .andWhere('search.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    // Get peak usage hours
    const hourlyUsage = await this.searchRepository
      .createQueryBuilder('search')
      .select(['EXTRACT(HOUR FROM search.createdAt) as hour', 'COUNT(*) as count'])
      .where('search.organizationId = :organizationId', { organizationId })
      .andWhere('search.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('EXTRACT(HOUR FROM search.createdAt)')
      .orderBy('count', 'DESC')
      .limit(3)
      .getRawMany();

    const totalTokens = parseInt(usage.total_tokens || '0');
    const costEstimate = this.calculateCostEstimate(totalTokens);

    return {
      uniqueUsers: parseInt(usage.unique_users || '0'),
      totalTokensUsed: totalTokens,
      costEstimate,
      peakUsageHours: hourlyUsage.map((h) => parseInt(h.hour)),
    };
  }

  private async getPerformanceStats(organizationId: string, startDate: Date, endDate: Date) {
    const relevanceStats = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .select('AVG(feedback.relevanceScore)', 'avgRelevance')
      .where('feedback.organizationId = :organizationId', { organizationId })
      .andWhere('feedback.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const satisfactionStats = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .select([
        'COUNT(CASE WHEN was_helpful = true THEN 1 END) as helpful_count',
        'COUNT(*) as total_feedback',
      ])
      .where('feedback.organizationId = :organizationId', { organizationId })
      .andWhere('feedback.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const utilizationStats = await this.documentRepository
      .createQueryBuilder('doc')
      .select([
        'COUNT(CASE WHEN access_count > 0 THEN 1 END) as accessed_docs',
        'COUNT(*) as total_docs',
      ])
      .where('doc.organizationId = :organizationId', { organizationId })
      .andWhere('doc.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const helpfulCount = parseInt(satisfactionStats.helpful_count || '0');
    const totalFeedback = parseInt(satisfactionStats.total_feedback || '0');
    const accessedDocs = parseInt(utilizationStats.accessed_docs || '0');
    const totalDocs = parseInt(utilizationStats.total_docs || '0');

    return {
      averageRelevanceScore: parseFloat(relevanceStats?.avgRelevance || '0'),
      userSatisfactionRate: totalFeedback > 0 ? helpfulCount / totalFeedback : 0,
      documentUtilizationRate: totalDocs > 0 ? accessedDocs / totalDocs : 0,
    };
  }

  private calculateCostEstimate(totalTokens: number): number {
    // Rough cost estimate based on OpenAI pricing
    // $0.0001 per 1K tokens for embeddings
    return (totalTokens / 1000) * 0.0001;
  }

  async trackDocumentAccess(documentId: string, userId: string): Promise<void> {
    await this.documentRepository
      .createQueryBuilder()
      .update(KnowledgeDocument)
      .set({
        accessCount: () => 'access_count + 1',
        lastAccessedAt: new Date(),
      })
      .where('id = :documentId', { documentId })
      .execute();
  }

  async recordSearchFeedback(data: {
    searchId: string;
    documentId: string;
    chunkId?: string;
    relevanceScore: number;
    wasHelpful: boolean;
    wasUsed: boolean;
    feedback?: string;
    userId: string;
    organizationId: string;
  }): Promise<void> {
    const feedback = this.feedbackRepository.create(data);
    await this.feedbackRepository.save(feedback);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyAnalytics(): Promise<void> {
    this.logger.log('Generating daily analytics...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    try {
      // Get all organizations that had activity yesterday
      const activeOrgs = await this.searchRepository
        .createQueryBuilder('search')
        .select('DISTINCT search.organizationId', 'organizationId')
        .where('search.createdAt BETWEEN :start AND :end', {
          start: yesterday,
          end: today,
        })
        .getRawMany();

      for (const org of activeOrgs) {
        await this.generateDailyAnalyticsForOrg(org.organizationId, yesterday);
      }

      this.logger.log(`Generated daily analytics for ${activeOrgs.length} organizations`);
    } catch (error) {
      this.logger.error('Failed to generate daily analytics', error);
    }
  }

  private async generateDailyAnalyticsForOrg(organizationId: string, date: Date): Promise<void> {
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const [searchStats, documentStats, userStats] = await Promise.all([
      this.searchRepository
        .createQueryBuilder('search')
        .select(['COUNT(*) as search_count', 'AVG(execution_time_ms) as avg_latency'])
        .where('organizationId = :organizationId', { organizationId })
        .andWhere('createdAt BETWEEN :start AND :end', {
          start: date,
          end: endDate,
        })
        .getRawOne(),

      this.documentRepository
        .createQueryBuilder('doc')
        .select('SUM(access_count) as access_count')
        .where('organizationId = :organizationId', { organizationId })
        .andWhere('lastAccessedAt BETWEEN :start AND :end', {
          start: date,
          end: endDate,
        })
        .getRawOne(),

      this.searchRepository
        .createQueryBuilder('search')
        .select('COUNT(DISTINCT userId) as unique_users')
        .where('organizationId = :organizationId', { organizationId })
        .andWhere('createdAt BETWEEN :start AND :end', {
          start: date,
          end: endDate,
        })
        .getRawOne(),
    ]);

    const relevanceStats = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .select('AVG(relevanceScore)', 'avgRelevance')
      .where('organizationId = :organizationId', { organizationId })
      .andWhere('createdAt BETWEEN :start AND :end', {
        start: date,
        end: endDate,
      })
      .getRawOne();

    const analytics = this.analyticsRepository.create({
      date,
      organizationId,
      searchCount: parseInt(searchStats.search_count || '0'),
      accessCount: parseInt(documentStats.access_count || '0'),
      uniqueUsers: parseInt(userStats.unique_users || '0'),
      averageRelevanceScore: parseFloat(relevanceStats?.avgRelevance || '0'),
      averageLatency: parseFloat(searchStats.avg_latency || '0'),
      metrics: {
        generatedAt: new Date(),
        period: 'daily',
      },
    });

    await this.analyticsRepository.save(analytics);
  }

  async getTopPerformingDocuments(
    organizationId: string,
    limit: number = 10
  ): Promise<
    Array<{
      id: string;
      title: string;
      accessCount: number;
      averageRelevance: number;
      lastAccessed: Date;
    }>
  > {
    const documents = await this.documentRepository
      .createQueryBuilder('doc')
      .select(['doc.id', 'doc.title', 'doc.accessCount', 'doc.lastAccessedAt'])
      .where('doc.organizationId = :organizationId', { organizationId })
      .andWhere('doc.accessCount > 0')
      .orderBy('doc.accessCount', 'DESC')
      .limit(limit)
      .getMany();

    const documentsWithRelevance = await Promise.all(
      documents.map(async (doc) => {
        const avgRelevance = await this.feedbackRepository
          .createQueryBuilder('feedback')
          .select('AVG(feedback.relevanceScore)', 'avgRelevance')
          .where('feedback.documentId = :documentId', { documentId: doc.id })
          .getRawOne();

        return {
          id: doc.id,
          title: doc.title,
          accessCount: doc.accessCount,
          averageRelevance: parseFloat(avgRelevance?.avgRelevance || '0'),
          lastAccessed: doc.lastAccessedAt || doc.createdAt,
        };
      })
    );

    return documentsWithRelevance;
  }

  async getSearchTrends(
    organizationId: string,
    days: number = 30
  ): Promise<
    Array<{
      date: string;
      searchCount: number;
      successRate: number;
      averageLatency: number;
    }>
  > {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await this.searchRepository
      .createQueryBuilder('search')
      .select([
        'DATE(search.createdAt) as date',
        'COUNT(*) as search_count',
        "COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_searches",
        'AVG(execution_time_ms) as avg_latency',
      ])
      .where('search.organizationId = :organizationId', { organizationId })
      .andWhere('search.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(search.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return trends.map((trend) => ({
      date: trend.date,
      searchCount: parseInt(trend.search_count),
      successRate: parseInt(trend.successful_searches) / parseInt(trend.search_count),
      averageLatency: parseFloat(trend.avg_latency || '0'),
    }));
  }
}
