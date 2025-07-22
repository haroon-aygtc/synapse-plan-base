'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { wsService, ConnectionState } from '@/lib/websocket';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className,
  showDetails = true,
}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    wsService.getConnectionState(),
  );
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = wsService.onConnectionStateChange((state) => {
      setConnectionState(state);
    });

    return unsubscribe;
  }, []);

  const getStatusConfig = () => {
    switch (connectionState.status) {
      case 'connected':
        return {
          variant: 'default' as const,
          icon: <Wifi className="h-3 w-3" />,
          text: 'Connected',
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
        };
      case 'connecting':
        return {
          variant: 'secondary' as const,
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Connecting',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
        };
      case 'disconnected':
        return {
          variant: 'outline' as const,
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Disconnected',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200',
        };
      case 'error':
        return {
          variant: 'destructive' as const,
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Error',
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200',
        };
      default:
        return {
          variant: 'outline' as const,
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200',
        };
    }
  };

  const handleReconnect = () => {
    wsService.forceReconnect();
    setIsPopoverOpen(false);
  };

  const statusConfig = getStatusConfig();

  const formatLatency = (latency?: number) => {
    if (!latency) return 'N/A';
    return `${latency}ms`;
  };

  const formatUptime = () => {
    if (!connectionState.lastConnected) return 'N/A';
    const now = new Date();
    const connected = connectionState.lastConnected;
    const diffMs = now.getTime() - connected.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  if (!showDetails) {
    return (
      <Badge
        variant={statusConfig.variant}
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium',
          statusConfig.bgColor,
          statusConfig.color,
          className,
        )}
      >
        {statusConfig.icon}
        {statusConfig.text}
      </Badge>
    );
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-2 py-1 hover:bg-muted/50 transition-colors',
            className,
          )}
        >
          <Badge
            variant={statusConfig.variant}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium border-0 px-2 py-1',
              statusConfig.bgColor,
              statusConfig.color,
            )}
          >
            {statusConfig.icon}
            {statusConfig.text}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Connection Status</h4>
            <Badge
              variant={statusConfig.variant}
              className={cn(
                'flex items-center gap-1.5 text-xs',
                statusConfig.bgColor,
                statusConfig.color,
              )}
            >
              {statusConfig.icon}
              {statusConfig.text}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1">Latency</div>
              <div className="font-medium flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {formatLatency(connectionState.latency)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Uptime</div>
              <div className="font-medium">{formatUptime()}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Reconnects</div>
              <div className="font-medium">
                {connectionState.reconnectAttempts}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Last Connected</div>
              <div className="font-medium text-xs">
                {connectionState.lastConnected
                  ? connectionState.lastConnected.toLocaleTimeString()
                  : 'Never'}
              </div>
            </div>
          </div>

          {connectionState.status !== 'connected' && (
            <div className="pt-2 border-t">
              <Button
                onClick={handleReconnect}
                size="sm"
                className="w-full flex items-center gap-2"
                disabled={connectionState.status === 'connecting'}
              >
                <RefreshCw
                  className={cn(
                    'h-3 w-3',
                    connectionState.status === 'connecting' && 'animate-spin',
                  )}
                />
                {connectionState.status === 'connecting'
                  ? 'Connecting...'
                  : 'Reconnect'}
              </Button>
            </div>
          )}

          <div className="text-xs text-muted-foreground pt-2 border-t">
            Real-time connection to SynapseAI services
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ConnectionStatus;
