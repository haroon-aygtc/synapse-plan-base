"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Play,
  Plus,
  Settings,
  Trash2,
  Sparkles,
  MessageSquare,
  Bot,
  Wand2,
} from "lucide-react";
import AIConfigurationPanel from "@/components/ai-assistant/AIConfigurationPanel";
import VisualAgentBuilder from "@/components/agent-builder/VisualAgentBuilder";
import ComponentPalette from "@/components/agent-builder/ComponentPalette";
import { type AgentConfiguration } from "@/lib/ai-assistant";

export default function AgentCreatePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showAIAssistant, setShowAIAssistant] = useState(true);
  const [showVisualBuilder, setShowVisualBuilder] = useState(false);
  const [showComponentPalette, setShowComponentPalette] = useState(false);
  const [userExperience, setUserExperience] = useState<
    "beginner" | "intermediate" | "advanced"
  >("intermediate");
  const [agentConfiguration, setAgentConfiguration] = useState<
    Partial<AgentConfiguration>
  >({
    name: "Customer Support Assistant",
    description:
      "A helpful assistant that answers customer questions about our products and services.",
    category: "customer-support",
    personality: "helpful",
    model: "gpt-4",
    temperature: 0.7,
    memoryEnabled: true,
    contextWindow: 10,
    tone: "friendly",
    style: "conversational",
    traits: [],
    capabilities: [],
    knowledgeSources: [],
    tools: [],
  });

  // Legacy state for backward compatibility
  const [agentName, setAgentName] = useState(agentConfiguration.name || "");
  const [agentDescription, setAgentDescription] = useState(
    agentConfiguration.description || "",
  );
  const [selectedPersonality, setSelectedPersonality] = useState(
    agentConfiguration.personality || "helpful",
  );
  const [selectedModel, setSelectedModel] = useState(
    agentConfiguration.model || "gpt-4",
  );
  const [temperature, setTemperature] = useState([
    agentConfiguration.temperature || 0.7,
  ]);
  const [memoryEnabled, setMemoryEnabled] = useState(
    agentConfiguration.memoryEnabled || true,
  );
  const [contextWindow, setContextWindow] = useState([
    agentConfiguration.contextWindow || 10,
  ]);

  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfigurationUpdate = (
    newConfig: Partial<AgentConfiguration>,
  ) => {
    setAgentConfiguration((prev) => ({ ...prev, ...newConfig }));

    // Update legacy state for backward compatibility
    if (newConfig.name) setAgentName(newConfig.name);
    if (newConfig.description) setAgentDescription(newConfig.description);
    if (newConfig.personality) setSelectedPersonality(newConfig.personality);
    if (newConfig.model) setSelectedModel(newConfig.model);
    if (newConfig.temperature !== undefined)
      setTemperature([newConfig.temperature]);
    if (newConfig.memoryEnabled !== undefined)
      setMemoryEnabled(newConfig.memoryEnabled);
    if (newConfig.contextWindow !== undefined)
      setContextWindow([newConfig.contextWindow]);
  };

  const handleSave = () => {
    // In a real implementation, this would save the agent configuration
    console.log("Agent saved:", agentConfiguration);
  };

  const handleTest = () => {
    // In a real implementation, this would open a test conversation with the agent
    console.log("Testing agent...");
  };

  const handleAddComponent = (template: any) => {
    console.log("Adding component:", template);
    // In a real implementation, this would add the component to the visual builder
  };

  return (
    <div className="container mx-auto py-8 bg-background">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold flex-1 text-center">
          Create New Agent
        </h1>
        <div className="flex space-x-2">
          <Button
            variant={showAIAssistant ? "default" : "outline"}
            onClick={() => setShowAIAssistant(!showAIAssistant)}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            AI Assistant
          </Button>
          <Button
            variant={showVisualBuilder ? "default" : "outline"}
            onClick={() => setShowVisualBuilder(!showVisualBuilder)}
          >
            <Bot className="mr-2 h-4 w-4" />
            Visual Builder
          </Button>
          <Button
            variant={showComponentPalette ? "default" : "outline"}
            onClick={() => setShowComponentPalette(!showComponentPalette)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Components
          </Button>
          <Select
            value={userExperience}
            onValueChange={(value: "beginner" | "intermediate" | "advanced") =>
              setUserExperience(value)
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button onClick={handleTest}>
            <Play className="mr-2 h-4 w-4" />
            Test Agent
          </Button>
        </div>
      </div>

      <div className="flex justify-center mb-8">
        <div className="flex items-center">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <div
                  className={`w-12 h-1 ${currentStep > index ? "bg-primary" : "bg-muted"}`}
                />
              )}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center
                  ${
                    currentStep > index + 1
                      ? "bg-primary text-primary-foreground"
                      : currentStep === index + 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
              >
                {index + 1}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* AI Configuration Assistant */}
      {showAIAssistant && (
        <div className="mb-8">
          <AIConfigurationPanel
            onConfigurationUpdate={handleConfigurationUpdate}
            currentConfiguration={agentConfiguration}
            userExperience={userExperience}
            currentStep={currentStep}
          />
        </div>
      )}

      {/* Visual Agent Builder */}
      {showVisualBuilder && (
        <div className="mb-8">
          <VisualAgentBuilder
            onConfigurationUpdate={handleConfigurationUpdate}
            currentConfiguration={agentConfiguration}
          />
        </div>
      )}

      {/* Component Palette */}
      {showComponentPalette && (
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {showVisualBuilder ? (
                <div className="text-center py-8 text-muted-foreground">
                  Visual Builder is active. Components can be dragged directly
                  onto the canvas.
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Enable Visual Builder to see component interactions.
                </div>
              )}
            </div>
            <div>
              <ComponentPalette
                onAddComponent={handleAddComponent}
                currentConfiguration={agentConfiguration}
                userExperience={userExperience}
                searchContext={agentConfiguration.description || ""}
              />
            </div>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Define your agent's name and purpose
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input
                id="agent-name"
                placeholder="Enter agent name"
                value={agentConfiguration.name || ""}
                onChange={(e) =>
                  handleConfigurationUpdate({ name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-description">Description</Label>
              <Textarea
                id="agent-description"
                placeholder="Describe what your agent does"
                rows={4}
                value={agentConfiguration.description || ""}
                onChange={(e) =>
                  handleConfigurationUpdate({ description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-category">Category</Label>
              <Select
                value={agentConfiguration.category || "customer-support"}
                onValueChange={(value) =>
                  handleConfigurationUpdate({ category: value })
                }
              >
                <SelectTrigger id="agent-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer-support">
                    Customer Support
                  </SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="it">IT Support</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Smart Configuration Indicators */}
            {agentConfiguration.traits &&
              agentConfiguration.traits.length > 0 && (
                <div className="space-y-2">
                  <Label>AI-Suggested Traits</Label>
                  <div className="flex flex-wrap gap-2">
                    {agentConfiguration.traits.map((trait, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        <Bot className="w-3 h-3 mr-1" />
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleNext}>Continue</Button>
          </CardFooter>
        </Card>
      )}

      {currentStep === 2 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Personality & Behavior</CardTitle>
            <CardDescription>
              Define how your agent should interact with users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preset" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preset">Preset Personalities</TabsTrigger>
                <TabsTrigger value="custom">Custom Personality</TabsTrigger>
              </TabsList>
              <TabsContent value="preset" className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      id: "helpful",
                      name: "Helpful Assistant",
                      description:
                        "Friendly and eager to assist with any request",
                    },
                    {
                      id: "professional",
                      name: "Professional Expert",
                      description:
                        "Formal, knowledgeable, and business-oriented",
                    },
                    {
                      id: "friendly",
                      name: "Friendly Guide",
                      description: "Casual, approachable, and conversational",
                    },
                    {
                      id: "technical",
                      name: "Technical Specialist",
                      description: "Detailed, precise, and technically focused",
                    },
                    {
                      id: "creative",
                      name: "Creative Partner",
                      description: "Imaginative, inspiring, and idea-focused",
                    },
                    {
                      id: "concise",
                      name: "Concise Responder",
                      description: "Brief, to-the-point, and efficient",
                    },
                  ].map((personality) => {
                    const isSelected =
                      (agentConfiguration.personality ||
                        selectedPersonality) === personality.id;
                    const isAISuggested =
                      agentConfiguration.personality === personality.id &&
                      agentConfiguration.personality !== selectedPersonality;
                    return (
                      <Card
                        key={personality.id}
                        className={`cursor-pointer border-2 ${isSelected ? "border-primary" : "border-border"} ${isAISuggested ? "ring-2 ring-blue-200" : ""}`}
                        onClick={() =>
                          handleConfigurationUpdate({
                            personality: personality.id,
                          })
                        }
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {personality.name}
                            {isAISuggested && (
                              <Badge variant="secondary" className="text-xs">
                                <Sparkles className="w-3 h-3 mr-1" />
                                AI Pick
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {personality.description}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
              <TabsContent value="custom" className="space-y-6 pt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tone">Tone of Voice</Label>
                    <Select
                      value={agentConfiguration.tone || "friendly"}
                      onValueChange={(value) =>
                        handleConfigurationUpdate({ tone: value })
                      }
                    >
                      <SelectTrigger id="tone">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="professional">
                          Professional
                        </SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="style">Communication Style</Label>
                    <Select
                      value={agentConfiguration.style || "conversational"}
                      onValueChange={(value) =>
                        handleConfigurationUpdate({ style: value })
                      }
                    >
                      <SelectTrigger id="style">
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conversational">
                          Conversational
                        </SelectItem>
                        <SelectItem value="instructional">
                          Instructional
                        </SelectItem>
                        <SelectItem value="analytical">Analytical</SelectItem>
                        <SelectItem value="persuasive">Persuasive</SelectItem>
                        <SelectItem value="narrative">Narrative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personality-traits">
                      Personality Traits
                    </Label>
                    <Textarea
                      id="personality-traits"
                      placeholder="Describe your agent's personality traits (e.g., empathetic, detail-oriented, humorous)"
                      rows={3}
                      value={agentConfiguration.traits?.join(", ") || ""}
                      onChange={(e) =>
                        handleConfigurationUpdate({
                          traits: e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter((t) => t.length > 0),
                        })
                      }
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handlePrevious}>
              Back
            </Button>
            <Button onClick={handleNext}>Continue</Button>
          </CardFooter>
        </Card>
      )}

      {currentStep === 3 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>AI Model & Settings</CardTitle>
            <CardDescription>
              Configure the AI model and performance settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <Select
                value={agentConfiguration.model || selectedModel}
                onValueChange={(value) =>
                  handleConfigurationUpdate({ model: value })
                }
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">
                    <div className="flex items-center gap-2">
                      GPT-4 (Most capable)
                      {agentConfiguration.model === "gpt-4" && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI Pick
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                  <SelectItem value="gpt-3.5-turbo">
                    GPT-3.5 Turbo (Fast & efficient)
                  </SelectItem>
                  <SelectItem value="claude-3-opus">
                    Claude 3 Opus (High performance)
                  </SelectItem>
                  <SelectItem value="claude-3-sonnet">
                    Claude 3 Sonnet (Balanced)
                  </SelectItem>
                  <SelectItem value="gemini-pro">
                    Gemini Pro (Google's model)
                  </SelectItem>
                  <SelectItem value="mistral-large">
                    Mistral Large (Open source)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Model costs vary. Higher capability models may incur higher
                usage costs.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="temperature">Temperature (Creativity)</Label>
                <span className="text-sm text-muted-foreground">
                  {(agentConfiguration.temperature || temperature[0]).toFixed(
                    1,
                  )}
                  {agentConfiguration.temperature !== undefined &&
                    agentConfiguration.temperature !== temperature[0] && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI Optimized
                      </Badge>
                    )}
                </span>
              </div>
              <Slider
                id="temperature"
                min={0}
                max={1}
                step={0.1}
                value={[agentConfiguration.temperature || temperature[0]]}
                onValueChange={(value) =>
                  handleConfigurationUpdate({ temperature: value[0] })
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Precise & Deterministic</span>
                <span>Creative & Variable</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Conversation Memory</h3>
                  <p className="text-sm text-muted-foreground">
                    Enable agent to remember previous interactions
                  </p>
                </div>
                <Switch
                  checked={agentConfiguration.memoryEnabled ?? memoryEnabled}
                  onCheckedChange={(checked) =>
                    handleConfigurationUpdate({ memoryEnabled: checked })
                  }
                />
              </div>

              {(agentConfiguration.memoryEnabled ?? memoryEnabled) && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <div className="flex justify-between">
                    <Label htmlFor="context-window">
                      Context Window (Messages)
                    </Label>
                    <span className="text-sm text-muted-foreground">
                      {agentConfiguration.contextWindow || contextWindow[0]}
                      {agentConfiguration.contextWindow !== undefined &&
                        agentConfiguration.contextWindow !==
                          contextWindow[0] && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Optimized
                          </Badge>
                        )}
                    </span>
                  </div>
                  <Slider
                    id="context-window"
                    min={1}
                    max={50}
                    step={1}
                    value={[
                      agentConfiguration.contextWindow || contextWindow[0],
                    ]}
                    onValueChange={(value) =>
                      handleConfigurationUpdate({ contextWindow: value[0] })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of previous messages the agent will remember
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handlePrevious}>
              Back
            </Button>
            <Button onClick={handleNext}>Continue</Button>
          </CardFooter>
        </Card>
      )}

      {currentStep === 4 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Knowledge & Capabilities</CardTitle>
            <CardDescription>
              Add knowledge sources and define agent capabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Knowledge Sources</Label>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Source
                </Button>
              </div>
              <div className="bg-muted/50 border border-dashed border-muted rounded-lg p-8 text-center">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="rounded-full bg-background p-3">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium">Add Knowledge Sources</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Upload documents, connect to websites, or link databases to
                    give your agent specific knowledge.
                  </p>
                  <Button variant="secondary" size="sm" className="mt-2">
                    Browse Knowledge Base
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Available Tools</Label>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Tool
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-md flex items-center">
                        <Settings className="h-4 w-4 mr-2" /> Web Search
                      </CardTitle>
                      <Badge>Enabled</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Search the web for up-to-date information
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-md flex items-center">
                        <Sparkles className="h-4 w-4 mr-2" /> Image Generation
                      </CardTitle>
                      <Badge variant="outline">Disabled</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Generate images based on text descriptions
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handlePrevious}>
              Back
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </Button>
              <Button onClick={handleSave}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
