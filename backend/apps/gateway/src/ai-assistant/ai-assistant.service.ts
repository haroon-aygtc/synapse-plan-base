import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, PromptTemplate } from '@database/entities';
import OpenAI from 'openai';
import {
  GenerateConfigDto,
  AnalyzeAgentDto,
  PromptSuggestionsDto,
  OptimizePromptDto,
  GenerateTestCasesDto,
  ExplainAgentDto,
  PersonalityProfileDto,
} from './dto';
import { AIProviderService } from '../ai-provider/ai-provider.service';

@Injectable()
export class AIAssistantService {
  private readonly logger = new Logger(AIAssistantService.name);
  private readonly openai: OpenAI;

  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(PromptTemplate)
    private readonly promptTemplateRepository: Repository<PromptTemplate>,
    private readonly configService: ConfigService,
    private readonly aiProviderService: AIProviderService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateAgentConfig(
    dto: GenerateConfigDto,
    userId: string,
    organizationId: string,
  ) {
    this.logger.log(`Generating agent config for user ${userId}`);

    try {
      const personalityDescription = this.buildPersonalityDescription(
        dto.personalityTraits,
      );
      const requirementsText = dto.requirements?.join(', ') || '';
      const constraintsText = dto.constraints?.join(', ') || '';

      const prompt = `
You are an AI agent configuration expert. Generate a comprehensive agent configuration based on the following requirements:

Description: ${dto.description}
Use Case: ${dto.useCase}
Personality Traits: ${personalityDescription}
${requirementsText ? `Requirements: ${requirementsText}` : ''}
${constraintsText ? `Constraints: ${constraintsText}` : ''}

Generate a JSON response with the following structure:
{
  "name": "Agent name (creative and relevant)",
  "description": "Detailed description of the agent's purpose and capabilities",
  "prompt": "Complete system prompt that defines the agent's behavior, personality, and capabilities",
  "model": "Recommended AI model (gpt-4, gpt-3.5-turbo, claude-3-opus, claude-3-sonnet)",
  "temperature": "Temperature value between 0.0 and 1.0",
  "maxTokens": "Recommended max tokens (500-4000)",
  "tools": ["array", "of", "recommended", "tool", "names"],
  "knowledgeSources": ["array", "of", "recommended", "knowledge", "sources"],
  "settings": {
    "enableStreaming": true/false,
    "enableMemory": true/false,
    "maxConversationLength": number,
    "responseFormat": "text/json/structured"
  },
  "metadata": {
    "category": "category name",
    "industry": "target industry",
    "complexity": "simple/intermediate/advanced",
    "estimatedCost": "low/medium/high"
  }
}

Make the configuration production-ready and optimized for the specified use case.
`;

      // Use AI Provider Service for real provider selection and execution
      const selectedProvider = await this.aiProviderService.selectProvider(
        organizationId,
        'AGENT_GENERATION' as any,
        'gpt-4',
        { userId, organizationId },
      );

      const completion = await this.aiProviderService.executeCompletion(
        {
          messages: [
            {
              role: 'system',
              content:
                'You are an expert AI agent configuration generator. Always respond with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          model: 'gpt-4',
          temperature: 0.3,
          maxTokens: 2000,
          executionType: 'AGENT_GENERATION' as any,
          resourceId: 'ai-assistant',
        },
        organizationId,
        userId,
      );

      const content = completion.content;
      if (!content) {
        this.logger.error('Empty response received from AI provider');
        throw new Error(
          'No response from AI provider. Please try again later.',
        );
      }

      const config = JSON.parse(content);

      this.logger.log(`Generated config for agent: ${config.name}`);
      return config;
    } catch (error) {
      this.logger.error('Failed to generate agent config', error);
      throw new Error('Failed to generate agent configuration');
    }
  }

  async analyzeAgent(
    dto: AnalyzeAgentDto,
    userId: string,
    organizationId: string,
  ) {
    this.logger.log(`Analyzing agent ${dto.name} for user ${userId}`);

    try {
      const prompt = `
Analyze the following AI agent configuration and provide detailed insights:

Agent Name: ${dto.name}
Description: ${dto.description || 'Not provided'}
Prompt: ${dto.prompt}
Model: ${dto.model}
Temperature: ${dto.temperature}
Tools: ${dto.tools?.join(', ') || 'None'}
Knowledge Sources: ${dto.knowledgeSources?.join(', ') || 'None'}
Performance Metrics: ${JSON.stringify(dto.performanceMetrics || {})}

Provide analysis in the following JSON format:
{
  "strengths": ["array of identified strengths"],
  "weaknesses": ["array of identified weaknesses"],
  "suggestions": ["array of improvement suggestions"],
  "optimizations": {
    "prompt": "optimized version of the prompt",
    "temperature": optimized_temperature_value,
    "tools": ["recommended", "tools", "to", "add"]
  },
  "performanceScore": score_out_of_100,
  "categories": ["relevant", "categories", "for", "this", "agent"],
  "riskAssessment": {
    "level": "low/medium/high",
    "concerns": ["potential", "risks"],
    "mitigations": ["risk", "mitigation", "strategies"]
  },
  "scalabilityAnalysis": {
    "currentCapacity": "assessment of current capacity",
    "bottlenecks": ["potential", "bottlenecks"],
    "recommendations": ["scaling", "recommendations"]
  }
}
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert AI agent analyzer. Provide thorough, actionable analysis in valid JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 2500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        this.logger.error('Empty response received from OpenAI');
        throw new Error('No response from AI');
      }

      const analysis = JSON.parse(content);

      this.logger.log(`Completed analysis for agent: ${dto.name}`);
      return analysis;
    } catch (error) {
      this.logger.error('Failed to analyze agent', error);
      throw new Error('Failed to analyze agent');
    }
  }

  async generatePromptSuggestions(
    dto: PromptSuggestionsDto,
    userId: string,
    organizationId: string,
  ) {
    this.logger.log(
      `Generating prompt suggestions for use case: ${dto.useCase}`,
    );

    try {
      const prompt = `
Generate 5 different prompt suggestions for the following requirements:

Use Case: ${dto.useCase}
Industry: ${dto.industry || 'General'}
Tone: ${dto.tone || 'Professional'}
Complexity: ${dto.complexity || 'intermediate'}

For each suggestion, provide:
{
  "suggestions": [
    {
      "title": "Descriptive title for the prompt",
      "description": "Brief description of what this prompt achieves",
      "prompt": "Complete system prompt text",
      "useCase": "Specific use case this prompt is optimized for",
      "category": "Category classification",
      "variables": ["list", "of", "customizable", "variables"],
      "strengths": ["key", "strengths", "of", "this", "approach"],
      "bestFor": ["scenarios", "where", "this", "works", "best"]
    }
  ]
}

Make each prompt unique and optimized for different aspects of the use case.
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert prompt engineer. Generate diverse, high-quality prompt suggestions in valid JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        this.logger.error('Empty response received from OpenAI');
        throw new Error('No response from AI');
      }

      const suggestions = JSON.parse(content);

      this.logger.log(
        `Generated ${suggestions.suggestions?.length || 0} prompt suggestions`,
      );
      return suggestions;
    } catch (error) {
      this.logger.error('Failed to generate prompt suggestions', error);
      throw new Error('Failed to generate prompt suggestions');
    }
  }

  async optimizePrompt(
    dto: OptimizePromptDto,
    userId: string,
    organizationId: string,
  ) {
    this.logger.log(`Optimizing prompt for use case: ${dto.useCase}`);

    try {
      const issuesText =
        dto.performanceIssues?.join(', ') || 'General optimization';
      const metricsText = dto.targetMetrics
        ? JSON.stringify(dto.targetMetrics)
        : 'Standard performance targets';

      const prompt = `
Optimize the following prompt for better performance:

Current Prompt: ${dto.currentPrompt}
Use Case: ${dto.useCase}
Performance Issues: ${issuesText}
Target Metrics: ${metricsText}

Provide optimization in the following JSON format:
{
  "optimizedPrompt": "The improved version of the prompt",
  "improvements": ["list of specific improvements made"],
  "expectedImprovements": {
    "accuracy": percentage_improvement,
    "responseTime": percentage_improvement,
    "relevance": percentage_improvement,
    "consistency": percentage_improvement
  },
  "reasoning": "Detailed explanation of the optimization strategy",
  "testingRecommendations": ["suggestions", "for", "testing", "the", "optimized", "prompt"],
  "potentialRisks": ["potential", "risks", "of", "the", "changes"],
  "rollbackPlan": "Strategy for reverting if optimization doesn't work"
}
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert prompt optimization specialist. Provide detailed, actionable optimizations in valid JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        this.logger.error('Empty response received from OpenAI');
        throw new Error('No response from AI');
      }

      const optimization = JSON.parse(content);

      this.logger.log(`Completed prompt optimization`);
      return optimization;
    } catch (error) {
      this.logger.error('Failed to optimize prompt', error);
      throw new Error('Failed to optimize prompt');
    }
  }

  async generateTestCases(
    dto: GenerateTestCasesDto,
    userId: string,
    organizationId: string,
  ) {
    this.logger.log(
      `Generating ${dto.testType} test cases for use case: ${dto.useCase}`,
    );

    try {
      const count = dto.count || 5;
      const prompt = `
Generate ${count} comprehensive test cases for the following agent:

Agent Prompt: ${dto.agentPrompt}
Use Case: ${dto.useCase}
Test Type: ${dto.testType}

Generate test cases in the following JSON format:
{
  "testCases": [
    {
      "name": "Descriptive test case name",
      "description": "What this test case validates",
      "input": {
        "message": "User input message",
        "context": {"any": "additional context"},
        "metadata": {"test": "metadata"}
      },
      "expectedOutput": {
        "response": "Expected response pattern or content",
        "tone": "Expected tone",
        "accuracy": "Expected accuracy level"
      },
      "criteria": ["success", "criteria", "for", "this", "test"],
      "priority": "high/medium/low",
      "category": "functional/performance/security/usability",
      "estimatedDuration": "Expected test duration in seconds"
    }
  ]
}

Make test cases comprehensive and cover edge cases, typical scenarios, and stress conditions.
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert test case generator for AI agents. Create comprehensive, realistic test scenarios in valid JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 3000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        this.logger.error('Empty response received from OpenAI');
        throw new Error('No response from AI');
      }

      const testCases = JSON.parse(content);

      this.logger.log(
        `Generated ${testCases.testCases?.length || 0} test cases`,
      );
      return testCases;
    } catch (error) {
      this.logger.error('Failed to generate test cases', error);
      throw new Error('Failed to generate test cases');
    }
  }

  async explainAgent(
    dto: ExplainAgentDto,
    userId: string,
    organizationId: string,
  ) {
    this.logger.log(`Explaining agent: ${dto.name}`);

    try {
      const prompt = `
Provide a comprehensive explanation of the following AI agent:

Agent Name: ${dto.name}
Prompt: ${dto.prompt}
Model: ${dto.model}
Tools: ${dto.tools?.join(', ') || 'None'}
Knowledge Sources: ${dto.knowledgeSources?.join(', ') || 'None'}

Provide explanation in the following JSON format:
{
  "explanation": "Comprehensive explanation of what this agent does and how it works",
  "capabilities": ["specific", "capabilities", "of", "the", "agent"],
  "limitations": ["known", "limitations", "and", "constraints"],
  "bestUseCases": ["scenarios", "where", "this", "agent", "excels"],
  "technicalDetails": {
    "architecture": "Description of the agent's architecture",
    "processingFlow": "How the agent processes requests",
    "integrations": ["external", "systems", "it", "can", "integrate", "with"],
    "scalability": "Scalability characteristics"
  },
  "userGuidance": {
    "howToUse": "Instructions for using the agent effectively",
    "bestPractices": ["best", "practices", "for", "interaction"],
    "commonMistakes": ["mistakes", "to", "avoid"],
    "troubleshooting": ["common", "issues", "and", "solutions"]
  },
  "businessValue": {
    "benefits": ["business", "benefits", "this", "agent", "provides"],
    "roi": "Expected return on investment",
    "metrics": ["key", "metrics", "to", "track"]
  }
}
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert AI agent explainer. Provide clear, comprehensive explanations that both technical and non-technical users can understand.',
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
        this.logger.error('Empty response received from OpenAI');
        throw new Error('No response from AI');
      }

      const explanation = JSON.parse(content);

      this.logger.log(`Generated explanation for agent: ${dto.name}`);
      return explanation;
    } catch (error) {
      this.logger.error('Failed to explain agent', error);
      throw new Error('Failed to explain agent');
    }
  }

  async generatePersonalityProfile(
    dto: PersonalityProfileDto,
    userId: string,
    organizationId: string,
  ) {
    this.logger.log(`Generating personality profile for user ${userId}`);

    try {
      const traitsDescription = Object.entries(dto.traits)
        .map(([trait, value]) => `${trait}: ${value}%`)
        .join(', ');

      const prompt = `
Generate a comprehensive personality profile based on these traits:

${traitsDescription}

Provide the profile in the following JSON format:
{
  "profile": "Comprehensive personality description",
  "characteristics": ["key", "personality", "characteristics"],
  "communicationStyle": "Description of how this personality communicates",
  "strengths": ["personality", "strengths"],
  "potentialIssues": ["potential", "issues", "or", "challenges"],
  "recommendations": ["recommendations", "for", "optimization"],
  "interactionGuidelines": {
    "doThis": ["things", "that", "work", "well"],
    "avoidThis": ["things", "to", "avoid"],
    "adaptFor": ["situations", "requiring", "adaptation"]
  },
  "useCaseAlignment": {
    "bestFor": ["use", "cases", "this", "personality", "excels", "at"],
    "notIdealFor": ["use", "cases", "to", "avoid"],
    "modifications": ["suggested", "modifications", "for", "different", "contexts"]
  }
}
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert personality analyst for AI agents. Provide detailed, actionable personality profiles in valid JSON format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        this.logger.error('Empty response received from OpenAI');
        throw new Error('No response from AI');
      }

      const profile = JSON.parse(content);

      this.logger.log(`Generated personality profile`);
      return profile;
    } catch (error) {
      this.logger.error('Failed to generate personality profile', error);
      throw new Error('Failed to generate personality profile');
    }
  }

  private buildPersonalityDescription(traits: Record<string, number>): string {
    return Object.entries(traits)
      .map(([trait, value]) => {
        const level =
          value >= 80
            ? 'very high'
            : value >= 60
              ? 'high'
              : value >= 40
                ? 'moderate'
                : value >= 20
                  ? 'low'
                  : 'very low';
        return `${trait}: ${level} (${value}%)`;
      })
      .join(', ');
  }
}
