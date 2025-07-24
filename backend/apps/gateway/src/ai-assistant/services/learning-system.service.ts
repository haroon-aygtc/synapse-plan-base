import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '@database/entities';

interface LearningData {
  configurationId: string;
  configurationType: string;
  userFeedback: string;
  successMetrics: Record<string, number>;
  satisfactionRating: number;
  context: Record<string, any>;
  timestamp: Date;
  userId: string;
  organizationId: string;
}

interface UserPattern {
  userId: string;
  organizationId: string;
  preferences: Record<string, any>;
  successfulConfigurations: any[];
  commonRequirements: string[];
  preferredComplexity: string;
  averageSatisfaction: number;
  lastUpdated: Date;
}

interface OrganizationPattern {
  organizationId: string;
  industryType?: string;
  commonUseCases: string[];
  preferredModels: string[];
  successfulPatterns: any[];
  averagePerformance: Record<string, number>;
  lastUpdated: Date;
}

interface LearningInsight {
  type: 'user_preference' | 'organization_trend' | 'global_pattern';
  insight: string;
  confidence: number;
  applicableScenarios: string[];
  recommendedActions: string[];
  supportingData: any;
}

@Injectable()
export class LearningSystemService {
  private readonly logger = new Logger(LearningSystemService.name);
  
  // In-memory storage for learning data (in production, use a proper database)
  private readonly learningData: Map<string, LearningData> = new Map();
  private readonly userPatterns: Map<string, UserPattern> = new Map();
  private readonly organizationPatterns: Map<string, OrganizationPattern> = new Map();
  private readonly globalInsights: LearningInsight[] = [];

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    private readonly configService: ConfigService,
  ) {
    // Initialize learning system
    this.initializeLearningSystem();
  }

  async recordFeedback(
    configurationId: string,
    configurationType: string,
    userFeedback: string,
    successMetrics: Record<string, number>,
    satisfactionRating: number,
    context: Record<string, any>,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    this.logger.log(`Recording feedback for configuration ${configurationId}`);

    const learningEntry: LearningData = {
      configurationId,
      configurationType,
      userFeedback,
      successMetrics,
      satisfactionRating,
      context,
      timestamp: new Date(),
      userId,
      organizationId,
    };

    // Store learning data
    const key = `${configurationId}_${Date.now()}`;
    this.learningData.set(key, learningEntry);

    // Update user patterns
    await this.updateUserPattern(userId, organizationId, learningEntry);

    // Update organization patterns
    await this.updateOrganizationPattern(organizationId, learningEntry);

    // Generate insights
    await this.generateInsights();

    this.logger.log(`Feedback recorded and patterns updated for user ${userId}`);
  }

  async getUserPreferences(userId: string, organizationId: string): Promise<UserPattern | null> {
    const key = `${organizationId}_${userId}`;
    return this.userPatterns.get(key) || null;
  }

  async getOrganizationTrends(organizationId: string): Promise<OrganizationPattern | null> {
    return this.organizationPatterns.get(organizationId) || null;
  }

  async getPersonalizedSuggestions(
    userId: string,
    organizationId: string,
    configurationType: string,
    context: Record<string, any>,
  ): Promise<{
    suggestions: any[];
    reasoning: string[];
    confidence: number;
  }> {
    this.logger.log(`Generating personalized suggestions for user ${userId}`);

    try {
      const userPattern = await this.getUserPreferences(userId, organizationId);
      const orgPattern = await this.getOrganizationTrends(organizationId);
      
      const suggestions: any[] = [];
      const reasoning: string[] = [];
      let confidence = 0.5; // Base confidence

      // User-based suggestions
      if (userPattern) {
        confidence += 0.2;
        
        if (userPattern.preferences.preferredModels) {
          suggestions.push({
            type: 'model_preference',
            value: userPattern.preferences.preferredModels[0],
            reason: `Based on your previous successful configurations, you prefer ${userPattern.preferences.preferredModels[0]}`,
          });
          reasoning.push('Applied user model preferences from historical data');
        }

        if (userPattern.preferredComplexity) {
          suggestions.push({
            type: 'complexity_preference',
            value: userPattern.preferredComplexity,
            reason: `Your configurations typically use ${userPattern.preferredComplexity} complexity`,
          });
          reasoning.push('Applied user complexity preferences');
        }

        if (userPattern.commonRequirements.length > 0) {
          suggestions.push({
            type: 'common_requirements',
            value: userPattern.commonRequirements,
            reason: 'These requirements appear frequently in your successful configurations',
          });
          reasoning.push('Included commonly used requirements');
        }
      }

      // Organization-based suggestions
      if (orgPattern) {
        confidence += 0.15;

        if (orgPattern.preferredModels.length > 0) {
          suggestions.push({
            type: 'org_model_trend',
            value: orgPattern.preferredModels[0],
            reason: `${orgPattern.preferredModels[0]} is commonly used in your organization`,
          });
          reasoning.push('Applied organization model trends');
        }

        if (orgPattern.commonUseCases.includes(configurationType)) {
          confidence += 0.1;
          reasoning.push(`${configurationType} is a common use case in your organization`);
        }
      }

      // Global insights
      const relevantInsights = this.globalInsights.filter(
        insight => insight.applicableScenarios.includes(configurationType)
      );

      for (const insight of relevantInsights.slice(0, 3)) {
        suggestions.push({
          type: 'global_insight',
          value: insight.recommendedActions,
          reason: insight.insight,
        });
        reasoning.push(`Global pattern: ${insight.insight}`);
        confidence += insight.confidence * 0.05;
      }

      // Cap confidence at 0.95
      confidence = Math.min(confidence, 0.95);

      this.logger.log(`Generated ${suggestions.length} personalized suggestions with confidence ${confidence}`);
      
      return {
        suggestions,
        reasoning,
        confidence,
      };
    } catch (error) {
      this.logger.error('Failed to generate personalized suggestions', error);
      return {
        suggestions: [],
        reasoning: ['Unable to generate personalized suggestions'],
        confidence: 0.3,
      };
    }
  }

  async getOptimizationRecommendations(
    configuration: any,
    configurationType: string,
    userId: string,
    organizationId: string,
  ): Promise<{
    recommendations: any[];
    expectedImprovements: Record<string, string>;
    confidence: number;
  }> {
    this.logger.log('Generating optimization recommendations based on learning data');

    try {
      const userPattern = await this.getUserPreferences(userId, organizationId);
      const orgPattern = await this.getOrganizationTrends(organizationId);
      
      const recommendations: any[] = [];
      const expectedImprovements: Record<string, string> = {};
      let confidence = 0.6;

      // Analyze similar successful configurations
      const similarConfigs = this.findSimilarSuccessfulConfigurations(
        configuration,
        configurationType,
        organizationId,
      );

      if (similarConfigs.length > 0) {
        confidence += 0.2;
        
        // Find common patterns in successful configurations
        const patterns = this.extractPatterns(similarConfigs);
        
        for (const pattern of patterns) {
          recommendations.push({
            field: pattern.field,
            currentValue: configuration[pattern.field],
            suggestedValue: pattern.commonValue,
            reason: `${pattern.successRate}% of similar successful configurations use this value`,
            priority: pattern.successRate > 80 ? 'high' : pattern.successRate > 60 ? 'medium' : 'low',
          });
          
          expectedImprovements[pattern.field] = `${pattern.averageImprovement}% improvement expected`;
        }
      }

      // User-specific optimizations
      if (userPattern && userPattern.successfulConfigurations.length > 2) {
        confidence += 0.1;
        
        const userOptimizations = this.analyzeUserOptimizations(userPattern, configuration);
        recommendations.push(...userOptimizations);
      }

      // Organization-specific optimizations
      if (orgPattern && orgPattern.successfulPatterns.length > 0) {
        confidence += 0.1;
        
        const orgOptimizations = this.analyzeOrganizationOptimizations(orgPattern, configuration);
        recommendations.push(...orgOptimizations);
      }

      this.logger.log(`Generated ${recommendations.length} optimization recommendations`);
      
      return {
        recommendations,
        expectedImprovements,
        confidence: Math.min(confidence, 0.95),
      };
    } catch (error) {
      this.logger.error('Failed to generate optimization recommendations', error);
      return {
        recommendations: [],
        expectedImprovements: {},
        confidence: 0.3,
      };
    }
  }

  async getLearningInsights(): Promise<LearningInsight[]> {
    return this.globalInsights.slice(0, 10); // Return top 10 insights
  }

  private async initializeLearningSystem(): Promise<void> {
    this.logger.log('Initializing learning system');
    
    // Load existing data from database if available
    // This is a placeholder - in production, load from persistent storage
    
    // Generate initial insights
    await this.generateInsights();
  }

  private async updateUserPattern(
    userId: string,
    organizationId: string,
    learningEntry: LearningData,
  ): Promise<void> {
    const key = `${organizationId}_${userId}`;
    let userPattern = this.userPatterns.get(key);

    if (!userPattern) {
      userPattern = {
        userId,
        organizationId,
        preferences: {},
        successfulConfigurations: [],
        commonRequirements: [],
        preferredComplexity: 'intermediate',
        averageSatisfaction: 0,
        lastUpdated: new Date(),
      };
    }

    // Update satisfaction average
    const totalEntries = userPattern.successfulConfigurations.length + 1;
    userPattern.averageSatisfaction = 
      (userPattern.averageSatisfaction * (totalEntries - 1) + learningEntry.satisfactionRating) / totalEntries;

    // Add to successful configurations if rating is high
    if (learningEntry.satisfactionRating >= 4) {
      userPattern.successfulConfigurations.push({
        configuration: learningEntry.context.configuration,
        type: learningEntry.configurationType,
        metrics: learningEntry.successMetrics,
        timestamp: learningEntry.timestamp,
      });

      // Keep only recent successful configurations (last 20)
      if (userPattern.successfulConfigurations.length > 20) {
        userPattern.successfulConfigurations = userPattern.successfulConfigurations.slice(-20);
      }
    }

    // Extract preferences from context
    if (learningEntry.context.configuration) {
      const config = learningEntry.context.configuration;
      
      // Track model preferences
      if (config.model) {
        if (!userPattern.preferences.preferredModels) {
          userPattern.preferences.preferredModels = [];
        }
        if (!userPattern.preferences.preferredModels.includes(config.model)) {
          userPattern.preferences.preferredModels.push(config.model);
        }
      }

      // Track complexity preferences
      if (config.complexity) {
        userPattern.preferredComplexity = config.complexity;
      }
    }

    userPattern.lastUpdated = new Date();
    this.userPatterns.set(key, userPattern);
  }

  private async updateOrganizationPattern(
    organizationId: string,
    learningEntry: LearningData,
  ): Promise<void> {
    let orgPattern = this.organizationPatterns.get(organizationId);

    if (!orgPattern) {
      orgPattern = {
        organizationId,
        commonUseCases: [],
        preferredModels: [],
        successfulPatterns: [],
        averagePerformance: {},
        lastUpdated: new Date(),
      };
    }

    // Update common use cases
    if (!orgPattern.commonUseCases.includes(learningEntry.configurationType)) {
      orgPattern.commonUseCases.push(learningEntry.configurationType);
    }

    // Update preferred models
    if (learningEntry.context.configuration?.model) {
      const model = learningEntry.context.configuration.model;
      if (!orgPattern.preferredModels.includes(model)) {
        orgPattern.preferredModels.push(model);
      }
    }

    // Add to successful patterns if rating is high
    if (learningEntry.satisfactionRating >= 4) {
      orgPattern.successfulPatterns.push({
        configuration: learningEntry.context.configuration,
        type: learningEntry.configurationType,
        metrics: learningEntry.successMetrics,
        timestamp: learningEntry.timestamp,
      });

      // Keep only recent patterns (last 50)
      if (orgPattern.successfulPatterns.length > 50) {
        orgPattern.successfulPatterns = orgPattern.successfulPatterns.slice(-50);
      }
    }

    // Update average performance metrics
    for (const [metric, value] of Object.entries(learningEntry.successMetrics)) {
      if (!orgPattern.averagePerformance[metric]) {
        orgPattern.averagePerformance[metric] = value;
      } else {
        orgPattern.averagePerformance[metric] = 
          (orgPattern.averagePerformance[metric] + value) / 2;
      }
    }

    orgPattern.lastUpdated = new Date();
    this.organizationPatterns.set(organizationId, orgPattern);
  }

  private async generateInsights(): Promise<void> {
    this.logger.log('Generating learning insights');

    try {
      // Clear old insights
      this.globalInsights.length = 0;

      // Analyze user patterns
      const userInsights = this.analyzeUserPatterns();
      this.globalInsights.push(...userInsights);

      // Analyze organization patterns
      const orgInsights = this.analyzeOrganizationPatterns();
      this.globalInsights.push(...orgInsights);

      // Analyze global trends
      const globalTrends = this.analyzeGlobalTrends();
      this.globalInsights.push(...globalTrends);

      this.logger.log(`Generated ${this.globalInsights.length} learning insights`);
    } catch (error) {
      this.logger.error('Failed to generate insights', error);
    }
  }

  private analyzeUserPatterns(): LearningInsight[] {
    const insights: LearningInsight[] = [];
    
    // Analyze common user preferences
    const modelPreferences: Record<string, number> = {};
    const complexityPreferences: Record<string, number> = {};

    for (const userPattern of this.userPatterns.values()) {
      if (userPattern.preferences.preferredModels) {
        for (const model of userPattern.preferences.preferredModels) {
          modelPreferences[model] = (modelPreferences[model] || 0) + 1;
        }
      }
      
      if (userPattern.preferredComplexity) {
        complexityPreferences[userPattern.preferredComplexity] = 
          (complexityPreferences[userPattern.preferredComplexity] || 0) + 1;
      }
    }

    // Generate model preference insights
    const topModel = Object.entries(modelPreferences)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topModel) {
      insights.push({
        type: 'global_pattern',
        insight: `${topModel[0]} is the most preferred model across users`,
        confidence: Math.min(topModel[1] / this.userPatterns.size, 0.9),
        applicableScenarios: ['agent', 'tool', 'workflow'],
        recommendedActions: [`Consider suggesting ${topModel[0]} as default model`],
        supportingData: { modelPreferences },
      });
    }

    return insights;
  }

  private analyzeOrganizationPatterns(): LearningInsight[] {
    const insights: LearningInsight[] = [];
    
    // Analyze common organization trends
    const useCaseTrends: Record<string, number> = {};
    
    for (const orgPattern of this.organizationPatterns.values()) {
      for (const useCase of orgPattern.commonUseCases) {
        useCaseTrends[useCase] = (useCaseTrends[useCase] || 0) + 1;
      }
    }

    // Generate use case insights
    const topUseCase = Object.entries(useCaseTrends)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topUseCase) {
      insights.push({
        type: 'organization_trend',
        insight: `${topUseCase[0]} is the most common use case across organizations`,
        confidence: Math.min(topUseCase[1] / this.organizationPatterns.size, 0.9),
        applicableScenarios: [topUseCase[0]],
        recommendedActions: [`Optimize templates for ${topUseCase[0]} use cases`],
        supportingData: { useCaseTrends },
      });
    }

    return insights;
  }

  private analyzeGlobalTrends(): LearningInsight[] {
    const insights: LearningInsight[] = [];
    
    // Analyze satisfaction trends
    let totalSatisfaction = 0;
    let totalEntries = 0;
    
    for (const userPattern of this.userPatterns.values()) {
      totalSatisfaction += userPattern.averageSatisfaction;
      totalEntries++;
    }

    if (totalEntries > 0) {
      const averageSatisfaction = totalSatisfaction / totalEntries;
      
      insights.push({
        type: 'global_pattern',
        insight: `Average user satisfaction is ${averageSatisfaction.toFixed(2)}/5`,
        confidence: Math.min(totalEntries / 10, 0.9),
        applicableScenarios: ['agent', 'tool', 'workflow', 'widget'],
        recommendedActions: averageSatisfaction < 4 ? 
          ['Focus on improving configuration quality'] : 
          ['Maintain current quality standards'],
        supportingData: { averageSatisfaction, totalEntries },
      });
    }

    return insights;
  }

  private findSimilarSuccessfulConfigurations(
    configuration: any,
    configurationType: string,
    organizationId: string,
  ): any[] {
    const similar: any[] = [];
    
    // Search in organization patterns
    const orgPattern = this.organizationPatterns.get(organizationId);
    if (orgPattern) {
      for (const pattern of orgPattern.successfulPatterns) {
        if (pattern.type === configurationType) {
          // Simple similarity check - in production, use more sophisticated matching
          const similarity = this.calculateSimilarity(configuration, pattern.configuration);
          if (similarity > 0.6) {
            similar.push(pattern);
          }
        }
      }
    }

    return similar;
  }

  private calculateSimilarity(config1: any, config2: any): number {
    // Simple similarity calculation - in production, use more sophisticated algorithms
    const keys1 = Object.keys(config1 || {});
    const keys2 = Object.keys(config2 || {});
    const commonKeys = keys1.filter(key => keys2.includes(key));
    
    if (keys1.length === 0 && keys2.length === 0) return 1;
    if (keys1.length === 0 || keys2.length === 0) return 0;
    
    return commonKeys.length / Math.max(keys1.length, keys2.length);
  }

  private extractPatterns(configurations: any[]): any[] {
    const patterns: any[] = [];
    
    // Extract common field values
    const fieldValues: Record<string, Record<string, number>> = {};
    
    for (const config of configurations) {
      for (const [field, value] of Object.entries(config.configuration || {})) {
        if (!fieldValues[field]) {
          fieldValues[field] = {};
        }
        const valueStr = JSON.stringify(value);
        fieldValues[field][valueStr] = (fieldValues[field][valueStr] || 0) + 1;
      }
    }

    // Find patterns with high success rates
    for (const [field, values] of Object.entries(fieldValues)) {
      const totalConfigs = configurations.length;
      for (const [value, count] of Object.entries(values)) {
        const successRate = (count / totalConfigs) * 100;
        if (successRate >= 50) { // At least 50% success rate
          patterns.push({
            field,
            commonValue: JSON.parse(value),
            successRate,
            averageImprovement: Math.min(successRate, 30), // Estimated improvement
          });
        }
      }
    }

    return patterns;
  }

  private analyzeUserOptimizations(userPattern: UserPattern, configuration: any): any[] {
    const optimizations: any[] = [];
    
    // Analyze user's successful configurations for optimization opportunities
    if (userPattern.successfulConfigurations.length > 0) {
      const avgMetrics = this.calculateAverageMetrics(userPattern.successfulConfigurations);
      
      // Suggest optimizations based on user's historical performance
      if (avgMetrics.accuracy && avgMetrics.accuracy > 0.8) {
        optimizations.push({
          field: 'temperature',
          currentValue: configuration.temperature,
          suggestedValue: 0.3,
          reason: 'Your successful configurations typically use lower temperature for better accuracy',
          priority: 'medium',
        });
      }
    }

    return optimizations;
  }

  private analyzeOrganizationOptimizations(orgPattern: OrganizationPattern, configuration: any): any[] {
    const optimizations: any[] = [];
    
    // Suggest optimizations based on organization patterns
    if (orgPattern.preferredModels.length > 0 && 
        !orgPattern.preferredModels.includes(configuration.model)) {
      optimizations.push({
        field: 'model',
        currentValue: configuration.model,
        suggestedValue: orgPattern.preferredModels[0],
        reason: `${orgPattern.preferredModels[0]} is commonly used in your organization`,
        priority: 'low',
      });
    }

    return optimizations;
  }

  private calculateAverageMetrics(configurations: any[]): Record<string, number> {
    const avgMetrics: Record<string, number> = {};
    
    for (const config of configurations) {
      for (const [metric, value] of Object.entries(config.metrics || {})) {
        if (typeof value === 'number') {
          avgMetrics[metric] = (avgMetrics[metric] || 0) + value;
        }
      }
    }

    // Calculate averages
    for (const metric in avgMetrics) {
      avgMetrics[metric] /= configurations.length;
    }

    return avgMetrics;
  }
}