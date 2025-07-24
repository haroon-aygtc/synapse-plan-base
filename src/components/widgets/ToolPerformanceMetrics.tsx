'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Clock, Zap, TrendingUp, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  totalExecutions: number;
  errorRate: number;
  throughput: number;
  uptime: number;
}

interface ToolPerformanceMetricsProps {
  sourceId: string;
  sourceType: 'agent' | 'tool' | 'workflow';
}

export function ToolPerformanceMetrics({
  sourceId,
  sourceType,
}: ToolPerformanceMetricsProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [sourceId, sourceType]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/${sourceType}s/${sourceId}/metrics`);
      if (response.data.success) {
        setMetrics(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No metrics available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Performance Metrics
        </CardTitle>
        <CardDescription>
          Real-time performance data for this {sourceType}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Response Time</span>
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {metrics.averageResponseTime}ms
              </Badge>
            </div>
            <Progress value={Math.min(metrics.averageResponseTime / 10, 100)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Success Rate</span>
              <Badge
                variant={metrics.successRate > 95 ? 'default' : 'destructive'}
              >
                {metrics.successRate.toFixed(1)}%
              </Badge>
            </div>
            <Progress value={metrics.successRate} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Throughput</span>
              <Badge variant="outline">
                <Zap className="h-3 w-3 mr-1" />
                {metrics.throughput}/min
              </Badge>
            </div>
            <Progress value={Math.min(metrics.throughput / 10, 100)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Uptime</span>
              <Badge variant={metrics.uptime > 99 ? 'default' : 'secondary'}>
                <TrendingUp className="h-3 w-3 mr-1" />
                {metrics.uptime.toFixed(2)}%
              </Badge>
            </div>
            <Progress value={metrics.uptime} />
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span>Total Executions</span>
            <span className="font-medium">
              {metrics.totalExecutions.toLocaleString()}
            </span>
          </div>
          {metrics.errorRate > 0 && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="flex items-center gap-1 text-red-600">
                <AlertCircle className="h-3 w-3" />
                Error Rate
              </span>
              <span className="font-medium text-red-600">
                {metrics.errorRate.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
