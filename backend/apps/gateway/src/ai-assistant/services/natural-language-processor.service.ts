import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  ProcessNaturalLanguageDto,
  IntentRecognitionDto,
  ConfigurationSuggestionDto,
  ValidationOptimizationDto,
  LearningFeedbackDto,
  ConfigurationType,
  IntentType,
} from '../dto/natural-language-config.dto';

interface IntentRecognitionResult {
  intent: IntentType;
  confidence: number;
  entities: Record<string, any>;
  suggestedActions: string[];
  clarificationNeeded?: string[];
}

interface ConfigurationSuggestion {
  confidence: number;
  suggestedConfig: any;
  explanation: string;
  alternatives: ConfigurationAlternative[];
  validationResults: ValidationResult[];
}

interface ConfigurationAlternative {
  config: any;
  description: string;
  pros: string[];
  cons: string[];
  useCase: string;
}

interface ValidationResult {
  field: string;
  status: 'valid' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

interface OptimizationSuggestion {
  field: string;
  currentValue: any;
  suggestedValue: any;
  reasoning: string;
  expectedImprovement: string;
  priority: 'high' | 'medium' | 'low';
}

@Injectable()
export class NaturalLanguageProcessorService {
  private readonly logger = new Logger(NaturalLanguageProcessorService.name);
  private readonly openai: OpenAI;
  private readonly learningData: Map<string, any> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async processNaturalLanguage(
    dto: ProcessNaturalLanguageDto,
    userId: string,
    organizationId: string
  ): Promise<ConfigurationSuggestion> {
    this.logger.log(`Processing natural language request for ${dto.configurationType}`);

    try {
      // First, recognize the intent
      const intentResult = await this.recognizeIntent({
        userInput: dto.description,
        context: dto.context,
      });

      // Generate configuration based on intent and description
      const configPrompt = this.buildConfigurationPrompt(dto, intentResult);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(dto.configurationType),
          },
          {
            role: 'user',
            content: configPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);

      // Validate the generated configuration
      const validationResults = await this.validateConfiguration(
        result.suggestedConfig,
        dto.configurationType
      );

      const suggestion: ConfigurationSuggestion = {
        confidence: result.confidence || 0.8,
        suggestedConfig: result.suggestedConfig,
        explanation: result.explanation,
        alternatives: result.alternatives || [],
        validationResults,
      };

      this.logger.log(
        `Generated configuration suggestion with confidence: ${suggestion.confidence}`
      );
      return suggestion;
    } catch (error) {
      this.logger.error('Failed to process natural language request', error);
      throw new Error('Failed to process natural language configuration request');
    }
  }

  async recognizeIntent(dto: IntentRecognitionDto): Promise<IntentRecognitionResult> {
    this.logger.log('Recognizing user intent');

    try {
      const prompt = `
Analyze the following user input and recognize the intent:

User Input: "${dto.userInput}"
Context: ${JSON.stringify(dto.context)}
${dto.conversationHistory ? `Conversation History: ${JSON.stringify(dto.conversationHistory.slice(-5))}` : ''}

Identify the user's intent and extract relevant entities. Respond in JSON format:
{
  "intent": "create|modify|optimize|analyze|explain",
  "confidence": confidence_score_0_to_1,
  "entities": {
    "configurationType": "agent|tool|workflow|widget",
    "targetFeatures": ["list", "of", "features"],
    "constraints": ["list", "of", "constraints"],
    "preferences": {"key": "value"},
    "complexity": "simple|intermediate|advanced"
  },
  "suggestedActions": ["list", "of", "suggested", "next", "steps"],
  "clarificationNeeded": ["questions", "to", "ask", "user", "if", "unclear"]
}
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert intent recognition system for AI configuration. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);
      this.logger.log(`Recognized intent: ${result.intent} with confidence: ${result.confidence}`);

      return result;
    } catch (error) {
      this.logger.error('Failed to recognize intent', error);
      throw new Error('Failed to recognize user intent');
    }
  }

  async generateContextAwareSuggestions(
    dto: ConfigurationSuggestionDto,
    userId: string,
    organizationId: string
  ): Promise<ConfigurationSuggestion[]> {
    this.logger.log('Generating context-aware suggestions');

    try {
      const prompt = `
Generate intelligent configuration suggestions based on:

Current Configuration: ${JSON.stringify(dto.currentConfiguration)}
User Intent: ${dto.userIntent}
Context: ${JSON.stringify(dto.context)}
${dto.performanceMetrics ? `Performance Metrics: ${JSON.stringify(dto.performanceMetrics)}` : ''}

Generate 3-5 suggestions in JSON format:
{
  "suggestions": [
    {
      "confidence": confidence_score_0_to_1,
      "suggestedConfig": {configuration_object},
      "explanation": "Why this suggestion is relevant",
      "alternatives": [
        {
          "config": {alternative_config},
          "description": "Description of this alternative",
          "pros": ["advantages"],
          "cons": ["disadvantages"],
          "useCase": "Best use case for this alternative"
        }
      ],
      "expectedImprovements": {
        "performance": "expected performance improvement",
        "usability": "expected usability improvement",
        "maintainability": "expected maintainability improvement"
      }
    }
  ]
}
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert configuration advisor. Generate practical, context-aware suggestions in valid JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 2500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);

      // Validate each suggestion
      const suggestions = await Promise.all(
        result.suggestions.map(async (suggestion: any) => ({
          ...suggestion,
          validationResults: await this.validateConfiguration(
            suggestion.suggestedConfig,
            this.inferConfigurationType(suggestion.suggestedConfig)
          ),
        }))
      );

      this.logger.log(`Generated ${suggestions.length} context-aware suggestions`);
      return suggestions;
    } catch (error) {
      this.logger.error('Failed to generate context-aware suggestions', error);
      throw new Error('Failed to generate configuration suggestions');
    }
  }

  async validateAndOptimizeConfiguration(
    dto: ValidationOptimizationDto,
    userId: string,
    organizationId: string
  ): Promise<{
    validationResults: ValidationResult[];
    optimizationSuggestions: OptimizationSuggestion[];
    optimizedConfiguration?: any;
  }> {
    this.logger.log('Validating and optimizing configuration');

    try {
      // Validate configuration
      const validationResults = await this.validateConfiguration(
        dto.configuration,
        dto.configurationType
      );

      // Generate optimization suggestions
      const optimizationPrompt = `
Analyze and optimize the following configuration:

Configuration: ${JSON.stringify(dto.configuration)}
Type: ${dto.configurationType}
Context: ${JSON.stringify(dto.context)}
${dto.targetMetrics ? `Target Metrics: ${JSON.stringify(dto.targetMetrics)}` : ''}

Provide optimization suggestions in JSON format:
{
  "optimizationSuggestions": [
    {
      "field": "field_name",
      "currentValue": current_value,
      "suggestedValue": suggested_value,
      "reasoning": "Why this optimization is recommended",
      "expectedImprovement": "Expected improvement description",
      "priority": "high|medium|low"
    }
  ],
  "optimizedConfiguration": {optimized_configuration_object},
  "performanceImpact": {
    "expectedSpeedImprovement": "percentage or description",
    "expectedAccuracyImprovement": "percentage or description",
    "expectedCostReduction": "percentage or description"
  }
}
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert configuration optimizer. Provide detailed, actionable optimization suggestions in valid JSON format.',
          },
          {
            role: 'user',
            content: optimizationPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);

      this.logger.log(
        `Generated ${result.optimizationSuggestions?.length || 0} optimization suggestions`
      );

      return {
        validationResults,
        optimizationSuggestions: result.optimizationSuggestions || [],
        optimizedConfiguration: result.optimizedConfiguration,
      };
    } catch (error) {
      this.logger.error('Failed to validate and optimize configuration', error);
      throw new Error('Failed to validate and optimize configuration');
    }
  }

  async processLearningFeedback(
    dto: LearningFeedbackDto,
    userId: string,
    organizationId: string
  ): Promise<void> {
    this.logger.log('Processing learning feedback');

    try {
      // Store feedback for learning
      const feedbackKey = `${organizationId}_${userId}_${Date.now()}`;
      this.learningData.set(feedbackKey, {
        configuration: dto.generatedConfiguration,
        feedback: dto.userFeedback,
        metrics: dto.successMetrics,
        rating: dto.satisfactionRating,
        context: dto.context,
        timestamp: new Date(),
      });

      // Analyze feedback to improve future suggestions
      const analysisPrompt = `
Analyze this user feedback to improve future configuration suggestions:

Generated Configuration: ${JSON.stringify(dto.generatedConfiguration)}
User Feedback: ${dto.userFeedback}
Success Metrics: ${JSON.stringify(dto.successMetrics || {})}
Satisfaction Rating: ${dto.satisfactionRating || 'Not provided'}
Context: ${JSON.stringify(dto.context)}

Provide learning insights in JSON format:
{
  "insights": ["key", "insights", "from", "this", "feedback"],
  "improvementAreas": ["areas", "where", "suggestions", "can", "be", "improved"],
  "successFactors": ["factors", "that", "contributed", "to", "success"],
  "patterns": ["patterns", "identified", "in", "user", "preferences"],
  "recommendations": ["recommendations", "for", "future", "suggestions"]
}
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert learning system analyzer. Extract actionable insights from user feedback.',
          },
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const insights = JSON.parse(content);
        this.logger.log(
          `Processed feedback insights: ${insights.insights?.length || 0} insights identified`
        );

        // Store insights for future use
        const insightsKey = `insights_${organizationId}_${userId}`;
        const existingInsights = this.learningData.get(insightsKey) || [];
        existingInsights.push({
          ...insights,
          timestamp: new Date(),
        });
        this.learningData.set(insightsKey, existingInsights);
      }

      this.logger.log('Learning feedback processed successfully');
    } catch (error) {
      this.logger.error('Failed to process learning feedback', error);
      // Don't throw error for learning feedback as it's not critical
    }
  }

  private buildConfigurationPrompt(
    dto: ProcessNaturalLanguageDto,
    intentResult: IntentRecognitionResult
  ): string {
    return `
Generate a ${dto.configurationType} configuration based on this natural language description:

Description: "${dto.description}"
Recognized Intent: ${intentResult.intent}
Extracted Entities: ${JSON.stringify(intentResult.entities)}
Context: ${JSON.stringify(dto.context)}
${dto.additionalRequirements ? `Additional Requirements: ${dto.additionalRequirements.join(', ')}` : ''}
${dto.targetLanguage ? `Target Language: ${dto.targetLanguage}` : ''}

Generate a comprehensive configuration in JSON format:
{
  "confidence": confidence_score_0_to_1,
  "suggestedConfig": {
    // Complete configuration object based on type
  },
  "explanation": "Detailed explanation of the generated configuration",
  "alternatives": [
    {
      "config": {alternative_configuration},
      "description": "Description of this alternative approach",
      "pros": ["advantages"],
      "cons": ["disadvantages"],
      "useCase": "Best use case for this alternative"
    }
  ],
  "implementationSteps": ["step1", "step2", "step3"],
  "considerations": ["important", "considerations", "for", "implementation"],
  "estimatedComplexity": "simple|intermediate|advanced",
  "estimatedTime": "estimated implementation time"
}

Make the configuration production-ready and optimized for the described use case.
`;
  }

  private getSystemPrompt(configurationType: ConfigurationType): string {
    const basePrompt =
      'You are an expert AI configuration generator. Always respond with valid JSON.';

    switch (configurationType) {
      case ConfigurationType.AGENT:
        return `${basePrompt} You specialize in creating AI agent configurations with optimal prompts, model selection, and tool integration.`;
      case ConfigurationType.TOOL:
        return `${basePrompt} You specialize in creating tool configurations with proper API integration, authentication, and parameter mapping.`;
      case ConfigurationType.WORKFLOW:
        return `${basePrompt} You specialize in creating workflow configurations with optimal step sequencing, error handling, and state management.`;
      case ConfigurationType.WIDGET:
        return `${basePrompt} You specialize in creating widget configurations with proper embedding, styling, and interaction handling.`;
      default:
        return basePrompt;
    }
  }

  private async validateConfiguration(
    configuration: any,
    configurationType: ConfigurationType
  ): Promise<ValidationResult[]> {
    const validationResults: ValidationResult[] = [];

    try {
      // Basic validation rules based on configuration type
      switch (configurationType) {
        case ConfigurationType.AGENT:
          if (!configuration.prompt) {
            validationResults.push({
              field: 'prompt',
              status: 'error',
              message: 'Agent prompt is required',
              suggestion: 'Add a comprehensive system prompt that defines the agent behavior',
            });
          }
          if (!configuration.model) {
            validationResults.push({
              field: 'model',
              status: 'error',
              message: 'AI model selection is required',
              suggestion: 'Choose an appropriate model like gpt-4, gpt-3.5-turbo, or claude-3-opus',
            });
          }
          break;

        case ConfigurationType.TOOL:
          if (!configuration.endpoint && !configuration.function) {
            validationResults.push({
              field: 'endpoint',
              status: 'error',
              message: 'Tool endpoint or function is required',
              suggestion: 'Specify either an API endpoint or a function definition',
            });
          }
          break;

        case ConfigurationType.WORKFLOW:
          if (!configuration.steps || !Array.isArray(configuration.steps)) {
            validationResults.push({
              field: 'steps',
              status: 'error',
              message: 'Workflow steps are required',
              suggestion: 'Define an array of workflow steps with proper sequencing',
            });
          }
          break;

        case ConfigurationType.WIDGET:
          if (!configuration.type) {
            validationResults.push({
              field: 'type',
              status: 'error',
              message: 'Widget type is required',
              suggestion: 'Specify the widget type (chat, form, display, etc.)',
            });
          }
          break;
      }

      // Add success validation if no errors found
      if (validationResults.filter((r) => r.status === 'error').length === 0) {
        validationResults.push({
          field: 'overall',
          status: 'valid',
          message: 'Configuration is valid and ready for use',
        });
      }
    } catch (error) {
      validationResults.push({
        field: 'validation',
        status: 'error',
        message: 'Failed to validate configuration',
        suggestion: 'Check configuration format and required fields',
      });
    }

    return validationResults;
  }

  private inferConfigurationType(configuration: any): ConfigurationType {
    if (configuration.prompt || configuration.model) {
      return ConfigurationType.AGENT;
    }
    if (configuration.endpoint || configuration.function) {
      return ConfigurationType.TOOL;
    }
    if (configuration.steps) {
      return ConfigurationType.WORKFLOW;
    }
    if (configuration.type && configuration.embed) {
      return ConfigurationType.WIDGET;
    }
    return ConfigurationType.AGENT; // Default fallback
  }
}
