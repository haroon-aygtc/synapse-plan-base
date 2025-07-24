import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { api } from '@/lib/api';
import { Widget, WidgetConfiguration } from '@/lib/sdk/types';

export interface UseWidgetsOptions {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'agent' | 'tool' | 'workflow';
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface WidgetAnalytics {
  widgetId: string;
  period: { start: Date; end: Date };
  metrics: {
    totalViews: number;
    uniqueVisitors: number;
    interactions: number;
    conversions: number;
    averageSessionDuration: number;
    bounceRate: number;
  };
  trends: Array<{
    date: string;
    views: number;
    interactions: number;
    conversions: number;
  }>;
  topPages: Array<{
    url: string;
    views: number;
    interactions: number;
  }>;
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  browserBreakdown: Record<string, number>;
  geographicData: Array<{
    country: string;
    views: number;
    interactions: number;
  }>;
}

export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'agent' | 'tool' | 'workflow';
  configuration: WidgetConfiguration;
  preview: {
    image: string;
    demoUrl: string;
  };
  tags: string[];
  rating: number;
  downloads: number;
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetTestResult {
  success: boolean;
  performance: {
    loadTime: number;
    renderTime: number;
    interactionTime: number;
  };
  compatibility: {
    browsers: Record<string, boolean>;
    devices: Record<string, boolean>;
    frameworks: Record<string, boolean>;
  };
  accessibility: {
    score: number;
    issues: Array<{
      level: 'error' | 'warning' | 'info';
      message: string;
      element?: string;
    }>;
  };
  seo: {
    score: number;
    recommendations: string[];
  };
  errors: string[];
  warnings: string[];
}

export const useWidgets = (options: UseWidgetsOptions = {}) => {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchWidgets = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.search) params.append('search', options.search);
      if (options.type) params.append('type', options.type);
      if (options.isActive !== undefined)
        params.append('isActive', options.isActive.toString());
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);

      const response = await api.get(`/widgets?${params.toString()}`);

      if (response.data.success) {
        setWidgets(response.data.data);
        setPagination(response.data.pagination);
      } else {
        throw new Error(response.data.message || 'Failed to fetch widgets');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch widgets');
      console.error('Error fetching widgets:', err);
    } finally {
      setLoading(false);
    }
  }, [user, options]);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  const createWidget = useCallback(
    async (widgetData: {
      name: string;
      description?: string;
      type: 'agent' | 'tool' | 'workflow';
      sourceId: string;
      configuration: WidgetConfiguration;
      isActive?: boolean;
    }) => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.post('/widgets', widgetData);

        if (response.data.success) {
          await fetchWidgets(); // Refresh the list
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to create widget');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to create widget');
        console.error('Error creating widget:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchWidgets],
  );

  const updateWidget = useCallback(
    async (
      id: string,
      updates: Partial<{
        name: string;
        description: string;
        configuration: Partial<WidgetConfiguration>;
        isActive: boolean;
      }>,
    ) => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.put(`/widgets/${id}`, updates);

        if (response.data.success) {
          await fetchWidgets(); // Refresh the list
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to update widget');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to update widget');
        console.error('Error updating widget:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchWidgets],
  );

  const deleteWidget = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.delete(`/widgets/${id}`);

        if (response.data.success) {
          await fetchWidgets(); // Refresh the list
          return true;
        } else {
          throw new Error(response.data.message || 'Failed to delete widget');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to delete widget');
        console.error('Error deleting widget:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchWidgets],
  );

  const deployWidget = useCallback(
    async (
      id: string,
      deploymentOptions: {
        environment?: 'staging' | 'production';
        customDomain?: string;
        enableAnalytics?: boolean;
        enableCaching?: boolean;
      } = {},
    ) => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.post(
          `/widgets/${id}/deploy`,
          deploymentOptions,
        );

        if (response.data.success) {
          await fetchWidgets(); // Refresh the list
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to deploy widget');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to deploy widget');
        console.error('Error deploying widget:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchWidgets],
  );

  const undeployWidget = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.post(`/widgets/${id}/undeploy`);

        if (response.data.success) {
          await fetchWidgets(); // Refresh the list
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to undeploy widget');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to undeploy widget');
        console.error('Error undeploying widget:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchWidgets],
  );

  const generateEmbedCode = useCallback(
    async (
      id: string,
      options: {
        format?: 'javascript' | 'iframe' | 'react' | 'vue' | 'angular';
        containerId?: string;
        width?: string;
        height?: string;
        responsive?: boolean;
        theme?: Record<string, any>;
      } = {},
    ) => {
      setError(null);

      try {
        const response = await api.post(`/widgets/${id}/embed-code`, options);

        if (response.data.success) {
          return response.data.data;
        } else {
          throw new Error(
            response.data.message || 'Failed to generate embed code',
          );
        }
      } catch (err: any) {
        setError(err.message || 'Failed to generate embed code');
        console.error('Error generating embed code:', err);
        throw err;
      }
    },
    [],
  );

  const testWidget = useCallback(
    async (
      id: string,
      testOptions: {
        browsers?: string[];
        devices?: string[];
        checkAccessibility?: boolean;
        checkPerformance?: boolean;
        checkSEO?: boolean;
      } = {},
    ): Promise<WidgetTestResult> => {
      setError(null);

      try {
        const response = await api.post(`/widgets/${id}/test`, testOptions);

        if (response.data.success) {
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to test widget');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to test widget');
        console.error('Error testing widget:', err);
        throw err;
      }
    },
    [],
  );

  const previewWidget = useCallback(
    async (
      id: string,
      previewOptions: {
        device?: 'desktop' | 'mobile' | 'tablet';
        theme?: Record<string, any>;
        mockData?: Record<string, any>;
      } = {},
    ) => {
      setError(null);

      try {
        const response = await api.post(
          `/widgets/${id}/preview`,
          previewOptions,
        );

        if (response.data.success) {
          return response.data.data;
        } else {
          throw new Error(
            response.data.message || 'Failed to generate preview',
          );
        }
      } catch (err: any) {
        setError(err.message || 'Failed to generate preview');
        console.error('Error generating preview:', err);
        throw err;
      }
    },
    [],
  );

  const cloneWidget = useCallback(
    async (
      id: string,
      cloneData: {
        name: string;
        configuration?: Partial<WidgetConfiguration>;
      },
    ) => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.post(`/widgets/${id}/clone`, cloneData);

        if (response.data.success) {
          await fetchWidgets(); // Refresh the list
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to clone widget');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to clone widget');
        console.error('Error cloning widget:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchWidgets],
  );

  const getWidgetAnalytics = useCallback(
    async (
      id: string,
      period: {
        start: Date;
        end: Date;
      },
    ): Promise<WidgetAnalytics> => {
      setError(null);

      try {
        const params = new URLSearchParams({
          start: period.start.toISOString(),
          end: period.end.toISOString(),
        });

        const response = await api.get(
          `/widgets/${id}/analytics?${params.toString()}`,
        );

        if (response.data.success) {
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to fetch analytics');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch analytics');
        console.error('Error fetching analytics:', err);
        throw err;
      }
    },
    [],
  );

  const exportAnalytics = useCallback(
    async (
      id: string,
      period: {
        start: Date;
        end: Date;
      },
      format: 'csv' | 'json' | 'xlsx' = 'csv',
    ) => {
      setError(null);

      try {
        const params = new URLSearchParams({
          start: period.start.toISOString(),
          end: period.end.toISOString(),
          format,
        });

        const response = await api.get(
          `/widgets/${id}/analytics/export?${params.toString()}`,
          {
            responseType: 'blob',
          },
        );

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute(
          'download',
          `widget-analytics-${id}-${Date.now()}.${format}`,
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err: any) {
        setError(err.message || 'Failed to export analytics');
        console.error('Error exporting analytics:', err);
        throw err;
      }
    },
    [],
  );

  const getWidget = useCallback(async (id: string): Promise<Widget> => {
    setError(null);

    try {
      const response = await api.get(`/widgets/${id}`);

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch widget');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch widget');
      console.error('Error fetching widget:', err);
      throw err;
    }
  }, []);

  return {
    widgets,
    loading,
    error,
    pagination,
    fetchWidgets,
    createWidget,
    updateWidget,
    deleteWidget,
    deployWidget,
    undeployWidget,
    generateEmbedCode,
    testWidget,
    previewWidget,
    cloneWidget,
    getWidgetAnalytics,
    exportAnalytics,
    getWidget,
  };
};

export const useWidgetTemplates = () => {
  const [templates, setTemplates] = useState<WidgetTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchTemplates = useCallback(
    async (
      options: {
        page?: number;
        limit?: number;
        category?: string;
        type?: 'agent' | 'tool' | 'workflow';
        search?: string;
        sortBy?: string;
        sortOrder?: 'ASC' | 'DESC';
      } = {},
    ) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (options.page) params.append('page', options.page.toString());
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.category) params.append('category', options.category);
        if (options.type) params.append('type', options.type);
        if (options.search) params.append('search', options.search);
        if (options.sortBy) params.append('sortBy', options.sortBy);
        if (options.sortOrder) params.append('sortOrder', options.sortOrder);

        const response = await api.get(
          `/widgets/templates?${params.toString()}`,
        );

        if (response.data.success) {
          setTemplates(response.data.data);
          setPagination(response.data.pagination);
        } else {
          throw new Error(response.data.message || 'Failed to fetch templates');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch templates');
        console.error('Error fetching templates:', err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getTemplate = useCallback(
    async (templateId: string): Promise<WidgetTemplate> => {
      setError(null);

      try {
        const response = await api.get(`/widgets/templates/${templateId}`);

        if (response.data.success) {
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to fetch template');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch template');
        console.error('Error fetching template:', err);
        throw err;
      }
    },
    [],
  );

  const createFromTemplate = useCallback(
    async (
      templateId: string,
      widgetData: {
        name: string;
        sourceId: string;
        configuration?: Partial<WidgetConfiguration>;
      },
    ) => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.post(
          `/widgets/templates/${templateId}/create`,
          widgetData,
        );

        if (response.data.success) {
          return response.data.data;
        } else {
          throw new Error(
            response.data.message || 'Failed to create widget from template',
          );
        }
      } catch (err: any) {
        setError(err.message || 'Failed to create widget from template');
        console.error('Error creating widget from template:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const publishAsTemplate = useCallback(
    async (
      widgetId: string,
      templateData: {
        name: string;
        description: string;
        category: string;
        tags: string[];
        isPublic?: boolean;
      },
    ) => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.post(
          `/widgets/${widgetId}/publish-template`,
          templateData,
        );

        if (response.data.success) {
          return response.data.data;
        } else {
          throw new Error(
            response.data.message || 'Failed to publish template',
          );
        }
      } catch (err: any) {
        setError(err.message || 'Failed to publish template');
        console.error('Error publishing template:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    templates,
    loading,
    error,
    pagination,
    fetchTemplates,
    getTemplate,
    createFromTemplate,
    publishAsTemplate,
  };
};
