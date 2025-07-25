'use client';

import React from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Palette,
  Layout,
  Zap,
  Shield,
  Smartphone,
  Monitor,
  Tablet,
} from 'lucide-react';

import { WidgetConfiguration } from '@/lib/sdk/types';

interface WidgetSettingsProps {
  configuration: WidgetConfiguration;
  onUpdate: (updates: Partial<WidgetConfiguration>) => void;
}

export function WidgetSettings({
  configuration,
  onUpdate,
}: WidgetSettingsProps) {
  const handleThemeUpdate = (
    updates: Partial<WidgetConfiguration['theme']>,
  ) => {
    onUpdate({
      theme: {
        ...configuration.theme,
        ...updates,
      },
    });
  };

  const handleLayoutUpdate = (
    updates: Partial<WidgetConfiguration['layout']>,
  ) => {
    onUpdate({
      layout: {
        ...configuration.layout,
        ...updates,
      },
    });
  };

  const handleBehaviorUpdate = (
    updates: Partial<WidgetConfiguration['behavior']>,
  ) => {
    onUpdate({
      behavior: {
        ...configuration.behavior,
        ...updates,
      },
    });
  };

  const handleBrandingUpdate = (
    updates: Partial<WidgetConfiguration['branding']>,
  ) => {
    onUpdate({
      branding: {
        ...configuration.branding,
        ...updates,
      },
    });
  };

  const handleSecurityUpdate = (
    updates: Partial<WidgetConfiguration['security']>,
  ) => {  
    onUpdate({
      security: {
        ...configuration.security,
        allowedDomains: updates?.allowedDomains || [],
        requireAuth: updates?.requireAuth || false,
        rateLimiting: updates?.rateLimiting || {
          enabled: false,
          requestsPerMinute: 60,  
          tokensPerMinute: 60,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="theme" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="theme">
            <Palette className="h-4 w-4 mr-2" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="layout">
            <Layout className="h-4 w-4 mr-2" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="behavior">
            <Zap className="h-4 w-4 mr-2" />
            Behavior
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Settings className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="theme">
          <Card>
            <CardHeader>
              <CardTitle>Theme Configuration</CardTitle>
              <CardDescription>
                Customize the visual appearance of your widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={configuration.theme.primaryColor}
                      onChange={(e) =>
                        handleThemeUpdate({ primaryColor: e.target.value })
                      }
                      className="w-16 h-10"
                    />
                    <Input
                      value={configuration.theme.primaryColor}
                      onChange={(e) =>
                        handleThemeUpdate({ primaryColor: e.target.value })
                      }
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={configuration.theme.secondaryColor}
                      onChange={(e) =>
                        handleThemeUpdate({ secondaryColor: e.target.value })
                      }
                      className="w-16 h-10"
                    />
                    <Input
                      value={configuration.theme.secondaryColor}
                      onChange={(e) =>
                        handleThemeUpdate({ secondaryColor: e.target.value })
                      }
                      placeholder="#64748b"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={configuration.theme.backgroundColor}
                      onChange={(e) =>
                        handleThemeUpdate({ backgroundColor: e.target.value })
                      }
                      className="w-16 h-10"
                    />
                    <Input
                      value={configuration.theme.backgroundColor}
                      onChange={(e) =>
                        handleThemeUpdate({ backgroundColor: e.target.value })
                      }
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="textColor"
                      type="color"
                      value={configuration.theme.textColor}
                      onChange={(e) =>
                        handleThemeUpdate({ textColor: e.target.value })
                      }
                      className="w-16 h-10"
                    />
                    <Input
                      value={configuration.theme.textColor}
                      onChange={(e) =>
                        handleThemeUpdate({ textColor: e.target.value })
                      }
                      placeholder="#1f2937"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="borderRadius">Border Radius (px)</Label>
                  <Input
                    id="borderRadius"
                    type="number"
                    value={configuration.theme.borderRadius}
                    onChange={(e) =>
                      handleThemeUpdate({
                        borderRadius: parseInt(e.target.value) || 0,
                      })
                    }
                    min="0"
                    max="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fontSize">Font Size (px)</Label>
                  <Input
                    id="fontSize"
                    type="number"
                    value={configuration.theme.fontSize}
                    onChange={(e) =>
                      handleThemeUpdate({
                        fontSize: parseInt(e.target.value) || 14,
                      })
                    }
                    min="10"
                    max="24"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fontFamily">Font Family</Label>
                <Select
                  value={configuration.theme.fontFamily || 'Inter, sans-serif'}
                  onValueChange={(value) =>
                    handleThemeUpdate({ fontFamily: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                    <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                    <SelectItem value="Open Sans, sans-serif">
                      Open Sans
                    </SelectItem>
                    <SelectItem value="Lato, sans-serif">Lato</SelectItem>
                    <SelectItem value="Poppins, sans-serif">Poppins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customCSS">Custom CSS</Label>
                <Textarea
                  id="customCSS"
                  value={configuration.theme.customCSS || ''}
                  onChange={(e) =>
                    handleThemeUpdate({ customCSS: e.target.value })
                  }
                  placeholder="/* Add your custom CSS here */"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout">
          <Card>
            <CardHeader>
              <CardTitle>Layout Configuration</CardTitle>
              <CardDescription>
                Configure the size and positioning of your widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">Width (px)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={configuration.layout.width}
                    onChange={(e) =>
                      handleLayoutUpdate({
                        width: parseInt(e.target.value) || 400,
                      })
                    }
                    min="200"
                    max="800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (px)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={configuration.layout.height}
                    onChange={(e) =>
                      handleLayoutUpdate({
                        height: parseInt(e.target.value) || 600,
                      })
                    }
                    min="300"
                    max="1000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Select
                  value={configuration.layout.position}
                  onValueChange={(value: any) =>
                    handleLayoutUpdate({ position: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                    <SelectItem value="top-left">Top Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="fullscreen">Fullscreen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="responsive"
                  checked={configuration.layout.responsive}
                  onCheckedChange={(checked) =>
                    handleLayoutUpdate({ responsive: checked })
                  }
                />
                <Label htmlFor="responsive">Responsive Design</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zIndex">Z-Index</Label>
                <Input
                  id="zIndex"
                  type="number"
                  value={configuration.layout.zIndex || 1000}
                  onChange={(e) =>
                    handleLayoutUpdate({
                      zIndex: parseInt(e.target.value) || 1000,
                    })
                  }
                  min="1"
                  max="9999"
                />
              </div>

              <div className="space-y-4">
                <Label>Margin (px)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="marginTop">Top</Label>
                    <Input
                      id="marginTop"
                      type="number"
                      value={configuration.layout.margin?.top || 20}
                      onChange={(e) =>
                        handleLayoutUpdate({
                          margin: {
                            top: parseInt(e.target.value) || 20,
                            right: configuration.layout.margin?.right || 20,
                            bottom: configuration.layout.margin?.bottom || 20,
                            left: configuration.layout.margin?.left || 20,
                          },
                        })
                      }
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="marginRight">Right</Label>
                    <Input
                      id="marginRight"
                      type="number"
                      value={configuration.layout.margin?.right || 20}
                      onChange={(e) =>
                        handleLayoutUpdate({
                          margin: {
                            top: configuration.layout.margin?.top || 20,
                            right: parseInt(e.target.value) || 20,
                            bottom: configuration.layout.margin?.bottom || 20,
                            left: configuration.layout.margin?.left || 20,
                          },
                        })
                      }
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="marginBottom">Bottom</Label>
                    <Input
                      id="marginBottom"
                      type="number"
                      value={configuration.layout.margin?.bottom || 20}
                      onChange={(e) =>
                        handleLayoutUpdate({
                          margin: {
                            top: configuration.layout.margin?.top || 20,
                            right: configuration.layout.margin?.right || 20,
                            bottom: parseInt(e.target.value) || 20,
                            left: configuration.layout.margin?.left || 20,
                          },
                        })
                      }
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="marginLeft">Left</Label>
                    <Input
                      id="marginLeft"
                      type="number"
                      value={configuration.layout.margin?.left || 20}
                      onChange={(e) =>
                        handleLayoutUpdate({
                          margin: {
                            top: configuration.layout.margin?.top || 20,
                            right: configuration.layout.margin?.right || 20,
                            bottom: configuration.layout.margin?.bottom || 20,
                            left: parseInt(e.target.value) || 20,
                          },
                        })
                      }
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior">
          <Card>
            <CardHeader>
              <CardTitle>Behavior Configuration</CardTitle>
              <CardDescription>
                Configure how your widget behaves and interacts with users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoOpen"
                    checked={configuration.behavior.autoOpen}
                    onCheckedChange={(checked) =>
                      handleBehaviorUpdate({ autoOpen: checked })
                    }
                  />
                  <Label htmlFor="autoOpen">
                    Auto-open widget on page load
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="showWelcomeMessage"
                    checked={configuration.behavior.showWelcomeMessage}
                    onCheckedChange={(checked) =>
                      handleBehaviorUpdate({ showWelcomeMessage: checked })
                    }
                  />
                  <Label htmlFor="showWelcomeMessage">
                    Show welcome message
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableTypingIndicator"
                    checked={configuration.behavior.enableTypingIndicator}
                    onCheckedChange={(checked) =>
                      handleBehaviorUpdate({ enableTypingIndicator: checked })
                    }
                  />
                  <Label htmlFor="enableTypingIndicator">
                    Enable typing indicator
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableSoundNotifications"
                    checked={configuration.behavior.enableSoundNotifications}
                    onCheckedChange={(checked) =>
                      handleBehaviorUpdate({
                        enableSoundNotifications: checked,
                      })
                    }
                  />
                  <Label htmlFor="enableSoundNotifications">
                    Enable sound notifications
                  </Label>
                </div>

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding Configuration</CardTitle>
              <CardDescription>
                Customize the branding and appearance of your widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="showLogo"
                  checked={configuration.branding.showLogo}
                  onCheckedChange={(checked) =>
                    handleBrandingUpdate({ showLogo: checked })
                  }
                />
                <Label htmlFor="showLogo">Show company logo</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={configuration.branding.companyName || ''}
                  onChange={(e) =>
                    handleBrandingUpdate({ companyName: e.target.value })
                  }
                  placeholder="Your Company Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={configuration.branding.logoUrl || ''}
                  onChange={(e) =>
                    handleBrandingUpdate({ logoUrl: e.target.value })
                  }
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customHeader">Custom Header HTML</Label>
                <Textarea
                  id="customHeader"
                  value={configuration.branding.customHeader || ''}
                  onChange={(e) =>
                    handleBrandingUpdate({ customHeader: e.target.value })
                  }
                  placeholder="<div>Custom header content</div>"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customFooter">Custom Footer HTML</Label>
                <Textarea
                  id="customFooter"
                  value={configuration.branding.customFooter || ''}
                  onChange={(e) =>
                    handleBrandingUpdate({ customFooter: e.target.value })
                  }
                  placeholder="<div>Custom footer content</div>"
                  rows={3}
                />
              </div>

              <Separator />

              <div className="flex items-center space-x-2">
                <Switch
                  id="showPoweredBy"
                  checked={configuration.branding.showPoweredBy ?? true}
                  onCheckedChange={(checked) =>
                    handleBrandingUpdate({ showPoweredBy: checked })
                  }
                />
                <Label htmlFor="showPoweredBy">
                  Show &quot;Powered by&quot; text
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="poweredByText">Powered By Text</Label>
                <Input
                  id="poweredByText"
                  value={configuration.branding.poweredByText || ''}
                  onChange={(e) =>
                    handleBrandingUpdate({ poweredByText: e.target.value })
                  }
                  placeholder="Powered by SynapseAI"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Configuration</CardTitle>
              <CardDescription>
                Configure security settings and access controls for your widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="allowedDomains">Allowed Domains</Label>
                <Textarea
                  id="allowedDomains"
                  value={configuration.security?.allowedDomains.join('\n')}
                  onChange={(e) =>
                    handleSecurityUpdate({
                      allowedDomains: e.target.value
                        .split('\n')
                        .filter((domain) => domain.trim()),
                    })
                  }
                  placeholder="example.com\napp.example.com\n*.example.com"
                  rows={4}
                />
                <p className="text-sm text-gray-500">
                  Enter one domain per line. Use * for wildcards.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="requireAuth"
                  checked={configuration.security?.requireAuth}
                  onCheckedChange={(checked) =>
                    handleSecurityUpdate({ requireAuth: checked })
                  }
                />
                <Label htmlFor="requireAuth">Require authentication</Label>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="rateLimitingEnabled"
                    checked={configuration.security?.rateLimiting.enabled ?? false}
                    onCheckedChange={(checked) =>
                      handleSecurityUpdate({
                        rateLimiting: {
                          ...configuration.security?.rateLimiting,
                          enabled: checked ?? true,
                          requestsPerMinute: configuration.security?.rateLimiting.requestsPerMinute ?? 60,
                          tokensPerMinute: configuration.security?.rateLimiting.tokensPerMinute ?? 60,
                        },  
                      })
                    }
                  />
                  <Label htmlFor="rateLimitingEnabled">
                    Enable rate limiting
                  </Label>
                </div>

              <div className="space-y-2">
                <Label htmlFor="requestsPerMinute">
                  Requests per Minute
                </Label>
                <Input
                  id="requestsPerMinute"
                  type="number"
                  value={
                    configuration.security?.rateLimiting.requestsPerMinute ?? 60
                  }
                  onChange={(e) =>
                    handleSecurityUpdate({
                      rateLimiting: {
                        ...configuration.security?.rateLimiting,
                        requestsPerMinute: parseInt(e.target.value) || 60,
                        enabled: configuration.security?.rateLimiting.enabled ?? false,
                        tokensPerMinute: parseInt(e.target.value) || 60,
                      },
                    })
                  }
                  min="1"
                  max="1000"
                  disabled={!configuration.security?.rateLimiting.enabled}
                />
              </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
