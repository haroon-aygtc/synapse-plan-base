'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Settings,
  Trash2,
  TestTube,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
} from 'lucide-react';
import { useProviders } from '@/hooks/useProviders';
import { AIProvider, CreateProviderRequest } from '@/lib/provider-api';
import { toast } from '@/components/ui/use-toast';

const PROVIDER_TYPES = [
  {
    type: 'openai' as const,
    name: 'OpenAI',
    description: 'GPT models from OpenAI',
    defaultModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o'],
    baseUrl: 'https://api.openai.com/v1',
  },
  {
    type: 'claude' as const,
    name: 'Anthropic Claude',
    description: 'Claude models from Anthropic',
    defaultModels: [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
    baseUrl: 'https://api.anthropic.com',
  },
  {
    type: 'gemini' as const,
    name: 'Google Gemini',
    description: 'Gemini models from Google',
    defaultModels: ['gemini-pro', 'gemini-pro-vision'],
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  },
  {
    type: 'mistral' as const,
    name: 'Mistral AI',
    description: 'Mistral models',
    defaultModels: [
      'mistral-large-latest',
      'mistral-medium-latest',
      'mistral-small-latest',
    ],
    baseUrl: 'https://api.mistral.ai/v1',
  },
  {
    type: 'groq' as const,
    name: 'Groq',
    description: 'High-speed inference with Groq',
    defaultModels: ['llama2-70b-4096', 'mixtral-8x7b-32768', 'gemma-7b-it'],
    baseUrl: 'https://api.groq.com/openai/v1',
  },
  {
    type: 'openrouter' as const,
    name: 'OpenRouter',
    description: 'Access to multiple AI models through OpenRouter',
    defaultModels: [
      'openai/gpt-4-turbo',
      'openai/gpt-3.5-turbo',
      'anthropic/claude-3-opus',
      'anthropic/claude-3-sonnet',
      'google/gemini-pro',
      'meta-llama/llama-2-70b-chat',
      'mistralai/mistral-7b-instruct',
    ],
    baseUrl: 'https://openrouter.ai/api/v1',
  },
];

interface ProviderFormData {
  name: string;
  type: AIProvider['type'] | '';
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  requestsPerMinute: number;
  tokensPerMinute: number;
  models: string[];
  priority: number;
  costMultiplier: number;
  isActive: boolean;
}

const initialFormData: ProviderFormData = {
  name: '',
  type: '',
  apiKey: '',
  baseUrl: '',
  timeout: 30000,
  maxRetries: 3,
  requestsPerMinute: 60,
  tokensPerMinute: 100000,
  models: [],
  priority: 100,
  costMultiplier: 1.0,
  isActive: true,
};

export function ProviderConfiguration() {
  const {
    providers,
    loading,
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider,
    rotateApiKey,
  } = useProviders();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(
    null,
  );
  const [formData, setFormData] = useState<ProviderFormData>(initialFormData);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateProvider = () => {
    setFormData(initialFormData);
    setEditingProvider(null);
    setShowCreateDialog(true);
  };

  const handleEditProvider = (provider: AIProvider) => {
    setFormData({
      name: provider.name,
      type: provider.type,
      apiKey: provider.config.apiKey,
      baseUrl: provider.config.baseUrl || '',
      timeout: provider.config.timeout || 30000,
      maxRetries: provider.config.maxRetries || 3,
      requestsPerMinute: provider.config.rateLimits?.requestsPerMinute || 60,
      tokensPerMinute: provider.config.rateLimits?.tokensPerMinute || 100000,
      models: provider.config.models || [],
      priority: provider.priority,
      costMultiplier: provider.costMultiplier,
      isActive: provider.isActive,
    });
    setEditingProvider(provider);
    setShowCreateDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.type || !formData.apiKey) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const providerData: CreateProviderRequest = {
      name: formData.name,
      type: formData.type as AIProvider['type'],
      config: {
        apiKey: formData.apiKey,
        baseUrl: formData.baseUrl || undefined,
        timeout: formData.timeout,
        maxRetries: formData.maxRetries,
        rateLimits: {
          requestsPerMinute: formData.requestsPerMinute,
          tokensPerMinute: formData.tokensPerMinute,
        },
        models: formData.models.length > 0 ? formData.models : undefined,
      },
      priority: formData.priority,
      costMultiplier: formData.costMultiplier,
      isActive: formData.isActive,
    };

    try {
      if (editingProvider) {
        await updateProvider(editingProvider.id, providerData);
      } else {
        await createProvider(providerData);
      }
      setShowCreateDialog(false);
      setFormData(initialFormData);
      setEditingProvider(null);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleTestProvider = async (providerId: string) => {
    setTesting(providerId);
    try {
      await testProvider(providerId);
    } finally {
      setTesting(null);
    }
  };

  const handleRotateKey = async (providerId: string) => {
    const newKey = prompt('Enter new API key:');
    if (newKey) {
      await rotateApiKey(providerId, newKey);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedProviderType = PROVIDER_TYPES.find(
    (p) => p.type === formData.type,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Provider Configuration</h2>
          <p className="text-muted-foreground">
            Manage your AI provider settings and credentials
          </p>
        </div>
        <Button onClick={handleCreateProvider}>
          <Plus className="h-4 w-4 mr-2" />
          Add Provider
        </Button>
      </div>

      {/* Providers List */}
      <div className="grid gap-6">
        {providers.map((provider) => {
          const providerType = PROVIDER_TYPES.find(
            (p) => p.type === provider.type,
          );
          return (
            <Card key={provider.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {provider.name}
                        <Badge
                          variant={provider.isActive ? 'default' : 'secondary'}
                        >
                          {provider.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {providerType?.description} • Priority:{' '}
                        {provider.priority}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestProvider(provider.id)}
                      disabled={testing === provider.id}
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {testing === provider.id ? 'Testing...' : 'Test'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProvider(provider)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Provider</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {provider.name}?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteProvider(provider.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p className="font-medium">{providerType?.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Models</Label>
                    <p className="font-medium">
                      {provider.config.models?.length ||
                        providerType?.defaultModels.length ||
                        0}{' '}
                      available
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">
                      Cost Multiplier
                    </Label>
                    <p className="font-medium">{provider.costMultiplier}x</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Health</Label>
                    <Badge
                      variant={
                        provider.healthCheck?.status === 'healthy'
                          ? 'default'
                          : 'destructive'
                      }
                    >
                      {provider.healthCheck?.status || 'unknown'}
                    </Badge>
                  </div>
                </div>
                {provider.metrics && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">
                          Total Requests
                        </Label>
                        <p className="font-medium">
                          {provider.metrics.totalRequests.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          Success Rate
                        </Label>
                        <p className="font-medium">
                          {(
                            (provider.metrics.successfulRequests /
                              provider.metrics.totalRequests) *
                            100
                          ).toFixed(1)}
                          %
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          Avg Response
                        </Label>
                        <p className="font-medium">
                          {provider.metrics.averageResponseTime.toFixed(0)}ms
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          Total Cost
                        </Label>
                        <p className="font-medium">
                          ${provider.metrics.totalCost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Provider Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? 'Edit Provider' : 'Add New Provider'}
            </DialogTitle>
            <DialogDescription>
              Configure your AI provider settings and credentials
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Settings</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="models">Models</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Provider Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="My OpenAI Provider"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Provider Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => {
                      const providerType = PROVIDER_TYPES.find(
                        (p) => p.type === value,
                      );
                      setFormData({
                        ...formData,
                        type: value as AIProvider['type'],
                        baseUrl: providerType?.baseUrl || '',
                        models: providerType?.defaultModels || [],
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_TYPES.map((provider) => (
                        <SelectItem key={provider.type} value={provider.type}>
                          <div>
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {provider.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key *</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={formData.apiKey}
                    onChange={(e) =>
                      setFormData({ ...formData, apiKey: e.target.value })
                    }
                    placeholder="Enter your API key"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    {editingProvider && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRotateKey(editingProvider.id)}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                  id="baseUrl"
                  value={formData.baseUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, baseUrl: e.target.value })
                  }
                  placeholder={selectedProviderType?.baseUrl}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority (1-1000)</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: parseInt(e.target.value) || 100,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costMultiplier">Cost Multiplier</Label>
                  <Input
                    id="costMultiplier"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={formData.costMultiplier}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        costMultiplier: parseFloat(e.target.value) || 1.0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min="1000"
                    max="300000"
                    value={formData.timeout}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timeout: parseInt(e.target.value) || 30000,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxRetries">Max Retries</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.maxRetries}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxRetries: parseInt(e.target.value) || 3,
                      })
                    }
                  />
                </div>
              </div>

              <Separator />
              <h4 className="font-medium">Rate Limits</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requestsPerMinute">Requests per Minute</Label>
                  <Input
                    id="requestsPerMinute"
                    type="number"
                    min="1"
                    value={formData.requestsPerMinute}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requestsPerMinute: parseInt(e.target.value) || 60,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tokensPerMinute">Tokens per Minute</Label>
                  <Input
                    id="tokensPerMinute"
                    type="number"
                    min="1"
                    value={formData.tokensPerMinute}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tokensPerMinute: parseInt(e.target.value) || 100000,
                      })
                    }
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="models" className="space-y-4">
              <div className="space-y-2">
                <Label>Available Models</Label>
                <p className="text-sm text-muted-foreground">
                  Leave empty to use all default models for this provider type
                </p>
                <Textarea
                  value={formData.models.join('\n')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      models: e.target.value.split('\n').filter(Boolean),
                    })
                  }
                  placeholder="Enter one model per line"
                  rows={6}
                />
              </div>
              {selectedProviderType && (
                <div className="space-y-2">
                  <Label>Default Models for {selectedProviderType.name}</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedProviderType.defaultModels.map((model) => (
                      <Badge
                        key={model}
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => {
                          if (!formData.models.includes(model)) {
                            setFormData({
                              ...formData,
                              models: [...formData.models, model],
                            });
                          }
                        }}
                      >
                        {model}
                        <Plus className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingProvider ? 'Update Provider' : 'Create Provider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
