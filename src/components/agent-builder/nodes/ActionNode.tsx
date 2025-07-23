'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Send, 
  Save, 
  Trash2, 
  Edit,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Zap,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface ActionNodeData {
  label: string;
  name: string;
  actionType: string;
  config?: Record<string, any>;
  status?: 'idle' | 'running' | 'completed' | 'failed';
  description?: string;
  lastExecution?: {
    success: boolean;
    timestamp: string;
    executionTime: number;
    output?: any;
    error?: string;
  };
}

const ACTION_ICONS = {
  send: Send,
  save: Save,
  delete: Trash2,
  edit: Edit,
  copy: Copy,
  download: Download,
  upload: Upload,
  refresh: RefreshCw,
  execute: Play,
  default: Play
};

export const ActionNode = memo(({ data, selected }: NodeProps<ActionNodeData>) => {
  const IconComponent = ACTION_ICONS[data.actionType as keyof typeof ACTION_ICONS] || ACTION_ICONS.default;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'running':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'running':
        return <Zap className="h-3 w-3" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Play className="h-3 w-3" />;
    }
  };

  const getActionColor = (type: string) => {
    const colors = {
      send: 'bg-blue-500',
      save: 'bg-green-500',
      delete: 'bg-red-500',
      edit: 'bg-yellow-500',
      copy: 'bg-purple-500',
      download: 'bg-indigo-500',
      upload: 'bg-orange-500',
      refresh: 'bg-teal-500',
      execute: 'bg-gray-500',
      default: 'bg-green-500'
    };
    return colors[type as keyof typeof colors] || colors.default;
  };

  const formatLastExecution = (execution?: ActionNodeData['lastExecution']) => {
    if (!execution) return 'Never';
    const date = new Date(execution.timestamp);
    const status = execution.success ? 'SUCCESS' : 'FAILED';
    return `${status} (${date.toLocaleTimeString()})`;
  };

  return (
    <Card className={`min-w-[180px] ${selected ? 'ring-2 ring-primary' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-green-500"
      />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 ${getActionColor(data.actionType)} rounded-lg text-white`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{data.name}</h3>
              <p className="text-xs text-muted-foreground capitalize">{data.actionType}</p>
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${getStatusColor(data.status)}`} />
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {data.description && (
          <div className="text-xs text-muted-foreground line-clamp-2">
            {data.description}
          </div>
        )}

        {data.config && Object.keys(data.config).length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium">Configuration:</div>
            <div className="space-y-1">
              {Object.entries(data.config).slice(0, 2).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{key}:</span>
                  <Badge variant="outline" className="text-xs ml-1">
                    {String(value).length > 10 ? `${String(value).slice(0, 10)}...` : String(value)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.lastExecution && (
          <div className="space-y-1">
            <div className="text-xs font-medium">Last Execution:</div>
            <div className="text-xs text-muted-foreground">
              {formatLastExecution(data.lastExecution)}
            </div>
            <div className="text-xs text-muted-foreground">
              Duration: {data.lastExecution.executionTime}ms
            </div>
            {data.lastExecution.error && (
              <div className="text-xs text-red-500 truncate">
                Error: {data.lastExecution.error}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center space-x-1 pt-1">
          <div className={`p-1 rounded ${getStatusColor(data.status)} text-white`}>
            {getStatusIcon(data.status)}
          </div>
          <span className="text-xs capitalize">
            {data.status || 'idle'}
          </span>
        </div>
      </CardContent>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500"
      />
    </Card>
  );
});

ActionNode.displayName = 'ActionNode';