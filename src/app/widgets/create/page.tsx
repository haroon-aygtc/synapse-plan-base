"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Save,
  Play,
  Eye,
  Settings,
  Palette,
  Code,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Download,
  Upload,
  TestTube,
  Zap,
  Bot,
  Wrench,
  GitBranch,
  BarChart3,
  Users,
  Activity,
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AIConfigurationInterface } from "@/components/widgets/AIConfigurationInterface";
import { VisualToolBuilder } from "@/components/widgets/VisualToolBuilder";
import { ToolTemplates } from "@/components/widgets/ToolTemplates";
import { ToolPerformanceMetrics } from "@/components/widgets/ToolPerformanceMetrics";
import { ToolAgentConnection } from "@/components/widgets/ToolAgentConnection";
import { ToolWorkflowConnection } from "@/components/widgets/ToolWorkflowConnection";
import { WidgetSettings } from "@/components/widgets/WidgetSettings";
import { WidgetPreview } from "@/components/widgets/WidgetPreview";
import { WidgetDeployment } from "@/components/widgets/WidgetDeployment";
import { WidgetAnalytics } from "@/components/widgets/WidgetAnalytics";

interface WidgetConfiguration {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
    fontSize: number;
    fontFamily?: string;
    customCSS?: string;
  };
  layout: {
    width: number;
    height: number;
    position:
      | "bottom-right"
      | "bottom-left"
      | "top-right"
      | "top-left"
      | "center"
      | "fullscreen";
    responsive: boolean;
    zIndex?: number;
    margin?: { top: number; right: number; bottom: number; left: number };
  };
  behavior: {
    autoOpen: boolean;
    showWelcomeMessage: boolean;
    enableTypingIndicator: boolean;
    enableSoundNotifications: boolean;
    sessionTimeout?: number;
    maxMessages?: number;
    enableFileUpload?: boolean;
    enableVoiceInput?: boolean;
  };
  branding: {
    showLogo: boolean;
    companyName?: string;
    logoUrl?: string;
    customHeader?: string;
    customFooter?: string;
    poweredByText?: string;
    showPoweredBy?: boolean;
  };
  security: {
    allowedDomains: string[];
    requireAuth: boolean;
    rateLimiting: {
      enabled: boolean;
      requestsPerMinute: number;
      burstLimit?: number;
    };
    enableCORS?: boolean;
    csrfProtection?: boolean;
    encryptData?: boolean;
  };
}

interface Widget {
  id?: string;
  name: string;
  description?: string;
  type: "agent" | "tool" | "workflow";
  sourceId: string;
  configuration: WidgetConfiguration;
  isActive: boolean;
  isDeployed: boolean;
  version: string;
  metadata?: Record<string, any>;
}

export default function CreateWidgetPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("basic");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [previewDevice, setPreviewDevice] = useState<
    "desktop" | "mobile" | "tablet"
  >("desktop");
  const [showPreview, setShowPreview] = useState(false);

  // Available sources
  const [agents, setAgents] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);

  const [widget, setWidget] = useState<Widget>({
    name: "",
    description: "",
    type: "agent",
    sourceId: "",
    isActive: true,
    isDeployed: false,
    version: "1.0.0",
    configuration: {
      theme: {
        primaryColor: "#3b82f6",
        secondaryColor: "#64748b",
        backgroundColor: "#ffffff",
        textColor: "#1f2937",
        borderRadius: 8,
        fontSize: 14,
        fontFamily: "Inter, sans-serif",
      },
      layout: {
        width: 400,
        height: 600,
        position: "bottom-right",
        responsive: true,
        zIndex: 1000,
        margin: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      behavior: {
        autoOpen: false,
        showWelcomeMessage: true,
        enableTypingIndicator: true,
        enableSoundNotifications: false,
        sessionTimeout: 1800,
        maxMessages: 100,
        enableFileUpload: false,
        enableVoiceInput: false,
      },
      branding: {
        showLogo: true,
        companyName: user?.organization?.name || "Your Company",
        showPoweredBy: true,
        poweredByText: "Powered by SynapseAI",
      },
      security: {
        allowedDomains: [],
        requireAuth: false,
        rateLimiting: {
          enabled: true,
          requestsPerMinute: 60,
          burstLimit: 10,
        },
        enableCORS: true,
        csrfProtection: true,
        encryptData: true,
      },
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    loadSources();
  }, [isAuthenticated, router]);

  const loadSources = async () => {
    try {
      setLoadingSources(true);
      const [agentsRes, toolsRes, workflowsRes] = await Promise.all([
        api.get("/agents"),
        api.get("/tools"),
        api.get("/workflows"),
      ]);

      if (agentsRes.data.success) setAgents(agentsRes.data.data);
      if (toolsRes.data.success) setTools(toolsRes.data.data);
      if (workflowsRes.data.success) setWorkflows(workflowsRes.data.data);
    } catch (error) {
      console.error("Failed to load sources:", error);
      toast({
        title: "Error",
        description: "Failed to load available sources",
        variant: "destructive",
      });
    } finally {
      setLoadingSources(false);
    }
  };

  const handleWidgetUpdate = useCallback((updates: Partial<Widget>) => {
    setWidget((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleConfigurationUpdate = useCallback(
    (configUpdates: Partial<WidgetConfiguration>) => {
      setWidget((prev) => ({
        ...prev,
        configuration: {
          ...prev.configuration,
          ...configUpdates,
        },
      }));
    },
    [],
  );

  const validateWidget = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!widget.name.trim()) {
      errors.push("Widget name is required");
    }

    if (!widget.sourceId) {
      errors.push("Please select a source (agent, tool, or workflow)");
    }

    if (widget.configuration.security.allowedDomains.length === 0) {
      errors.push("At least one allowed domain is required for security");
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleSave = async () => {
    const validation = validateWidget();
    if (!validation.isValid) {
      toast({
        title: "Validation Failed",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await api.post("/widgets", {
        ...widget,
        userId: user?.id,
        organizationId: user?.organizationId,
      });

      if (response.data.success) {
        const createdWidget = response.data.data;
        toast({
          title: "Widget Created",
          description: `Widget "${widget.name}" has been created successfully`,
        });
        router.push(`/widgets/${createdWidget.id}`);
      } else {
        throw new Error(response.data.message || "Failed to create widget");
      }
    } catch (error: any) {
      console.error("Failed to save widget:", error);
      toast({
        title: "Save Failed",
        description:
          error.response?.data?.message ||
          error.message ||
          "Failed to save widget",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    const validation = validateWidget();
    if (!validation.isValid) {
      toast({
        title: "Validation Failed",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsTesting(true);
      const response = await api.post("/widgets/test", {
        configuration: widget.configuration,
        sourceId: widget.sourceId,
        type: widget.type,
        testOptions: {
          browsers: ["chrome", "firefox", "safari"],
          devices: ["desktop", "mobile", "tablet"],
          checkAccessibility: true,
          checkPerformance: true,
          checkSEO: true,
        },
      });

      if (response.data.success) {
        setTestResults(response.data.data);
        toast({
          title: "Test Completed",
          description: "Widget test completed successfully",
        });
      } else {
        throw new Error(response.data.message || "Test failed");
      }
    } catch (error: any) {
      console.error("Test failed:", error);
      toast({
        title: "Test Failed",
        description:
          error.response?.data?.message ||
          error.message ||
          "Widget test failed",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDeploy = async () => {
    if (!widget.id) {
      toast({
        title: "Save Required",
        description: "Please save the widget before deploying",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDeploying(true);
      const response = await api.post(`/widgets/${widget.id}/deploy`, {
        environment: "production",
        enableAnalytics: true,
        enableCaching: true,
      });

      if (response.data.success) {
        setWidget((prev) => ({ ...prev, isDeployed: true }));
        toast({
          title: "Deployment Successful",
          description: "Widget has been deployed successfully",
        });
      } else {
        throw new Error(response.data.message || "Deployment failed");
      }
    } catch (error: any) {
      console.error("Deployment failed:", error);
      toast({
        title: "Deployment Failed",
        description:
          error.response?.data?.message ||
          error.message ||
          "Widget deployment failed",
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const getSourceOptions = () => {
    switch (widget.type) {
      case "agent":
        return agents.map((agent) => ({ value: agent.id, label: agent.name }));
      case "tool":
        return tools.map((tool) => ({ value: tool.id, label: tool.name }));
      case "workflow":
        return workflows.map((workflow) => ({
          value: workflow.id,
          label: workflow.name,
        }));
      default:
        return [];
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/widgets")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {widget.name || "New Widget"}
                  </h1>
                  <p className="text-sm text-gray-500">
                    Create and configure your widget
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={isTesting || !widget.sourceId}
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  {isTesting ? "Testing..." : "Test"}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !widget.name.trim() || !widget.sourceId}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSaving ? "Saving..." : "Save Widget"}
                </Button>
                {widget.id && (
                  <Button
                    onClick={handleDeploy}
                    disabled={isDeploying || widget.isDeployed}
                    variant={widget.isDeployed ? "secondary" : "default"}
                  >
                    {isDeploying ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : widget.isDeployed ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <Globe className="h-4 w-4 mr-2" />
                    )}
                    {isDeploying
                      ? "Deploying..."
                      : widget.isDeployed
                        ? "Deployed"
                        : "Deploy"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-7 mb-6">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="ai-config">AI Config</TabsTrigger>
                  <TabsTrigger value="visual-builder">Builder</TabsTrigger>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="deploy">Deploy</TabsTrigger>
                </TabsList>

                <TabsContent value="basic">
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Information</CardTitle>
                      <CardDescription>
                        Configure the basic settings for your widget
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Widget Name</Label>
                          <Input
                            id="name"
                            value={widget.name}
                            onChange={(e) =>
                              handleWidgetUpdate({ name: e.target.value })
                            }
                            placeholder="Enter widget name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type">Widget Type</Label>
                          <Select
                            value={widget.type}
                            onValueChange={(
                              value: "agent" | "tool" | "workflow",
                            ) => {
                              handleWidgetUpdate({ type: value, sourceId: "" });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="agent">
                                <div className="flex items-center gap-2">
                                  <Bot className="h-4 w-4" />
                                  Agent Widget
                                </div>
                              </SelectItem>
                              <SelectItem value="tool">
                                <div className="flex items-center gap-2">
                                  <Wrench className="h-4 w-4" />
                                  Tool Widget
                                </div>
                              </SelectItem>
                              <SelectItem value="workflow">
                                <div className="flex items-center gap-2">
                                  <GitBranch className="h-4 w-4" />
                                  Workflow Widget
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={widget.description || ""}
                          onChange={(e) =>
                            handleWidgetUpdate({ description: e.target.value })
                          }
                          placeholder="Describe what this widget does"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="source">
                          Source{" "}
                          {widget.type.charAt(0).toUpperCase() +
                            widget.type.slice(1)}
                        </Label>
                        <Select
                          value={widget.sourceId}
                          onValueChange={(value) =>
                            handleWidgetUpdate({ sourceId: value })
                          }
                          disabled={loadingSources}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                loadingSources
                                  ? "Loading..."
                                  : `Select a ${widget.type}`
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {getSourceOptions().map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="active"
                          checked={widget.isActive}
                          onCheckedChange={(checked) =>
                            handleWidgetUpdate({ isActive: checked })
                          }
                        />
                        <Label htmlFor="active">Widget is active</Label>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="ai-config">
                  <AIConfigurationInterface
                    widget={widget}
                    onUpdate={handleWidgetUpdate}
                    onConfigurationUpdate={handleConfigurationUpdate}
                  />
                </TabsContent>

                <TabsContent value="visual-builder">
                  <VisualToolBuilder
                    widget={widget}
                    onUpdate={handleWidgetUpdate}
                    onConfigurationUpdate={handleConfigurationUpdate}
                  />
                </TabsContent>

                <TabsContent value="templates">
                  <ToolTemplates
                    selectedType={widget.type}
                    onTemplateSelect={(template) => {
                      handleWidgetUpdate({
                        name: template.name,
                        description: template.description,
                        configuration: {
                          ...widget.configuration,
                          ...template.configuration,
                        },
                      });
                    }}
                    onConfigurationApply={handleConfigurationUpdate}
                  />
                </TabsContent>

                <TabsContent value="settings">
                  <WidgetSettings
                    configuration={widget.configuration}
                    onUpdate={handleConfigurationUpdate}
                  />
                </TabsContent>

                <TabsContent value="analytics">
                  {widget.id ? (
                    <WidgetAnalytics widget={widget} />
                  ) : (
                    <div className="text-center py-12">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Save the widget first to view analytics
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="deploy">
                  <WidgetDeployment
                    widget={widget}
                    onDeploy={handleDeploy}
                    isDeploying={isDeploying}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Preview */}
              {showPreview && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Preview</CardTitle>
                      <div className="flex items-center gap-1">
                        <Button
                          variant={
                            previewDevice === "desktop" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setPreviewDevice("desktop")}
                        >
                          <Monitor className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={
                            previewDevice === "tablet" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setPreviewDevice("tablet")}
                        >
                          <Tablet className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={
                            previewDevice === "mobile" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setPreviewDevice("mobile")}
                        >
                          <Smartphone className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <WidgetPreview widget={widget} device={previewDevice} />
                  </CardContent>
                </Card>
              )}

              {/* Test Results */}
              {testResults && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TestTube className="h-5 w-5" />
                      Test Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        {testResults.success ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span
                          className={
                            testResults.success
                              ? "text-green-700"
                              : "text-red-700"
                          }
                        >
                          {testResults.success
                            ? "All tests passed"
                            : "Some tests failed"}
                        </span>
                      </div>

                      {testResults.details && (
                        <div className="space-y-2">
                          <div className="text-sm">
                            <strong>Performance Score:</strong>{" "}
                            {testResults.details.performanceScore || "N/A"}
                          </div>
                          <div className="text-sm">
                            <strong>Accessibility Score:</strong>{" "}
                            {testResults.details.accessibilityScore || "N/A"}
                          </div>
                          <div className="text-sm">
                            <strong>SEO Score:</strong>{" "}
                            {testResults.details.seoScore || "N/A"}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Performance Metrics */}
              {widget.sourceId && (
                <ToolPerformanceMetrics
                  sourceId={widget.sourceId}
                  sourceType={widget.type}
                />
              )}

              {/* Connections */}
              {widget.sourceId && widget.type === "tool" && (
                <>
                  <ToolAgentConnection toolId={widget.sourceId} />
                  <ToolWorkflowConnection toolId={widget.sourceId} />
                </>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Configuration
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Export Configuration
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Widget
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Documentation
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
