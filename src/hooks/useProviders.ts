import { useState, useEffect, useCallback } from 'react';
import {
  providerAPI,
  AIProvider,
  ProviderHealthResponse,
  CostAnalytics,
  UsageStats,
  RoutingRule,
  OptimizationSuggestions,
} from '@/lib/provider-api';
import { useWebSocketSubscription } from './useWebSocketSubscription';
import { toast } from '@/components/ui/use-toast';

export function useProviders() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async (includeInactive = false) => {
    try {
      setLoading(true);
      const data = await providerAPI.getProviders(includeInactive);
      setProviders(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch providers');
      toast({
        title: 'Error',
        description: 'Failed to fetch AI providers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const createProvider = useCallback(
    async (data: Parameters<typeof providerAPI.createProvider>[0]) => {
      try {
        const newProvider = await providerAPI.createProvider(data);
        setProviders((prev) => [...prev, newProvider]);
        toast({
          title: 'Success',
          description: 'AI provider created successfully',
        });
        return newProvider;
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err.message || 'Failed to create provider',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [],
  );

  const updateProvider = useCallback(
    async (
      id: string,
      data: Parameters<typeof providerAPI.updateProvider>[1],
    ) => {
      try {
        const updatedProvider = await providerAPI.updateProvider(id, data);
        setProviders((prev) =>
          prev.map((p) => (p.id === id ? updatedProvider : p)),
        );
        toast({
          title: 'Success',
          description: 'AI provider updated successfully',
        });
        return updatedProvider;
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err.message || 'Failed to update provider',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [],
  );

  const deleteProvider = useCallback(async (id: string) => {
    try {
      await providerAPI.deleteProvider(id);
      setProviders((prev) => prev.filter((p) => p.id !== id));
      toast({
        title: 'Success',
        description: 'AI provider deleted successfully',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete provider',
        variant: 'destructive',
      });
      throw err;
    }
  }, []);

  const testProvider = useCallback(async (id: string) => {
    try {
      const result = await providerAPI.testProvider(id);
      if (result.success) {
        toast({
          title: 'Success',
          description: `Provider test successful (${result.responseTime}ms)`,
        });
      } else {
        toast({
          title: 'Test Failed',
          description: result.error || 'Provider test failed',
          variant: 'destructive',
        });
      }
      return result;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to test provider',
        variant: 'destructive',
      });
      throw err;
    }
  }, []);

  const rotateApiKey = useCallback(async (id: string, newApiKey: string) => {
    try {
      const updatedProvider = await providerAPI.rotateApiKey(id, newApiKey);
      setProviders((prev) =>
        prev.map((p) => (p.id === id ? updatedProvider : p)),
      );
      toast({
        title: 'Success',
        description: 'API key rotated successfully',
      });
      return updatedProvider;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to rotate API key',
        variant: 'destructive',
      });
      throw err;
    }
  }, []);

  // Real-time updates via WebSocket
  useWebSocketSubscription('ai.provider.*', (event) => {
    switch (event.type) {
      case 'ai.provider.created':
        fetchProviders();
        break;
      case 'ai.provider.updated':
        fetchProviders();
        break;
      case 'ai.provider.deleted':
        setProviders((prev) =>
          prev.filter((p) => p.id !== event.data.providerId),
        );
        break;
      case 'ai.provider.health.check':
        setProviders((prev) =>
          prev.map((p) => {
            if (p.id === event.data.providerId) {
              return {
                ...p,
                healthCheck: {
                  ...p.healthCheck,
                  status: event.data.healthStatus,
                  responseTime: event.data.responseTime,
                  errorRate: event.data.errorRate,
                  uptime: event.data.uptime,
                  lastCheck: new Date(),
                },
              };
            }
            return p;
          }),
        );
        break;
    }
  });

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return {
    providers,
    loading,
    error,
    fetchProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider,
    rotateApiKey,
  };
}

export function useProviderHealth() {
  const [health, setHealth] = useState<ProviderHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      const data = await providerAPI.getProviderHealth();
      setHealth(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch provider health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return { health, loading, error, refetch: fetchHealth };
}

export function useProviderCosts() {
  const [costs, setCosts] = useState<CostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCosts = useCallback(
    async (startDate?: string, endDate?: string) => {
      try {
        setLoading(true);
        const data = await providerAPI.getCostAnalytics(startDate, endDate);
        setCosts(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch cost analytics');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  return { costs, loading, error, refetch: fetchCosts };
}

export function useProviderUsage() {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(
    async (period: 'day' | 'week' | 'month' = 'week') => {
      try {
        setLoading(true);
        const data = await providerAPI.getUsageStats(period);
        setUsage(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch usage stats');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return { usage, loading, error, refetch: fetchUsage };
}

export function useProviderRouting() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await providerAPI.getRoutingRules();
      setRules(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch routing rules');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRule = useCallback(async (rule: Omit<RoutingRule, 'id'>) => {
    try {
      const newRule = await providerAPI.createRoutingRule(rule);
      setRules((prev) => [...prev, newRule]);
      toast({
        title: 'Success',
        description: 'Routing rule created successfully',
      });
      return newRule;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to create routing rule',
        variant: 'destructive',
      });
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return { rules, loading, error, fetchRules, createRule };
}

export function useProviderOptimization() {
  const [suggestions, setSuggestions] =
    useState<OptimizationSuggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await providerAPI.getOptimizationSuggestions();
      setSuggestions(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch optimization suggestions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  return { suggestions, loading, error, refetch: fetchSuggestions };
}
