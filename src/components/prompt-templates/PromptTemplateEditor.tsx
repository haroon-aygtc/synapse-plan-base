"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  Play,
  Save,
  Eye,
  Settings,
  Code,
  FileText,
  Tag,
  AlertCircle,
  CheckCircle,
  Copy,
  Wand2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  PromptTemplate,
  TemplateVariable,
  CreatePromptTemplateRequest,
  UpdatePromptTemplateRequest,
} from "@/lib/prompt-template-api";
import { usePromptTemplates } from "@/hooks/usePromptTemplates";

interface PromptTemplateEditorProps {
  template?: PromptTemplate | null;
  onSave: (
    data: CreatePromptTemplateRequest | UpdatePromptTemplateRequest,
  ) => Promise<void>;
  onCancel: () => void;
}

const CATEGORIES = [
  "agent-system",
  "user-instruction",
  "tool-summary",
  "error-message",
  "welcome-intro",
  "rag-injection",
  "custom",
];

const VARIABLE_TYPES = [
  "string",
  "number",
  "boolean",
  "array",
  "object",
] as const;

export function PromptTemplateEditor({
  template,
  onSave,
  onCancel,
}: PromptTemplateEditorProps) {
  const { toast } = useToast();
  const { renderTemplate, validateTemplate } = usePromptTemplates({
    autoLoad: false,
  });

  const [formData, setFormData] = useState<CreatePromptTemplateRequest>({
    name: "",
    description: "",
    content: "",
    category: "custom",
    version: "1.0.0",
    variables: [],
    metadata: {},
    tags: [],
    isPublic: false,
  });

  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [previewContent, setPreviewContent] = useState("");
  const [previewVariables, setPreviewVariables] = useState<Record<string, any>>(
    {},
  );
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors?: string[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showVariableDialog, setShowVariableDialog] = useState(false);
  const [editingVariable, setEditingVariable] =
    useState<TemplateVariable | null>(null);
  const [newVariable, setNewVariable] = useState<TemplateVariable>({
    name: "",
    type: "string",
    description: "",
    required: true,
    defaultValue: "",
  });

  // Initialize form data from template
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || "",
        content: template.content,
        category: template.category,
        version: template.version,
        variables: template.variables || [],
        metadata: template.metadata || {},
        tags: template.tags || [],
        isPublic: template.isPublic,
        parentTemplateId: template.parentTemplateId,
      });
      setVariables(template.variables || []);
      setTags(template.tags || []);
    }
  }, [template]);

  // Auto-detect variables in content
  const detectVariables = useCallback(() => {
    const variableRegex = /{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;
    const matches = formData.content.match(variableRegex);

    if (matches) {
      const detectedVars = matches.map((match) => {
        const name = match.replace(/[{}\s]/g, "");
        return name;
      });

      const uniqueVars = [...new Set(detectedVars)];
      const newVariables: TemplateVariable[] = [];

      uniqueVars.forEach((varName) => {
        const existing = variables.find((v) => v.name === varName);
        if (!existing) {
          newVariables.push({
            name: varName,
            type: "string",
            description: `Auto-detected variable: ${varName}`,
            required: true,
          });
        }
      });

      if (newVariables.length > 0) {
        setVariables((prev) => [...prev, ...newVariables]);
        toast({
          title: "Variables Detected",
          description: `Found ${newVariables.length} new variables in your template`,
        });
      }
    }
  }, [formData.content, variables, toast]);

  const handleAddVariable = useCallback(() => {
    if (!newVariable.name.trim()) {
      toast({
        title: "Error",
        description: "Variable name is required",
        variant: "destructive",
      });
      return;
    }

    if (variables.some((v) => v.name === newVariable.name)) {
      toast({
        title: "Error",
        description: "Variable name already exists",
        variant: "destructive",
      });
      return;
    }

    setVariables((prev) => [...prev, { ...newVariable }]);
    setNewVariable({
      name: "",
      type: "string",
      description: "",
      required: true,
      defaultValue: "",
    });
    setShowVariableDialog(false);
  }, [newVariable, variables, toast]);

  const handleUpdateVariable = useCallback(
    (index: number, updatedVariable: TemplateVariable) => {
      setVariables((prev) =>
        prev.map((v, i) => (i === index ? updatedVariable : v)),
      );
    },
    [],
  );

  const handleDeleteVariable = useCallback((index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags((prev) => [...prev, newTag.trim()]);
      setNewTag("");
    }
  }, [newTag, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  }, []);

  const handlePreview = useCallback(async () => {
    if (!formData.content.trim()) {
      toast({
        title: "Error",
        description: "Template content is required for preview",
        variant: "destructive",
      });
      return;
    }

    // Create sample variables for preview
    const sampleVars: Record<string, any> = {};
    variables.forEach((variable) => {
      if (variable.defaultValue !== undefined) {
        sampleVars[variable.name] = variable.defaultValue;
      } else {
        switch (variable.type) {
          case "string":
            sampleVars[variable.name] = `Sample ${variable.name}`;
            break;
          case "number":
            sampleVars[variable.name] = 42;
            break;
          case "boolean":
            sampleVars[variable.name] = true;
            break;
          case "array":
            sampleVars[variable.name] = ["item1", "item2"];
            break;
          case "object":
            sampleVars[variable.name] = { key: "value" };
            break;
        }
      }
    });

    setPreviewVariables(sampleVars);

    // Render preview
    let rendered = formData.content;
    Object.entries(sampleVars).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      rendered = rendered.replace(
        regex,
        typeof value === "object" ? JSON.stringify(value) : String(value),
      );
    });

    setPreviewContent(rendered);
    setShowPreview(true);
  }, [formData.content, variables, toast]);

  const handleValidate = useCallback(async () => {
    const result = await validateTemplate(formData.content, previewVariables);
    setValidationResult(result);

    if (result.valid) {
      toast({
        title: "Validation Passed",
        description: "Template is valid and ready to use",
      });
    } else {
      toast({
        title: "Validation Failed",
        description: result.errors?.[0] || "Template validation failed",
        variant: "destructive",
      });
    }
  }, [formData.content, previewVariables, validateTemplate, toast]);

  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.content.trim()) {
      toast({
        title: "Error",
        description: "Template content is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const saveData = {
        ...formData,
        variables,
        tags,
      };

      await onSave(saveData);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  }, [formData, variables, tags, onSave, toast]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter template name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category
                        .replace("-", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe what this template is used for"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
              />
              <Button type="button" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="content">Template Content *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectVariables}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Detect Variables
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreview}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleValidate}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Validate
              </Button>
            </div>
          </div>

          <Textarea
            id="content"
            value={formData.content}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, content: e.target.value }))
            }
            placeholder="Enter your prompt template content. Use {{variable_name}} for variables."
            rows={12}
            className="font-mono"
          />

          {validationResult && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md ${
                validationResult.valid
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {validationResult.valid ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">
                {validationResult.valid
                  ? "Template is valid"
                  : validationResult.errors?.[0] || "Validation failed"}
              </span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="variables" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Template Variables</Label>
            <Button type="button" onClick={() => setShowVariableDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Variable
            </Button>
          </div>

          <div className="space-y-3">
            {variables.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No variables defined</p>
                <p className="text-sm">
                  Add variables to make your template dynamic
                </p>
              </div>
            ) : (
              variables.map((variable, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                            {variable.name}
                          </code>
                          <Badge variant="outline">{variable.type}</Badge>
                          {variable.required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        {variable.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {variable.description}
                          </p>
                        )}
                        {variable.defaultValue !== undefined && (
                          <div className="text-xs text-gray-500">
                            Default: {JSON.stringify(variable.defaultValue)}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingVariable(variable);
                            setNewVariable(variable);
                            setShowVariableDialog(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVariable(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, version: e.target.value }))
                }
                placeholder="1.0.0"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isPublic: checked }))
                }
              />
              <Label htmlFor="isPublic">Make template public</Label>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Metadata (JSON)</Label>
            <Textarea
              value={JSON.stringify(formData.metadata, null, 2)}
              onChange={(e) => {
                try {
                  const metadata = JSON.parse(e.target.value);
                  setFormData((prev) => ({ ...prev, metadata }));
                } catch (error) {
                  // Invalid JSON, ignore
                }
              }}
              placeholder="{}"
              rows={4}
              className="font-mono"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {template ? "Update" : "Create"} Template
        </Button>
      </div>

      {/* Variable Dialog */}
      <Dialog open={showVariableDialog} onOpenChange={setShowVariableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVariable ? "Edit Variable" : "Add Variable"}
            </DialogTitle>
            <DialogDescription>
              Define a variable that can be injected into your template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="varName">Variable Name *</Label>
              <Input
                id="varName"
                value={newVariable.name}
                onChange={(e) =>
                  setNewVariable((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="variable_name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="varType">Type *</Label>
                <Select
                  value={newVariable.type}
                  onValueChange={(value: any) =>
                    setNewVariable((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIABLE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="varRequired"
                  checked={newVariable.required}
                  onCheckedChange={(checked) =>
                    setNewVariable((prev) => ({ ...prev, required: checked }))
                  }
                />
                <Label htmlFor="varRequired">Required</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="varDescription">Description</Label>
              <Input
                id="varDescription"
                value={newVariable.description || ""}
                onChange={(e) =>
                  setNewVariable((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe this variable"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="varDefault">Default Value</Label>
              <Input
                id="varDefault"
                value={newVariable.defaultValue || ""}
                onChange={(e) =>
                  setNewVariable((prev) => ({
                    ...prev,
                    defaultValue: e.target.value,
                  }))
                }
                placeholder="Optional default value"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowVariableDialog(false);
                setEditingVariable(null);
                setNewVariable({
                  name: "",
                  type: "string",
                  description: "",
                  required: true,
                  defaultValue: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddVariable}>
              {editingVariable ? "Update" : "Add"} Variable
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              Preview of your template with sample variables
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Sample Variables:</Label>
              <pre className="bg-gray-100 p-3 rounded text-sm mt-2">
                {JSON.stringify(previewVariables, null, 2)}
              </pre>
            </div>

            <div>
              <Label>Rendered Output:</Label>
              <div className="bg-gray-50 p-4 rounded mt-2 whitespace-pre-wrap">
                {previewContent}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PromptTemplateEditor;
