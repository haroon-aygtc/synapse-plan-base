'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Clock, 
  MessageSquare, 
  Webhook,
  Calendar,
  Mail,
  FileText,
  User,
  AlertCircle
} from 'lucide-react';

interface TriggerNodeData {
  label: string;
  name: string;
  type: string;
  config?: Record<string, any>;
  status?: 'idle' | 'active' | 'error';
  description?: string;
  lastTriggered?: string;
}

const TRIGGER_ICONS = {
  webhook: Webhook,
  schedule: Clock,
  message: MessageSquare,
  email: Mail,
  file: FileText,
  user: User,
  event: Zap,
  default: Zap
};

export const TriggerNode = memo(({ data, selected }: NodeProps<TriggerNodeData>) => {
  const IconComponent = TRIGGER_ICONS[data.type as keyof typeof TRIGGER_ICONS] || TRIGGER_ICONS.default;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <Zap className="h-3 w-3" />;
      case 'error':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getTriggerColor = (type: string) => {
    const colors = {
      webhook: 'bg-yellow-500',
      schedule: 'bg-blue-500',
      message: 'bg-green-500',
      email: 'bg-red-500',
      file: 'bg-purple-500',
      user: 'bg-indigo-500',
      event: 'bg-orange-500',
      default: 'bg-yellow-500'
    };
    return colors[type as keyof typeof colors] || colors.default;
  };

  const formatLastTriggered = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className={`min-w-[180px] ${selected ? 'ring-2 ring-primary' : ''}`}>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-yellow-500"
      />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 ${getTriggerColor(data.type)} rounded-lg text-white`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{data.name}</h3>
              <p className="text-xs text-muted-foreground capitalize">{data.type}</p>
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

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Last triggered:</span>
          <span className="text-xs">
            {formatLastTriggered(data.lastTriggered)}
          </span>
        </div>

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

        <div className="flex items-center space-x-1 pt-1">
          <div className={`p-1 rounded ${getStatusColor(data.status)} text-white`}>
            {getStatusIcon(data.status)}
          </div>
          <span className="text-xs capitalize">
            {data.status || 'idle'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
});

TriggerNode.displayName = 'TriggerNode';