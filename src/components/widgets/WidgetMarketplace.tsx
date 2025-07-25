'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Star,
  Download,
  Eye,
  Heart,
  ExternalLink,
  Zap,
  Bot,
  Wrench,
  GitBranch,
  Users,
  TrendingUp,
  Award,
  Clock,
  Tag,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useWidgetTemplates } from '@/hooks/useWidgets';
import { WidgetTemplate } from '@/hooks/useWidgets';

interface WidgetMarketplaceProps {
  onTemplateSelect?: (template: WidgetTemplate) => void;
  showCreateButton?: boolean;
}

export function WidgetMarketplace({
  onTemplateSelect,
  showCreateButton = true,
}: WidgetMarketplaceProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<
    'all' | 'agent' | 'tool' | 'workflow'
  >('all');
  const [sortBy, setSortBy] = useState<'rating' | 'downloads' | 'recent'>(
    'rating',
  );
  const [selectedTemplate, setSelectedTemplate] =
    useState<WidgetTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const {
    templates,
    loading,
    error,
    pagination,
    fetchTemplates,
    createFromTemplate,
  } = useWidgetTemplates();

  useEffect(() => {
    fetchTemplates({
      search: search || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      type: selectedType !== 'all' ? selectedType : undefined,
      sortBy:
        sortBy === 'rating'
          ? 'templateRating'
          : sortBy === 'downloads'
            ? 'templateDownloads'
            : 'createdAt',
      sortOrder: sortBy === 'recent' ? 'DESC' : 'DESC',
    });
  }, [search, selectedCategory, selectedType, sortBy]);

  const categories = [
    { value: 'all', label: 'All Categories', icon: null },
    { value: 'customer-service', label: 'Customer Service', icon: Users },
    { value: 'sales', label: 'Sales & Marketing', icon: TrendingUp },
    { value: 'productivity', label: 'Productivity', icon: Zap },
    { value: 'analytics', label: 'Analytics', icon: Award },
    { value: 'automation', label: 'Automation', icon: GitBranch },
    { value: 'communication', label: 'Communication', icon: Users },
  ];

  const handleTemplateSelect = async (template: WidgetTemplate) => {
    if (onTemplateSelect) {
      onTemplateSelect(template);
      return;
    }

    // Navigate to create widget with template
    router.push(`/widgets/create?template=${template.id}`);
  };

  const handlePreviewTemplate = (template: WidgetTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleCreateFromTemplate = async (template: WidgetTemplate) => {
    try {
      // This would typically open a dialog to get widget name and source
      const widgetName = prompt(
        `Enter name for your widget based on "${template.name}":`,
      );
      if (!widgetName) return;

      // Get available sources based on template type
      const availableSources = await getAvailableSources(template.type);

      if (availableSources.length === 0) {
        toast({
          title: 'No Sources Available',
          description: `You need to create a ${template.type} first before using this template.`,
          variant: 'destructive',
        });
        return;
      }

      // Use the first available source or let user select
      const sourceId = availableSources[0].id;

      const widget = await createFromTemplate(template.id, {
        name: widgetName,
        sourceId,
        configuration: template.configuration,
      });

      toast({
        title: 'Widget Created',
        description: `"${widgetName}" has been created from template successfully.`,
      });

      router.push(`/widgets/${widget.id}/edit`);
    } catch (error: any) {
      console.error('Error creating widget from template:', error);
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to create widget from template.',
        variant: 'destructive',
      });
    }
  };

  const getAvailableSources = async (type: 'agent' | 'tool' | 'workflow') => {
    try {
      // This would call the appropriate API based on type
      const response = await fetch(`/api/${type}s?limit=100&isActive=true`);
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error: any) {
      console.error(`Error fetching ${type}s:`, error);
      return [];
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'agent':
        return Bot;
      case 'tool':
        return Wrench;
      case 'workflow':
        return GitBranch;
      default:
        return Zap;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'agent':
        return 'bg-blue-100 text-blue-800';
      case 'tool':
        return 'bg-green-100 text-green-800';
      case 'workflow':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? 'text-yellow-400 fill-current'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Error Loading Templates
        </h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => fetchTemplates()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Widget Marketplace
          </h2>
          <p className="text-gray-600">
            Discover and deploy pre-built widget templates
          </p>
        </div>
        {showCreateButton && (
          <Button onClick={() => router.push('/widgets/create')}>
            Create Custom Widget
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                <div className="flex items-center gap-2">
                  {category.icon && <category.icon className="h-4 w-4" />}
                  {category.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={selectedType}
          onValueChange={(value: any) => setSelectedType(value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="agent">Agents</SelectItem>
            <SelectItem value="tool">Tools</SelectItem>
            <SelectItem value="workflow">Workflows</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Top Rated</SelectItem>
            <SelectItem value="downloads">Most Popular</SelectItem>
            <SelectItem value="recent">Recently Added</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No templates found
          </h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const TypeIcon = getTypeIcon(template.type);

            return (
              <Card
                key={template.id}
                className="hover:shadow-lg transition-shadow group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getTypeColor(template.type)}>
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {template.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg mb-1">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Preview Image */}
                  {template.preview?.image && (
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={template.preview.image}
                        alt={`${template.name} preview`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      {renderStars(template.rating)}
                      <span className="ml-1">
                        ({template.rating.toFixed(1)})
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        {template.downloads.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(template.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Creator */}
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={template.createdBy.avatar} />
                      <AvatarFallback className="text-xs">
                        {template.createdBy.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-600">
                      by {template.createdBy.name}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviewTemplate(template)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleTemplateSelect(template)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
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
              disabled={pagination.page === pagination.totalPages}
              onClick={() => fetchTemplates({ page: pagination.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Template Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {React.createElement(getTypeIcon(selectedTemplate.type), {
                    className: 'h-5 w-5',
                  })}
                  {selectedTemplate.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedTemplate.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Preview Image/Demo */}
                {selectedTemplate.preview?.image && (
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={selectedTemplate.preview.image}
                      alt={`${selectedTemplate.name} preview`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Template Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Template Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <Badge className={getTypeColor(selectedTemplate.type)}>
                          {selectedTemplate.type}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category:</span>
                        <span>{selectedTemplate.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rating:</span>
                        <div className="flex items-center gap-1">
                          {renderStars(selectedTemplate.rating)}
                          <span>({selectedTemplate.rating.toFixed(1)})</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Downloads:</span>
                        <span>
                          {selectedTemplate.downloads.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Creator</h4>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={selectedTemplate.createdBy.avatar} />
                        <AvatarFallback>
                          {selectedTemplate.createdBy.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {selectedTemplate.createdBy.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Created{' '}
                          {new Date(
                            selectedTemplate.createdAt,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {selectedTemplate.tags && selectedTemplate.tags.length > 0 && (
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
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  {selectedTemplate.preview?.demoUrl && (
                    <Button variant="outline" asChild>
                      <a
                        href={selectedTemplate.preview.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Demo
                      </a>
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      handleCreateFromTemplate(selectedTemplate);
                      setPreviewOpen(false);
                    }}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Create Widget from Template
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
