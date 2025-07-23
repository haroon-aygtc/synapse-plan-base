"use client";

import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import {
  Route,
  Settings,
  Plus,
  Edit,
  Trash2,
  ArrowRight,
  Target,
  Zap,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Play,
  Pause,
} from "lucide-react";
import { useProviderRouting, useProviders } from "@/hooks/useProviders";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { RoutingRule } from "@/lib/provider-api";

interface RoutingRuleCardProps {
  rule: RoutingRule;
  providers: any[];
  onEdit: (rule: RoutingRule) => void;
  onDelete: (ruleId: string) => void;
  onToggle: (ruleId: string, isActive: boolean) => void;
  onTest: (ruleId: string) => void;
}

function RoutingRuleCard({
  rule,
  providers,
  onEdit,
  onDelete,
  onToggle,
  onTest,
}: RoutingRuleCardProps) {
  const getProviderName = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    return provider?.name || "Unknown Provider";
  };

  const getProviderIcon = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return "❓";

    switch (provider.type.toLowerCase()) {
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

  const getConditionSummary = (conditions: any) => {
    const parts = [];
    if (conditions.model) parts.push(`Model: ${conditions.model}`);
    if (conditions.executionType)
      parts.push(`Type: ${conditions.executionType}`);
    if (conditions.costThreshold)
      parts.push(`Cost < $${conditions.costThreshold}`);
    if (conditions.performanceThreshold)
      parts.push(`Response < ${conditions.performanceThreshold}ms`);
    return parts.length > 0 ? parts.join(", ") : "No conditions";
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-lg",
        rule.isActive
          ? "border-green-200 bg-green-50/50 dark:bg-green-900/10"
          : "border-gray-200 bg-gray-50/50 dark:bg-gray-800/50",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{rule.name}</CardTitle>
            </div>
            <Badge variant={rule.isActive ? "default" : "secondary"}>
              {rule.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Priority: {rule.priority}
            </Badge>
            <Switch
              checked={rule.isActive}
              onCheckedChange={(checked) => onToggle(rule.id, checked)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conditions */}
        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            Conditions
          </Label>
          <div className="mt-1 p-3 bg-white dark:bg-gray-900 rounded-lg border">
            <p className="text-sm">{getConditionSummary(rule.conditions)}</p>
          </div>
        </div>

        {/* Target Provider */}
        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            Target Provider
          </Label>
          <div className="mt-1 flex items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
            <span className="text-lg">
              {getProviderIcon(rule.targetProvider)}
            </span>
            <span className="font-medium">
              {getProviderName(rule.targetProvider)}
            </span>
          </div>
        </div>

        {/* Fallback Providers */}
        {rule.fallbackProviders && rule.fallbackProviders.length > 0 && (
          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              Fallback Providers
            </Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {rule.fallbackProviders.map((providerId, index) => (
                <div
                  key={providerId}
                  className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-900 rounded-lg border text-sm"
                >
                  <span>{index + 1}.</span>
                  <span>{getProviderIcon(providerId)}</span>
                  <span>{getProviderName(providerId)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTest(rule.id)}
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-2" />
            Test Rule
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(rule)}>
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Routing Rule</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the routing rule "{rule.name}
                  "? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(rule.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

interface CreateRuleDialogProps {
  providers: any[];
  onCreateRule: (rule: Omit<RoutingRule, "id">) => void;
  editingRule?: RoutingRule | null;
  onEditComplete?: () => void;
}

function CreateRuleDialog({
  providers,
  onCreateRule,
  editingRule,
  onEditComplete,
}: CreateRuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    priority: 100,
    conditions: {
      model: "",
      executionType: "",
      costThreshold: "",
      performanceThreshold: "",
    },
    targetProvider: "",
    fallbackProviders: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    if (editingRule) {
      setFormData({
        name: editingRule.name,
        priority: editingRule.priority,
        conditions: {
          model: editingRule.conditions.model || "",
          executionType: editingRule.conditions.executionType || "",
          costThreshold: editingRule.conditions.costThreshold?.toString() || "",
          performanceThreshold:
            editingRule.conditions.performanceThreshold?.toString() || "",
        },
        targetProvider: editingRule.targetProvider,
        fallbackProviders: editingRule.fallbackProviders || [],
        isActive: editingRule.isActive,
      });
      setOpen(true);
    }
  }, [editingRule]);

  const handleSubmit = () => {
    if (!formData.name || !formData.targetProvider) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const rule: Omit<RoutingRule, "id"> = {
      name: formData.name,
      priority: formData.priority,
      conditions: {
        ...(formData.conditions.model && { model: formData.conditions.model }),
        ...(formData.conditions.executionType && {
          executionType: formData.conditions.executionType,
        }),
        ...(formData.conditions.costThreshold && {
          costThreshold: parseFloat(formData.conditions.costThreshold),
        }),
        ...(formData.conditions.performanceThreshold && {
          performanceThreshold: parseInt(
            formData.conditions.performanceThreshold,
          ),
        }),
      },
      targetProvider: formData.targetProvider,
      fallbackProviders:
        formData.fallbackProviders.length > 0
          ? formData.fallbackProviders
          : undefined,
      isActive: formData.isActive,
    };

    onCreateRule(rule);
    setOpen(false);
    setFormData({
      name: "",
      priority: 100,
      conditions: {
        model: "",
        executionType: "",
        costThreshold: "",
        performanceThreshold: "",
      },
      targetProvider: "",
      fallbackProviders: [],
      isActive: true,
    });

    if (editingRule && onEditComplete) {
      onEditComplete();
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (editingRule && onEditComplete) {
      onEditComplete();
    }
  };

  const addFallbackProvider = (providerId: string) => {
    if (
      !formData.fallbackProviders.includes(providerId) &&
      providerId !== formData.targetProvider
    ) {
      setFormData({
        ...formData,
        fallbackProviders: [...formData.fallbackProviders, providerId],
      });
    }
  };

  const removeFallbackProvider = (providerId: string) => {
    setFormData({
      ...formData,
      fallbackProviders: formData.fallbackProviders.filter(
        (id) => id !== providerId,
      ),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!editingRule && (
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Routing Rule
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRule ? "Edit Routing Rule" : "Create New Routing Rule"}
          </DialogTitle>
          <DialogDescription>
            Configure intelligent routing rules to optimize provider selection
            based on your criteria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., High Performance Route"
              />
            </div>

            <div>
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
              <p className="text-xs text-muted-foreground mt-1">
                Higher priority rules are evaluated first
              </p>
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-4">
            <h4 className="font-medium">Routing Conditions</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="model">Model Filter</Label>
                <Input
                  id="model"
                  value={formData.conditions.model}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conditions: {
                        ...formData.conditions,
                        model: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g., gpt-4, claude-3"
                />
              </div>

              <div>
                <Label htmlFor="executionType">Execution Type</Label>
                <Select
                  value={formData.conditions.executionType}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      conditions: {
                        ...formData.conditions,
                        executionType: value,
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="tool">Tool</SelectItem>
                    <SelectItem value="workflow">Workflow</SelectItem>
                    <SelectItem value="knowledge">Knowledge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="costThreshold">Max Cost per Request ($)</Label>
                <Input
                  id="costThreshold"
                  type="number"
                  step="0.0001"
                  value={formData.conditions.costThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conditions: {
                        ...formData.conditions,
                        costThreshold: e.target.value,
                      },
                    })
                  }
                  placeholder="0.01"
                />
              </div>

              <div>
                <Label htmlFor="performanceThreshold">
                  Max Response Time (ms)
                </Label>
                <Input
                  id="performanceThreshold"
                  type="number"
                  value={formData.conditions.performanceThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      conditions: {
                        ...formData.conditions,
                        performanceThreshold: e.target.value,
                      },
                    })
                  }
                  placeholder="3000"
                />
              </div>
            </div>
          </div>

          {/* Target Provider */}
          <div>
            <Label htmlFor="targetProvider">Target Provider *</Label>
            <Select
              value={formData.targetProvider}
              onValueChange={(value) =>
                setFormData({ ...formData, targetProvider: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select primary provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex items-center gap-2">
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

          {/* Fallback Providers */}
          <div>
            <Label>Fallback Providers (Optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Providers to use if the target provider fails or is unavailable
            </p>

            <div className="space-y-2">
              {formData.fallbackProviders.map((providerId, index) => {
                const provider = providers.find((p) => p.id === providerId);
                return (
                  <div
                    key={providerId}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{index + 1}.</span>
                      <span>{provider?.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {provider?.type}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFallbackProvider(providerId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}

              <Select onValueChange={addFallbackProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Add fallback provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers
                    .filter(
                      (p) =>
                        p.id !== formData.targetProvider &&
                        !formData.fallbackProviders.includes(p.id),
                    )
                    .map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex items-center gap-2">
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
          </div>

          {/* Active Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked })
              }
            />
            <Label htmlFor="isActive">Enable this rule immediately</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {editingRule ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProviderRoutingConfig() {
  const { rules, loading, error, fetchRules, createRule } =
    useProviderRouting();
  const { providers } = useProviders();
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);

  const handleCreateRule = async (rule: Omit<RoutingRule, "id">) => {
    try {
      await createRule(rule);
      toast({
        title: "Success",
        description: "Routing rule created successfully",
      });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleEditRule = (rule: RoutingRule) => {
    setEditingRule(rule);
  };

  const handleEditComplete = () => {
    setEditingRule(null);
    fetchRules(); // Refresh rules after edit
  };

  const handleDeleteRule = async (ruleId: string) => {
    // TODO: Implement delete rule API call
    toast({
      title: "Feature Coming Soon",
      description: "Rule deletion will be available in the next update.",
    });
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    // TODO: Implement toggle rule API call
    toast({
      title: "Feature Coming Soon",
      description: "Rule toggling will be available in the next update.",
    });
  };

  const handleTestRule = async (ruleId: string) => {
    // TODO: Implement test rule API call
    toast({
      title: "Testing Rule",
      description: "Simulating routing rule with sample data...",
    });

    // Simulate test result
    setTimeout(() => {
      toast({
        title: "Test Completed",
        description: "Rule would route to OpenAI provider with 95% confidence.",
      });
    }, 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Unable to Load Routing Rules
          </h3>
          <p className="text-muted-foreground text-center mb-4">{error}</p>
          <Button onClick={fetchRules}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const activeRules = rules.filter((rule) => rule.isActive);
  const inactiveRules = rules.filter((rule) => !rule.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Smart Provider Routing</h2>
          <p className="text-muted-foreground">
            Configure intelligent routing rules to optimize provider selection
          </p>
        </div>
        <CreateRuleDialog
          providers={providers}
          onCreateRule={handleCreateRule}
          editingRule={editingRule}
          onEditComplete={handleEditComplete}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeRules.length} active, {inactiveRules.length} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeRules.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently routing traffic
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Providers</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providers.length}</div>
            <p className="text-xs text-muted-foreground">
              Available for routing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Priority</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rules.length > 0
                ? Math.round(
                    rules.reduce((sum, rule) => sum + rule.priority, 0) /
                      rules.length,
                  )
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Rule priority average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeRules.length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive ({inactiveRules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {rules.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {rules
                .sort((a, b) => b.priority - a.priority)
                .map((rule) => (
                  <RoutingRuleCard
                    key={rule.id}
                    rule={rule}
                    providers={providers}
                    onEdit={handleEditRule}
                    onDelete={handleDeleteRule}
                    onToggle={handleToggleRule}
                    onTest={handleTestRule}
                  />
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Route className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Routing Rules</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first routing rule to start optimizing provider
                  selection.
                </p>
                <CreateRuleDialog
                  providers={providers}
                  onCreateRule={handleCreateRule}
                  editingRule={editingRule}
                  onEditComplete={handleEditComplete}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeRules
              .sort((a, b) => b.priority - a.priority)
              .map((rule) => (
                <RoutingRuleCard
                  key={rule.id}
                  rule={rule}
                  providers={providers}
                  onEdit={handleEditRule}
                  onDelete={handleDeleteRule}
                  onToggle={handleToggleRule}
                  onTest={handleTestRule}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="inactive">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {inactiveRules
              .sort((a, b) => b.priority - a.priority)
              .map((rule) => (
                <RoutingRuleCard
                  key={rule.id}
                  rule={rule}
                  providers={providers}
                  onEdit={handleEditRule}
                  onDelete={handleDeleteRule}
                  onToggle={handleToggleRule}
                  onTest={handleTestRule}
                />
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
