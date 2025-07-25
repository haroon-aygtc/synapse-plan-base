"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Pause,
  Play,
  Trash2,
  Download,
  Filter,
  Wifi,
  WifiOff,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface StreamingEvent {
  id: string;
  timestamp: Date;
  type: string;
  providerId?: string;
  providerType?: string;
  executionId?: string;
  data: any;
  level: "info" | "warning" | "error" | "success";
}

const EVENT_TYPES = {
  "provider.selected": {
    label: "Provider Selected",
    icon: "🎯",
    level: "info" as const,
  },
  "provider.switched": {
    label: "Provider Switched",
    icon: "🔄",
    level: "warning" as const,
  },
  "provider.error": {
    label: "Provider Error",
    icon: "❌",
    level: "error" as const,
  },
  "provider.complete": {
    label: "Provider Complete",
    icon: "✅",
    level: "success" as const,
  },
  text_chunk: { label: "Text Chunk", icon: "📝", level: "info" as const },
  stream_start: { label: "Stream Start", icon: "▶️", level: "info" as const },
  stream_end: { label: "Stream End", icon: "⏹️", level: "info" as const },
  fallback_triggered: {
    label: "Fallback Triggered",
    icon: "🔀",
    level: "warning" as const,
  },
  circuit_breaker_open: {
    label: "Circuit Breaker Open",
    icon: "⚡",
    level: "error" as const,
  },
  rate_limit_hit: {
    label: "Rate Limit Hit",
    icon: "⏱️",
    level: "warning" as const,
  },
};

export function StreamingEventsConsole() {
  const [events, setEvents] = useState<StreamingEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [maxEvents, setMaxEvents] = useState(1000);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // WebSocket subscription for real-time events
  useWebSocketSubscription("ai.provider.*", (event) => {
    if (isPaused) return;

    const streamingEvent: StreamingEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: event.type,
      providerId: event.data?.providerId,
      providerType: event.data?.providerType,
      executionId: event.data?.executionId,
      data: event.data,
      level: getEventLevel(event.type),
    };

    setEvents((prev) => {
      const newEvents = [streamingEvent, ...prev];
      return newEvents.slice(0, maxEvents);
    });

    setIsConnected(true);
  });

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [events, autoScroll]);

  // Simulate connection status
  useEffect(() => {
    const interval = setInterval(() => {
      // In a real implementation, this would check actual WebSocket connection
      setIsConnected(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getEventLevel = (
    eventType: string,
  ): "info" | "warning" | "error" | "success" => {
    const eventConfig = EVENT_TYPES[eventType as keyof typeof EVENT_TYPES];
    return eventConfig?.level || "info";
  };

  const getEventIcon = (eventType: string) => {
    const eventConfig = EVENT_TYPES[eventType as keyof typeof EVENT_TYPES];
    return eventConfig?.icon || "📡";
  };

  const getEventLabel = (eventType: string) => {
    const eventConfig = EVENT_TYPES[eventType as keyof typeof EVENT_TYPES];
    return eventConfig?.label || eventType;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "success":
        return "text-green-600 bg-green-50 border-green-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  const filteredEvents = events.filter((event) => {
    if (filterType !== "all" && event.type !== filterType) return false;
    if (filterLevel !== "all" && event.level !== filterLevel) return false;
    return true;
  });

  const clearEvents = () => {
    setEvents([]);
    toast({
      title: "Events Cleared",
      description: "All streaming events have been cleared from the console.",
    });
  };

  const exportEvents = () => {
    const exportData = {
      events: filteredEvents,
      exportedAt: new Date().toISOString(),
      totalEvents: events.length,
      filteredEvents: filteredEvents.length,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `streaming-events-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Events Exported",
      description: "Streaming events have been exported as JSON file.",
    });
  };

  const formatEventData = (data: any) => {
    if (!data) return "No data";

    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getProviderIcon = (providerType?: string) => {
    if (!providerType) return "🔧";

    switch (providerType.toLowerCase()) {
      case "openai":
        return "🤖";
      case "claude":
        return "🧠";
      case "gemini":
        return "💎";
      case "mistral":
        return "🌪️";
      case "groq":
        return "⚡";
      case "openrouter":
        return "🔀";
      default:
        return "🔧";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Streaming Events Console</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of AI provider events and streaming responses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={isConnected ? "default" : "destructive"}
            className="flex items-center gap-1"
          >
            {isConnected ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Console Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {/* Pause/Resume */}
            <div className="flex items-center space-x-2">
              <Switch
                id="pause"
                checked={!isPaused}
                onCheckedChange={(checked: boolean) => setIsPaused(!checked)}
              />
              <Label htmlFor="pause" className="flex items-center gap-2">
                {isPaused ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isPaused ? "Paused" : "Live"}
              </Label>
            </div>

            {/* Auto Scroll */}
            <div className="flex items-center space-x-2">
              <Switch
                id="autoscroll"
                checked={autoScroll}
                onCheckedChange={setAutoScroll}
              />
              <Label htmlFor="autoscroll">Auto Scroll</Label>
            </div>

            {/* Event Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Event Types</SelectItem>
                  {Object.entries(EVENT_TYPES).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      {config.icon} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level Filter */}
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            {/* Actions */}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={exportEvents}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={clearEvents}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm text-muted-foreground">
            <span>Total Events: {events.length}</span>
            <span>Filtered: {filteredEvents.length}</span>
            <span>Max Events: {maxEvents}</span>
            {isPaused && (
              <Badge variant="secondary" className="text-xs">
                Paused - Events not being captured
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Live Events Stream
          </CardTitle>
          <CardDescription>
            Real-time AI provider events and streaming responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={containerRef}
            className="h-96 overflow-y-auto space-y-2 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border"
          >
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Events</h3>
                <p className="text-muted-foreground">
                  {isPaused
                    ? "Event capture is paused. Resume to see live events."
                    : "Waiting for AI provider events..."}
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    "p-3 rounded-lg border text-sm",
                    getLevelColor(event.level),
                  )}
                >
                  {/* Event Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {getEventIcon(event.type)}
                      </span>
                      <span className="font-medium">
                        {getEventLabel(event.type)}
                      </span>
                      {event.providerType && (
                        <div className="flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          <span>{getProviderIcon(event.providerType)}</span>
                          <span className="text-xs">{event.providerType}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {event.timestamp.toLocaleTimeString()}
                    </div>
                  </div>

                  {/* Event Details */}
                  {event.executionId && (
                    <div className="text-xs text-muted-foreground mb-1">
                      Execution ID: {event.executionId}
                    </div>
                  )}

                  {/* Event Data */}
                  {event.data && Object.keys(event.data).length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium mb-1">
                        Event Data
                      </summary>
                      <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded border overflow-x-auto">
                        {formatEventData(event.data)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
            <div ref={eventsEndRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
