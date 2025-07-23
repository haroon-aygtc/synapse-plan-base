'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  FileText, 
  Globe, 
  Brain,
  Search,
  Zap,
  AlertCircle
} from 'lucide-react';

interface KnowledgeNodeData {
  label: string;
  name: string;
  source: string;
  config?: Record<string, any>;
  status?: 'idle' | 'indexing' | 'ready' | 'error';
  description?: string;
  documentCount?: number;
  lastUpdated?: string;
}

const KNOWLEDGE_ICONS = {
  documents: FileText,
  database: Database,
  api: Globe,
  web: Search,
  default: Brain
};

export const KnowledgeNode = memo(({ data, selected }: NodeProps<KnowledgeNodeData>) => {
  const IconComponent = KNOWLEDGE_ICONS[data.source as keyof typeof KNOWLEDGE_ICONS] || KNOWLEDGE_ICONS.default;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-500';
      case 'indexing':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'ready':
        return <Brain className="h-3 w-3" />;
      case 'indexing':
        return <Zap className="h-3 w-3" />;
      case 'error':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Database className="h-3 w-3" />;
    }
  };

  const getSourceColor = (source: string) => {
    const colors = {
      documents: 'bg-blue-600',
      database: 'bg-green-600',
      api: 'bg-purple-600',
      web: 'bg-orange-600',
      default: 'bg-gray-600'
    };
    return colors[source as keyof typeof colors] || colors.default;
  };

  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <Card className={`min-w-[200px] ${selected ? 'ring-2 ring-primary' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-green-500"
      />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 ${getSourceColor(data.source)} rounded-lg text-white`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{data.name}</h3>
              <p className="text-xs text-muted-foreground capitalize">{data.source}</p>
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

        <div className="space-y-1">
          {data.documentCount !== undefined && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Documents:</span>
              <Badge variant="outline" className="text-xs">
                {data.documentCount.toLocaleString()}
              </Badge>
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Updated:</span>
            <span className="text-xs">
              {formatLastUpdated(data.lastUpdated)}
            </span>
          </div>
        </div>

        {data.config && Object.keys(data.config).length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium">Configuration:</div>
            <div className="space-y-1">
              {Object.entries(data.config).slice(0, 2).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{key}:</span>
                  <Badge variant="outline" className="text-xs ml-1">
                    {String(value).length > 8 ? `${String(value).slice(0, 8)}...` : String(value)}
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
        className="w-3 h-3 !bg-green-500"
      />
    </Card>
  );
});

KnowledgeNode.displayName = 'KnowledgeNode';