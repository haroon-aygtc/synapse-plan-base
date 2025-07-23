"use client";

import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Star,
  Download,
  Eye,
  TrendingUp,
  Users,
  Clock,
  Search,
  Filter,
  Sparkles,
  Award,
  CheckCircle,
  MessageSquare,
  Settings,
  Zap,
  Target,
  Lightbulb,
  BarChart,
  Shield,
  Globe,
} from "lucide-react";
import { AgentConfiguration } from "@/lib/ai-assistant";
import { useToast } from "@/components/ui/use-toast";

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  author: {
    name: string;
    avatar?: string;
    verified: boolean;
  };
  config: Partial<AgentConfiguration>;
  stats: {
    downloads: number;
    rating: number;
    reviews: number;
    successRate: number;
  };
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  featured: boolean;
  premium: boolean;
  lastUpdated: Date;
  version: string;
  useCases: string[];
  preview?: {
    conversation: Array<{
      role: "user" | "assistant";
      content: string;
    }>;
  };
}

interface AgentMarketplaceProps {
  onSelectTemplate: (template: AgentTemplate) => void;
  onDeployTemplate: (template: AgentTemplate) => void;
  className?: string;
}

// Mock data - in a real app, this would come from an API
const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "customer-support-pro",
    name: "Customer Support Pro",
    description: "Advanced customer support agent with sentiment analysis and escalation handling",
    category: "customer-support",
    author: {
      name: "SynapseAI Team",
      verified: true,
    },
    config: {
      personality: "helpful",
      model: "gpt-4",
      temperature: 0.3,
      memoryEnabled: true,
      tone: "professional",
      style: "supportive",
      capabilities: ["sentiment-analysis", "escalation-handling", "knowledge-base"],
    },
    stats: {
      downloads: 15420,
      rating: 4.8,
      reviews: 342,
      successRate: 94,
    },
    tags: ["support", "customer-service", "escalation", "sentiment"],
    difficulty: "intermediate",
    featured: true,
    premium: false,
    lastUpdated: new Date('2024-01-15'),
    version: "2.1.0",
    useCases: ["Help desk", "Live chat", "Ticket resolution"],
    preview: {
      conversation: [
        { role: "user", content: "I'm having trouble with my account login" },
        { role: "assistant", content: "I understand how frustrating login issues can be. Let me help you resolve this quickly. Can you tell me what happens when you try to log in?" },
      ],
    },
  },
  {
    id: "sales-qualifier-ai",
    name: "Sales Qualifier AI",
    description: "Intelligent lead qualification agent with CRM integration and scoring",
    category: "sales",
    author: {
      name: "Revenue Labs",
      verified: true,
    },
    config: {
      personality: "professional",
      model: "gpt-4",
      temperature: 0.5,
      memoryEnabled: true,
      tone: "confident",
      style: "consultative",
      capabilities: ["lead-scoring", "crm-integration", "qualification"],
    },
    stats: {
      downloads: 8930,
      rating: 4.6,
      reviews: 187,
      successRate: 87,
    },
    tags: ["sales", "leads", "qualification", "crm"],
    difficulty: "advanced",
    featured: true,
    premium: true,
    lastUpdated: new Date('2024-01-12'),
    version: "1.8.2",
    useCases: ["Lead qualification", "Sales discovery", "Demo scheduling"],
  },
  {
    id: "content-creator-assistant",
    name: "Content Creator Assistant",
    description: "Creative writing assistant for blogs, social media, and marketing content",
    category: "marketing",
    author: {
      name: "Creative Studio",
      verified: false,
    },
    config: {
      personality: "creative",
      model: "gpt-4",
      temperature: 0.8,
      memoryEnabled: true,
      tone: "engaging",
      style: "creative",
      capabilities: ["content-generation", "seo-optimization", "social-media"],
    },
    stats: {
      downloads: 12650,
      rating: 4.7,
      reviews: 298,
      successRate: 91,
    },
    tags: ["content", "writing", "marketing", "seo"],
    difficulty: "beginner",
    featured: false,
    premium: false,
    lastUpdated: new Date('2024-01-10'),
    version: "1.5.1",
    useCases: ["Blog writing", "Social media posts", "Ad copy"],
  },
  {
    id: "technical-documentation",
    name: "Technical Documentation Expert",
    description: "Specialized agent for creating and maintaining technical documentation",
    category: "technical",
    author: {
      name: "DevTools Inc",
      verified: true,
    },
    config: {
      personality: "technical",
      model: "gpt-4",
      temperature: 0.2,
      memoryEnabled: true,
      tone: "technical",
      style: "instructional",
      capabilities: ["code-analysis", "documentation", "api-docs"],
    },
    stats: {
      downloads: 5420,
      rating: 4.9,
      reviews: 89,
      successRate: 96,
    },
    tags: ["technical", "documentation", "api", "code"],
    difficulty: "advanced",
    featured: false,
    premium: true,
    lastUpdated: new Date('2024-01-08'),
    version: "3.0.0",
    useCases: ["API documentation", "User guides", "Technical specs"],
  },
  {
    id: "hr-assistant",
    name: "HR Assistant",
    description: "Human resources assistant for employee queries and policy guidance",
    category: "hr",
    author: {
      name: "HR Solutions",
      verified: true,
    },
    config: {
      personality: "professional",
      model: "gpt-3.5-turbo",
      temperature: 0.4,
      memoryEnabled: true,
      tone: "supportive",
      style: "professional",
      capabilities: ["policy-guidance", "employee-support", "compliance"],
    },
    stats: {
      downloads: 3280,
      rating: 4.5,
      reviews: 67,
      successRate: 89,
    },
    tags: ["hr", "policies", "employees", "compliance"],
    difficulty: "intermediate",
    featured: false,
    premium: false,
    lastUpdated: new Date('2024-01-05'),
    version: "1.2.3",
    useCases: ["Policy questions", "Benefits info", "Leave requests"],
  },
];

export default function AgentMarketplace({
  onSelectTemplate,
  onDeployTemplate,
  className = "",
}: AgentMarketplaceProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);

  // Filter and sort templates
  const filteredTemplates = AGENT_TEMPLATES.filter((template) => {
    const matchesSearch =
      searchQuery === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;

    const matchesDifficulty =
      selectedDifficulty === "all" || template.difficulty === selectedDifficulty;

    const matchesPremium = !showPremiumOnly || template.premium;

    return matchesSearch && matchesCategory && matchesDifficulty && matchesPremium;
  }).sort((a, b) => {
    switch (sortBy) {
      case "featured":
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.stats.downloads - a.stats.downloads;
      case "downloads":
        return b.stats.downloads - a.stats.downloads;
      case "rating":
        return b.stats.rating - a.stats.rating;
      case "recent":
        return b.lastUpdated.getTime() - a.lastUpdated.getTime();
      default:
        return 0;
    }
  });

  const handlePreviewTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    onSelectTemplate(template);
  };

  const handleDeployTemplate = (template: AgentTemplate) => {
    onDeployTemplate(template);
    toast({
      title: "Template deployed",
      description: `"${template.name}" has been added to your agents`,
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "customer-support":
        return MessageSquare;
      case "sales":
        return TrendingUp;
      case "marketing":
        return Lightbulb;
      case "technical":
        return Settings;
      case "hr":
        return Users;
      default:
        return Bot;
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
    <div className={`h-full bg-background ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Agent Marketplace</h2>
          <p className="text-muted-foreground">
            Discover and deploy pre-built AI agents created by the community
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="customer-support">Customer Support</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="downloads">Most Downloaded</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="recent">Recently Updated</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant={showPremiumOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPremiumOnly(!showPremiumOnly)}
              >
                <Award className="h-4 w-4 mr-2" />
                Premium Only
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {filteredTemplates.length} agent{filteredTemplates.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const CategoryIcon = getCategoryIcon(template.category);
            
            return (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  template.featured ? "ring-2 ring-primary/20" : ""
                } ${
                  selectedTemplate?.id === template.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handlePreviewTemplate(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CategoryIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {template.name}
                          {template.featured && (
                            <Badge variant="default" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          {template.premium && (
                            <Badge variant="secondary" className="text-xs">
                              <Award className="h-3 w-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">{template.stats.rating}</span>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < Math.floor(template.stats.rating)
                                      ? "text-yellow-400 fill-current"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              ({template.stats.reviews})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <CardDescription className="mt-2">
                    {template.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Author */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-3 w-3" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      by {template.author.name}
                    </span>
                    {template.author.verified && (
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <span>{template.stats.downloads.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>{template.stats.successRate}% success</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Difficulty */}
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getDifficultyColor(template.difficulty)}`}
                    >
                      {template.difficulty}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      v{template.version}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        handlePreviewTemplate(template);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        handleDeployTemplate(template);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Deploy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No agents found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or browse all categories
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
