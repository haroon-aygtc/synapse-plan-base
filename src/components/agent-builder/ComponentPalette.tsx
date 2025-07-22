"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Settings,
  FileText,
  Zap,
  Globe,
  Image,
  Mail,
  Calendar,
  Database,
  Users,
  BarChart,
  MessageSquare,
  Phone,
  CreditCard,
  Lock,
  Search,
  Sparkles,
  TrendingUp,
  Clock,
  Target,
  Lightbulb,
  Star,
  Filter,
} from "lucide-react";
import {
  aiAssistant,
  type AgentConfiguration,
  type IntentAnalysis,
} from "@/lib/ai-assistant";

interface ComponentTemplate {
  id: string;
  name: string;
  description: string;
  category: "agent" | "tool" | "knowledge" | "workflow";
  icon: React.ComponentType<{ className?: string }>;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  popularity: number;
  config: Record<string, any>;
  aiSuggested?: boolean;
  confidence?: number;
}

interface ComponentPaletteProps {
  onAddComponent: (template: ComponentTemplate) => void;
  currentConfiguration?: Partial<AgentConfiguration>;
  userExperience?: "beginner" | "intermediate" | "advanced";
  searchContext?: string;
  canvasNodes?: any[];
  canvasEdges?: any[];
  onDragStart?: (nodeType: string, nodeData: any) => void;
}

const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  // Agent Templates
  {
    id: "customer-support-agent",
    name: "Customer Support Agent",
    description:
      "Friendly assistant for handling customer inquiries and support tickets",
    category: "agent",
    icon: MessageSquare,
    tags: ["support", "customer-service", "help-desk"],
    difficulty: "beginner",
    popularity: 95,
    config: {
      personality: "helpful",
      model: "gpt-4",
      temperature: 0.3,
      memoryEnabled: true,
      tone: "friendly",
      style: "conversational",
    },
  },
  {
    id: "sales-assistant",
    name: "Sales Assistant",
    description: "Professional agent for lead qualification and sales support",
    category: "agent",
    icon: TrendingUp,
    tags: ["sales", "leads", "conversion"],
    difficulty: "intermediate",
    popularity: 87,
    config: {
      personality: "professional",
      model: "gpt-4",
      temperature: 0.5,
      memoryEnabled: true,
      tone: "professional",
      style: "persuasive",
    },
  },
  {
    id: "technical-expert",
    name: "Technical Expert",
    description:
      "Specialized agent for technical documentation and troubleshooting",
    category: "agent",
    icon: Settings,
    tags: ["technical", "documentation", "troubleshooting"],
    difficulty: "advanced",
    popularity: 78,
    config: {
      personality: "technical",
      model: "gpt-4",
      temperature: 0.2,
      memoryEnabled: true,
      tone: "technical",
      style: "instructional",
    },
  },
  {
    id: "creative-assistant",
    name: "Creative Assistant",
    description: "Imaginative agent for content creation and brainstorming",
    category: "agent",
    icon: Lightbulb,
    tags: ["creative", "content", "brainstorming"],
    difficulty: "intermediate",
    popularity: 82,
    config: {
      personality: "creative",
      model: "gpt-4",
      temperature: 0.8,
      memoryEnabled: true,
      tone: "creative",
      style: "engaging",
    },
  },

  // Tool Templates
  {
    id: "web-search-tool",
    name: "Web Search",
    description: "Search the web for up-to-date information and answers",
    category: "tool",
    icon: Globe,
    tags: ["search", "web", "information"],
    difficulty: "beginner",
    popularity: 92,
    config: {
      toolType: "web-search",
      provider: "google",
      maxResults: 10,
    },
  },
  {
    id: "image-generator",
    name: "Image Generator",
    description: "Generate images from text descriptions using AI",
    category: "tool",
    icon: Image,
    tags: ["image", "generation", "ai"],
    difficulty: "intermediate",
    popularity: 85,
    config: {
      toolType: "image-generation",
      provider: "dall-e",
      resolution: "1024x1024",
    },
  },
  {
    id: "email-tool",
    name: "Email Integration",
    description: "Send and manage emails through various providers",
    category: "tool",
    icon: Mail,
    tags: ["email", "communication", "automation"],
    difficulty: "intermediate",
    popularity: 79,
    config: {
      toolType: "email",
      provider: "gmail",
      templates: [],
    },
  },
  {
    id: "calendar-tool",
    name: "Calendar Management",
    description: "Schedule meetings and manage calendar events",
    category: "tool",
    icon: Calendar,
    tags: ["calendar", "scheduling", "meetings"],
    difficulty: "intermediate",
    popularity: 73,
    config: {
      toolType: "calendar",
      provider: "google-calendar",
      timezone: "UTC",
    },
  },
  {
    id: "database-tool",
    name: "Database Query",
    description: "Query and manipulate database records",
    category: "tool",
    icon: Database,
    tags: ["database", "query", "data"],
    difficulty: "advanced",
    popularity: 68,
    config: {
      toolType: "database",
      provider: "postgresql",
      connectionString: "",
    },
  },
  {
    id: "analytics-tool",
    name: "Analytics Dashboard",
    description: "Generate reports and analyze data trends",
    category: "tool",
    icon: BarChart,
    tags: ["analytics", "reports", "data"],
    difficulty: "advanced",
    popularity: 71,
    config: {
      toolType: "analytics",
      provider: "custom",
      metrics: [],
    },
  },

  // Knowledge Templates
  {
    id: "document-knowledge",
    name: "Document Library",
    description: "Upload and search through document collections",
    category: "knowledge",
    icon: FileText,
    tags: ["documents", "search", "library"],
    difficulty: "beginner",
    popularity: 88,
    config: {
      sourceType: "document",
      formats: ["pdf", "docx", "txt"],
      indexing: "semantic",
    },
  },
  {
    id: "website-knowledge",
    name: "Website Scraper",
    description: "Extract and index content from websites",
    category: "knowledge",
    icon: Globe,
    tags: ["website", "scraping", "content"],
    difficulty: "intermediate",
    popularity: 76,
    config: {
      sourceType: "website",
      crawlDepth: 2,
      updateFrequency: "daily",
    },
  },
  {
    id: "api-knowledge",
    name: "API Data Source",
    description: "Connect to external APIs for real-time data",
    category: "knowledge",
    icon: Zap,
    tags: ["api", "real-time", "integration"],
    difficulty: "advanced",
    popularity: 65,
    config: {
      sourceType: "api",
      endpoint: "",
      authentication: "bearer",
    },
  },

  // Workflow Templates
  {
    id: "customer-onboarding",
    name: "Customer Onboarding",
    description: "Automated workflow for new customer setup",
    category: "workflow",
    icon: Users,
    tags: ["onboarding", "automation", "customer"],
    difficulty: "intermediate",
    popularity: 84,
    config: {
      steps: [
        { type: "agent", action: "welcome" },
        { type: "tool", action: "create-account" },
        { type: "tool", action: "send-email" },
      ],
    },
  },
  {
    id: "lead-qualification",
    name: "Lead Qualification",
    description: "Automated lead scoring and qualification process",
    category: "workflow",
    icon: Target,
    tags: ["leads", "qualification", "sales"],
    difficulty: "advanced",
    popularity: 77,
    config: {
      steps: [
        { type: "agent", action: "qualify" },
        { type: "tool", action: "score" },
        { type: "tool", action: "route" },
      ],
    },
  },
  {
    id: "support-ticket",
    name: "Support Ticket Handler",
    description: "Automated support ticket triage and routing",
    category: "workflow",
    icon: MessageSquare,
    tags: ["support", "tickets", "automation"],
    difficulty: "intermediate",
    popularity: 81,
    config: {
      steps: [
        { type: "agent", action: "analyze" },
        { type: "tool", action: "categorize" },
        { type: "tool", action: "assign" },
      ],
    },
  },
];

export default function ComponentPalette({
  onAddComponent,
  currentConfiguration,
  userExperience = "intermediate",
  searchContext = "",
  canvasNodes = [],
  canvasEdges = [],
  onDragStart,
}: ComponentPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [aiSuggestions, setAiSuggestions] = useState<ComponentTemplate[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showOnlyRecommended, setShowOnlyRecommended] = useState(false);
  const [contextualSuggestions, setContextualSuggestions] = useState<
    ComponentTemplate[]
  >([]);
  const [canvasAnalysis, setCanvasAnalysis] = useState<{
    missingConnections: string[];
    suggestedNodes: string[];
    flowCompleteness: number;
  }>({ missingConnections: [], suggestedNodes: [], flowCompleteness: 0 });

  // Analyze canvas structure for contextual suggestions
  const analyzeCanvasStructure = useCallback(() => {
    const nodeTypes = canvasNodes.map((node) => node.data?.type || node.type);
    const nodeTypeCounts = nodeTypes.reduce(
      (acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const missingConnections: string[] = [];
    const suggestedNodes: string[] = [];

    // Analyze flow completeness
    const hasAgent = nodeTypes.includes("agent");
    const hasTools = nodeTypes.includes("tool");
    const hasKnowledge = nodeTypes.includes("knowledge");
    const hasWorkflow = nodeTypes.includes("workflow");

    let completeness = 0;
    if (hasAgent) completeness += 25;
    if (hasTools) completeness += 25;
    if (hasKnowledge) completeness += 25;
    if (hasWorkflow) completeness += 25;

    // Suggest missing components based on existing ones
    if (hasAgent && !hasTools) {
      suggestedNodes.push("tool");
      missingConnections.push("Agent needs tools to perform actions");
    }

    if (hasAgent && !hasKnowledge) {
      suggestedNodes.push("knowledge");
      missingConnections.push("Agent could benefit from knowledge sources");
    }

    if ((hasAgent || hasTools) && !hasWorkflow) {
      suggestedNodes.push("workflow");
      missingConnections.push(
        "Consider adding workflows to orchestrate components",
      );
    }

    // Check for isolated nodes (nodes without connections)
    const connectedNodeIds = new Set([
      ...canvasEdges.map((edge) => edge.source),
      ...canvasEdges.map((edge) => edge.target),
    ]);

    const isolatedNodes = canvasNodes.filter(
      (node) => !connectedNodeIds.has(node.id),
    );
    if (isolatedNodes.length > 0) {
      missingConnections.push(
        `${isolatedNodes.length} isolated node(s) need connections`,
      );
    }

    setCanvasAnalysis({
      missingConnections,
      suggestedNodes,
      flowCompleteness: completeness,
    });
  }, [canvasNodes, canvasEdges]);

  // Generate contextual suggestions based on canvas analysis
  useEffect(() => {
    analyzeCanvasStructure();

    const contextualTemplates = COMPONENT_TEMPLATES.map((template) => {
      let contextScore = 0;
      let isContextual = false;

      // Boost score for suggested node types
      if (canvasAnalysis.suggestedNodes.includes(template.category)) {
        contextScore += 0.8;
        isContextual = true;
      }

      // Boost score for complementary components
      const nodeTypes = canvasNodes.map((node) => node.data?.type || node.type);
      if (nodeTypes.includes("agent") && template.category === "tool") {
        contextScore += 0.6;
        isContextual = true;
      }

      if (nodeTypes.includes("tool") && template.category === "workflow") {
        contextScore += 0.5;
        isContextual = true;
      }

      return {
        ...template,
        contextScore,
        isContextual,
      };
    })
      .filter((t) => t.isContextual && t.contextScore > 0.3)
      .sort((a, b) => (b.contextScore || 0) - (a.contextScore || 0))
      .slice(0, 4);

    setContextualSuggestions(contextualTemplates);
  }, [canvasNodes, canvasEdges, canvasAnalysis.suggestedNodes]);

  // Generate AI suggestions based on current configuration and context
  useEffect(() => {
    const generateSuggestions = async () => {
      if (!currentConfiguration && !searchContext && canvasNodes.length === 0)
        return;

      setIsLoadingSuggestions(true);
      try {
        let analysis: any = { category: "other", suggestedCapabilities: [] };
        let suggestions: any[] = [];

        if (searchContext) {
          analysis = await aiAssistant.analyzeIntent(searchContext);
        }

        if (currentConfiguration) {
          suggestions = await aiAssistant.generateConfigurationSuggestions(
            searchContext || currentConfiguration.description || "",
            currentConfiguration,
          );
        }

        // Map AI suggestions to component templates
        const suggestedTemplates = COMPONENT_TEMPLATES.map((template) => {
          let confidence = 0;
          let aiSuggested = false;

          // Check if template matches the analyzed category
          if (template.category === "agent" && analysis.category) {
            const categoryMatch = template.tags.some((tag) =>
              analysis.category.includes(tag),
            );
            if (categoryMatch) {
              confidence += 0.3;
              aiSuggested = true;
            }
          }

          // Check if template matches suggested capabilities
          if (analysis.suggestedCapabilities) {
            const capabilityMatch = analysis.suggestedCapabilities.some(
              (capability: string) =>
                template.tags.some((tag) => capability.includes(tag)),
            );
            if (capabilityMatch) {
              confidence += 0.4;
              aiSuggested = true;
            }
          }

          // Check configuration suggestions
          suggestions.forEach((suggestion) => {
            if (
              template.config[suggestion.field] === suggestion.value ||
              template.tags.includes(String(suggestion.value).toLowerCase())
            ) {
              confidence += suggestion.confidence * 0.3;
              aiSuggested = true;
            }
          });

          return {
            ...template,
            aiSuggested,
            confidence: Math.min(confidence, 1),
          };
        });

        // Sort by confidence and filter AI suggested ones
        const aiSuggestedTemplates = suggestedTemplates
          .filter((t) => t.aiSuggested && t.confidence > 0.2)
          .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
          .slice(0, 6);

        setAiSuggestions(aiSuggestedTemplates);
      } catch (error) {
        console.error("Error generating AI suggestions:", error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    generateSuggestions();
  }, [currentConfiguration, searchContext, canvasNodes.length]);

  // Filter templates based on search and filters
  const filteredTemplates = COMPONENT_TEMPLATES.filter((template) => {
    const matchesSearch =
      searchQuery === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;

    const matchesDifficulty =
      selectedDifficulty === "all" ||
      template.difficulty === selectedDifficulty;

    const matchesExperience =
      userExperience === "advanced" ||
      (userExperience === "intermediate" &&
        template.difficulty !== "advanced") ||
      (userExperience === "beginner" && template.difficulty === "beginner");

    return (
      matchesSearch && matchesCategory && matchesDifficulty && matchesExperience
    );
  });

  // Sort templates by popularity and AI suggestions
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (showOnlyRecommended) {
      const aIsAI = aiSuggestions.some((s) => s.id === a.id);
      const bIsAI = aiSuggestions.some((s) => s.id === b.id);
      if (aIsAI && !bIsAI) return -1;
      if (!aIsAI && bIsAI) return 1;
    }
    return b.popularity - a.popularity;
  });

  const displayTemplates = showOnlyRecommended
    ? [...contextualSuggestions, ...aiSuggestions].slice(0, 8)
    : sortedTemplates;

  // Handle drag start for drag-and-drop
  const handleDragStart = (
    event: React.DragEvent,
    template: ComponentTemplate,
  ) => {
    event.dataTransfer.setData("application/reactflow", template.category);
    event.dataTransfer.setData(
      "application/nodedata",
      JSON.stringify(template.config),
    );
    event.dataTransfer.effectAllowed = "move";

    if (onDragStart) {
      onDragStart(template.category, template.config);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "agent":
        return Bot;
      case "tool":
        return Settings;
      case "knowledge":
        return FileText;
      case "workflow":
        return Zap;
      default:
        return Settings;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="h-full bg-background">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Component Palette
          <div className="flex gap-1 ml-auto">
            {contextualSuggestions.length > 0 && (
              <Badge variant="default" className="text-xs">
                {contextualSuggestions.length} contextual
              </Badge>
            )}
            {aiSuggestions.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {aiSuggestions.length} AI
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Drag and drop components to build your agent workflow
          {canvasAnalysis.flowCompleteness < 100 && (
            <div className="mt-2 text-xs">
              Flow completeness: {canvasAnalysis.flowCompleteness}%
              {canvasAnalysis.missingConnections.length > 0 && (
                <div className="mt-1 text-amber-600">
                  • {canvasAnalysis.missingConnections[0]}
                </div>
              )}
            </div>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={showOnlyRecommended ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyRecommended(!showOnlyRecommended)}
              disabled={
                aiSuggestions.length === 0 && contextualSuggestions.length === 0
              }
            >
              <Star className="h-4 w-4 mr-1" />
              Smart Suggestions
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCategory("all");
                setSelectedDifficulty("all");
                setSearchQuery("");
                setShowOnlyRecommended(false);
              }}
            >
              <Filter className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        <Separator />

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="agent" className="text-xs">
              Agents
            </TabsTrigger>
            <TabsTrigger value="tool" className="text-xs">
              Tools
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="text-xs">
              Knowledge
            </TabsTrigger>
            <TabsTrigger value="workflow" className="text-xs">
              Workflows
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {isLoadingSuggestions && showOnlyRecommended && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">
                      Generating AI suggestions...
                    </div>
                  </div>
                )}

                {displayTemplates.length === 0 && !isLoadingSuggestions && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">
                      No components found matching your criteria
                    </div>
                  </div>
                )}

                {displayTemplates.map((template) => {
                  const IconComponent = template.icon;
                  const CategoryIcon = getCategoryIcon(template.category);
                  const isAISuggested = aiSuggestions.some(
                    (s) => s.id === template.id,
                  );
                  const isContextual = contextualSuggestions.some(
                    (s) => s.id === template.id,
                  );
                  const confidence = aiSuggestions.find(
                    (s) => s.id === template.id,
                  )?.confidence;
                  const contextScore = contextualSuggestions.find(
                    (s) => s.id === template.id,
                  )?.contextScore;  

                  return (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isContextual
                          ? "ring-2 ring-green-200 bg-green-50"
                          : isAISuggested
                            ? "ring-2 ring-primary/20 bg-primary/5"
                            : ""
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, template)}
                      onClick={() => onAddComponent(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <IconComponent className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate">
                                {template.name}
                              </h4>
                              {isContextual && (
                                <Badge
                                  variant="default"
                                  className="text-xs flex items-center gap-1 bg-green-600"
                                >
                                  <Target className="h-3 w-3" />
                                  {contextScore &&
                                    `${Math.round(contextScore * 100)}%`}
                                </Badge>
                              )}
                              {isAISuggested && !isContextual && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs flex items-center gap-1"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  {confidence &&
                                    `${Math.round(confidence * 100)}%`}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {template.description}
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <CategoryIcon className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground capitalize">
                                  {template.category}
                                </span>
                              </div>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getDifficultyColor(template.difficulty)}`}
                              >
                                {template.difficulty}
                              </Badge>
                              <div className="flex items-center gap-1 ml-auto">
                                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {template.popularity}%
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.tags.slice(0, 3).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
