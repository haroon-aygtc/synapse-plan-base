'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Code,
  Database,
  Globe,
  Plus,
  Save,
  TestTube,
  Trash2,
  Wand2,
  Eye,
  Download,
  Star,
  Search,
  Filter,
  Zap,
  Bot,
  Mail,
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {apiClient} from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface ToolTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  endpoint: string;
  method: string;
  schema: any;
  headers?: Record<string, string>;
  authentication?: any;
  tags: string[];
  iconUrl?: string;
}

interface ToolFormData {
  name: string;
  description: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  authentication: {
    type: string;
    apiKey?: string;
    username?: string;
    password?: string;
  };
  category: string;
  tags: string[];
  schema: any;
  isPublic: boolean;
  timeout: number;
  rateLimit: {
    requestsPerMinute: number;
    burstLimit?: number;
  };
}

export default function ToolCreationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [testStatus, setTestStatus] = useState<
    'idle' | 'running' | 'success' | 'error'
  >('idle');
  const [testResult, setTestResult] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [templates, setTemplates] = useState<ToolTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ToolTemplate | null>(
    null,
  );
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [schemaDetecting, setSchemaDetecting] = useState(false);
  const [marketplaceDialogOpen, setMarketplaceDialogOpen] = useState(false);
  const [marketplaceTools, setMarketplaceTools] = useState<any[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [marketplaceCategory, setMarketplaceCategory] = useState('all');
  const [aiConfiguring, setAiConfiguring] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [draggedComponent, setDraggedComponent] = useState<string | null>(null);
  const [toolHealth, setToolHealth] = useState<any>(null);
  const [healthChecking, setHealthChecking] = useState(false);

  const [formData, setFormData] = useState<ToolFormData>({
    name: '',
    description: '',
    endpoint: '',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    authentication: { type: 'none' },
    category: '',
    tags: [],
    schema: null,
    isPublic: false,
    timeout: 30000,
    rateLimit: {
      requestsPerMinute: 60,
    },
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await apiClient.get('/tools/templates');

      if (response.data.success) {
        setTemplates(response.data.data || response.data);
      } else {
        setTemplates(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const generateAIConfiguration = async () => {
    if (!aiDescription.trim()) return;

    setAiConfiguring(true);
    try {
      const response = await apiClient.post('/tools/ai-configure', {
        description: aiDescription,
        apiUrl: formData.endpoint,
        serviceType: formData.category,
      });

      if (response.data.success) {
        const config = response.data.data;
        setFormData({
          ...formData,
          name: config.name || formData.name,
          description: config.description || formData.description,
          endpoint: config.endpoint || formData.endpoint,
          method: config.method || formData.method,
          headers: config.headers || formData.headers,
          authentication: config.authentication || formData.authentication,
          category: config.category || formData.category,
          tags: config.tags || formData.tags,
          schema: config.schema || formData.schema,
        });
        setShowAiDialog(false);
        setActiveTab('connection');
      }
    } catch (error) {
      console.error('AI configuration failed:', error);
    } finally {
      setAiConfiguring(false);
    }
  };

  const checkToolHealth = async () => {
    if (!formData.endpoint) return;

    setHealthChecking(true);
    try {
      // Create a temporary tool for health checking
      const tempTool = {
        ...formData,
        organizationId: user?.organizationId,
        userId: user?.id,
      };

      const createResponse = await apiClient.post('/tools', tempTool);
      if (createResponse.data.success) {
        const toolId = createResponse.data.data?.id || createResponse.data.id;

        try {
          const healthResponse = await apiClient.get(`/tools/${toolId}/health`);
          setToolHealth(healthResponse.data);
        } finally {
          // Clean up temporary tool
          await apiClient.delete(`/tools/${toolId}`);
        }
      }
    } catch (error) {
      console.error('Health check failed:', error);
      setToolHealth({
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setHealthChecking(false);
    }
  };

  const loadMarketplaceTools = async () => {
    setMarketplaceLoading(true);
    try {
      const params = new URLSearchParams();
      if (marketplaceSearch) params.append('search', marketplaceSearch);
      if (marketplaceCategory !== 'all')
        params.append('category', marketplaceCategory);
      params.append('limit', '20');

      const response = await apiClient.get(`/tools/marketplace?${params.toString()}`);

      if (response.data.success) {
        setMarketplaceTools(response.data.data || []);
      } else {
        console.error(
          'Failed to load marketplace tools:',
          response.data.message,
        );
        setMarketplaceTools([]);
      }
    } catch (error: any) {
      console.error('Failed to load marketplace tools:', error);
      setMarketplaceTools([]);
    } finally {
      setMarketplaceLoading(false);
    }
  };

  const installMarketplaceTool = async (toolId: string) => {
    try {
      const response = await apiClient.post(`/tools/marketplace/${toolId}/install`, {
        organizationId: user?.organizationId,
        userId: user?.id,
      });

      if (response.data.success) {
        setMarketplaceDialogOpen(false);
        router.push('/tools');
      } else {
        throw new Error(response.data.message || 'Failed to install tool');
      }
    } catch (error: any) {
      console.error('Failed to install tool:', error);
      alert(
        error.response?.data?.message ||
          error.message ||
          'Failed to install tool',
      );
    }
  };

  const applyTemplate = (template: ToolTemplate) => {
    setFormData({
      ...formData,
      name: template.name,
      description: template.description,
      endpoint: template.endpoint,
      method: template.method,
      headers: template.headers || { 'Content-Type': 'application/json' },
      authentication: template.authentication || { type: 'none' },
      category: template.category,
      tags: template.tags,
      schema: template.schema,
    });
    setTemplateDialogOpen(false);
    setActiveTab('connection');
  };

  const detectAPISchema = async () => {
    if (!formData.endpoint) return;

    setSchemaDetecting(true);
    try {
      const response = await apiClient.post('/tools/detect-schema', {
        endpoint: formData.endpoint,
        method: formData.method,
        headers: formData.headers,
      });

      if (response.data) {
        setFormData({ ...formData, schema: response.data });
        setActiveTab('parameters');
      }
    } catch (error) {
      console.error('Schema detection failed:', error);
    } finally {
      setSchemaDetecting(false);
    }
  };

  const runTest = async () => {
    setTestStatus('running');
    setTestResult(null);

    try {
      const testInputElement = document.getElementById(
        'test-input',
      ) as HTMLTextAreaElement;

      let testParameters = {};
      try {
        testParameters = JSON.parse(testInputElement?.value || '{}');
      } catch (parseError) {
        throw new Error('Invalid JSON in test input');
      }

      const testData = {
        functionName: 'execute',
        parameters: testParameters,
      };

      // Validate endpoint before testing
      if (!formData.endpoint) {
        throw new Error('API endpoint is required for testing');
      }

      // Create a temporary tool for testing
      const tempTool = {
        ...formData,
        organizationId: user?.organizationId,
        userId: user?.id,
        name: formData.name || 'Test Tool',
        description: formData.description || 'Temporary tool for testing',
      };

      const createResponse = await apiClient.post('/tools', tempTool);

      if (!createResponse.data.success && !createResponse.data.id) {
        throw new Error(
          createResponse.data.message || 'Failed to create temporary tool',
        );
      }

      const toolId = createResponse.data.data?.id || createResponse.data.id;

      try {
        // Test the tool with real API call
        const testResponse = await apiClient.post(`/tools/${toolId}/test`, testData);

        const result = testResponse.data.data || testResponse.data;
        setTestResult({
          ...result,
          timestamp: new Date().toISOString(),
          endpoint: formData.endpoint,
          method: formData.method,
        });
        setTestStatus(result.success ? 'success' : 'error');

        // Show success toast
        if (result.success) {
          // You can add toast notification here if needed
        }
      } finally {
        // Clean up temporary tool
        try {
          await apiClient.delete(`/tools/${toolId}`);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temporary tool:', cleanupError);
        }
      }
    } catch (error: any) {
      console.error('Test failed:', error);
      setTestStatus('error');
      setTestResult({
        success: false,
        error: error.response?.data?.message || error.message || 'Test failed',
        timestamp: new Date().toISOString(),
        endpoint: formData.endpoint,
        method: formData.method,
      });
    }
  };

  const createTool = async () => {
    if (!user) return;

    setIsCreating(true);
    try {
      const toolData = {
        ...formData,
        organizationId: user.organizationId,
        userId: user.id,
      };

      const response = await apiClient.post('/tools', toolData);

      if (response.data.success) {
        const toolId = response.data.data?.id || response.data.id;
        router.push(`/tools/${toolId}`);
      } else {
        throw new Error(response.data.message || 'Failed to create tool');
      }
    } catch (error: any) {
      console.error('Failed to create tool:', error);
      // You might want to show a toast notification here
      alert(
        error.response?.data?.message ||
          error.message ||
          'Failed to create tool',
      );
    } finally {
      setIsCreating(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      updateFormData('tags', [...formData.tags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateFormData(
      'tags',
      formData.tags.filter((tag) => tag !== tagToRemove),
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'communication':
        return MessageSquare;
      case 'crm':
        return Users;
      case 'analytics':
        return BarChart3;
      case 'automation':
        return Bot;
      case 'integration':
        return Code;
      default:
        return Globe;
    }
  };

  return (
    <div className="container mx-auto py-8 bg-background">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Create Tool</h1>
          <p className="text-muted-foreground">
            Connect your APIs and services as reusable tools
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAiDialog(true)}>
            <Wand2 className="mr-2 h-4 w-4" />
            AI Configure
          </Button>
          <Button
            variant="outline"
            onClick={() => setMarketplaceDialogOpen(true)}
          >
            <Download className="mr-2 h-4 w-4" />
            Browse Marketplace
          </Button>
          <Button variant="outline" onClick={() => router.push('/tools')}>
            Cancel
          </Button>
          <Button
            onClick={createTool}
            disabled={isCreating || !formData.name || !formData.endpoint}
          >
            {isCreating ? (
              <LoadingSpinner className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isCreating ? 'Creating...' : 'Create Tool'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Tool Configuration</CardTitle>
              <CardDescription>
                Configure your tool's details, API connection, and parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid grid-cols-4 mb-6">
                  <TabsTrigger value="general">
                    <div className="flex items-center">
                      <span className="mr-2">General</span>
                      {activeTab !== 'general' && (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="connection">
                    <div className="flex items-center">
                      <span className="mr-2">Connection</span>
                      {activeTab !== 'connection' && (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="parameters">
                    <div className="flex items-center">
                      <span className="mr-2">Parameters</span>
                      {activeTab !== 'parameters' && (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="test">
                    <div className="flex items-center">
                      <span className="mr-2">Test</span>
                      {activeTab !== 'test' && (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Tool Name</Label>
                        <Input
                          id="name"
                          placeholder="Enter tool name"
                          value={formData.name}
                          onChange={(e) =>
                            updateFormData('name', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) =>
                            updateFormData('category', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="communication">
                              Communication
                            </SelectItem>
                            <SelectItem value="crm">CRM & Sales</SelectItem>
                            <SelectItem value="analytics">Analytics</SelectItem>
                            <SelectItem value="automation">
                              Automation
                            </SelectItem>
                            <SelectItem value="integration">
                              Integration
                            </SelectItem>
                            <SelectItem value="productivity">
                              Productivity
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe what this tool does and how it should be used"
                        rows={3}
                        value={formData.description}
                        onChange={(e) =>
                          updateFormData('description', e.target.value)
                        }
                      />
                      {toolHealth && (
                        <Alert
                          className={
                            toolHealth.isHealthy
                              ? 'bg-green-50 border-green-200'
                              : 'border-red-200 bg-red-50'
                          }
                        >
                          <AlertCircle
                            className={`h-4 w-4 ${toolHealth.isHealthy ? 'text-green-600' : 'text-red-600'}`}
                          />
                          <AlertTitle
                            className={
                              toolHealth.isHealthy
                                ? 'text-green-800'
                                : 'text-red-800'
                            }
                          >
                            {toolHealth.isHealthy
                              ? 'Endpoint Healthy'
                              : 'Endpoint Issues'}
                          </AlertTitle>
                          <AlertDescription
                            className={
                              toolHealth.isHealthy
                                ? 'text-green-700'
                                : 'text-red-700'
                            }
                          >
                            {toolHealth.isHealthy
                              ? `Response time: ${toolHealth.responseTime}ms, Status: ${toolHealth.status}`
                              : toolHealth.error || 'Unable to reach endpoint'}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {tag}
                            <button
                              onClick={() => removeTag(tag)}
                              className="ml-1 hover:text-red-500"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a tag"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addTag(e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.querySelector(
                              'input[placeholder="Add a tag"]',
                            ) as HTMLInputElement;
                            if (input?.value) {
                              addTag(input.value);
                              input.value = '';
                            }
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="public"
                          checked={formData.isPublic}
                          onCheckedChange={(checked) =>
                            updateFormData('isPublic', checked)
                          }
                        />
                        <Label htmlFor="public">
                          Make this tool public in marketplace
                        </Label>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timeout">Timeout (ms)</Label>
                        <Input
                          id="timeout"
                          type="number"
                          value={formData.timeout}
                          onChange={(e) =>
                            updateFormData('timeout', parseInt(e.target.value))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="connection" className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="method">HTTP Method</Label>
                        <Select
                          value={formData.method}
                          onValueChange={(value) =>
                            updateFormData('method', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="auth-type">Authentication Type</Label>
                        <Select
                          value={formData.authentication.type}
                          onValueChange={(value) =>
                            updateFormData('authentication', {
                              ...formData.authentication,
                              type: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="api_key">API Key</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="basic">Basic Auth</SelectItem>
                            <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="endpoint">API Endpoint</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={detectAPISchema}
                          disabled={!formData.endpoint || schemaDetecting}
                        >
                          {schemaDetecting ? (
                            <LoadingSpinner className="mr-2 h-3 w-3" />
                          ) : (
                            <Wand2 className="mr-2 h-3 w-3" />
                          )}
                          {schemaDetecting
                            ? 'Detecting...'
                            : 'Auto-detect Schema'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={checkToolHealth}
                          disabled={!formData.endpoint || healthChecking}
                        >
                          {healthChecking ? (
                            <LoadingSpinner className="mr-2 h-3 w-3" />
                          ) : (
                            <AlertCircle className="mr-2 h-3 w-3" />
                          )}
                          {healthChecking ? 'Checking...' : 'Health Check'}
                        </Button>
                      </div>
                      <Input
                        id="endpoint"
                        placeholder="https://api.example.com/v1/endpoint"
                        value={formData.endpoint}
                        onChange={(e) =>
                          updateFormData('endpoint', e.target.value)
                        }
                      />
                    </div>

                    {formData.authentication.type === 'api_key' && (
                      <div className="space-y-2">
                        <Label htmlFor="api-key">API Key</Label>
                        <Input
                          id="api-key"
                          type="password"
                          placeholder="Enter your API key"
                          value={formData.authentication.apiKey || ''}
                          onChange={(e) =>
                            updateFormData('authentication', {
                              ...formData.authentication,
                              apiKey: e.target.value,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Your API key is securely encrypted and stored
                        </p>
                      </div>
                    )}

                    {formData.authentication.type === 'bearer' && (
                      <div className="space-y-2">
                        <Label htmlFor="bearer-token">Bearer Token</Label>
                        <Input
                          id="bearer-token"
                          type="password"
                          placeholder="Enter your bearer token"
                          value={formData.authentication.apiKey || ''}
                          onChange={(e) =>
                            updateFormData('authentication', {
                              ...formData.authentication,
                              apiKey: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}

                    {formData.authentication.type === 'basic' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            placeholder="Username"
                            value={formData.authentication.username || ''}
                            onChange={(e) =>
                              updateFormData('authentication', {
                                ...formData.authentication,
                                username: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Password"
                            value={formData.authentication.password || ''}
                            onChange={(e) =>
                              updateFormData('authentication', {
                                ...formData.authentication,
                                password: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="headers">Headers (JSON)</Label>
                      <Textarea
                        id="headers"
                        placeholder='{"Content-Type": "application/json", "X-Custom-Header": "value"}'
                        rows={3}
                        value={JSON.stringify(formData.headers, null, 2)}
                        onChange={(e) => {
                          try {
                            const headers = JSON.parse(e.target.value);
                            updateFormData('headers', headers);
                          } catch (error) {
                            // Invalid JSON, don't update
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Rate Limiting</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="rate-limit">
                            Requests per minute
                          </Label>
                          <Input
                            id="rate-limit"
                            type="number"
                            value={formData.rateLimit.requestsPerMinute}
                            onChange={(e) =>
                              updateFormData('rateLimit', {
                                ...formData.rateLimit,
                                requestsPerMinute: parseInt(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="burst-limit">
                            Burst limit (optional)
                          </Label>
                          <Input
                            id="burst-limit"
                            type="number"
                            value={formData.rateLimit.burstLimit || ''}
                            onChange={(e) =>
                              updateFormData('rateLimit', {
                                ...formData.rateLimit,
                                burstLimit: e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="parameters" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Tool Schema</h3>
                      {formData.schema && (
                        <Badge variant="secondary">
                          <Check className="h-3 w-3 mr-1" />
                          Schema detected
                        </Badge>
                      )}
                    </div>

                    {formData.schema ? (
                      <div className="space-y-4">
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Auto-detected Schema</AlertTitle>
                          <AlertDescription>
                            The schema was automatically detected from your API
                            endpoint. You can modify it below if needed.
                          </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                          <Label>Schema Preview</Label>
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="text-sm font-medium mb-2">
                              {formData.schema.description}
                            </div>
                            <div className="space-y-2">
                              {Object.entries(
                                formData.schema.properties || {},
                              ).map(([key, prop]: [string, any]) => (
                                <div
                                  key={key}
                                  className="flex items-center justify-between py-1 px-2 bg-background rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <code className="text-sm font-mono">
                                      {key}
                                    </code>
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {prop.type}
                                    </Badge>
                                    {formData.schema.required?.includes(
                                      key,
                                    ) && (
                                      <Badge
                                        variant="destructive"
                                        className="text-xs"
                                      >
                                        required
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {prop.description}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                          <Code className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">
                          No Schema Detected
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Configure your API endpoint first, then use
                          auto-detection or define the schema manually.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab('connection')}
                        >
                          Configure Connection
                        </Button>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="manual-schema">
                        Manual Schema (JSON)
                      </Label>
                      <Textarea
                        id="manual-schema"
                        placeholder='{"type": "object", "properties": {"query": {"type": "string", "description": "Search query"}}, "required": ["query"]}'
                        rows={8}
                        className="font-mono text-sm"
                        value={
                          formData.schema
                            ? JSON.stringify(formData.schema, null, 2)
                            : ''
                        }
                        onChange={(e) => {
                          try {
                            const schema = JSON.parse(e.target.value);
                            updateFormData('schema', schema);
                          } catch (error) {
                            // Invalid JSON, don't update
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Define the input parameters your tool accepts using JSON
                        Schema format.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="test" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Test Your Tool</h3>
                      <Button
                        onClick={runTest}
                        disabled={testStatus === 'running'}
                        variant={
                          testStatus === 'success' ? 'outline' : 'default'
                        }
                      >
                        {testStatus === 'idle' && (
                          <>
                            <TestTube className="h-4 w-4 mr-1" /> Run Test
                          </>
                        )}
                        {testStatus === 'running' && 'Testing...'}
                        {testStatus === 'success' && (
                          <>
                            <Check className="h-4 w-4 mr-1" /> Test Passed
                          </>
                        )}
                        {testStatus === 'error' && 'Test Failed'}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="test-input">Test Input (JSON)</Label>
                      <Textarea
                        id="test-input"
                        placeholder={
                          formData.schema
                            ? JSON.stringify(
                                Object.keys(
                                  formData.schema.properties || {},
                                ).reduce(
                                  (acc, key) => {
                                    acc[key] = `example_${key}`;
                                    return acc;
                                  },
                                  {} as Record<string, string>,
                                ),
                                null,
                                2,
                              )
                            : '{"query": "example search"}'
                        }
                        rows={4}
                        className="font-mono text-sm"
                      />
                    </div>

                    {testStatus === 'success' && testResult && (
                      <Alert className="bg-green-50 border-green-200">
                        <Check className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">
                          Test Successful
                        </AlertTitle>
                        <AlertDescription className="text-green-700">
                          Your tool connected successfully and returned valid
                          results. Execution time: {testResult.executionTime}ms
                        </AlertDescription>
                      </Alert>
                    )}

                    {testStatus === 'error' && testResult && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Test Failed</AlertTitle>
                        <AlertDescription>
                          {testResult.error ||
                            'Connection error: Unable to reach API endpoint. Please check your URL and authentication.'}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="test-output">Test Output</Label>
                      <div className="relative">
                        <Textarea
                          id="test-output"
                          value={
                            testResult && testResult.result
                              ? JSON.stringify(testResult.result, null, 2)
                              : ''
                          }
                          rows={8}
                          readOnly
                          className="font-mono text-sm bg-muted"
                          placeholder="Test output will appear here..."
                        />
                        {testStatus === 'running' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                            <div className="flex items-center gap-2">
                              <LoadingSpinner className="h-4 w-4" />
                              <span>Testing connection...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  const prevTabs = {
                    general: 'general',
                    connection: 'general',
                    parameters: 'connection',
                    test: 'parameters',
                  };
                  setActiveTab(
                    prevTabs[activeTab as keyof typeof prevTabs] || 'general',
                  );
                }}
                disabled={activeTab === 'general'}
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  const nextTabs = {
                    general: 'connection',
                    connection: 'parameters',
                    parameters: 'test',
                    test: 'test',
                  };
                  setActiveTab(
                    nextTabs[activeTab as keyof typeof nextTabs] || 'test',
                  );
                }}
                disabled={activeTab === 'test'}
              >
                Next
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tool Templates</CardTitle>
                <CardDescription>
                  Start with a pre-configured template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-4">
                    <LoadingSpinner className="h-6 w-6" />
                  </div>
                ) : (
                  <>
                    {templates.slice(0, 3).map((template) => {
                      const Icon = getCategoryIcon(template.category);
                      return (
                        <Button
                          key={template.id}
                          variant="outline"
                          className="w-full justify-start h-auto p-3"
                          onClick={() => {
                            setSelectedTemplate(template);
                            setTemplateDialogOpen(true);
                          }}
                        >
                          <div className="flex items-start gap-3 text-left">
                            <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {template.description}
                              </div>
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => setTemplateDialogOpen(true)}
                    >
                      View All Templates
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentation</CardTitle>
                <CardDescription>
                  Learn how to create effective tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  •{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    Tool creation guide
                  </a>
                </p>
                <p className="text-sm">
                  •{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    API connection best practices
                  </a>
                </p>
                <p className="text-sm">
                  •{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    Parameter configuration
                  </a>
                </p>
                <p className="text-sm">
                  •{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    Testing and validation
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Configuration Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              AI-Powered Tool Configuration
            </DialogTitle>
            <DialogDescription>
              Describe what you want your tool to do, and AI will generate the
              configuration for you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-description">Tool Description</Label>
              <Textarea
                id="ai-description"
                placeholder="e.g., Send messages to Slack channels, Create leads in Salesforce, Send emails via Gmail..."
                rows={4}
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current API URL (optional)</Label>
                <Input
                  value={formData.endpoint}
                  onChange={(e) => updateFormData('endpoint', e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                />
              </div>
              <div className="space-y-2">
                <Label>Service Type (optional)</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => updateFormData('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="communication">Communication</SelectItem>
                    <SelectItem value="crm">CRM & Sales</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                    <SelectItem value="automation">Automation</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
                    <SelectItem value="productivity">Productivity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAiDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={generateAIConfiguration}
                disabled={aiConfiguring || !aiDescription.trim()}
              >
                {aiConfiguring ? (
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                {aiConfiguring ? 'Generating...' : 'Generate Configuration'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Selection Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Start with a pre-configured template for popular services
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => {
              const Icon = getCategoryIcon(template.category);
              return (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => applyTemplate(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {template.name}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {template.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
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
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div>Method: {template.method}</div>
                      <div>Category: {template.category}</div>
                      {template.authentication && (
                        <div>Auth: {template.authentication.type}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Marketplace Dialog */}
      <Dialog
        open={marketplaceDialogOpen}
        onOpenChange={setMarketplaceDialogOpen}
      >
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Tool Marketplace
            </DialogTitle>
            <DialogDescription>
              Browse and install tools created by the community
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tools..."
                  value={marketplaceSearch}
                  onChange={(e) => setMarketplaceSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={marketplaceCategory}
              onValueChange={setMarketplaceCategory}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="crm">CRM & Sales</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
                <SelectItem value="automation">Automation</SelectItem>
                <SelectItem value="integration">Integration</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={loadMarketplaceTools}
              disabled={marketplaceLoading}
            >
              {marketplaceLoading ? (
                <LoadingSpinner className="mr-2 h-4 w-4" />
              ) : (
                <Filter className="mr-2 h-4 w-4" />
              )}
              {marketplaceLoading ? 'Loading...' : 'Search'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketplaceTools.map((tool) => {
              const Icon = getCategoryIcon(tool.category);
              return (
                <Card
                  key={tool.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{tool.name}</CardTitle>
                        <CardDescription className="text-sm line-clamp-2">
                          {tool.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{tool.rating || 0}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tool.downloads || 0} installs
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {tool.category}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => installMarketplaceTool(tool.id)}
                    >
                      <Download className="mr-2 h-3 w-3" />
                      Install
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {marketplaceTools.length === 0 && !marketplaceLoading && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Tools Found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or browse all categories.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
