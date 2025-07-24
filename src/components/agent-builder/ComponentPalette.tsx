"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Bot,
  Wrench,
  Database,
  Zap,
  GitBranch,
  MessageSquare,
  Star,
  Clock,
  TrendingUp,
  Filter,
  Plus,
  Sparkles,
  Heart,
  Download,
  Share,
  Settings,
} from "lucide-react";
import { AgentConfiguration } from "@/lib/ai-assistant";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface ComponentPaletteProps {
  onAddComponent: (component: ComponentTemplate) => void;
  currentConfiguration: Partial<AgentConfiguration>;
  userExperience: "beginner" | "intermediate" | "advanced";
  searchContext: string;
  canvasNodes: any[];
  canvasEdges: any[];
}

interface ComponentTemplate {
  id: string;
  name: string;
  description: string;
  category: "core" | "tools" | "knowledge" | "integrations" | "custom";
  type: "agent" | "tool" | "knowledge" | "trigger" | "condition" | "action";
  icon: React.ReactNode;
  config: Record<string, any>;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  popularity: number;
  rating: number;
  usageCount: number;
  isCustom?: boolean;
  isFavorite?: boolean;
  isRecentlyUsed?: boolean;
  author?: string;
  version?: string;
  dependencies?: string[];
  examples?: Array<{
    name: string;
    description: string;
    config: Record<string, any>;
  }>;
}

interface IntelligentSuggestion {
  id: string;
  component: ComponentTemplate;
  reason: string;
  confidence: number;
  context: string;
}

const CORE_COMPONENTS: ComponentTemplate[] = [
  {
    id: "basic-agent",
    name: "Basic Agent",
    description: "A simple conversational AI agent",
    category: "core",
    type: "agent",
    icon: <Bot className="h-4 w-4" />,
    config: {
      model: "gpt-4",
      temperature: 0.7,
      maxTokens: 2000,
    },
    tags: ["conversation", "basic", "ai"],
    difficulty: "beginner",
    popularity: 95,
    rating: 4.8,
    usageCount: 1250,
  },
  {
    id: "web-search-tool",
    name: "Web Search",
    description: "Search the web for current information",
    category: "tools",
    type: "tool",
    icon: <Search className="h-4 w-4" />,
    config: {
      provider: "google",
      maxResults: 10,
      safeSearch: true,
    },
    tags: ["search", "web", "information"],
    difficulty: "beginner",
    popularity: 87,
    rating: 4.6,
    usageCount: 890,
  },
  {
    id: "knowledge-base",
    name: "Knowledge Base",
    description: "Access your uploaded documents and data",
    category: "knowledge",
    type: "knowledge",
    icon: <Database className="h-4 w-4" />,
    config: {
      searchType: "semantic",
      maxResults: 5,
      threshold: 0.7,
    },
    tags: ["knowledge", "documents", "search"],
    difficulty: "intermediate",
    popularity: 78,
    rating: 4.7,
    usageCount: 654,
  },
  {
    id: "conditional-logic",
    name: "Conditional Logic",
    description: "Branch workflow based on conditions",
    category: "core",
    type: "condition",
    icon: <GitBranch className="h-4 w-4" />,
    config: {
      operator: "equals",
      caseSensitive: false,
    },
    tags: ["logic", "branching", "conditions"],
    difficulty: "intermediate",
    popularity: 65,
    rating: 4.4,
    usageCount: 432,
  },
  {
    id: "webhook-trigger",
    name: "Webhook Trigger",
    description: "Trigger workflow from external events",
    category: "integrations",
    type: "trigger",
    icon: <Zap className="h-4 w-4" />,
    config: {
      method: "POST",
      authentication: "none",
    },
    tags: ["webhook", "trigger", "integration"],
    difficulty: "advanced",
    popularity: 45,
    rating: 4.2,
    usageCount: 234,
  },
];

const INDUSTRY_TEMPLATES: ComponentTemplate[] = [
  {
    id: "customer-support-agent",
    name: "Customer Support Agent",
    description: "Specialized agent for customer service",
    category: "custom",
    type: "agent",
    icon: <MessageSquare className="h-4 w-4" />,
    config: {
      personality: "helpful",
      tone: "professional",
      escalationRules: true,
    },
    tags: ["customer-service", "support", "helpdesk"],
    difficulty: "beginner",
    popularity: 92,
    rating: 4.9,
    usageCount: 1100,
    author: "SynapseAI Team",
    version: "2.1.0",
  },
  {
    id: "sales-qualification-agent",
    name: "Sales Qualification",
    description: "Qualify leads and schedule demos",
    category: "custom",
    type: "agent",
    icon: <TrendingUp className="h-4 w-4" />,
    config: {
      qualificationCriteria: ["budget", "authority", "need", "timeline"],
      followUpActions: true,
    },
    tags: ["sales", "qualification", "leads"],
    difficulty: "intermediate",
    popularity: 76,
    rating: 4.5,
    usageCount: 567,
    author: "Sales Team",
    version: "1.8.0",
  },
];

export default function ComponentPalette({
  onAddComponent,
  currentConfiguration,
  userExperience,
  searchContext,
  canvasNodes,
  canvasEdges,
}: ComponentPaletteProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [intelligentSuggestions, setIntelligentSuggestions] = useState<
    IntelligentSuggestion[]
  >([]);
  const [customComponents, setCustomComponents] = useState<ComponentTemplate[]>(
    [],
  );
  const [showAdvanced, setShowAdvanced] = useState(
    userExperience === "advanced",
  );

  const allComponents = useMemo(() => {
    return [...CORE_COMPONENTS, ...INDUSTRY_TEMPLATES, ...customComponents].map(
      (component) => ({
        ...component,
        isFavorite: favorites.has(component.id),
        isRecentlyUsed: recentlyUsed.includes(component.id),
      }),
    );
  }, [favorites, recentlyUsed, customComponents]);

  const filteredComponents = useMemo(() => {
    let filtered = allComponents;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (component) =>
          component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          component.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          component.tags.some((tag) =>
            tag.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      if (selectedCategory === "favorites") {
        filtered = filtered.filter((component) => component.isFavorite);
      } else if (selectedCategory === "recent") {
        filtered = filtered.filter((component) => component.isRecentlyUsed);
      } else {
        filtered = filtered.filter(
          (component) => component.category === selectedCategory,
        );
      }
    }

    // Filter by difficulty based on user experience
    if (!showAdvanced) {
      const allowedDifficulties = {
        beginner: ["beginner"],
        intermediate: ["beginner", "intermediate"],
        advanced: ["beginner", "intermediate", "advanced"],
      };
      filtered = filtered.filter((component) =>
        allowedDifficulties[userExperience].includes(component.difficulty),
      );
    }

    // Sort by popularity and rating
    return filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      if (a.isRecentlyUsed && !b.isRecentlyUsed) return -1;
      if (!a.isRecentlyUsed && b.isRecentlyUsed) return 1;
      return b.popularity - a.popularity;
    });
  }, [
    allComponents,
    searchTerm,
    selectedCategory,
    userExperience,
    showAdvanced,
  ]);

  useEffect(() => {
    generateIntelligentSuggestions();
  }, [currentConfiguration, searchContext, canvasNodes]);

  useEffect(() => {
    loadCustomComponents();
    loadUserPreferences();
  }, []);

  const generateIntelligentSuggestions = () => {
    const suggestions: IntelligentSuggestion[] = [];

    // Suggest based on current configuration
    if (currentConfiguration.category === "customer-support") {
      const supportAgent = allComponents.find(
        (c) => c.id === "customer-support-agent",
      );
      if (supportAgent) {
        suggestions.push({
          id: "support-suggestion",
          component: supportAgent,
          reason: "Perfect for customer support use cases",
          confidence: 0.95,
          context: "Based on your agent category",
        });
      }
    }

    // Suggest based on search context
    if (
      searchContext.toLowerCase().includes("search") ||
      searchContext.toLowerCase().includes("information")
    ) {
      const webSearch = allComponents.find((c) => c.id === "web-search-tool");
      if (webSearch) {
        suggestions.push({
          id: "search-suggestion",
          component: webSearch,
          reason: "Adds web search capabilities",
          confidence: 0.88,
          context: "Based on your description",
        });
      }
    }

    // Suggest based on canvas analysis
    const hasAgent = canvasNodes.some((node) => node.type === "agent");
    const hasKnowledge = canvasNodes.some((node) => node.type === "knowledge");

    if (hasAgent && !hasKnowledge) {
      const knowledgeBase = allComponents.find(
        (c) => c.id === "knowledge-base",
      );
      if (knowledgeBase) {
        suggestions.push({
          id: "knowledge-suggestion",
          component: knowledgeBase,
          reason: "Enhance your agent with knowledge",
          confidence: 0.82,
          context: "Workflow optimization",
        });
      }
    }

    setIntelligentSuggestions(suggestions.slice(0, 3));
  };

  const loadCustomComponents = async () => {
    try {
      const response = await api.get("/components/custom");
      if (response.data.success) {
        setCustomComponents(response.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load custom components:", error);
    }
  };

  const loadUserPreferences = () => {
    try {
      const savedFavorites = localStorage.getItem("component-favorites");
      const savedRecent = localStorage.getItem("component-recent");

      if (savedFavorites) {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      }

      if (savedRecent) {
        setRecentlyUsed(JSON.parse(savedRecent));
      }
    } catch (error) {
      console.error("Failed to load user preferences:", error);
    }
  };

  const handleAddComponent = (component: ComponentTemplate) => {
    onAddComponent(component);

    // Update recently used
    const newRecent = [
      component.id,
      ...recentlyUsed.filter((id) => id !== component.id),
    ].slice(0, 10);
    setRecentlyUsed(newRecent);
    localStorage.setItem("component-recent", JSON.stringify(newRecent));

    toast({
      title: "Component Added",
      description: `${component.name} has been added to your workflow`,
    });
  };

  const toggleFavorite = (componentId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(componentId)) {
      newFavorites.delete(componentId);
    } else {
      newFavorites.add(componentId);
    }
    setFavorites(newFavorites);
    localStorage.setItem(
      "component-favorites",
      JSON.stringify([...newFavorites]),
    );
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

  const renderComponent = (component: ComponentTemplate) => (
    <Card
      key={component.id}
      className="mb-3 hover:shadow-md transition-shadow cursor-pointer"
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {component.icon}
            <div>
              <h4 className="font-medium text-sm">{component.name}</h4>
              <p className="text-xs text-gray-500 line-clamp-2">
                {component.description}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(component.id);
            }}
          >
            <Heart
              className={`h-3 w-3 ${
                component.isFavorite
                  ? "fill-red-500 text-red-500"
                  : "text-gray-400"
              }`}
            />
          </Button>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-1">
            <Badge
              variant="outline"
              className={`text-xs ${getDifficultyColor(component.difficulty)}`}
            >
              {component.difficulty}
            </Badge>
            {component.isRecentlyUsed && (
              <Badge
                variant="outline"
                className="text-xs bg-blue-100 text-blue-800"
              >
                <Clock className="h-2 w-2 mr-1" />
                Recent
              </Badge>
            )}
            {component.isCustom && (
              <Badge
                variant="outline"
                className="text-xs bg-purple-100 text-purple-800"
              >
                Custom
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {component.rating.toFixed(1)}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          {component.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Used {component.usageCount.toLocaleString()} times
          </span>
          <Button
            size="sm"
            onClick={() => handleAddComponent(component)}
            className="h-6 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Component Palette
        </CardTitle>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showAdvanced ? "default" : "outline"}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="h-3 w-3 mr-1" />
            Advanced
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          className="h-full"
        >
          <TabsList className="grid w-full grid-cols-3 mx-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>

          <div className="px-4 py-2">
            <div className="flex gap-1 flex-wrap">
              {["core", "tools", "knowledge", "integrations", "custom"].map(
                (category) => (
                  <Button
                    key={category}
                    size="sm"
                    variant={
                      selectedCategory === category ? "default" : "outline"
                    }
                    onClick={() => setSelectedCategory(category)}
                    className="text-xs h-6"
                  >
                    {category}
                  </Button>
                ),
              )}
            </div>
          </div>

          <ScrollArea className="h-[500px] px-4">
            {/* Intelligent Suggestions */}
            {intelligentSuggestions.length > 0 &&
              selectedCategory === "all" && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <h3 className="font-medium text-sm">AI Suggestions</h3>
                  </div>
                  {intelligentSuggestions.map((suggestion) => (
                    <Card
                      key={suggestion.id}
                      className="mb-2 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {suggestion.component.icon}
                            <div>
                              <h4 className="font-medium text-sm">
                                {suggestion.component.name}
                              </h4>
                              <p className="text-xs text-purple-700">
                                {suggestion.reason}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs bg-purple-100 text-purple-800"
                          >
                            {Math.round(suggestion.confidence * 100)}% match
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">
                            {suggestion.context}
                          </span>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAddComponent(suggestion.component)
                            }
                            className="h-6 text-xs bg-purple-600 hover:bg-purple-700"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Separator className="my-4" />
                </div>
              )}

            {/* Components */}
            <TabsContent value="all" className="mt-0">
              {filteredComponents.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Settings className="h-8 w-8 mx-auto mb-2" />
                  <p>No components found</p>
                  <p className="text-sm">
                    Try adjusting your search or filters
                  </p>
                </div>
              ) : (
                filteredComponents.map(renderComponent)
              )}
            </TabsContent>

            <TabsContent value="favorites" className="mt-0">
              {filteredComponents.filter((c) => c.isFavorite).length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Heart className="h-8 w-8 mx-auto mb-2" />
                  <p>No favorites yet</p>
                  <p className="text-sm">
                    Click the heart icon to add favorites
                  </p>
                </div>
              ) : (
                filteredComponents
                  .filter((c) => c.isFavorite)
                  .map(renderComponent)
              )}
            </TabsContent>

            <TabsContent value="recent" className="mt-0">
              {filteredComponents.filter((c) => c.isRecentlyUsed).length ===
              0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>No recent components</p>
                  <p className="text-sm">Components you use will appear here</p>
                </div>
              ) : (
                filteredComponents
                  .filter((c) => c.isRecentlyUsed)
                  .map(renderComponent)
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
