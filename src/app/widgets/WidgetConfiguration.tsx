'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, X, Palette, Layout, Settings, Shield } from 'lucide-react';
import { WidgetConfiguration as WidgetConfigType } from '@/lib/sdk/types';

interface WidgetConfigurationProps {
  configuration: WidgetConfigType;
  onChange: (configuration: WidgetConfigType) => void;
}

export function WidgetConfiguration({ configuration, onChange }: WidgetConfigurationProps) {
  const [newDomain, setNewDomain] = useState('');

  const updateConfiguration = (path: string, value: any) => {
    const keys = path.split('.');
    const newConfig = { ...configuration };
    let current: any = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    onChange(newConfig);
  };

  const addDomain = () => {
    if (newDomain && !configuration.security?.allowedDomains.includes(newDomain)) {
      updateConfiguration('security.allowedDomains', [
        ...(configuration.security?.allowedDomains || []),
        newDomain
      ]);
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    updateConfiguration('security.allowedDomains', 
      configuration.security?.allowedDomains.filter(d => d !== domain)
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="theme" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="behavior" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Behavior
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="theme" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Colors</CardTitle>
              <CardDescription>Customize the color scheme of your widget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={configuration.theme.primaryColor}
                      onChange={(e) => updateConfiguration('theme.primaryColor', e.target.value)}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      value={configuration.theme.primaryColor}
                      onChange={(e) => updateConfiguration('theme.primaryColor', e.target.value)}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={configuration.theme.secondaryColor}
                      onChange={(e) => updateConfiguration('theme.secondaryColor', e.target.value)}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      value={configuration.theme.secondaryColor}
                      onChange={(e) => updateConfiguration('theme.secondaryColor', e.target.value)}
                      placeholder="#64748b"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={configuration.theme.backgroundColor}
                      onChange={(e) => updateConfiguration('theme.backgroundColor', e.target.value)}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      value={configuration.theme.backgroundColor}
                      onChange={(e) => updateConfiguration('theme.backgroundColor', e.target.value)}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="textColor"
                      type="color"
                      value={configuration.theme.textColor}
                      onChange={(e) => updateConfiguration('theme.textColor', e.target.value)}
                      className="w-12 h-10 p-1 border rounded"
                    />
                    <Input
                      value={configuration.theme.textColor}
                      onChange={(e) => updateConfiguration('theme.textColor', e.target.value)}
                      placeholder="#1f2937"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>Configure text appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Font Size: {configuration.theme.fontSize}px</Label>
                <Slider
                  value={[configuration.theme.fontSize]}
                  onValueChange={([value]) => updateConfiguration('theme.fontSize', value)}
                  min={10}
                  max={24}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Border Radius: {configuration.theme.borderRadius}px</Label>
                <Slider
                  value={[configuration.theme.borderRadius]}
                  onValueChange={([value]) => updateConfiguration('theme.borderRadius', value)}
                  min={0}
                  max={20}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="fontFamily">Font Family</Label>
                <Input
                  id="fontFamily"
                  value={configuration.theme.fontFamily || ''}
                  onChange={(e) => updateConfiguration('theme.fontFamily', e.target.value)}
                  placeholder="Inter, system-ui, sans-serif"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom CSS</CardTitle>
              <CardDescription>Add custom styles to your widget</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={configuration.theme.customCSS || ''}
                onChange={(e) => updateConfiguration('theme.customCSS', e.target.value)}
                placeholder="/* Add your custom CSS here */"
                rows={6}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dimensions</CardTitle>
              <CardDescription>Set the size of your widget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="width">Width (px)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={configuration.layout.width}
                    onChange={(e) => updateConfiguration('layout.width', parseInt(e.target.value))}
                    min={200}
                    max={800}
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height (px)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={configuration.layout.height}
                    onChange={(e) => updateConfiguration('layout.height', parseInt(e.target.value))}
                    min={300}
                    max={1000}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="responsive"
                  checked={configuration.layout.responsive}
                  onCheckedChange={(checked) => updateConfiguration('layout.responsive', checked)}
                />
                <Label htmlFor="responsive">Responsive design</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Position</CardTitle>
              <CardDescription>Choose where the widget appears on the page</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={configuration.layout.position}
                onValueChange={(value) => updateConfiguration('layout.position', value)}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Widget Behavior</CardTitle>
              <CardDescription>Configure how your widget behaves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="autoOpen"
                  checked={configuration.behavior.autoOpen}
                  onCheckedChange={(checked) => updateConfiguration('behavior.autoOpen', checked)}
                />
                <Label htmlFor="autoOpen">Auto-open widget on page load</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="showWelcomeMessage"
                  checked={configuration.behavior.showWelcomeMessage}
                  onCheckedChange={(checked) => updateConfiguration('behavior.showWelcomeMessage', checked)}
                />
                <Label htmlFor="showWelcomeMessage">Show welcome message</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableTypingIndicator"
                  checked={configuration.behavior.enableTypingIndicator}
                  onCheckedChange={(checked) => updateConfiguration('behavior.enableTypingIndicator', checked)}
                />
                <Label htmlFor="enableTypingIndicator">Show typing indicator</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableSoundNotifications"
                  checked={configuration.behavior.enableSoundNotifications}
                  onCheckedChange={(checked) => updateConfiguration('behavior.enableSoundNotifications', checked)}
                />
                <Label htmlFor="enableSoundNotifications">Enable sound notifications</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Customize the branding of your widget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="showLogo"
                  checked={configuration.branding.showLogo}
                  onCheckedChange={(checked) => updateConfiguration('branding.showLogo', checked)}
                />
                <Label htmlFor="showLogo">Show company logo</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="showPoweredBy"
                  checked={configuration.branding.showPoweredBy}
                  onCheckedChange={(checked) => updateConfiguration('branding.showPoweredBy', checked)}
                />
                <Label htmlFor="showPoweredBy">Show "Powered by" text</Label>
              </div>
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={configuration.branding.companyName || ''}
                  onChange={(e) => updateConfiguration('branding.companyName', e.target.value)}
                  placeholder="Your Company Name"
                />
              </div>
              <div>
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={configuration.branding.logoUrl || ''}
                  onChange={(e) => updateConfiguration('branding.logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain Restrictions</CardTitle>
              <CardDescription>Control which domains can embed your widget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  onKeyPress={(e) => e.key === 'Enter' && addDomain()}
                />
                <Button onClick={addDomain} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {configuration.security?.allowedDomains.map((domain) => (
                  <Badge key={domain} variant="secondary" className="flex items-center gap-1">
                    {domain}
                    <button
                      onClick={() => removeDomain(domain)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {configuration.security?.allowedDomains.length === 0 && (
                <p className="text-sm text-gray-500">No domain restrictions (widget can be embedded anywhere)</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>Configure authentication requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="requireAuth"
                  checked={configuration.security?.requireAuth}
                  onCheckedChange={(checked) => updateConfiguration('security.requireAuth', checked)}
                />
                <Label htmlFor="requireAuth">Require user authentication</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting</CardTitle>
              <CardDescription>Prevent abuse with rate limiting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="rateLimitingEnabled"
                  checked={configuration.security?.rateLimiting.enabled}
                  onCheckedChange={(checked) => updateConfiguration('security.rateLimiting.enabled', checked)}
                />
                <Label htmlFor="rateLimitingEnabled">Enable rate limiting</Label>
              </div>
              {configuration.security?.rateLimiting.enabled && (
                <div>
                  <Label htmlFor="requestsPerMinute">Requests per minute</Label>
                  <Input
                    id="requestsPerMinute"
                    type="number"
                    value={configuration.security?.rateLimiting.requestsPerMinute}
                    onChange={(e) => updateConfiguration('security.rateLimiting.requestsPerMinute', parseInt(e.target.value))}
                    min={1}
                    max={1000}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
