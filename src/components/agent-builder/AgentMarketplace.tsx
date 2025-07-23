'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAgentBuilder } from '@/hooks/useAgentBuilder';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from '@/components/ui/use-toast';
import {
  Search,
  Filter,
  Star,
  Download,
  Bot,
  Tag,
  Settings,
  ChevronRight,
  Check,
  X,
  Info,
  AlertCircle,
  Zap,
  ArrowRight,
  Globe,
  Briefcase,
  Users,
  MessageSquare,
  FileText,
  Code,
  ShoppingCart,
  Headphones,
  BookOpen,
  BarChart3
} from 'lucide-react';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  industry: string;
  useCase: string;
  prompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  tools: string[];
  knowledgeSources: string[];
  settings: Record<string, any>;
  metadata: Record<string, any>;
  personalityTraits: Record<string, number>;
  rating: number;
  downloads: number;
  author: string;
  tags: string[];
  preview: {
    input: string;
    output: string;
  };
}

export function AgentMarketplace() {
  const { createAgent } = useAgentBuilder();
  const { getAgentTemplates, deployTemplate } = useAIAssistant();
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<AgentTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('featured');

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      try {
        const data = await getAgentTemplates();
        setTemplates(data);
        setFilteredTemplates(data);
      } catch (error) {
        console.error('Error fetching templates:', error);
        toast({
          title: 'Error',
          description: 'Failed to load agent templates',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [getAgentTemplates]);

  // Filter templates based on search and filters
  useEffect(() => {
    let result = templates;

    if (searchQuery) {
      result = result.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedCategory) {
      result = result.filter(template => template.category === selectedCategory);
    }

    if (selectedIndustry) {
      result = result.filter(template => template.industry === selectedIndustry);
    }

    if (activeTab === 'featured') {
      result = result.filter(template => template.rating >= 4.0);
    } else if (activeTab === 'popular') {
      result = [...result].sort((a, b) => b.downloads - a.downloads);
    } else if (activeTab === 'newest') {
      // Assuming there's a createdAt field, otherwise this is just a placeholder
      result = [...result].sort((a, b) =>
        new Date(b.metadata.createdAt || 0).getTime() -
        new Date(a.metadata.createdAt || 0).getTime()
      );
    }

    setFilteredTemplates(result);
  }, [templates, searchQuery, selectedCategory, selectedIndustry, activeTab]);

  const handleDeployTemplate = useCallback(async () => {
    if (!selectedTemplate) return;

    setIsDeploying(true);
    try {
      const result = await deployTemplate(selectedTemplate.id);

      toast({
        title: 'Template Deployed',
        description: 'Agent has been created successfully',
      });

      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error deploying template:', error);
      toast({
        title: 'Deployment Failed',
        description: 'Failed to deploy agent template',
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  }, [selectedTemplate, deployTemplate]);

  const categories = Array.from(new Set(templates.map(t => t.category)));
  const industries = Array.from(new Set(templates.map(t => t.industry)));

  const getCategoryIcon = (category: string) => {
    const icons = {
      'customer-support': <Headphones className="h-4 w-4" />,
      'content-creation': <FileText className="h-4 w-4" />,
      'data-analysis': <BarChart3 className="h-4 w-4" />,
      'code-assistant': <Code className="h-4 w-4" />,
      'education': <BookOpen className="h-4 w-4" />,
      'e-commerce': <ShoppingCart className="h-4 w-4" />,
      'general': <Bot className="h-4 w-4" />,
      'default': <Bot className="h-4 w-4" />
    };

    const key = category.toLowerCase().replace(/\s+/g, '-');
    return icons[key as keyof typeof icons] || icons.default;
  };

  const getIndustryIcon = (industry: string) => {
    const icons = {
      'technology': <Code className="h-4 w-4" />,
      'healthcare': <Users className="h-4 w-4" />,
      'finance': <BarChart3 className="h-4 w-4" />,
      'education': <BookOpen className="h-4 w-4" />,
      'retail': <ShoppingCart className="h-4 w-4" />,
      'general': <Globe className="h-4 w-4" />,
      'default': <Briefcase className="h-4 w-4" />
    };

    const key = industry.toLowerCase().replace(/\s+/g, '-');
    return icons[key as keyof typeof icons] || icons.default;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
              }`}
          />
        ))}
        <span className="ml-1 text-xs font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Agent Marketplace</h2>
          <p className="text-muted-foreground">
            Discover and deploy pre-built agent templates
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters Sidebar */}
        <div className="w-full md:w-64 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted ${selectedCategory === null ? 'bg-muted' : ''
                  }`}
                onClick={() => setSelectedCategory(null)}
              >
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4" />
                  <span className="text-sm">All Categories</span>
                </div>
                {selectedCategory === null && <Check className="h-4 w-4" />}
              </div>

              {categories.map((category) => (
                <div
                  key={category}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted ${selectedCategory === category ? 'bg-muted' : ''
                    }`}
                  onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
                >
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(category)}
                    <span className="text-sm">{category}</span>
                  </div>
                  {selectedCategory === category && <Check className="h-4 w-4" />}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Industries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted ${selectedIndustry === null ? 'bg-muted' : ''
                  }`}
                onClick={() => setSelectedIndustry(null)}
              >
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">All Industries</span>
                </div>
                {selectedIndustry === null && <Check className="h-4 w-4" />}
              </div>

              {industries.map((industry) => (
                <div
                  key={industry}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted ${selectedIndustry === industry ? 'bg-muted' : ''
                    }`}
                  onClick={() => setSelectedIndustry(industry === selectedIndustry ? null : industry)}
                >
                  <div className="flex items-center space-x-2">
                    {getIndustryIcon(industry)}
                    <span className="text-sm">{industry}</span>
                  </div>
                  {selectedIndustry === industry && <Check className="h-4 w-4" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Templates Grid */}
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="featured">Featured</TabsTrigger>
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="newest">Newest</TabsTrigger>
            </TabsList>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                <p className="text-muted-foreground max-w-md">
                  Try adjusting your search or filters to find agent templates.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {template.description}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="flex items-center space-x-1">
                          {getCategoryIcon(template.category)}
                          <span className="ml-1">{template.category}</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-1">
                            <Bot className="h-4 w-4 text-muted-foreground" />
                            <span>{template.model}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Download className="h-4 w-4 text-muted-foreground" />
                            <span>{template.downloads.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
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
                          <div className="flex items-center space-x-1">
                            <Settings className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {template.tools.length} tools
                            </span>
                          </div>
                          {renderStars(template.rating)}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button
                        className="w-full"
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Deploy Template
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </Tabs>
        </div>
      </div>

      {/* Template Details Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Details</h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Category:</span>
                  <Badge variant="outline">{selectedTemplate?.category}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Industry:</span>
                  <Badge variant="outline">{selectedTemplate?.industry}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Model:</span>
                  <span>{selectedTemplate?.model}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Temperature:</span>
                  <span>{selectedTemplate?.temperature}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Author:</span>
                  <span>{selectedTemplate?.author}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Downloads:</span>
                  <span>{selectedTemplate?.downloads.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rating:</span>
                  {selectedTemplate && renderStars(selectedTemplate.rating)}
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <h4 className="text-sm font-medium">Capabilities</h4>
              <div className="space-y-3">
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-1">Tools</h5>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate?.tools.map((tool) => (
                      <Badge key={tool} variant="outline" className="text-xs">
                        {tool}
                      </Badge>
                    ))}
                    {!selectedTemplate?.tools.length && (
                      <span className="text-xs text-muted-foreground">No tools configured</span>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-1">Knowledge Sources</h5>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate?.knowledgeSources.map((source) => (
                      <Badge key={source} variant="outline" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                    {!selectedTemplate?.knowledgeSources.length && (
                      <span className="text-xs text-muted-foreground">No knowledge sources configured</span>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-1">Tags</h5>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate?.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-1">Personality</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTemplate?.personalityTraits && Object.entries(selectedTemplate.personalityTraits).map(([trait, value]) => (
                      <div key={trait} className="flex items-center justify-between">
                        <span className="text-xs capitalize">{trait}:</span>
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="preview">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="prompt">System Prompt</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="space-y-4 mt-2">
              <div className="border rounded-md p-3 bg-muted/30">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">User</span>
                </div>
                <p className="text-sm">{selectedTemplate?.preview.input}</p>
              </div>

              <div className="border rounded-md p-3 bg-primary/5">
                <div className="flex items-center space-x-2 mb-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Agent</span>
                </div>
                <p className="text-sm">{selectedTemplate?.preview.output}</p>
              </div>
            </TabsContent>
            <TabsContent value="prompt" className="mt-2">
              <div className="border rounded-md p-3 bg-muted/30 font-mono text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                {selectedTemplate?.prompt}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeployTemplate}
              disabled={isDeploying}
            >
              {isDeploying ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Deploying...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Deploy Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}