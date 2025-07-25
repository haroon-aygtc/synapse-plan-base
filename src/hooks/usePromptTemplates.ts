import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  PromptTemplate,
  PromptTemplateAPI,
  CreatePromptTemplateRequest,
  UpdatePromptTemplateRequest,
  PromptTemplateFilters,
  RenderTemplateRequest,
} from "@/lib/prompt-template-api";

export interface UsePromptTemplatesOptions {
  autoLoad?: boolean;
  filters?: PromptTemplateFilters;
}

export interface UsePromptTemplatesReturn {
  templates: PromptTemplate[];
  loading: boolean;
  error: string | null;
  selectedTemplate: PromptTemplate | null;

  // CRUD operations
  loadTemplates: (filters?: PromptTemplateFilters) => Promise<void>;
  createTemplate: (
    data: CreatePromptTemplateRequest,
  ) => Promise<PromptTemplate | null>;
  updateTemplate: (
    id: string,
    data: UpdatePromptTemplateRequest,
  ) => Promise<PromptTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
  selectTemplate: (template: PromptTemplate | null) => void;

  // Template operations
  renderTemplate: (request: RenderTemplateRequest) => Promise<string | null>;
  createVersion: (
    id: string,
    version: string,
    changes: Record<string, any>,
  ) => Promise<PromptTemplate | null>;
  getVersionHistory: (id: string) => Promise<PromptTemplate[]>;
  rateTemplate: (id: string, rating: number) => Promise<boolean>;

  // Search and filter
  searchTemplates: (query: string) => Promise<void>;
  filterByCategory: (category: string) => Promise<void>;

  // Utility functions
  validateTemplate: (
    content: string,
    variables: Record<string, any>,
  ) => Promise<{ valid: boolean; errors?: string[] }>;
  duplicateTemplate: (
    template: PromptTemplate,
  ) => Promise<PromptTemplate | null>;
  exportTemplate: (template: PromptTemplate) => void;
  importTemplate: (templateData: any) => Promise<PromptTemplate | null>;
}

export function usePromptTemplates(
  options: UsePromptTemplatesOptions = {},
): UsePromptTemplatesReturn {
  const { autoLoad = true, filters } = options;
  const { toast } = useToast();

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<PromptTemplate | null>(null);

  const handleError = useCallback(
    (error: any, action: string) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        `Failed to ${action}`;
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      console.error(`Prompt template ${action} error:`, error);
    },
    [toast],
  );

  const loadTemplates = useCallback(
    async (loadFilters?: PromptTemplateFilters) => {
      setLoading(true);
      setError(null);

      try {
        const data = await PromptTemplateAPI.getTemplates(
          loadFilters || filters,
        );
        setTemplates(data);
      } catch (error) {
        handleError(error, "load templates");
      } finally {
        setLoading(false);
      }
    },
    [filters, handleError],
  );

  const createTemplate = useCallback(
    async (
      data: CreatePromptTemplateRequest,
    ): Promise<PromptTemplate | null> => {
      setLoading(true);
      setError(null);

      try {
        const newTemplate = await PromptTemplateAPI.createTemplate(data);
        setTemplates((prev) => [newTemplate, ...prev]);
        toast({
          title: "Success",
          description: "Template created successfully",
        });
        return newTemplate;
      } catch (error) {
        handleError(error, "create template");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError, toast],
  );

  const updateTemplate = useCallback(
    async (
      id: string,
      data: UpdatePromptTemplateRequest,
    ): Promise<PromptTemplate | null> => {
      setLoading(true);
      setError(null);

      try {
        const updatedTemplate = await PromptTemplateAPI.updateTemplate(
          id,
          data,
        );
        setTemplates((prev) =>
          prev.map((t) => (t.id === id ? updatedTemplate : t)),
        );
        if (selectedTemplate?.id === id) {
          setSelectedTemplate(updatedTemplate);
        }
        toast({
          title: "Success",
          description: "Template updated successfully",
        });
        return updatedTemplate;
      } catch (error) {
        handleError(error, "update template");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError, selectedTemplate, toast],
  );

  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        await PromptTemplateAPI.deleteTemplate(id);
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        if (selectedTemplate?.id === id) {
          setSelectedTemplate(null);
        }
        toast({
          title: "Success",
          description: "Template deleted successfully",
        });
        return true;
      } catch (error) {
        handleError(error, "delete template");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [handleError, selectedTemplate, toast],
  );

  const selectTemplate = useCallback((template: PromptTemplate | null) => {
    setSelectedTemplate(template);
  }, []);

  const renderTemplate = useCallback(
    async (request: RenderTemplateRequest): Promise<string | null> => {
      setError(null);

      try {
        const result = await PromptTemplateAPI.renderTemplate(request);
        return result.rendered;
      } catch (error) {
        handleError(error, "render template");
        return null;
      }
    },
    [handleError],
  );

  const createVersion = useCallback(
    async (
      id: string,
      version: string,
      changes: Record<string, any>,
    ): Promise<PromptTemplate | null> => {
      setLoading(true);
      setError(null);

      try {
        const newVersion = await PromptTemplateAPI.createVersion(
          id,
          version,
          changes,
        );
        setTemplates((prev) => [newVersion, ...prev]);
        toast({
          title: "Success",
          description: `Version ${version} created successfully`,
        });
        return newVersion;
      } catch (error) {
        handleError(error, "create version");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError, toast],
  );

  const getVersionHistory = useCallback(
    async (id: string): Promise<PromptTemplate[]> => {
      setError(null);

      try {
        return await PromptTemplateAPI.getVersionHistory(id);
      } catch (error) {
        handleError(error, "get version history");
        return [];
      }
    },
    [handleError],
  );

  const rateTemplate = useCallback(
    async (id: string, rating: number): Promise<boolean> => {
      setError(null);

      try {
        const updatedTemplate = await PromptTemplateAPI.rateTemplate(
          id,
          rating,
        );
        setTemplates((prev) =>
          prev.map((t) => (t.id === id ? updatedTemplate : t)),
        );
        if (selectedTemplate?.id === id) {
          setSelectedTemplate(updatedTemplate);
        }
        toast({
          title: "Success",
          description: "Rating submitted successfully",
        });
        return true;
      } catch (error) {
        handleError(error, "rate template");
        return false;
      }
    },
    [handleError, selectedTemplate, toast],
  );

  const searchTemplates = useCallback(
    async (query: string) => {
      await loadTemplates({ ...filters, search: query });
    },
    [loadTemplates, filters],
  );

  const filterByCategory = useCallback(
    async (category: string) => {
      await loadTemplates({ ...filters, category });
    },
    [loadTemplates, filters],
  );

  const validateTemplate = useCallback(
    async (
      content: string,
      variables: Record<string, any>,
    ): Promise<{ valid: boolean; errors?: string[] }> => {
      try {
        return await PromptTemplateAPI.validateTemplate(content, variables);
      } catch (error) {
        return {
          valid: false,
          errors: [
            error instanceof Error ? error.message : "Validation failed",
          ],
        };
      }
    },
    [],
  );

  const duplicateTemplate = useCallback(
    async (template: PromptTemplate): Promise<PromptTemplate | null> => {
      const duplicateData: CreatePromptTemplateRequest = {
        name: `${template.name} (Copy)`,
        description: template.description,
        content: template.content,
        category: template.category,
        variables: template.variables,
        metadata: template.metadata,
        tags: template.tags,
        isPublic: false,
        parentTemplateId: template.id,
      };

      return await createTemplate(duplicateData);
    },
    [createTemplate],
  );

  const exportTemplate = useCallback(
    (template: PromptTemplate) => {
      const exportData = {
        name: template.name,
        description: template.description,
        content: template.content,
        category: template.category,
        version: template.version,
        variables: template.variables,
        metadata: template.metadata,
        tags: template.tags,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${template.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Template exported successfully",
      });
    },
    [toast],
  );

  const importTemplate = useCallback(
    async (templateData: any): Promise<PromptTemplate | null> => {
      try {
        const importData: CreatePromptTemplateRequest = {
          name: templateData.name || "Imported Template",
          description: templateData.description,
          content: templateData.content,
          category: templateData.category || "imported",
          variables: templateData.variables,
          metadata: {
            ...templateData.metadata,
            imported: true,
            importedAt: new Date().toISOString(),
          },
          tags: templateData.tags,
          isPublic: false,
        };

        return await createTemplate(importData);
      } catch (error) {
        handleError(error, "import template");
        return null;
      }
    },
    [createTemplate, handleError],
  );

  // Auto-load templates on mount
  useEffect(() => {
    if (autoLoad) {
      loadTemplates();
    }
  }, [autoLoad, loadTemplates]);

  return {
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
    validateTemplate,
    duplicateTemplate,
    exportTemplate,
    importTemplate,
  };
}

export default usePromptTemplates;
