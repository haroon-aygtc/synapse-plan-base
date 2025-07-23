'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  GitBranch, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Code,
  Hash,
  Type,
  Calendar
} from 'lucide-react';

interface ConditionNodeData {
  label: string;
  name: string;
  conditionType: string;
  operator: string;
  value: any;
  status?: 'idle' | 'evaluating' | 'true' | 'false' | 'error';
  description?: string;
  lastEvaluation?: {
    result: boolean;
    timestamp: string;
    executionTime: number;
  };
}

const CONDITION_ICONS = {
  comparison: Hash,
  string: Type,
  boolean: CheckCircle,
  date: Calendar,
  custom: Code,
  default: GitBranch
};

const OPERATORS = {
  '==': 'equals',
  '!=': 'not equals',
  '>': 'greater than',
  '<': 'less than',
  '>=': 'greater or equal',
  '<=': 'less or equal',
  'contains': 'contains',
  'startsWith': 'starts with',
  'endsWith': 'ends with',
  'matches': 'matches regex',
  'in': 'in array',
  'exists': 'exists'
};

export const ConditionNode = memo(({ data, selected }: NodeProps<ConditionNodeData>) => {
  const IconComponent = CONDITION_ICONS[data.conditionType as keyof typeof CONDITION_ICONS] || CONDITION_ICONS.default;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'true':
        return 'bg-green-500';
      case 'false':
        return 'bg-red-500';
      case 'evaluating':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'true':
        return <CheckCircle className="h-3 w-3" />;
      case 'false':
        return <XCircle className="h-3 w-3" />;
      case 'evaluating':
        return <AlertTriangle className="h-3 w-3" />;
      case 'error':
        return <XCircle className="h-3 w-3" />;
      default:
        return <GitBranch className="h-3 w-3" />;
    }
  };

  const getConditionColor = (type: string) => {
    const colors = {
      comparison: 'bg-purple-500',
      string: 'bg-blue-500',
      boolean: 'bg-green-500',
      date: 'bg-indigo-500',
      custom: 'bg-gray-500',
      default: 'bg-purple-500'
    };
    return colors[type as keyof typeof colors] || colors.default;
  };

  const formatValue = (value: any) => {
    if (typeof value === 'string' && value.length > 15) {
      return `"${value.slice(0, 15)}..."`;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value).slice(0, 20) + '...';
    }
    return String(value);
  };

  const formatLastEvaluation = (evaluation?: ConditionNodeData['lastEvaluation']) => {
    if (!evaluation) return 'Never';
    const date = new Date(evaluation.timestamp);
    return `${evaluation.result ? 'TRUE' : 'FALSE'} (${date.toLocaleTimeString()})`;
  };

  return (
    <Card className={`min-w-[200px] ${selected ? 'ring-2 ring-primary' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-purple-500"
      />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 ${getConditionColor(data.conditionType)} rounded-lg text-white`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{data.name}</h3>
              <p className="text-xs text-muted-foreground capitalize">{data.conditionType}</p>
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
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Operator:</span>
            <Badge variant="outline" className="text-xs">
              {OPERATORS[data.operator as keyof typeof OPERATORS] || data.operator}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Value:</span>
            <Badge variant="outline" className="text-xs">
              {formatValue(data.value)}
            </Badge>
          </div>
        </div>

        {data.lastEvaluation && (
          <div className="space-y-1">
            <div className="text-xs font-medium">Last Evaluation:</div>
            <div className="text-xs text-muted-foreground">
              {formatLastEvaluation(data.lastEvaluation)}
            </div>
            <div className="text-xs text-muted-foreground">
              Execution: {data.lastEvaluation.executionTime}ms
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

      {/* True path */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="w-3 h-3 !bg-green-500"
        style={{ left: '25%' }}
      />
      
      {/* False path */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="w-3 h-3 !bg-red-500"
        style={{ left: '75%' }}
      />
    </Card>
  );
});

ConditionNode.displayName = 'ConditionNode';