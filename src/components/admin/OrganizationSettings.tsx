'use client';

import React, { useState } from 'react';
import {
  Settings,
  Building,
  Palette,
  Globe,
  Shield,
  CreditCard,
  Users,
  Save,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/types/global';

interface OrganizationSettingsProps {
  className?: string;
}

interface OrganizationConfig {
  name: string;
  description: string;
  website: string;
  logo: string;
  domain: string;
  timezone: string;
  language: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    logo: string;
    favicon: string;
  };
  security: {
    requireMFA: boolean;
    sessionTimeout: number;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
    allowedDomains: string[];
    ipWhitelist: string[];
  };
  features: {
    allowUserRegistration: boolean;
    requireEmailVerification: boolean;
    enableAuditLog: boolean;
    enableAPIAccess: boolean;
    maxUsers: number;
    maxAgents: number;
    maxTools: number;
  };
}

export function OrganizationSettings({ className }: OrganizationSettingsProps) {
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<OrganizationConfig>({
    name: 'Acme Corporation',
    description: 'AI-powered automation platform',
    website: 'https://acme.com',
    logo: '',
    domain: 'acme.synapseai.com',
    timezone: 'UTC',
    language: 'en',
    theme: {
      primaryColor: '#3b82f6',
      secondaryColor: '#64748b',
      logo: '',
      favicon: '',
    },
    security: {
      requireMFA: false,
      sessionTimeout: 24,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
      },
      allowedDomains: ['acme.com'],
      ipWhitelist: [],
    },
    features: {
      allowUserRegistration: false,
      requireEmailVerification: true,
      enableAuditLog: true,
      enableAPIAccess: true,
      maxUsers: 50,
      maxAgents: 100,
      maxTools: 200,
    },
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // API call to save organization settings
      console.log('Saving organization settings:', config);
      // await api.put('/admin/organization', config);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle file upload
      console.log('Uploading logo:', file);
    }
  };

  if (!hasPermission(PERMISSIONS.ORG_SETTINGS)) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Shield className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have permission to manage organization settings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Organization Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure your organization's settings, security, and features
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>General Information</span>
              </CardTitle>
              <CardDescription>
                Basic information about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    value={config.name}
                    onChange={(e) =>
                      setConfig({ ...config, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={config.website}
                    onChange={(e) =>
                      setConfig({ ...config, website: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) =>
                    setConfig({ ...config, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={config.timezone}
                    onValueChange={(value) =>
                      setConfig({ ...config, timezone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">
                        Eastern Time
                      </SelectItem>
                      <SelectItem value="America/Chicago">
                        Central Time
                      </SelectItem>
                      <SelectItem value="America/Denver">
                        Mountain Time
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        Pacific Time
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={config.language}
                    onValueChange={(value) =>
                      setConfig({ ...config, language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Branding & Theme</span>
              </CardTitle>
              <CardDescription>
                Customize your organization's visual identity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Organization Logo</Label>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                      {config.logo ? (
                        <img
                          src={config.logo}
                          alt="Logo"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Building className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Button
                        variant="outline"
                        onClick={() =>
                          document.getElementById('logo-upload')?.click()
                        }
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                      <p className="text-sm text-muted-foreground mt-1">
                        Recommended: 200x200px, PNG or SVG
                      </p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={config.theme.primaryColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            theme: {
                              ...config.theme,
                              primaryColor: e.target.value,
                            },
                          })
                        }
                        className="w-16 h-10"
                      />
                      <Input
                        value={config.theme.primaryColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            theme: {
                              ...config.theme,
                              primaryColor: e.target.value,
                            },
                          })
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={config.theme.secondaryColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            theme: {
                              ...config.theme,
                              secondaryColor: e.target.value,
                            },
                          })
                        }
                        className="w-16 h-10"
                      />
                      <Input
                        value={config.theme.secondaryColor}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            theme: {
                              ...config.theme,
                              secondaryColor: e.target.value,
                            },
                          })
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>
                Configure security policies and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Multi-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Force all users to enable MFA for enhanced security
                    </p>
                  </div>
                  <Switch
                    checked={config.security.requireMFA}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        security: { ...config.security, requireMFA: checked },
                      })
                    }
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">
                    Session Timeout (hours)
                  </Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={config.security.sessionTimeout}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        security: {
                          ...config.security,
                          sessionTimeout: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-32"
                  />
                </div>
                <Separator />
                <div className="space-y-4">
                  <Label>Password Policy</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minLength">Minimum Length</Label>
                      <Input
                        id="minLength"
                        type="number"
                        value={config.security.passwordPolicy.minLength}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            security: {
                              ...config.security,
                              passwordPolicy: {
                                ...config.security.passwordPolicy,
                                minLength: parseInt(e.target.value),
                              },
                            },
                          })
                        }
                        className="w-24"
                      />
                    </div>
                    <div className="space-y-3">
                      {[
                        { key: 'requireUppercase', label: 'Require Uppercase' },
                        { key: 'requireLowercase', label: 'Require Lowercase' },
                        { key: 'requireNumbers', label: 'Require Numbers' },
                        { key: 'requireSymbols', label: 'Require Symbols' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Switch
                            checked={
                              config.security.passwordPolicy[
                                key as keyof typeof config.security.passwordPolicy
                              ] as boolean
                            }
                            onCheckedChange={(checked) =>
                              setConfig({
                                ...config,
                                security: {
                                  ...config.security,
                                  passwordPolicy: {
                                    ...config.security.passwordPolicy,
                                    [key]: checked,
                                  },
                                },
                              })
                            }
                          />
                          <Label>{label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Feature Settings</span>
              </CardTitle>
              <CardDescription>
                Configure available features and limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {[
                  {
                    key: 'allowUserRegistration',
                    label: 'Allow User Registration',
                    description: 'Allow new users to register for accounts',
                  },
                  {
                    key: 'requireEmailVerification',
                    label: 'Require Email Verification',
                    description:
                      'Users must verify their email before accessing the platform',
                  },
                  {
                    key: 'enableAuditLog',
                    label: 'Enable Audit Logging',
                    description:
                      'Track all user actions for security and compliance',
                  },
                  {
                    key: 'enableAPIAccess',
                    label: 'Enable API Access',
                    description: 'Allow users to access the platform via API',
                  },
                ].map(({ key, label, description }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <Label>{label}</Label>
                      <p className="text-sm text-muted-foreground">
                        {description}
                      </p>
                    </div>
                    <Switch
                      checked={
                        config.features[
                          key as keyof typeof config.features
                        ] as boolean
                      }
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          features: { ...config.features, [key]: checked },
                        })
                      }
                    />
                  </div>
                ))}
                <Separator />
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { key: 'maxUsers', label: 'Max Users' },
                    { key: 'maxAgents', label: 'Max Agents' },
                    { key: 'maxTools', label: 'Max Tools' },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>{label}</Label>
                      <Input
                        id={key}
                        type="number"
                        value={
                          config.features[key as keyof typeof config.features]
                        }
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            features: {
                              ...config.features,
                              [key]: parseInt(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Billing & Usage</span>
              </CardTitle>
              <CardDescription>
                Manage your subscription and usage limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Current Plan</h3>
                    <p className="text-sm text-muted-foreground">
                      Professional Plan
                    </p>
                  </div>
                  <Badge>Active</Badge>
                </div>
                <Separator />
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">45/50</div>
                    <div className="text-sm text-muted-foreground">Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">78/100</div>
                    <div className="text-sm text-muted-foreground">Agents</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">156/200</div>
                    <div className="text-sm text-muted-foreground">Tools</div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Next Billing Date</h3>
                    <p className="text-sm text-muted-foreground">
                      January 15, 2024
                    </p>
                  </div>
                  <Button variant="outline">Manage Billing</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
