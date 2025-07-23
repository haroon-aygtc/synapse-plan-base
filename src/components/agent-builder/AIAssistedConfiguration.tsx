'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, 
  Wand2, 
  Brain, 
  MessageSquare, 
  Settings, 
  Zap,
  User,
  Bot,
  Lightbulb,
  Target,
  Palette,
  Volume2
} from 'lucide-react';

import { useAgentBuilder } from '@/hooks/useAgentBuilder';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { toast } from '@/components/ui/use-toast';

interface PersonalityTrait {
  name: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  personality: PersonalityTrait[];
  prompt: string;
  model: string;
  temperature: number;
  tools: string[];
}

const PERSONALITY_TRAITS: PersonalityTrait[] = [
  {
    name: 'Friendliness',
    value: 70,
    description: 'How warm and approachable the agent is',
    icon: <User className="h-4 w-4" />
  },
  {
    name: 'Professionalism',
    value: 80,
    description: 'How formal and business-oriented the agent is',
    icon: <Bot className="h-4 w-4" />
  },
  {
    name: 'Creativity',
    value: 60,
    description: 'How innovative and original the responses are',
    icon: <Lightbulb className="h-4 w-4" />
  },
  {
    name: 'Directness',
    value: 75,
    description: 'How straight-to-the-point the agent is',
    icon: <Target className="h-4 w-4" />
  },
  {
    name: 'Empathy',
    value: 65,
    description: 'How understanding and emotionally aware the agent is',
    icon: <MessageSquare className="h-4 w-4" />
  },
  {
    name: 'Humor',
    value: 40,
    description: 'How playful and humorous the agent is',
    icon: <Palette className="h-4 w-4" />
  }
];

const AI_MODELS = [
  { value: 'gpt-4', label: 'GPT-4 (Most Capable)', description: 'Best for complex reasoning and analysis' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Fast)', description: 'Good balance of speed and capability' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus (Creative)', description: 'Excellent for creative and analytical tasks' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet (Balanced)', description: 'Good for general-purpose tasks' }
];

const USE_CASES = [
  'Customer Support',
  'Content Creation',
  'Data Analysis',
  'Code Assistant',
  'Personal Assistant',
  'Educational Tutor',
  'Sales Assistant',
  'Research Helper'
];

export function AIAssistedConfiguration() {
  const { currentAgent, updateAgent } = useAgentBuilder();
  const { generateAgentConfig, isGenerating } = useAIAssistant();
  
  const [description, setDescription] = useState('');
  const [selectedUseCase, setSelectedUseCase] = useState('');
  const [personalityTraits, setPersonalityTraits] = useState<PersonalityTrait[]>(PERSONALITY_TRAITS);
  const [agentName, setAgentName] = useState(currentAgent?.name || '');
  const [agentPrompt, setAgentPrompt] = useState(currentAgent?.prompt || '');
  const [selectedModel, setSelectedModel] = useState(currentAgent?.model || 'gpt-4');
  const [temperature, setTemperature] = useState([currentAgent?.temperature || 0.7]);
  const [maxTokens, setMaxTokens] = useState([currentAgent?.maxTokens || 2000]);
  const [enableStreaming, setEnableStreaming] = useState(true);
  const [enableMemory, setEnableMemory] = useState(true);
  
  const [previewResponse, setPreviewResponse] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handlePersonalityChange = useCallback((traitName: string, value: number[]) => {
    setPersonalityTraits(prev => 
      prev.map(trait => 
        trait.name === traitName 
          ? { ...trait, value: value[0] }
          : trait
      )
    );
  }, []);

  const generateConfiguration = useCallback(async () => {
    if (!description.trim()) {
      toast({
        title: 'Description Required',
        description: 'Please describe what you want your agent to do.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const config = await generateAgentConfig({
        description,
        useCase: selectedUseCase,
        personalityTraits: personalityTraits.reduce((acc, trait) => ({
          ...acc,
          [trait.name.toLowerCase()]: trait.value
        }), {})
      });

      setAgentName(config.name);
      setAgentPrompt(config.prompt);
      setSelectedModel(config.model);
      setTemperature([config.temperature]);
      
      toast({
        title: 'Configuration Generated',
        description: 'AI has generated your agent configuration. Review and adjust as needed.',
      });
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate configuration. Please try again.',
        variant: 'destructive',
      });
    }
  }, [description, selectedUseCase, personalityTraits, generateAgentConfig]);

  const generatePreview = useCallback(async () => {
    if (!agentPrompt.trim()) return;

    setIsPreviewLoading(true);
    try {
      const preview = await previewResponse(
        agentPrompt,
        selectedModel,
        temperature[0],
        'Hello! Can you help me with a quick question?',
        personalityTraits.reduce((acc, trait) => ({
          ...acc,
          [trait.name.toLowerCase()]: trait.value
        }), {})
      );
      
      setPreviewResponse(preview.response);
    } catch (error) {
      console.error('Preview generation failed:', error);
      setPreviewResponse('Preview unavailable. Please check your configuration.');
    } finally {
      setIsPreviewLoading(false);
    }
  }, [agentPrompt, selectedModel, temperature, personalityTraits, previewResponse]);

  const saveConfiguration = useCallback(async () => {
    const agentConfig = {
      name: agentName,
      prompt: agentPrompt,
      model: selectedModel,
      temperature: temperature[0],
      maxTokens: maxTokens[0],
      settings: {
        enableStreaming,
        enableMemory,
        personalityTraits: personalityTraits.reduce((acc, trait) => ({
          ...acc,
          [trait.name.toLowerCase()]: trait.value
        }), {})
      },
      metadata: {
        useCase: selectedUseCase,
        description
      }
    };

    try {
      await updateAgent(agentConfig);
      toast({
        title: 'Configuration Saved',
        description: 'Your agent configuration has been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save configuration. Please try again.',
        variant: 'destructive',
      });
    }
  }, [agentName, agentPrompt, selectedModel, temperature, maxTokens, enableStreaming, enableMemory, personalityTraits, selectedUseCase, description, updateAgent]);

  useEffect(() => {
    if (agentPrompt) {
      const debounceTimer = setTimeout(generatePreview, 1000);
      return () => clearTimeout(debounceTimer);
    }
  }, [agentPrompt, selectedModel, temperature, personalityTraits, generatePreview]);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI-Assisted Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span>AI-Assisted Agent Setup</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Describe your agent</Label>
                <Textarea
                  id="description"
                  placeholder="I want an agent that can help customers with product inquiries, handle complaints professionally, and provide detailed product information..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="useCase">Primary Use Case</Label>
                <Select value={selectedUseCase} onValueChange={setSelectedUseCase}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a use case" />
                  </SelectTrigger>
                  <SelectContent>
                    {USE_CASES.map((useCase) => (
                      <SelectItem key={useCase} value={useCase}>
                        {useCase}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={generateConfiguration} 
                disabled={isGenerating || !description.trim()}
                className="w-full"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate Configuration'}
              </Button>
            </CardContent>
          </Card>

          {/* Personality Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-primary" />
                <span>Personality & Behavior</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {personalityTraits.map((trait) => (
                <div key={trait.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {trait.icon}
                      <Label className="font-medium">{trait.name}</Label>
                    </div>
                    <Badge variant="outline">{trait.value}%</Badge>
                  </div>
                  <Slider
                    value={[trait.value]}
                    onValueChange={(value) => handlePersonalityChange(trait.name, value)}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">{trait.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Basic Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-primary" />
                <span>Basic Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agentName">Agent Name</Label>
                  <Input
                    id="agentName"
                    placeholder="My Assistant"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">AI Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          <div>
                            <div className="font-medium">{model.label}</div>
                            <div className="text-sm text-muted-foreground">{model.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Temperature: {temperature[0]}</Label>
                <Slider
                  value={temperature}
                  onValueChange={setTemperature}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Higher values make responses more creative, lower values more focused
                </p>
              </div>

              <div className="space-y-2">
                <Label>Max Tokens: {maxTokens[0]}</Label>
                <Slider
                  value={maxTokens}
                  onValueChange={setMaxTokens}
                  max={4000}
                  min={100}
                  step={100}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Streaming</Label>
                  <p className="text-sm text-muted-foreground">Stream responses in real-time</p>
                </div>
                <Switch checked={enableStreaming} onCheckedChange={setEnableStreaming} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Memory</Label>
                  <p className="text-sm text-muted-foreground">Remember conversation context</p>
                </div>
                <Switch checked={enableMemory} onCheckedChange={setEnableMemory} />
              </div>
            </CardContent>
          </Card>

          {/* Prompt Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span>System Prompt</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="prompt">System Prompt Template</Label>
                <Textarea
                  id="prompt"
                  placeholder="You are a helpful assistant that..."
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  This prompt defines your agent's behavior and capabilities
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={generatePreview}>
              <Zap className="h-4 w-4 mr-2" />
              Preview Response
            </Button>
            <Button onClick={saveConfiguration}>
              Save Configuration
            </Button>
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span>Live Preview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">User</span>
                  </div>
                  <p className="text-sm">Hello! Can you help me with a quick question?</p>
                </div>

                <div className="bg-primary/10 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Bot className="h-4 w-4" />
                    <span className="text-sm font-medium">{agentName || 'Agent'}</span>
                  </div>
                  {isPreviewLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm text-muted-foreground">Generating response...</span>
                    </div>
                  ) : previewResponse ? (
                    <p className="text-sm">{previewResponse}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Configure your agent to see a preview</p>
                  )}
                </div>

                {personalityTraits.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Personality Profile</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {personalityTraits.slice(0, 4).map((trait) => (
                        <div key={trait.name} className="text-center">
                          <div className="text-xs text-muted-foreground">{trait.name}</div>
                          <div className="text-sm font-medium">{trait.value}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}