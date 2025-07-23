'use client';

import { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { Badge } from '@/components/ui/badge';

interface CustomEdgeData {
  label?: string;
  condition?: string;
  animated?: boolean;
  status?: 'active' | 'inactive' | 'error';
}

export const CustomEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}: EdgeProps<CustomEdgeData>) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const getEdgeColor = (status?: string) => {
    switch (status) {
      case 'active':
        return '#10b981'; // green
      case 'error':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getEdgeWidth = (status?: string) => {
    return status === 'active' ? 3 : 2;
  };

  return (
    <>
      <path
        id={id}
        style={{
          ...style,
          stroke: getEdgeColor(data?.status),
          strokeWidth: getEdgeWidth(data?.status),
          strokeDasharray: data?.animated ? '5,5' : 'none',
          animation: data?.animated ? 'dash 1s linear infinite' : 'none',
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {(data?.label || data?.condition) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <Badge 
              variant="secondary" 
              className="bg-white border shadow-sm text-xs"
            >
              {data.label || data.condition}
            </Badge>
          </div>
        </EdgeLabelRenderer>
      )}
      
      <style jsx>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -10;
          }
        }
      `}</style>
    </>
  );
});

CustomEdge.displayName = 'CustomEdge';