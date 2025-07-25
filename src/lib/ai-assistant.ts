  import { OpenAI } from "openai";

export interface AgentConfiguration {
  name: string;
  description: string;
  category: string;
  personality: string;
  model: string;
  temperature: number;
  memoryEnabled: boolean;
  contextWindow: number;
  tone: string;
  style: string;
  traits: string[];
  capabilities: string[];
  knowledgeSources: string[];
  tools: string[];
}

export interface IntentAnalysis {
  category: string;
  confidence: number;
  suggestedPersonality: string;
  suggestedModel: string;
  suggestedCapabilities: string[];
  reasoning: string;
  complexity: string;
}

export interface ConfigurationSuggestion {
  field: keyof AgentConfiguration;
  value: any;
  reasoning: string;
  confidence: number;
}

export interface ProgressiveDisclosure {
  userLevel: "beginner" | "intermediate" | "advanced";
  visibleFields: string[];
  recommendedNextSteps: string[];
}

export class AIConfigurationAssistant {
  public openai: OpenAI;
  private readonly systemPrompt = `You are an AI configuration assistant that helps users create AI agents. Your role is to:
1. Analyze user descriptions to understand their intent
2. Suggest optimal configurations based on use cases
3. Provide smart defaults for technical settings
4. Guide users through progressive configuration disclosure

Always respond with valid JSON and provide clear reasoning for your suggestions.`;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || "",
      dangerouslyAllowBrowser: true,
    });
  }

  async analyzeIntent(userDescription: string): Promise<IntentAnalysis> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: this.systemPrompt },
          {
            role: "user",
            content: `Analyze this agent description and provide intent analysis: "${userDescription}"
            
Respond with JSON in this format:
            {
              "category": "customer-support|sales|marketing|hr|it|other",
              "confidence": 0.0-1.0,
              "suggestedPersonality": "helpful|professional|friendly|technical|creative|concise",
              "suggestedModel": "gpt-4|gpt-3.5-turbo|claude-3-opus|claude-3-sonnet|gemini-pro|mistral-large",
              "suggestedCapabilities": ["web-search", "image-generation", "data-analysis", "email", "calendar"],
              "reasoning": "explanation of analysis"
            }`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("No response from AI");

      return JSON.parse(content) as IntentAnalysis;
    } catch (error) {
      console.error("Intent analysis error:", error);
      return {
        category: "other",
        confidence: 0.5,
        suggestedPersonality: "helpful",
        suggestedModel: "gpt-3.5-turbo",
        suggestedCapabilities: ["web-search"],
        reasoning: "Default configuration due to analysis error",
        complexity: "simple",
      };
    }
  }

  async generateConfigurationSuggestions(
    userDescription: string,
    currentConfig: Partial<AgentConfiguration>,
  ): Promise<ConfigurationSuggestion[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: this.systemPrompt },
          {
            role: "user",
            content: `Based on this description: "${userDescription}"
And current config: ${JSON.stringify(currentConfig)}

Provide configuration suggestions as JSON array:
[
  {
    "field": "temperature|contextWindow|personality|model|etc",
    "value": "suggested_value",
    "reasoning": "why this suggestion",
    "confidence": 0.0-1.0
  }
]`,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("No response from AI");

      return JSON.parse(content) as ConfigurationSuggestion[];
    } catch (error) {
      console.error("Configuration suggestions error:", error);
      return [];
    }
  }

  generateSmartDefaults(
    analysis: IntentAnalysis,
    semanticAnalysis: SemanticAnalysis,
  ): SmartDefault[] {
    const defaults: Record<string, Partial<AgentConfiguration>> = {
      "customer-support": {
        model: "gpt-4",
        temperature: 0.3,
        memoryEnabled: true,
        contextWindow: 15,
        tone: "friendly",
        style: "conversational",
        traits: ["empathetic", "patient", "solution-oriented"],
        capabilities: ["web-search", "knowledge-base"],
        tools: ["ticket-system", "knowledge-search"],
      },
      sales: {
        model: "gpt-4",
        temperature: 0.5,
        memoryEnabled: true,
        contextWindow: 20,
        tone: "professional",
        style: "persuasive",
        traits: ["confident", "goal-oriented", "relationship-focused"],
        capabilities: ["web-search", "data-analysis"],
        tools: ["crm-integration", "lead-scoring"],
      },
      marketing: {
        model: "gpt-4",
        temperature: 0.7,
        memoryEnabled: true,
        contextWindow: 12,
        tone: "creative",
        style: "engaging",
        traits: ["creative", "trend-aware", "brand-conscious"],
        capabilities: ["image-generation", "web-search"],
        tools: ["social-media", "content-generator"],
      },
      hr: {
        model: "gpt-3.5-turbo",
        temperature: 0.4,
        memoryEnabled: true,
        contextWindow: 10,
        tone: "professional",
        style: "supportive",
        traits: ["confidential", "supportive", "policy-aware"],
        capabilities: ["document-search", "calendar"],
        tools: ["hr-system", "policy-database"],
      },
      it: {
        model: "gpt-4",
        temperature: 0.2,
        memoryEnabled: true,
        contextWindow: 25,
        tone: "technical",
        style: "instructional",
        traits: ["precise", "methodical", "troubleshooting-focused"],
        capabilities: ["web-search", "code-analysis"],
        tools: ["monitoring-system", "documentation"],
      },
    };

    const personalityAdjustments: Record<
      string,
      Partial<AgentConfiguration>
    > = {
      creative: { temperature: 0.8 },
      technical: { temperature: 0.2, contextWindow: 20 },
      friendly: { tone: "casual" },
      professional: { tone: "formal", style: "business" },
      concise: { contextWindow: 8 },
    };

    const baseDefaults = defaults[analysis.category] || defaults["customer-support"];
    const personalityOverrides = personalityAdjustments[analysis.suggestedPersonality] || {};
    const smartDefaults: SmartDefault[] = [];
    for (const [field, value] of Object.entries(baseDefaults)) {
      smartDefaults.push({
        field: field as keyof AgentConfiguration,
        value,
        reasoning: `Default value for ${field}`,
        confidence: 0.8,
        source: "ai-analysis",
        adaptable: true,
      });
    }
    for (const [field, value] of Object.entries(personalityOverrides)) {
      smartDefaults.push({
        field: field as keyof AgentConfiguration,
        value,
        reasoning: `Personality override for ${field}`,
        confidence: 0.8,
        source: "ai-analysis",
        adaptable: true,
        });
    }
    return smartDefaults;
  }

  determineProgressiveDisclosure(
    userExperience: "beginner" | "intermediate" | "advanced",
    currentStep: number,
  ): ProgressiveDisclosure {
    const fieldsByLevel = {
      beginner: {
        1: ["name", "description", "category"],
        2: ["personality"],
        3: ["model"],
        4: ["capabilities"],
      },
      intermediate: {
        1: ["name", "description", "category"],
        2: ["personality", "tone", "style"],
        3: ["model", "temperature"],
        4: ["capabilities", "tools", "memoryEnabled"],
      },
      advanced: {
        1: ["name", "description", "category"],
        2: ["personality", "tone", "style", "traits"],
        3: ["model", "temperature", "contextWindow", "memoryEnabled"],
        4: ["capabilities", "tools", "knowledgeSources"],
      },
    };

    const nextStepsByLevel = {
      beginner: {
        1: ["Choose a personality that matches your use case"],
        2: ["Select an AI model (GPT-4 recommended for best results)"],
        3: ["Add capabilities your agent will need"],
        4: ["Review and test your agent"],
      },
      intermediate: {
        1: ["Customize personality and communication style"],
        2: ["Fine-tune AI model and creativity settings"],
        3: ["Configure capabilities and enable memory"],
        4: ["Review and test your agent"],
      },
      advanced: {
        1: ["Define detailed personality traits and behavior"],
        2: ["Optimize model parameters and memory settings"],
        3: ["Configure advanced capabilities and knowledge sources"],
        4: ["Review and test your agent"],
      },
    };

    const visibleFields = fieldsByLevel[userExperience][currentStep as keyof typeof fieldsByLevel[typeof userExperience]] || [];
    const recommendedNextSteps = nextStepsByLevel[userExperience][
      (currentStep + 1) as keyof typeof nextStepsByLevel[typeof userExperience]
    ] as string[] || ["Complete agent creation"];

    return {
      userLevel: userExperience,
      visibleFields,
      recommendedNextSteps,
    };
  }

  async optimizeConfiguration(
    config: Partial<AgentConfiguration>,
    usageContext: string,
  ): Promise<{
    optimizedConfig: Partial<AgentConfiguration>;
    improvements: string[];
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: this.systemPrompt },
          {
            role: "user",
            content: `Optimize this agent configuration for: "${usageContext}"
Current config: ${JSON.stringify(config)}

Respond with JSON:
{
  "optimizedConfig": { /* optimized configuration */ },
  "improvements": ["list of improvements made"]
}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 600,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("No response from AI");

        return JSON.parse(content) as {
        optimizedConfig: Partial<AgentConfiguration>;
        improvements: string[];
      };
    } catch (error) {
      console.error("Configuration optimization error:", error);
      return {
        optimizedConfig: config,
        improvements: ["Unable to optimize configuration at this time"],
      };
    }
  }

  validateConfiguration(config: Partial<AgentConfiguration>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
    readinessScore: number;
    completeness: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields validation
    if (!config.name || config.name.trim().length < 3) {
      errors.push("Agent name must be at least 3 characters long");
    }

    if (!config.description || config.description.trim().length < 10) {
      errors.push("Agent description must be at least 10 characters long");
    }

    // Parameter validation
    if (
      config.temperature !== undefined &&
      (config.temperature < 0 || config.temperature > 1)
    ) {
      errors.push("Temperature must be between 0 and 1");
    }

    if (
      config.contextWindow !== undefined &&
      (config.contextWindow < 1 || config.contextWindow > 50)
    ) {
      errors.push("Context window must be between 1 and 50 messages");
    }

    // Warnings for suboptimal configurations
    if (config.temperature && config.temperature > 0.9) {
      warnings.push("Very high temperature may produce inconsistent responses");
    }

    if (config.contextWindow && config.contextWindow > 30) {
      warnings.push(
        "Large context window may increase response time and costs",
      );
    }

    // Suggestions for improvements
    if (!config.category) {
      suggestions.push("Consider specifying a category to get better defaults");
    }

    if (!config.personality) {
      suggestions.push(
        "Define a personality to make responses more consistent",
      );
    }

    if (!config.capabilities || config.capabilities.length === 0) {
      suggestions.push(
        "Add capabilities to enhance your agent's functionality",
      );
    }

    // Calculate completeness score
    const totalFields = Object.keys({
      name: "",
      description: "",
      category: "",
      personality: "",
      model: "",
      temperature: 0,
      memoryEnabled: false,
      contextWindow: 0,
      tone: "",
      style: "",
      traits: [],
      capabilities: [],
      knowledgeSources: [],
      tools: [],
    } as AgentConfiguration).length;

    const completedFields = Object.keys(config).filter(
      (key) =>
        config[key as keyof AgentConfiguration] !== undefined &&
        config[key as keyof AgentConfiguration] !== null &&
        config[key as keyof AgentConfiguration] !== "",
    ).length;

    const completeness = Math.round((completedFields / totalFields) * 100);

    // Calculate readiness score
    let readinessScore = completeness;

    // Deduct points for errors and warnings
    readinessScore -= errors.length * 20;
    readinessScore -= warnings.length * 10;

    // Bonus points for good practices
    if (config.memoryEnabled) readinessScore += 5;
    if (config.capabilities && config.capabilities.length > 0)
      readinessScore += 10;
    if (config.tools && config.tools.length > 0) readinessScore += 5;

    readinessScore = Math.max(0, Math.min(100, readinessScore));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      readinessScore,
      completeness,
    };
  }
}

// Advanced NLP processing methods
export interface SemanticAnalysis {
  entities: Array<{
    text: string;
    type: string;
    confidence: number;
  }>;
  intents: Array<{
    intent: string;
    confidence: number;
  }>;
  sentiment: {
    score: number;
    label: "positive" | "negative" | "neutral";
  };
  keywords: string[];
  complexity: number;
  domain: string;
}

export interface SmartDefault {
  field: keyof AgentConfiguration;
  value: any;
  reasoning: string;
  confidence: number;
  source: "ai-analysis" | "best-practice" | "user-pattern" | "domain-specific";
  adaptable: boolean;
}

export interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  config: Partial<AgentConfiguration>;
  useCases: string[];
  popularity: number;
  successRate: number;
}

// Extend the main class with advanced methods
class AIConfigurationAssistantExtended extends AIConfigurationAssistant {
  async performSemanticAnalysis(text: string): Promise<SemanticAnalysis> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are an expert NLP analyst. Extract semantic information from text.",
          },
          {
            role: "user",
            content: `Perform semantic analysis on: "${text}"\n\nReturn JSON:\n{\n  "entities": [{"text": "entity", "type": "PERSON|ORG|TECH|CONCEPT", "confidence": 0.0-1.0}],\n  "intents": [{"intent": "intent_name", "confidence": 0.0-1.0}],\n  "sentiment": {"score": -1.0-1.0, "label": "positive|negative|neutral"},\n  "keywords": ["key", "words"],\n  "complexity": 0.0-1.0,\n  "domain": "domain_name"\n}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 600,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("No response from AI");

      return JSON.parse(content) as SemanticAnalysis;
    } catch (error) {
      console.error("Semantic analysis error:", error);
      return {
        entities: [],
        intents: [],
        sentiment: { score: 0, label: "neutral" },
        keywords: [],
        complexity: 0.5,
        domain: "general",
      };
    }
  }

  generateSmartDefaults(
    analysis: IntentAnalysis,
    semanticAnalysis: SemanticAnalysis,
    userContext?: {
      experience: string;
      industry: string;
      previousConfigs: Partial<AgentConfiguration>[];
    },
  ): SmartDefault[] {
    const defaults: SmartDefault[] = [];

    // AI-driven model selection
    let recommendedModel = "gpt-3.5-turbo";
    let modelReasoning = "Balanced performance and cost";
    let modelConfidence = 0.7;

    if (
      (analysis as IntentAnalysis).complexity === "complex" ||
      semanticAnalysis.complexity > 0.7 
    ) {
      recommendedModel = "gpt-4";
      modelReasoning = "Complex use case requires advanced reasoning";
      modelConfidence = 0.9;
    } else if (
      analysis.category === "customer-support" &&
      semanticAnalysis.sentiment.score > 0.5
    ) {
      recommendedModel = "gpt-4";
      modelReasoning = "Customer support benefits from empathetic responses";
      modelConfidence = 0.8;
    }

    defaults.push({
      field: "model",
      value: recommendedModel,
      reasoning: modelReasoning,
      confidence: modelConfidence,
      source: "ai-analysis",
      adaptable: true,
    });

    // Temperature based on use case and sentiment
    let temperature = 0.7;
    let tempReasoning = "Balanced creativity and consistency";

    if (
      analysis.category === "technical" ||
      semanticAnalysis.domain === "technical"
    ) {
      temperature = 0.2;
      tempReasoning = "Technical content requires precision";
    } else if (
      analysis.category === "creative" ||
      semanticAnalysis.keywords.includes("creative")
    ) {
      temperature = 0.8;
      tempReasoning = "Creative tasks benefit from higher variability";
    } else if (analysis.category === "customer-support") {
      temperature = 0.4;
      tempReasoning = "Support responses should be consistent but personable";
    }

    defaults.push({
      field: "temperature",
      value: temperature,
      reasoning: tempReasoning,
      confidence: 0.8,
      source: "domain-specific",
      adaptable: true,
    });

    // Memory settings based on use case
    const memoryEnabled = ![
      "one-time",
      "simple-query",
      "calculation",
      "translation",
    ].some((keyword) => semanticAnalysis.keywords.includes(keyword));

    defaults.push({
      field: "memoryEnabled",
      value: memoryEnabled,
      reasoning: memoryEnabled
        ? "Conversational context improves user experience"
        : "Simple queries don't require conversation memory",
      confidence: 0.8,
      source: "best-practice",
      adaptable: false,
    });

    // Context window based on complexity
    let contextWindow = 10;
    if (
      (analysis as IntentAnalysis).complexity === "complex" ||
      semanticAnalysis.complexity > 0.8
    ) {
      contextWindow = 20;
    } else if (
      (analysis as IntentAnalysis).complexity === "simple" ||
      semanticAnalysis.complexity < 0.3
    ) {
      contextWindow = 5;
    }

    defaults.push({
      field: "contextWindow",
      value: contextWindow,
      reasoning: `${(analysis as IntentAnalysis).complexity} use case requires ${contextWindow} message context`,
      confidence: 0.7,
      source: "ai-analysis",
      adaptable: true,
    });

    // Capabilities based on detected intents and entities
    const capabilities: string[] = [];

    if (
      semanticAnalysis.entities.some(
        (e) => e.type === "ORG" || e.type === "PERSON",
      )
    ) {
      capabilities.push("web-search");
    }

    if (
      semanticAnalysis.keywords.some((k) =>
        ["image", "visual", "picture", "generate"].includes(k),
      )
    ) {
      capabilities.push("image-generation");
    }

    if (
      semanticAnalysis.keywords.some((k) =>
        ["email", "message", "send", "notify"].includes(k),
      )
    ) {
      capabilities.push("email");
    }

    if (
      semanticAnalysis.keywords.some((k) =>
        ["schedule", "calendar", "meeting", "appointment"].includes(k),
      )
    ) {
      capabilities.push("calendar");
    }

    if (
      semanticAnalysis.keywords.some((k) =>
        ["data", "analyze", "report", "statistics"].includes(k),
      )
    ) {
      capabilities.push("data-analysis");
    }

    if (capabilities.length > 0) {
      defaults.push({
        field: "capabilities",
        value: capabilities,
        reasoning: "Detected capabilities based on use case description",
        confidence: 0.6,
        source: "ai-analysis",
        adaptable: true,
      });
    }

    return defaults;
  }

  async getConfigurationTemplates(
    category?: string,
    industry?: string,
  ): Promise<ConfigurationTemplate[]> {
    // In a real implementation, this would fetch from a database
    // For now, return curated templates
    const templates: ConfigurationTemplate[] = [
      {
        id: "customer-support-saas",
        name: "SaaS Customer Support",
        description:
          "Optimized for SaaS customer support with technical knowledge",
        category: "customer-support",
        config: {
          personality: "helpful",
          model: "gpt-4",
          temperature: 0.3,
          memoryEnabled: true,
          contextWindow: 15,
          tone: "professional",
          style: "supportive",
          capabilities: ["web-search", "knowledge-base"],
        },
        useCases: [
          "Technical support",
          "Billing inquiries",
          "Feature explanations",
        ],
        popularity: 92,
        successRate: 87,
      },
      {
        id: "sales-lead-qualifier",
        name: "Sales Lead Qualifier",
        description: "Designed for qualifying and nurturing sales leads",
        category: "sales",
        config: {
          personality: "professional",
          model: "gpt-4",
          temperature: 0.5,
          memoryEnabled: true,
          contextWindow: 20,
          tone: "confident",
          style: "consultative",
          capabilities: ["web-search", "data-analysis"],
        },
        useCases: ["Lead qualification", "Product demos", "Objection handling"],
        popularity: 85,
        successRate: 79,
      },
      {
        id: "content-creator",
        name: "Content Creation Assistant",
        description: "Creative assistant for content generation and ideation",
        category: "marketing",
        config: {
          personality: "creative",
          model: "gpt-4",
          temperature: 0.8,
          memoryEnabled: true,
          contextWindow: 12,
          tone: "engaging",
          style: "creative",
          capabilities: ["image-generation", "web-search"],
        },
        useCases: ["Blog writing", "Social media", "Marketing copy"],
        popularity: 78,
        successRate: 82,
      },
    ];

    return templates.filter(
      (t) =>
        (!category || t.category === category) &&
        (!industry ||
          t.useCases.some((uc) =>
            uc.toLowerCase().includes(industry.toLowerCase()),
          )),
    );
  }

  async adaptConfigurationToUser(
    baseConfig: Partial<AgentConfiguration>,
    userFeedback: {
      satisfaction: number;
      responseQuality: number;
      responseSpeed: number;
      issues: string[];
    },
    usagePatterns: {
      averageConversationLength: number;
      commonTopics: string[];
      peakUsageHours: number[];
    },
  ): Promise<Partial<AgentConfiguration>> {
    const adaptedConfig = { ...baseConfig };

    // Adapt based on satisfaction scores
    if (userFeedback.satisfaction < 0.7) {
      if (userFeedback.responseQuality < 0.7) {
        // Improve quality by using better model or adjusting temperature
        if (adaptedConfig.model === "gpt-3.5-turbo") {
          adaptedConfig.model = "gpt-4";
        }
        if (adaptedConfig.temperature && adaptedConfig.temperature > 0.5) {
          adaptedConfig.temperature = Math.max(
            0.2,
            adaptedConfig.temperature - 0.2,
          );
        }
      }

      if (userFeedback.responseSpeed < 0.7) {
        // Improve speed by optimizing model or reducing context
        if (
          adaptedConfig.model === "gpt-4" &&
          userFeedback.responseQuality > 0.8
        ) {
          adaptedConfig.model = "gpt-3.5-turbo";
        }
        if (adaptedConfig.contextWindow && adaptedConfig.contextWindow > 10) {
          adaptedConfig.contextWindow = Math.max(
            5,
            adaptedConfig.contextWindow - 5,
          );
        }
      }
    }

    // Adapt based on usage patterns
    if (usagePatterns.averageConversationLength > 15) {
      adaptedConfig.memoryEnabled = true;
      adaptedConfig.contextWindow = Math.max(
        adaptedConfig.contextWindow || 10,
        20,
      );
    }

    // Add capabilities based on common topics
    const currentCapabilities = adaptedConfig.capabilities || [];
    if (
      usagePatterns.commonTopics.includes("images") &&
      !currentCapabilities.includes("image-generation")
    ) {
      adaptedConfig.capabilities = [...currentCapabilities, "image-generation"];
    }
    if (
      usagePatterns.commonTopics.includes("search") &&
      !currentCapabilities.includes("web-search")
    ) {
      adaptedConfig.capabilities = [...currentCapabilities, "web-search"];
    }

    return adaptedConfig;
  }
}

export const aiAssistant = new AIConfigurationAssistantExtended();
