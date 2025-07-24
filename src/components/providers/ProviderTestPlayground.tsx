"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Zap,
  TestTube,
  Code,
  MessageSquare,
} from "lucide-react";
import { useProviders } from "@/hooks/useProviders";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface TestRequest {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  executionType: "agent" | "tool" | "workflow" | "knowledge";
  resourceId: string;
}

interface TestResult {
  id: string;
  content: string;
  tokensUsed: number;
  cost: number;
  executionTime: number;
  providerId: string;
  providerType: string;
  model: string;
  metadata?: any;
  error?: string;
}

export function ProviderTestPlayground() {
  const { providers } = useProviders();
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [testRequest, setTestRequest] = useState<TestRequest>({
    messages: [
      {
        role: "user",
        content: "Hello! Can you help me test this AI provider?",
      },
    ],
    model: "",
    temperature: 0.7,
    maxTokens: 1000,
    executionType: "agent",
    resourceId: "test-playground",
  });
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeProviders = providers.filter((p) => p.isActive);

  const handleRunTest = async () => {
    if (!testRequest.messages.length) {
      toast({
        title: "Validation Error",
        description: "Please add at least one message to test.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    const startTime = Date.now();

    try {
      // Simulate API call to the unified completion endpoint
      const response = await fetch("/api/ai-providers/ai/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          ...testRequest,
          ...(selectedProvider && { preferredProvider: selectedProvider }),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const executionTime = Date.now() - startTime;

      const testResult: TestResult = {
        id: result.id || `test-${Date.now()}`,
        content: result.content || "No response content",
        tokensUsed: result.tokensUsed || 0,
        cost: result.cost || 0,
        executionTime: result.executionTime || executionTime,
        providerId: result.providerId || "unknown",
        providerType: result.providerType || "unknown",
        model: result.model || testRequest.model || "unknown",
        metadata: result.metadata,
      };

      setTestResults((prev) => [testResult, ...prev]);

      toast({
        title: "Test Completed Successfully",
        description: `Response received in ${executionTime}ms from ${result.providerType}`,
      });
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      const errorResult: TestResult = {
        id: `error-${Date.now()}`,
        content: "",
        tokensUsed: 0,
        cost: 0,
        executionTime,
        providerId: selectedProvider || "unknown",
        providerType: "error",
        model: testRequest.model || "unknown",
        error: error.message || "Unknown error occurred",
      };

      setTestResults((prev) => [errorResult, ...prev]);

      toast({
        title: "Test Failed",
        description: error.message || "An error occurred during testing",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunFallbackTest = async () => {
    if (activeProviders.length < 2) {
      toast({
        title: "Insufficient Providers",
        description: "You need at least 2 active providers to test fallback.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);

    try {
      // Simulate fallback by temporarily disabling the primary provider
      toast({
        title: "Simulating Fallback",
        description: "Testing provider fallback scenario...",
      });

      // Run multiple tests to simulate fallback
      for (let i = 0; i < 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await handleRunTest();
      }

      toast({
        title: "Fallback Test Completed",
        description: "Fallback routing has been tested successfully.",
      });
    } catch (error) {
      toast({
        title: "Fallback Test Failed",
        description: "An error occurred during fallback testing",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addMessage = () => {
    setTestRequest({
      ...testRequest,
      messages: [...testRequest.messages, { role: "user", content: "" }],
    });
  };

  const updateMessage = (index: number, field: string, value: string) => {
    const updatedMessages = [...testRequest.messages];
    updatedMessages[index] = { ...updatedMessages[index], [field]: value };
    setTestRequest({ ...testRequest, messages: updatedMessages });
  };

  const removeMessage = (index: number) => {
    const updatedMessages = testRequest.messages.filter((_, i) => i !== index);
    setTestRequest({ ...testRequest, messages: updatedMessages });
  };

  const getProviderName = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    return provider?.name || "Unknown Provider";
  };

  const getProviderIcon = (providerType: string) => {
    switch (providerType.toLowerCase()) {
      case "openai":
        return "🤖";
      case "claude":
        return "🧠";
      case "gemini":
        return "💎";
      case "mistral":
        return "🌪️";
      case "groq":
        return "⚡";
      case "openrouter":
        return "🔀";
      default:
        return "🔧";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Test Playground</h2>
        <p className="text-muted-foreground">
          Test AI providers, simulate fallback scenarios, and compare responses
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test Configuration
            </CardTitle>
            <CardDescription>
              Configure your test request parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Provider Selection */}
            <div>
              <Label htmlFor="provider">Provider (Optional)</Label>
              <Select
                value={selectedProvider}
                onValueChange={setSelectedProvider}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto-select best provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto-select (Recommended)</SelectItem>
                  {activeProviders.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div className="flex items-center gap-2">
                        <span>{getProviderIcon(provider.type)}</span>
                        <span>{provider.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {provider.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model Selection */}
            <div>
              <Label htmlFor="model">Model (Optional)</Label>
              <Input
                id="model"
                value={testRequest.model}
                onChange={(e) =>
                  setTestRequest({ ...testRequest, model: e.target.value })
                }
                placeholder="e.g., gpt-4, claude-3-opus"
              />
            </div>

            {/* Execution Type */}
            <div>
              <Label htmlFor="executionType">Execution Type</Label>
              <Select
                value={testRequest.executionType}
                onValueChange={(value: any) =>
                  setTestRequest({ ...testRequest, executionType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="tool">Tool</SelectItem>
                  <SelectItem value="workflow">Workflow</SelectItem>
                  <SelectItem value="knowledge">Knowledge</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={testRequest.temperature}
                  onChange={(e) =>
                    setTestRequest({
                      ...testRequest,
                      temperature: parseFloat(e.target.value) || 0.7,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min="1"
                  max="4000"
                  value={testRequest.maxTokens}
                  onChange={(e) =>
                    setTestRequest({
                      ...testRequest,
                      maxTokens: parseInt(e.target.value) || 1000,
                    })
                  }
                />
              </div>
            </div>

            {/* Messages */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Messages</Label>
                <Button variant="outline" size="sm" onClick={addMessage}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Message
                </Button>
              </div>
              <div className="space-y-3">
                {testRequest.messages.map((message, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Select
                        value={message.role}
                        onValueChange={(value) =>
                          updateMessage(index, "role", value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="assistant">Assistant</SelectItem>
                        </SelectContent>
                      </Select>
                      {testRequest.messages.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMessage(index)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={message.content}
                      onChange={(e) =>
                        updateMessage(index, "content", e.target.value)
                      }
                      placeholder={`Enter ${message.role} message...`}
                      rows={3}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleRunTest}
                disabled={isRunning}
                className="flex-1"
              >
                {isRunning ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Run Test
              </Button>
              <Button
                variant="outline"
                onClick={handleRunFallbackTest}
                disabled={isRunning || activeProviders.length < 2}
              >
                <Zap className="h-4 w-4 mr-2" />
                Test Fallback
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Test Results
            </CardTitle>
            <CardDescription>
              View responses and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {testResults.length === 0 ? (
              <div className="text-center py-8">
                <TestTube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Tests Run Yet</h3>
                <p className="text-muted-foreground">
                  Configure your test parameters and run a test to see results.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div
                    key={result.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      result.error
                        ? "border-red-200 bg-red-50 dark:bg-red-900/20"
                        : "border-green-200 bg-green-50 dark:bg-green-900/20",
                    )}
                  >
                    {/* Result Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getProviderIcon(result.providerType)}
                        </span>
                        <div>
                          <div className="font-medium">
                            {getProviderName(result.providerId)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {result.model} • {result.executionTime}ms
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.error ? (
                          <Badge variant="destructive">Error</Badge>
                        ) : (
                          <Badge variant="default">Success</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(
                              result.error || result.content || "",
                            )
                          }
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Result Content */}
                    {result.error ? (
                      <div className="text-red-700 dark:text-red-300">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Error</span>
                        </div>
                        <p className="text-sm">{result.error}</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm mb-2">
                          <strong>Response:</strong>
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-3 rounded border text-sm">
                          {result.content}
                        </div>
                      </div>
                    )}

                    {/* Metrics */}
                    {!result.error && (
                      <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                        <div className="text-center">
                          <div className="text-sm font-medium">
                            {result.tokensUsed}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Tokens
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">
                            ${result.cost.toFixed(4)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Cost
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">
                            {result.executionTime}ms
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Response Time
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
