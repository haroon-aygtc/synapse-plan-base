'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Settings, Zap } from 'lucide-react';

interface AgentNodeData {
  label: string;
  name: string;
  model: string;
  temperature: number;
  prompt: string;
  status?: 'idle' | 'running' | 'error';
}

export const AgentNode = memo(({ data, selected }: NodeProps<AgentNodeData>) => {
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
        return <Settings className="h-3 w-3" />;
      default:
        return <Bot className="h-3 w-3" />;
    }
  };

  return (
    <Card className={`min-w-[200px] ${selected ? 'ring-2 ring-primary' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500"
      />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-500 rounded-lg text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{data.name}</h3>
              <p className="text-xs text-muted-foreground">{data.model}</p>
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${getStatusColor(data.status)}`} />
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Temperature:</span>
          <Badge variant="outline" className="text-xs">
            {data.temperature}
          </Badge>
        </div>
        
        <div className="text-xs text-muted-foreground line-clamp-2">
          {data.prompt || 'No prompt configured'}
        </div>

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
        className="w-3 h-3 !bg-blue-500"
      />
    </Card>
  );
});

AgentNode.displayName = 'AgentNode';