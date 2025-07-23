import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface AIGeneratedConfig {
  name: string;
  description: string;
  prompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  tools: string[];
  knowledgeSources: string[];
  settings: Record<string, any>;
  metadata: Record<string, any>;
}

export interface AgentAnalysis {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  optimizations: {
    prompt: string;
    temperature: number;
    tools: string[];
  };
  performanceScore: number;
  categories: string[];
}

export interface PromptSuggestion {
  title: string;
  description: string;
  prompt: string;
  useCase: string;
  category: string;
  variables: string[];
}

export function useAIAssistant() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const generateAgentConfig = useCallback(async (params: {
    description: string;
    useCase: string;
    personalityTraits: Record<string, number>;
    requirements?: string[];
    constraints?: string[];
  }): Promise<AIGeneratedConfig> => {
    if (!user) throw new Error('User not authenticated');

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai-assistant/generate-config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate configuration');
      }
    } catch (error) {
      console.error('Error generating config:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [user]);

  const analyzeAgent = useCallback(async (agentData: {
    name: string;
    description?: string;
    prompt: string;
    model: string;
    temperature: number;
    tools?: string[];
    knowledgeSources?: string[];
    performanceMetrics?: Record<string, any>;
  }): Promise<AgentAnalysis> => {
    if (!user) throw new Error('User not authenticated');

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai-assistant/analyze-agent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to analyze agent');
      }
    } catch (error) {
      console.error('Error analyzing agent:', error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, [user]);

  const generatePromptSuggestions = useCallback(async (params: {
    useCase: string;
    industry?: string;
    tone?: string;
    complexity?: 'simple' | 'intermediate' | 'advanced';
  }): Promise<PromptSuggestion[]> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('synapse_access_token');
      
      const response = await fetch(`${apiUrl}/ai-assistant/prompt-suggestions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        const result = await response.json();
        return result.data || result;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate prompt suggestions');
      }
    } catch (error) {
      console.error('Error generating prompt suggestions:', error);
      throw error;
    }
  }, [user]);

  const optimizePrompt = useCallback(async (params: {
    currentPrompt: string;
    useCase: string;
    performanceIssues?: string[];
    targetMetrics?: Record<string, number>;
  }): Promise<{
    optimizedPrompt: string;
    improvements: string[];
    expectedImprovements: Record<string, number>;
  }> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch('/api/ai-assistant/optimize-prompt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to optimize prompt');
      }
    } catch (error) {
      console.error('Error optimizing prompt:', error);
      throw error;
    }
  }, [user]);

  const generateTestCases = useCallback(async (params: {
    agentPrompt: string;
    useCase: string;
    testType: 'unit' | 'integration' | 'performance' | 'quality';
    count?: number;
  }): Promise<Array<{
    name: string;
    description: string;
    input: Record<string, any>;
    expectedOutput?: Record<string, any>;
    criteria: string[];
  }>> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch('/api/ai-assistant/generate-test-cases', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate test cases');
      }
    } catch (error) {
      console.error('Error generating test cases:', error);
      throw error;
    }
  }, [user]);

  const explainAgent = useCallback(async (agentData: {
    name: string;
    prompt: string;
    model: string;
    tools?: string[];
    knowledgeSources?: string[];
  }): Promise<{
    explanation: string;
    capabilities: string[];
    limitations: string[];
    bestUseCases: string[];
    technicalDetails: Record<string, any>;
  }> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch('/api/ai-assistant/explain-agent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to explain agent');
      }
    } catch (error) {
      console.error('Error explaining agent:', error);
      throw error;
    }
  }, [user]);

  const generatePersonalityProfile = useCallback(async (traits: Record<string, number>): Promise<{
    profile: string;
    characteristics: string[];
    communicationStyle: string;
    strengths: string[];
    potentialIssues: string[];
    recommendations: string[];
  }> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch('/api/ai-assistant/personality-profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ traits }),
      });

      if (response.ok) {
        return await response.json();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate personality profile');
      }
    } catch (error) {
      console.error('Error generating personality profile:', error);
      throw error;
    }
  }, [user]);

  return {
    isGenerating,
    isAnalyzing,
    generateAgentConfig,
    analyzeAgent,
    generatePromptSuggestions,
    optimizePrompt,
    generateTestCases,
    explainAgent,
    generatePersonalityProfile,
  };
}