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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Star,
  Download,
  Eye,
  Heart,
  MessageSquare,
  TrendingUp,
  Users,
  Bot,
  Settings,
  Zap,
  FileText,
  Filter,
  SortAsc,
  SortDesc,
  Award,
  Verified,
  Clock,
  DollarSign,
} from "lucide-react";
import { type AgentConfiguration } from "@/lib/ai-assistant";

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  category: string;
  industry: string;
  author: {
    name: string;
    avatar: string;
    verified: boolean;
    reputation: number;
  };
  rating: number;
  reviewCount: number;
  downloadCount: number;
  price: number; // 0 for free
  tags: string[];
  configuration: Partial<AgentConfiguration>;
  screenshots: string[];
  features: string[];
  useCases: string[];
  requirements: string[];
  changelog: Array<{
    version: string;
    date: string;
    changes: string[];
  }>;
  createdAt: Date;
  updatedAt: Date;
  featured: boolean;
  trending: boolean;
  verified: boolean;
}

interface AgentMarketplaceProps {
  onSelectTemplate: (template: AgentTemplate) => void;
  onDeployTemplate: (template: AgentTemplate) => void;
  className?: string;
}

const MOCK_TEMPLATES: AgentTemplate[] = [
  {
    id: "customer-support-pro",
    name: "Customer Support Pro",
    description: "Advanced customer support agent with multi-language support and sentiment analysis",
    longDescription: "A comprehensive customer support solution that handles complex inquiries, provides personalized responses, and integrates with popular helpdesk systems. Features advanced sentiment analysis, multi-language support, and intelligent ticket routing.",
    category: "customer-support",
    industry: "SaaS",
    author: {
      name: "SupportTech Solutions",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=supporttech",
      verified: true,
      reputation: 4.8,
    },
    rating: 4.9,
    reviewCount: 247,
    downloadCount: 1523,
    price: 0,
    tags: ["customer-service", "multilingual", "sentiment-analysis", "helpdesk"],
    configuration: {
      personality: "helpful",
      model: "gpt-4",
      temperature: 0.3,
      memoryEnabled: true,
      contextWindow: 20,
      tone: "professional",
      style: "supportive",
      capabilities: ["web-search", "knowledge-base", "sentiment-analysis"],
      tools: ["helpdesk-integration", "ticket-system"],
    },
    screenshots: [
      "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
    ],
    features: [
      "Multi-language support (15+ languages)",
      "Real-time sentiment analysis",
      "Intelligent ticket routing",
      "Knowledge base integration",
      "Performance analytics",
      "Custom branding options",
    ],
    useCases: [
      "E-commerce customer support",
      "SaaS product support",
      "Technical troubleshooting",
      "Billing and account inquiries",
    ],
    requirements: [
      "OpenAI API key",
      "Helpdesk system integration (optional)",
      "Knowledge base setup",
    ],
    changelog: [
      {
        version: "2.1.0",
        date: "2024-01-15",
        changes: [
          "Added sentiment analysis",
          "Improved response accuracy",
          "New language support",
        ],
      },
    ],
    createdAt: new Date("2023-12-01"),
    updatedAt: new Date("2024-01-15"),
    featured: true,
    trending: true,
    verified: true,
  },
  {
    id: "sales-qualifier-ai",
    name: "Sales Qualifier AI",
    description: "Intelligent lead qualification and nurturing system with CRM integration",
    longDescription: "Transform your sales process with AI-powered lead qualification. This agent automatically scores leads, schedules meetings, and integrates with popular CRM systems to streamline your sales pipeline.",
    category: "sales",
    industry: "Sales",
    author: {
      name: "SalesBoost Inc",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=salesboost",
      verified: true,
      reputation: 4.6,
    },
    rating: 4.7,
    reviewCount: 189,
    downloadCount: 892,
    price: 29.99,
    tags: ["sales", "lead-qualification", "crm", "automation"],
    configuration: {
      personality: "professional",
      model: "gpt-4",
      temperature: 0.5,
      memoryEnabled: true,
      contextWindow: 15,
      tone: "confident",
      style: "consultative",
      capabilities: ["web-search", "data-analysis", "calendar"],
      tools: ["crm-integration", "lead-scoring", "meeting-scheduler"],
    },
    screenshots: [
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
      "https://images.unsplash.com/photo-1553484771-371a605b060b?w=800&q=80",
    ],
    features: [
      "Automated lead scoring",
      "CRM integration (Salesforce, HubSpot)",
      "Meeting scheduling",
      "Follow-up automation",
      "Performance tracking",
      "Custom qualification criteria",
    ],
    useCases: [
      "B2B lead qualification",
      "Product demo scheduling",
      "Sales pipeline management",
      "Lead nurturing campaigns",
    ],
    requirements: [
      "CRM system access",
      "Calendar integration",
      "Lead scoring criteria setup",
    ],
    changelog: [
      {
        version: "1.5.0",
        date: "2024-01-10",
        changes: [
          "Added HubSpot integration",
          "Improved lead scoring algorithm",
          "Enhanced meeting scheduling",
        ],
      },
    ],
    createdAt: new Date("2023-11-15"),
    updatedAt: new Date("2024-01-10"),
    featured: false,
    trending: true,
    verified: true,
  },
  {
    id: "content-creator-pro",
    name: "Content Creator Pro",
    description: "AI-powered content generation for blogs, social media, and marketing materials",
    longDescription: "Create engaging content across multiple platforms with this versatile AI assistant. From blog posts to social media content, this agent helps maintain your brand voice while generating high-quality, SEO-optimized content.",
    category: "marketing",
    industry: "Marketing",
    author: {
      name: "ContentCraft Studio",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=contentcraft",
      verified: false,
      reputation: 4.3,
    },
    rating: 4.5,
    reviewCount: 156,
    downloadCount: 634,
    price: 19.99,
    tags: ["content", "marketing", "seo", "social-media"],
    configuration: {
      personality: "creative",
      model: "gpt-4",
      temperature: 0.8,
      memoryEnabled: true,
      contextWindow: 12,
      tone: "engaging",
      style: "creative",
      capabilities: ["image-generation", "web-search", "seo-optimization"],
      tools: ["content-planner", "seo-analyzer", "social-scheduler"],
    },
    screenshots: [
      "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=800&q=80",
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80",
    ],
    features: [
      "Multi-platform content generation",
      "SEO optimization",
      "Brand voice consistency",
      "Content calendar integration",
      "Performance analytics",
      "Image generation",
    ],
    useCases: [
      "Blog post creation",
      "Social media content",
      "Email marketing campaigns",
      "Product descriptions",
    ],
    requirements: [
      "Brand guidelines document",
      "Content calendar setup",
      "SEO keyword list",
    ],
    changelog: [
      {
        version: "1.2.0",
        date: "2024-01-05",
        changes: [
          "Added image generation",
          "Improved SEO optimization",
          "New content templates",
        ],
      },
    ],
    createdAt: new Date("2023-10-20"),
    updatedAt: new Date("2024-01-05"),
    featured: false,
    trending: false,
    verified: false,
  },
];

export default function AgentMarketplace({
  onSelectTemplate,
  onDeployTemplate,
  className,
}: AgentMarketplaceProps) {
  const [templates, setTemplates] = useState<AgentTemplate[]>(MOCK_TEMPLATES);
  const [filteredTemplates, setFilteredTemplates] = useState<AgentTemplate[]>(MOCK_TEMPLATES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Filter and sort templates
  useEffect(() => {
    let filtered = [...templates];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((template) => template.category === selectedCategory);
    }

    // Industry filter
    if (selectedIndustry !== "all") {
      filtered = filtered.filter((template) => template.industry === selectedIndustry);
    }

    // Price filter
    if (priceFilter === "free") {
      filtered = filtered.filter((template) => template.price === 0);
    } else if (priceFilter === "paid") {
      filtered = filtered.filter((template) => template.price > 0);
    }

    // Sort
    switch (sortBy) {
      case "featured":
        filtered.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return b.rating - a.rating;
        });
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "downloads":
        filtered.sort((a, b) => b.downloadCount - a.downloadCount);
        break;
      case "newest":
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case "price-low":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price - a.price);
        break;
    }

    setFilteredTemplates(filtered);
  }, [templates, searchQuery, selectedCategory, selectedIndustry, priceFilter, sortBy]);

  const handlePreview = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleDeploy = (template: AgentTemplate) => {
    onDeployTemplate(template);
    setShowPreview(false);
  };

  const categories = Array.from(new Set(templates.map((t) => t.category)));
  const industries = Array.from(new Set(templates.map((t) => t.industry)));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Agent Marketplace</h2>
          <p className="text-muted-foreground">
            Discover and deploy pre-built AI agents for your business
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{filteredTemplates.length} agents</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map((industry) => (
              <SelectItem key={industry} value={industry}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priceFilter} onValueChange={setPriceFilter}>
          <SelectTrigger className="w-24">
            <SelectValue placeholder="Price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="downloads">Downloads</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Featured Section */}
      {sortBy === "featured" && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Featured Agents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates
              .filter((t) => t.featured)
              .slice(0, 3)
              .map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{template.rating}</span>
                              <span className="text-xs text-muted-foreground">
                                ({template.reviewCount})
                              </span>
                            </div>
                            {template.verified && (
                              <Verified className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {template.price === 0 ? (
                          <Badge variant="secondary">Free</Badge>
                        ) : (
                          <Badge variant="default">${template.price}</Badge>
                        )}
                        {template.trending && (
                          <Badge variant="outline" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Trending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {template.description}
                    </CardDescription>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        <span>{template.downloadCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{template.author.name}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(template)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDeploy(template)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Deploy
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* All Templates */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">
          {sortBy === "featured" ? "All Agents" : "Search Results"}
        </h3>
        
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center">
                <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No agents found matching your criteria</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates
              .filter((t) => sortBy !== "featured" || !t.featured)
              .map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{template.rating}</span>
                              <span className="text-xs text-muted-foreground">
                                ({template.reviewCount})
                              </span>
                            </div>
                            {template.verified && (
                              <Verified className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {template.price === 0 ? (
                          <Badge variant="secondary">Free</Badge>
                        ) : (
                          <Badge variant="default">${template.price}</Badge>
                        )}
                        {template.trending && (
                          <Badge variant="outline" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Trending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {template.description}
                    </CardDescription>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        <span>{template.downloadCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{template.author.name}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(template)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDeploy(template)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Deploy
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl">{selectedTemplate.name}</DialogTitle>
                    <DialogDescription className="mt-2">
                      {selectedTemplate.longDescription}
                    </DialogDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {selectedTemplate.price === 0 ? (
                      <Badge variant="secondary" className="text-lg px-3 py-1">Free</Badge>
                    ) : (
                      <Badge variant="default" className="text-lg px-3 py-1">
                        ${selectedTemplate.price}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{selectedTemplate.rating}</span>
                      <span className="text-sm text-muted-foreground">
                        ({selectedTemplate.reviewCount} reviews)
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              
              <Tabs defaultValue="overview" className="mt-6">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="configuration">Configuration</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Key Features</h4>
                      <ul className="space-y-