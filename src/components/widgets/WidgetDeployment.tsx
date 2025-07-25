"use client";

import React, { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Globe,
  Code,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  Monitor,
} from "lucide-react";
import { Widget } from "@/lib/sdk/types";
import { useToast } from "@/components/ui/use-toast";

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
  const [embedFormat, setEmbedFormat] = useState<
    "javascript" | "iframe" | "react" | "vue" | "angular"
  >("javascript");
  const [customDomain, setCustomDomain] = useState("");
  const [enableAnalytics, setEnableAnalytics] = useState(true);
  const [enableCaching, setEnableCaching] = useState(true);

  const generateEmbedCode = () => {
    if (!widget.isDeployed || !widget.deploymentInfo) {
      return "<!-- Widget must be deployed to generate embed code -->";
    }

    const embedGenerator =
      new (require("@/lib/widget-runtime/embed-generator").WidgetEmbedGenerator)();

    const embedOptions = {
      format: embedFormat,
      width: widget.configuration.layout.width + "px",
      height: widget.configuration.layout.height + "px",
      responsive: widget.configuration.layout.responsive,
      enableAnalytics,
      enableCaching,
      customDomain,
      theme: {
        primaryColor: widget.configuration.theme.primaryColor,
        secondaryColor: widget.configuration.theme.secondaryColor,
        backgroundColor: widget.configuration.theme.backgroundColor,
        textColor: widget.configuration.theme.textColor,
        borderRadius: widget.configuration.theme.borderRadius,
        fontSize: widget.configuration.theme.fontSize,
        fontFamily: widget.configuration.theme.fontFamily,
      },
    };

    try {
      return embedGenerator.generateEmbedCode(widget, embedOptions);
    } catch (error: any) {
      console.error("Failed to generate embed code:", error);
      return `<!-- Error generating embed code: ${error.message} -->`;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Embed code has been copied to your clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy embed code to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Deployment Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Deployment Status
          </CardTitle>
          <CardDescription>
            Current deployment status and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                {widget.isDeployed ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Deployed
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Deployed
                  </Badge>
                )}
              </div>
              <Button
                onClick={onDeploy}
                disabled={isDeploying || !widget.isActive}
                className={
                  widget.isDeployed ? "bg-red-600 hover:bg-red-700" : ""
                }
              >
                {isDeploying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : widget.isDeployed ? (
                  "Undeploy"
                ) : (
                  "Deploy Widget"
                )}
              </Button>
            </div>

            {widget.deploymentInfo && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Environment:</span>
                  <Badge variant="outline">
                    {widget.deploymentInfo.environment}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Deployed:</span>
                  <span className="text-sm">
                    {new Date(
                      widget.deploymentInfo.deployedAt,
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Updated:</span>
                  <span className="text-sm">
                    {new Date(
                      widget.deploymentInfo.lastUpdated,
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {!widget.isActive && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Widget must be active before it can be deployed.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deployment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Deployment Configuration
          </CardTitle>
          <CardDescription>
            Configure deployment settings and options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="customDomain">Custom Domain (Optional)</Label>
            <Input
              id="customDomain"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="widgets.yourdomain.com"
            />
            <p className="text-sm text-gray-500">
              Use your own domain for widget hosting (requires DNS
              configuration)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enableAnalytics"
              checked={enableAnalytics}
              onCheckedChange={setEnableAnalytics}
            />
            <Label htmlFor="enableAnalytics">Enable Analytics Tracking</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enableCaching"
              checked={enableCaching}
              onCheckedChange={setEnableCaching}
            />
            <Label htmlFor="enableCaching">Enable CDN Caching</Label>
          </div>
        </CardContent>
      </Card>

      {/* Widget URLs */}
      {widget.isDeployed && widget.deploymentInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Widget URLs
            </CardTitle>
            <CardDescription>
              Direct links to your deployed widget
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Standalone Widget URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={widget.deploymentInfo.urls.standalone}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                    copyToClipboard(widget.deploymentInfo!.urls.standalone)
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    window.open(widget.deploymentInfo!.urls.standalone, "_blank") as Window | null;
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Embed URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={widget.deploymentInfo.urls.embed}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                    copyToClipboard(widget.deploymentInfo!.urls.embed)
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>API Endpoint</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={widget.deploymentInfo.urls.api}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                    copyToClipboard(widget.deploymentInfo!.urls.api)
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
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
              Copy and paste this code into your website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={embedFormat}
              onValueChange={(value: string) => setEmbedFormat(value as "javascript" | "iframe" | "react" | "vue" | "angular")}
            >
              <TabsList className="grid grid-cols-5 mb-4">
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="iframe">iFrame</TabsTrigger>
                <TabsTrigger value="react">React</TabsTrigger>
                <TabsTrigger value="vue">Vue</TabsTrigger>
                <TabsTrigger value="angular">Angular</TabsTrigger>
              </TabsList>

              <TabsContent value={embedFormat}>
                <div className="space-y-4">
                  <div className="relative">
                    <Textarea
                      value={generateEmbedCode()}
                      readOnly
                      className="font-mono text-sm min-h-32"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(generateEmbedCode())}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>

                  {embedFormat === "javascript" && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This script will automatically load and display your
                        widget. Place it anywhere in your HTML where you want
                        the widget to appear.
                      </AlertDescription>
                    </Alert>
                  )}

                  {embedFormat === "iframe" && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        iFrame embedding provides the most isolation but may
                        have limitations with responsive design and cross-origin
                        communication.
                      </AlertDescription>
                    </Alert>
                  )}

                  {(embedFormat === "react" ||
                    embedFormat === "vue" ||
                    embedFormat === "angular") && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Make sure to install the SynapseAI {embedFormat}{" "}
                        package:
                        <code className="ml-1 px-1 py-0.5 bg-gray-100 rounded text-xs">
                          npm install @synapseai/{embedFormat}-widget
                        </code>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {widget.isDeployed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Live Preview
            </CardTitle>
            <CardDescription>Preview your deployed widget</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50">
              <iframe
                src={widget.deploymentInfo?.urls.embed}
                width={widget.configuration.layout.width}
                height={widget.configuration.layout.height}
                frameBorder="0"
                className="border-0 rounded-lg"
                title={`${widget.name} Preview`}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default WidgetDeployment;
