'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useWidgets } from '@/hooks/useWidgets';
import { WidgetConfiguration } from '@/components/widgets/WidgetConfiguration';
import { WidgetPreview } from '@/components/widgets/WidgetPreview';
import { api } from '@/lib/api';
import { WidgetConfiguration as WidgetConfigType } from '@/lib/sdk/types';

interface SourceOption {
  id: string;
  name: string;
  description?: string;
  type: 'agent' | 'tool' | 'workflow';
}

export default function CreateWidgetPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { createWidget } = useWidgets();
  
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '' as 'agent' | 'tool' | 'workflow' | '',
    sourceId: '',
  });
  
  const [configuration, setConfiguration] = useState<WidgetConfigType>({
    theme: {
      primaryColor: '#3b82f6',
      secondaryColor: '#64748b',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      borderRadius: 8,
      fontSize: 14,
    },
    layout: {
      width: 400,
      height: 600,
      position: 'bottom-right',
      responsive: true,
    },
    behavior: {
      autoOpen: false,
      showWelcomeMessage: true,
      enableTypingIndicator: true,
      enableSoundNotifications: false,
    },
    branding: {
      showLogo: true,
      showPoweredBy: true,
    },
    security: {
      allowedDomains: [],
      requireAuth: false,
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 60,
      },
    },
  });

  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoadingSources(true);
    try {
      const [agentsRes, toolsRes, workflowsRes] = await Promise.all([
        api.get('/agents?limit=100'),
        api.get('/tools?limit=100'),
        api.get('/workflows?limit=100'),
      ]);

      const allSources: SourceOption[] = [
        ...(agentsRes.data.success ? agentsRes.data.data.map((agent: any) => ({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          type: 'agent' as const,
        })) : []),
        ...(toolsRes.data.success ? toolsRes.data.data.map((tool: any) => ({
          id: tool.id,
          name: tool.name,
          description: tool.description,
          type: 'tool' as const,
        })) : []),
        ...(workflowsRes.data.success ? workflowsRes.data.data.map((workflow: any) => ({
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          type: 'workflow' as const,
        })) : []),
      ];

      setSources(allSources);
    } catch (error) {
      console.error('Error fetching sources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sources. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingSources(false);
    }
  };

  const filteredSources = sources.filter(source => 
    !formData.type || source.type === formData.type
  );

  const selectedSource = sources.find(source => source.id === formData.sourceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.sourceId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const widget = await createWidget({
        name: formData.name,
        description: formData.description,
        type: formData.type,
        sourceId: formData.sourceId,
        configuration,
        isActive: true,
      });

      toast({
        title: 'Widget created',
        description: `"${formData.name}" has been created successfully.`,
      });

      router.push(`/widgets/${widget.id}/edit`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create widget. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: 'agent' | 'tool' | 'workflow') => {
    setFormData(prev => ({
      ...prev,
      type,
      sourceId: '', // Reset source selection when type changes
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/widgets')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Widgets
            </Button>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Widget</h1>
            <p className="text-gray-600 mt-1">
              Transform your agents, tools, and workflows into embeddable widgets
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="design">Design</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                      Configure the basic settings for your widget
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name">Widget Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter widget name"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe what this widget does"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Source Selection</CardTitle>
                    <CardDescription>
                      Choose the agent, tool, or workflow to power your widget
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="type">Source Type *</Label>
                      <Select value={formData.type} onValueChange={handleTypeChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agent">Agent</SelectItem>
                          <SelectItem value="tool">Tool</SelectItem>
                          <SelectItem value="workflow">Workflow</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.type && (
                      <div>
                        <Label htmlFor="sourceId">Source *</Label>
                        {loadingSources ? (
                          <div className="flex items-center justify-center py-4">
                            <LoadingSpinner size="sm" />
                          </div>
                        ) : (
                          <Select 
                            value={formData.sourceId} 
                            onValueChange={(value) => setFormData(prev => ({ ...prev, sourceId: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={`Select ${formData.type}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredSources.map((source) => (
                                <SelectItem key={source.id} value={source.id}>
                                  <div>
                                    <div className="font-medium">{source.name}</div>
                                    {source.description && (
                                      <div className="text-sm text-gray-500 truncate">
                                        {source.description}
                                      </div>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}

                    {selectedSource && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="font-medium text-blue-900">{selectedSource.name}</div>
                        {selectedSource.description && (
                          <div className="text-sm text-blue-700 mt-1">
                            {selectedSource.description}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="design">
                <WidgetConfiguration
                  configuration={configuration}
                  onChange={setConfiguration}
                />
              </TabsContent>

              <TabsContent value="advanced">
                <Card>
                  <CardHeader>
                    <CardTitle>Advanced Settings</CardTitle>
                    <CardDescription>
                      Configure security and behavior settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      Advanced configuration options will be available after widget creation.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={loading || !formData.name || !formData.type || !formData.sourceId}
                className="flex-1"
              >
                {loading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Create Widget
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview
                </CardTitle>
                <CardDescription>
                  See how your widget will look and behave
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WidgetPreview
                  configuration={configuration}
                  sourceType={formData.type}
                  sourceName={selectedSource?.name}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
