import OpenAI from "openai";

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
  private openai: OpenAI;
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

      return JSON.parse(content);
    } catch (error) {
      console.error("Intent analysis error:", error);
      return {
        category: "other",
        confidence: 0.5,
        suggestedPersonality: "helpful",
        suggestedModel: "gpt-3.5-turbo",
        suggestedCapabilities: ["web-search"],
        reasoning: "Default configuration due to analysis error",
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

      return JSON.parse(content);
    } catch (error) {
      console.error("Configuration suggestions error:", error);
      return [];
    }
  }

  generateSmartDefaults(
    category: string,
    personality: string,
  ): Partial<AgentConfiguration> {
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

    const baseDefaults = defaults[category] || defaults["customer-support"];
    const personalityOverrides = personalityAdjustments[personality] || {};

    return { ...baseDefaults, ...personalityOverrides };
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

    const visibleFields = fieldsByLevel[userExperience][currentStep] || [];
    const recommendedNextSteps = nextStepsByLevel[userExperience][
      currentStep + 1
    ] || ["Complete agent creation"];

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

      return JSON.parse(content);
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
  } {
    const errors: string[] = [];

    if (!config.name || config.name.trim().length < 3) {
      errors.push("Agent name must be at least 3 characters long");
    }

    if (!config.description || config.description.trim().length < 10) {
      errors.push("Agent description must be at least 10 characters long");
    }

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

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const aiAssistant = new AIConfigurationAssistant();
