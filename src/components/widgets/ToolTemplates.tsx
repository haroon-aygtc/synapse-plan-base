"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWidgetTemplates } from "@/hooks/useWidgets";
import { WidgetTemplate, WidgetConfiguration } from "@/hooks/useWidgets";
import {
  Search,
  Star,
  Download,
  Eye,
  Filter,
  Grid,
  List,
  ExternalLink,
  Code,
  Zap,
  Bot,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolTemplatesProps {
  selectedType: "agent" | "tool" | "workflow";
  onTemplateSelect: (template: WidgetTemplate) => void;
  onConfigurationApply?: (configuration: WidgetConfiguration) => void;
  className?: string;
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
}

const TEMPLATE_CATEGORIES: Record<string, TemplateCategory> = {
  communication: {
    id: "communication",
    name: "Communication",
    description: "Email, chat, and messaging tools",
    icon: ({ className }) => (
      <div className={cn("w-4 h-4 bg-blue-500 rounded", className)} />
    ),
    count: 0,
  },
  productivity: {
    id: "productivity",
    name: "Productivity",
    description: "Task management and workflow tools",
    icon: ({ className }) => <Zap className={className} />,
    count: 0,
  },
  crm: {
    id: "crm",
    name: "CRM & Sales",
    description: "Customer relationship management",
    icon: ({ className }) => (
      <div className={cn("w-4 h-4 bg-green-500 rounded", className)} />
    ),
    count: 0,
  },
  analytics: {
    id: "analytics",
    name: "Analytics",
    description: "Data analysis and reporting",
    icon: ({ className }) => (
      <div className={cn("w-4 h-4 bg-purple-500 rounded", className)} />
    ),
    count: 0,
  },
  automation: {
    id: "automation",
    name: "Automation",
    description: "Workflow automation tools",
    icon: ({ className }) => <Bot className={className} />,
    count: 0,
  },
  integration: {
    id: "integration",
    name: "Integration",
    description: "API and system integrations",
    icon: ({ className }) => <Code className={className} />,
    count: 0,
  },
};

const TYPE_ICONS = {
  agent: Bot,
  tool: Code,
  workflow: Workflow,
};

export default function ToolTemplates({
  selectedType,
  onTemplateSelect,
  onConfigurationApply,
  className,
}: ToolTemplatesProps) {
  const {
    templates,
    loading,
    error,
    pagination,
    fetchTemplates,
    getTemplate,
    createFromTemplate,
  } = useWidgetTemplates();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("rating");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedTemplate, setSelectedTemplate] =
    useState<WidgetTemplate | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Fetch templates on component mount and when filters change
  useEffect(() => {
    fetchTemplates({
      type: selectedType,
      category: selectedCategory === "all" ? undefined : selectedCategory,
      search: searchQuery || undefined,
      sortBy,
      sortOrder: sortBy === "name" ? "ASC" : "DESC",
      limit: 20,
    });
  }, [selectedType, selectedCategory, searchQuery, sortBy, fetchTemplates]);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [templates, searchQuery]);

  // Update category counts
  const categoriesWithCounts = useMemo(() => {
    const counts = templates.reduce(
      (acc, template) => {
        acc[template.category] = (acc[template.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.values(TEMPLATE_CATEGORIES).map((category) => ({
      ...category,
      count: counts[category.id] || 0,
    }));
  }, [templates]);

  const handleTemplatePreview = async (template: WidgetTemplate) => {
    try {
      const fullTemplate = await getTemplate(template.id);
      setSelectedTemplate(fullTemplate);
      setPreviewDialogOpen(true);
    } catch (err) {
      console.error("Failed to load template details:", err);
    }
  };

  const handleApplyTemplate = async (template: WidgetTemplate) => {
    setIsApplying(true);
    try {
      // Apply the template configuration
      if (onConfigurationApply) {
        onConfigurationApply(template.configuration);
      }
      onTemplateSelect(template);
      setPreviewDialogOpen(false);
    } catch (err) {
      console.error("Failed to apply template:", err);
    } finally {
      setIsApplying(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS] || Code;
    return <Icon className="w-4 h-4" />;
  };

  const formatRating = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "w-3 h-3",
          i < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : "text-gray-300",
        )}
      />
    ));
  };

  const formatDownloads = (downloads: number) => {
    if (downloads >= 1000000) {
      return `${(downloads / 1000000).toFixed(1)}M`;
    } else if (downloads >= 1000) {
      return `${(downloads / 1000).toFixed(1)}K`;
    }
    return downloads.toString();
  };

  if (error) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertDescription className="text-red-800">
          Failed to load templates: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("space-y-6 bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}{" "}
            Templates
          </h3>
          <p className="text-sm text-gray-600">
            Choose from pre-built templates to get started quickly
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoriesWithCounts.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{category.name}</span>
                  <Badge variant="secondary" className="ml-2">
                    {category.count}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="downloads">Downloads</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="createdAt">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Categories */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          {categoriesWithCounts.slice(0, 5).map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="flex items-center gap-1"
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{category.name}</span>
                <Badge variant="secondary" className="ml-1">
                  {category.count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Templates Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner className="w-8 h-8" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No templates found
          </h3>
          <p className="text-gray-600">
            {searchQuery
              ? "Try adjusting your search terms"
              : "No templates available for this category"}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4",
          )}
        >
          {filteredTemplates.map((template) => {
            const Icon = TYPE_ICONS[template.type];
            return (
              <Card
                key={template.id}
                className={cn(
                  "group hover:shadow-lg transition-all duration-200 cursor-pointer border-gray-200",
                  viewMode === "list" && "flex flex-row",
                )}
                onClick={() => handleTemplatePreview(template)}
              >
                {viewMode === "grid" ? (
                  <>
                    <div className="relative">
                      <img
                        src={template.preview.image}
                        alt={template.name}
                        className="w-full h-48 object-cover rounded-t-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80`;
                        }}
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-white/90">
                          {getTypeIcon(template.type)}
                          <span className="ml-1">{template.type}</span>
                        </Badge>
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                          {template.name}
                        </CardTitle>
                        <div className="flex items-center gap-1">
                          {formatRating(template.rating)}
                          <span className="text-xs text-gray-600 ml-1">
                            ({template.rating.toFixed(1)})
                          </span>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {formatDownloads(template.downloads)}
                          </div>
                          <Badge variant="outline">
                            {TEMPLATE_CATEGORIES[template.category]?.name ||
                              template.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {template.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {template.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <img
                            src={
                              template.createdBy.avatar ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${template.createdBy.name}`
                            }
                            alt={template.createdBy.name}
                            className="w-4 h-4 rounded-full"
                          />
                          {template.createdBy.name}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <>
                    <div className="w-32 h-24 flex-shrink-0">
                      <img
                        src={template.preview.image}
                        alt={template.name}
                        className="w-full h-full object-cover rounded-l-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80`;
                        }}
                      />
                    </div>
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {template.name}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {template.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {formatRating(template.rating)}
                            <span className="text-xs text-gray-600">
                              ({template.rating.toFixed(1)})
                            </span>
                          </div>
                          <Badge variant="secondary">
                            {getTypeIcon(template.type)}
                            <span className="ml-1">{template.type}</span>
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {formatDownloads(template.downloads)}
                          </div>
                          <Badge variant="outline">
                            {TEMPLATE_CATEGORIES[template.category]?.name ||
                              template.category}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasPrev}
            onClick={() => fetchTemplates({ page: pagination.page - 1 })}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasNext}
            onClick={() => fetchTemplates({ page: pagination.page + 1 })}
          >
            Next
          </Button>
        </div>
      )}

      {/* Template Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-xl">
                      {selectedTemplate.name}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      {selectedTemplate.description}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {getTypeIcon(selectedTemplate.type)}
                      <span className="ml-1">{selectedTemplate.type}</span>
                    </Badge>
                    <div className="flex items-center gap-1">
                      {formatRating(selectedTemplate.rating)}
                      <span className="text-sm text-gray-600 ml-1">
                        ({selectedTemplate.rating.toFixed(1)})
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-6">
                  {/* Preview Image */}
                  <div className="relative">
                    <img
                      src={selectedTemplate.preview.image}
                      alt={selectedTemplate.name}
                      className="w-full h-64 object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80`;
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 bg-white/90"
                      onClick={() =>
                        window.open(selectedTemplate.preview.demoUrl, "_blank")
                      }
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Live Demo
                    </Button>
                  </div>

                  {/* Template Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Category:</span>
                          <Badge variant="outline">
                            {TEMPLATE_CATEGORIES[selectedTemplate.category]
                              ?.name || selectedTemplate.category}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Downloads:</span>
                          <span>
                            {formatDownloads(selectedTemplate.downloads)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created:</span>
                          <span>
                            {new Date(
                              selectedTemplate.createdAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Updated:</span>
                          <span>
                            {new Date(
                              selectedTemplate.updatedAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Creator</h4>
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            selectedTemplate.createdBy.avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedTemplate.createdBy.name}`
                          }
                          alt={selectedTemplate.createdBy.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <div className="font-medium">
                            {selectedTemplate.createdBy.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            Template Creator
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h4 className="font-semibold mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Configuration Preview */}
                  <div>
                    <h4 className="font-semibold mb-2">Configuration</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Theme:</span>
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded"
                                style={{
                                  backgroundColor:
                                    selectedTemplate.configuration.theme
                                      .primaryColor,
                                }}
                              />
                              Primary:{" "}
                              {
                                selectedTemplate.configuration.theme
                                  .primaryColor
                              }
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded"
                                style={{
                                  backgroundColor:
                                    selectedTemplate.configuration.theme
                                      .backgroundColor,
                                }}
                              />
                              Background:{" "}
                              {
                                selectedTemplate.configuration.theme
                                  .backgroundColor
                              }
                            </div>
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Layout:</span>
                          <div className="mt-1 space-y-1">
                            <div>
                              Size:{" "}
                              {selectedTemplate.configuration.layout.width}×
                              {selectedTemplate.configuration.layout.height}
                            </div>
                            <div>
                              Position:{" "}
                              {selectedTemplate.configuration.layout.position}
                            </div>
                            <div>
                              Responsive:{" "}
                              {selectedTemplate.configuration.layout.responsive
                                ? "Yes"
                                : "No"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Download className="w-4 h-4" />
                  {formatDownloads(selectedTemplate.downloads)} downloads
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPreviewDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleApplyTemplate(selectedTemplate)}
                    disabled={isApplying}
                  >
                    {isApplying ? (
                      <>
                        <LoadingSpinner className="w-4 h-4 mr-2" />
                        Applying...
                      </>
                    ) : (
                      "Use This Template"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
