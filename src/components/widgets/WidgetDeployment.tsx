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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Globe,
  Copy,
  ExternalLink,
  Settings,
  Shield,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Loader2,
  Code,
  Download,
  Eye,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Widget {
  id?: string;
  name: string;
  description?: string;
  type: "agent" | "tool" | "workflow";
  sourceId: string;
  isActive: boolean;
  isDeployed: boolean;
  version: string;
  deploymentInfo?: {
    environment: "staging" | "production";
    customDomain?: string;
    enableAnalytics: boolean;
    enableCaching: boolean;
    deployedAt: Date;
    lastUpdated: Date;
    status: "active" | "inactive" | "error";
    embedCode: {
      javascript: string;
      iframe: string;
      react: string;
      vue: string;
      angular: string;
    };
    urls: {
      standalone: string;
      embed: string;
      api: string;
    };
  };
}

interface WidgetDeploymentProps {
  widget: Widget;
  onDeploy: () => Promise<void>;
  isDeploying: boolean;
}

export function WidgetDeployment({
  widget,
  onDeploy,
  isDeploying,
}: WidgetDeploymentProps) {
  const { toast } = useToast();
  const [selectedEnvironment, setSelectedEnvironment] = useState<
    "staging" | "production"
  >("production");
  const [customDomain, setCustomDomain] = useState("");
  const [enableAnalytics, setEnableAnalytics] = useState(true);
  const [enableCaching, setEnableCaching] = useState(true);
  const [selectedEmbedFormat, setSelectedEmbedFormat] = useState("javascript");
  const [allowedDomains, setAllowedDomains] = useState("");

  const handleCopyEmbedCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Embed code copied to clipboard",
    });
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "URL copied to clipboard",
    });
  };

  const getEmbedCode = (format: string) => {
    if (!widget.deploymentInfo) return "";
    return (
      widget.deploymentInfo.embedCode[
        format as keyof typeof widget.deploymentInfo.embedCode
      ] || ""
    );
  };

  const getEmbedCodeExample = (format: string) => {
    const baseUrl = "https://widgets.synapseai.com";
    const widgetId = widget.id || "widget-id";

    switch (format) {
      case "javascript":
        return `<script src="${baseUrl}/embed.js"></script>
<script>
  SynapseWidget.init({
    widgetId: '${widgetId}',
    container: '#synapse-widget'
  });
</script>
<div id="synapse-widget"></div>`;
      case "iframe":
        return `<iframe 
  src="${baseUrl}/embed/${widgetId}" 
  width="400" 
  height="600" 
  frameborder="0">
</iframe>`;
      case "react":
        return `import { SynapseWidget } from '@synapseai/react-widget';

function MyComponent() {
  return (
    <SynapseWidget 
      widgetId="${widgetId}"
      width={400}
      height={600}
    />
  );
}`;
      case "vue":
        return `<template>
  <SynapseWidget 
    :widget-id="'${widgetId}'"
    :width="400"
    :height="600"
  />
</template>

<script>
import { SynapseWidget } from '@synapseai/vue-widget';

export default {
  components: {
    SynapseWidget
  }
}
</script>`;
      case "angular":
        return `<synapse-widget 
  widgetId="${widgetId}"
  [width]="400"
  [height]="600">
</synapse-widget>`;
      default:
        return "";
    }
  };

  if (!widget.id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Deployment
          </CardTitle>
          <CardDescription>
            Deploy your widget to make it available for embedding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please save your widget before deploying it.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Deployment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Deployment Configuration
          </CardTitle>
          <CardDescription>
            Configure how your widget will be deployed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select
                value={selectedEnvironment}
                onValueChange={(value: "staging" | "production") =>
                  setSelectedEnvironment(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customDomain">Custom Domain (Optional)</Label>
              <Input
                id="customDomain"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="widgets.yourcompany.com"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="analytics"
                checked={enableAnalytics}
                onCheckedChange={setEnableAnalytics}
              />
              <Label htmlFor="analytics">Enable Analytics</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="caching"
                checked={enableCaching}
                onCheckedChange={setEnableCaching}
              />
              <Label htmlFor="caching">Enable Caching</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allowedDomains">Allowed Domains</Label>
            <Textarea
              id="allowedDomains"
              value={allowedDomains}
              onChange={(e) => setAllowedDomains(e.target.value)}
              placeholder="example.com\napp.example.com\n*.example.com"
              rows={3}
            />
            <p className="text-sm text-gray-500">
              Enter one domain per line. Use * for wildcards.
            </p>
          </div>

          <Button
            onClick={onDeploy}
            disabled={isDeploying || widget.isDeployed}
            className="w-full"
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
                : "Deploy Widget"}
          </Button>
        </CardContent>
      </Card>

      {/* Deployment Status */}
      {widget.isDeployed && widget.deploymentInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Deployment Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Environment</Label>
                <div className="mt-1">
                  <Badge
                    variant={
                      widget.deploymentInfo.environment === "production"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {widget.deploymentInfo.environment}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="mt-1">
                  <Badge
                    variant={
                      widget.deploymentInfo.status === "active"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {widget.deploymentInfo.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Deployed At</Label>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(widget.deploymentInfo.deployedAt).toLocaleString()}
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Last Updated</Label>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(widget.deploymentInfo.lastUpdated).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Widget URLs */}
      {widget.isDeployed && widget.deploymentInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Widget URLs
            </CardTitle>
            <CardDescription>
              Access your deployed widget through these URLs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Standalone URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={widget.deploymentInfo.urls.standalone}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleCopyUrl(widget.deploymentInfo!.urls.standalone)
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        widget.deploymentInfo!.urls.standalone,
                        "_blank",
                      )
                    }
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Embed URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={widget.deploymentInfo.urls.embed}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleCopyUrl(widget.deploymentInfo!.urls.embed)
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">API URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={widget.deploymentInfo.urls.api}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleCopyUrl(widget.deploymentInfo!.urls.api)
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Embed Code */}
      {widget.isDeployed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Embed Code
            </CardTitle>
            <CardDescription>
              Copy and paste this code to embed your widget
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="embedFormat">Format</Label>
              <Select
                value={selectedEmbedFormat}
                onValueChange={setSelectedEmbedFormat}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="iframe">iFrame</SelectItem>
                  <SelectItem value="react">React</SelectItem>
                  <SelectItem value="vue">Vue</SelectItem>
                  <SelectItem value="angular">Angular</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Code</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopyEmbedCode(
                      widget.deploymentInfo
                        ? getEmbedCode(selectedEmbedFormat)
                        : getEmbedCodeExample(selectedEmbedFormat),
                    )
                  }
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
              </div>
              <Textarea
                value={
                  widget.deploymentInfo
                    ? getEmbedCode(selectedEmbedFormat)
                    : getEmbedCodeExample(selectedEmbedFormat)
                }
                readOnly
                className="font-mono text-sm"
                rows={8}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security & Analytics */}
      {widget.isDeployed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">HTTPS Enabled</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Domain Restrictions</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Rate Limiting</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Usage Tracking</span>
                {enableAnalytics ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Performance Monitoring</span>
                {enableAnalytics ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Error Reporting</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
