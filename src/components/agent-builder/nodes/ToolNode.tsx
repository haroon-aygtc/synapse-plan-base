'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Search, 
  Code, 
  Mail, 
  Calendar, 
  Calculator,
  Globe,
  Database,
  FileText,
  Zap,
  AlertCircle
} from 'lucide-react';

interface ToolNodeData {
  label: string;
  name: string;
  type: string;
  config?: Record<string, any>;
  status?: 'idle' | 'running' | 'error';
  description?: string;
}

const TOOL_ICONS = {
  search: Search,
  code: Code,
  email: Mail,
  calendar: Calendar,
  calculator: Calculator,
  api: Globe,
  database: Database,
  documents: FileText,
  default: Settings
};

export const ToolNode = memo(({ data, selected }: NodeProps<ToolNodeData>) => {
  const IconComponent = TOOL_ICONS[data.type as keyof typeof TOOL_ICONS] || TOOL_ICONS.default;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'running':
        return <Zap className="h-3 w-3" />;
      case 'error':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Settings className="h-3 w-3" />;
    }
  };

  const getToolColor = (type: string) => {
    const colors = {
      search: 'bg-orange-500',
      code: 'bg-gray-500',
      email: 'bg-red-500',
      calendar: 'bg-indigo-500',
      calculator: 'bg-teal-500',
      api: 'bg-purple-500',
      database: 'bg-green-600',
      documents: 'bg-blue-600',
      default: 'bg-gray-500'
    };
    return colors[type as keyof typeof colors] || colors.default;
  };

  return (
    <Card className={`min-w-[180px] ${selected ? 'ring-2 ring-primary' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-orange-500"
      />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 ${getToolColor(data.type)} rounded-lg text-white`}>
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

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-orange-500"
      />
    </Card>
  );
});

ToolNode.displayName = 'ToolNode';