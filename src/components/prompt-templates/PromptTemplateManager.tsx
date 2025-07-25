"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Download,
  Upload,
  Star,
  StarOff,
  Eye,
  GitBranch,
  Clock,
  Users,
  Tag,
  FileText,
  Settings,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { usePromptTemplates } from "@/hooks/usePromptTemplates";
import { CreatePromptTemplateRequest, PromptTemplate } from "@/lib/prompt-template-api";
import { PromptTemplateEditor } from "./PromptTemplateEditor";

interface PromptTemplateManagerProps {
  onTemplateSelect?: (template: PromptTemplate) => void;
  selectedTemplateId?: string;
  showActions?: boolean;
  embedded?: boolean;
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

export function PromptTemplateManager({
  onTemplateSelect,
  selectedTemplateId,
  showActions = true,
  embedded = false,
}: PromptTemplateManagerProps) {
  const { toast } = useToast();
  const {
    templates,
    loading,
    error,
    selectedTemplate,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    selectTemplate,
    renderTemplate,
    createVersion,
    getVersionHistory,
    rateTemplate,
    searchTemplates,
    filterByCategory,
    duplicateTemplate,
    exportTemplate,
    importTemplate,
  } = usePromptTemplates();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showPublicOnly, setShowPublicOnly] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(
    null,
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [versionHistory, setVersionHistory] = useState<PromptTemplate[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        await searchTemplates(query);
      } else {
        await loadTemplates();
      }
    },
    [searchTemplates, loadTemplates],
  );

  const handleCategoryFilter = useCallback(
    async (category: string) => {
      setSelectedCategory(category);
      if (category === "all") {
        await loadTemplates();
      } else {
        await filterByCategory(category);
      }
    },
    [filterByCategory, loadTemplates],
  );

  const handleCreateTemplate = useCallback(() => {
    setEditingTemplate(null);
    setShowEditor(true);
  }, []);

  const handleEditTemplate = useCallback((template: PromptTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  }, []);

  const handleDeleteTemplate = useCallback(
    async (id: string) => {
      const success = await deleteTemplate(id);
      if (success) {
        setDeleteConfirmId(null);
      }
    },
    [deleteTemplate],
  );

  const handleDuplicateTemplate = useCallback(
    async (template: PromptTemplate) => {
      await duplicateTemplate(template);
    },
    [duplicateTemplate],
  );

  const handleTemplateSelect = useCallback(
    (template: PromptTemplate) => {
      selectTemplate(template);
      onTemplateSelect?.(template);
    },
    [selectTemplate, onTemplateSelect],
  );

  const handleViewVersionHistory = useCallback(
    async (template: PromptTemplate) => {
      const history = await getVersionHistory(template.id);
      setVersionHistory(history);
      setShowVersionHistory(true);
    },
    [getVersionHistory],
  );

  const handleRateTemplate = useCallback(
    async (template: PromptTemplate, rating: number) => {
      await rateTemplate(template.id, rating);
    },
    [rateTemplate],
  );

  const handleImportTemplate = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const templateData = JSON.parse(text);
        await importTemplate(templateData);
        setImportDialogOpen(false);
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid template file format",
          variant: "destructive",
        });
      }
    },
    [importTemplate, toast],
  );

  const filteredTemplates = templates.filter((template) => {
    if (showPublicOnly && !template.isPublic) return false;
    return true;
  });

  const renderTemplateCard = (template: PromptTemplate) => {
    const isSelected =
      selectedTemplateId === template.id ||
      selectedTemplate?.id === template.id;

    return (
      <Card
        key={template.id}
        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
          isSelected ? "ring-2 ring-blue-500 shadow-md" : ""
        }`}
        onClick={() => handleTemplateSelect(template)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-medium">
                {template.name}
              </CardTitle>
              {template.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {template.description}
                </p>
              )}
            </div>
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDuplicateTemplate(template)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleViewVersionHistory(template)}
                  >
                    <GitBranch className="h-4 w-4 mr-2" />
                    Version History
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportTemplate(template)}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteConfirmId(template.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{template.category}</Badge>
            <Badge variant="secondary">v{template.version}</Badge>
            {template.isPublic && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <Users className="h-3 w-3 mr-1" />
                Public
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            {template.tags && template.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="h-2 w-2 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {template.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{template.tags.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {template.usageCount}
                </div>
                <div className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {template.forkCount}
                </div>
                {template.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {template.rating.toFixed(1)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(template.updatedAt).toLocaleDateString()}
              </div>
            </div>

            {template.variables && template.variables.length > 0 && (
              <div className="text-xs text-gray-500">
                Variables: {template.variables.map((v) => v.name).join(", ")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={handleCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
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

        <div className="grid gap-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates found</p>
            </div>
          ) : (
            filteredTemplates.map(renderTemplateCard)
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prompt Templates</h1>
          <p className="text-gray-600">
            Manage and organize your prompt templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={handleCreateTemplate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement> ) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={handleCategoryFilter}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category
                      .replace("-", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showPublicOnly ? "default" : "outline"}
              onClick={() => setShowPublicOnly(!showPublicOnly)}
            >
              <Users className="h-4 w-4 mr-2" />
              Public Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredTemplates.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No templates found
            </h3>
            <p className="text-gray-500 mb-4">
              Get started by creating your first prompt template
            </p>
            <Button onClick={handleCreateTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        ) : (
          filteredTemplates.map(renderTemplateCard)
        )}
      </div>

      {/* Template Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Modify your existing prompt template"
                : "Create a new prompt template for your agents and tools"}
            </DialogDescription>
          </DialogHeader>
          <PromptTemplateEditor
            template={editingTemplate}
            onSave={async (data) => {
              if (editingTemplate) {
                await updateTemplate(editingTemplate.id, data);
              } else {
                await createTemplate(data as unknown as CreatePromptTemplateRequest);
              }
              setShowEditor(false);
              setEditingTemplate(null);
            }}
            onCancel={() => {
              setShowEditor(false);
              setEditingTemplate(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Template</DialogTitle>
            <DialogDescription>
              Select a JSON file to import a prompt template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input type="file" accept=".json" onChange={handleImportTemplate} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteConfirmId && handleDeleteTemplate(deleteConfirmId)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Version History Dialog */}
      <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              View all versions of this template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {versionHistory.map((version) => (
              <Card key={version.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        Version {version.version}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(version.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTemplateSelect(version)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PromptTemplateManager;
