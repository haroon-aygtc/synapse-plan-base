'use client';

import { useEffect, useRef, useCallback } from 'react';
import { wsService, SubscriptionOptions } from '@/lib/websocket';
import { useAuth } from './useAuth';

export interface UseWebSocketSubscriptionOptions extends SubscriptionOptions {
  enabled?: boolean;
  dependencies?: any[];
}

/**
 * Custom hook for managing WebSocket event subscriptions with automatic cleanup
 */
export function useWebSocketSubscription(
  eventType: string,
  callback: (data: any) => void,
  options: UseWebSocketSubscriptionOptions = {},
) {
  const { isAuthenticated } = useAuth();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const callbackRef = useRef(callback);
  const optionsRef = useRef(options);

  // Update refs when values change
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const subscribe = useCallback(() => {
    if (!isAuthenticated || options.enabled === false) {
      return;
    }

    // Unsubscribe from previous subscription if exists
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Create new subscription
    unsubscribeRef.current = wsService.subscribe(
      eventType,
      (data: any) => callbackRef.current(data),
      {
        targetType: 'tenant',
        autoResubscribe: true,
        ...optionsRef.current,
      },
    );
  }, [eventType, isAuthenticated, options.enabled]);

  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // Subscribe on mount and when dependencies change
  useEffect(() => {
    subscribe();
    return unsubscribe;
  }, [subscribe, unsubscribe, ...(options.dependencies || [])]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    subscribe,
    unsubscribe,
    isConnected: wsService.isConnected(),
  };
}

/**
 * Hook for subscribing to multiple events at once
 */
export function useWebSocketSubscriptions(
  subscriptions: Array<{
    eventType: string;
    callback: (data: any) => void;
    options?: UseWebSocketSubscriptionOptions;
  }>,
  globalOptions: UseWebSocketSubscriptionOptions = {},
) {
  const { isAuthenticated } = useAuth();
  const unsubscribersRef = useRef<Array<() => void>>([]);
  const subscriptionsRef = useRef(subscriptions);
  const globalOptionsRef = useRef(globalOptions);

  // Update refs when values change
  useEffect(() => {
    subscriptionsRef.current = subscriptions;
  }, [subscriptions]);

  useEffect(() => {
    globalOptionsRef.current = globalOptions;
  }, [globalOptions]);

  const subscribeAll = useCallback(() => {
    if (!isAuthenticated || globalOptionsRef.current.enabled === false) {
      return;
    }

    // Unsubscribe from all previous subscriptions
    unsubscribersRef.current.forEach((unsubscribe) => unsubscribe());
    unsubscribersRef.current = [];

    // Create new subscriptions
    subscriptionsRef.current.forEach(
      ({ eventType, callback, options = {} }) => {
        const unsubscribe = wsService.subscribe(eventType, callback, {
          targetType: 'tenant',
          autoResubscribe: true,
          ...globalOptionsRef.current,
          ...options,
        });
        unsubscribersRef.current.push(unsubscribe);
      },
    );
  }, [isAuthenticated]);

  const unsubscribeAll = useCallback(() => {
    unsubscribersRef.current.forEach((unsubscribe) => unsubscribe());
    unsubscribersRef.current = [];
  }, []);

  // Subscribe on mount and when dependencies change
  useEffect(() => {
    subscribeAll();
    return unsubscribeAll;
  }, [subscribeAll, unsubscribeAll, ...(globalOptions.dependencies || [])]);

  return {
    subscribeAll,
    unsubscribeAll,
    isConnected: wsService.isConnected(),
    activeSubscriptions: unsubscribersRef.current.length,
  };
}

/**
 * Hook for publishing events (Legacy WebSocket)
 */
export function useWebSocketPublisher() {
  const { isAuthenticated } = useAuth();

  const publishEvent = useCallback(
    (
      eventType: string,
      payload: any,
      targetType: 'all' | 'tenant' | 'user' | 'flow' = 'tenant',
      targetId?: string,
    ) => {
      if (!isAuthenticated) {
        console.warn('Cannot publish event: Not authenticated');
        return;
      }

      wsService.publishEvent(eventType, payload, targetType, targetId);
    },
    [isAuthenticated],
  );

  return {
    publishEvent,
    isConnected: wsService.isConnected(),
  };
}

/**
 * Hook for APIX WebSocket subscriptions with enhanced features
 */
export function useAPXSubscription(
  messageType: APXMessageType,
  callback: (data: any) => void,
  options: {
    enabled?: boolean;
    filters?: Record<string, any>;
    target_id?: string;
    dependencies?: any[];
  } = {},
) {
  const apix = useAPIX({ autoConnect: true });
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const callbackRef = useRef(callback);
  const optionsRef = useRef(options);

  // Update refs when values change
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const subscribe = useCallback(() => {
    if (!apix.isConnected || options.enabled === false) {
      return;
    }

    // Unsubscribe from previous subscription if exists
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Create new APIX subscription
    unsubscribeRef.current = apix.subscribe(
      messageType,
      (message) => callbackRef.current(message.payload),
      {
        filters: optionsRef.current.filters,
        target_id: optionsRef.current.target_id,
      },
    );
  }, [messageType, apix.isConnected, options.enabled]);

  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // Subscribe on mount and when dependencies change
  useEffect(() => {
    subscribe();
    return unsubscribe;
  }, [subscribe, unsubscribe, ...(options.dependencies || [])]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    subscribe,
    unsubscribe,
    isConnected: apix.isConnected,
    sessionContext: apix.sessionContext,
  };
}

/**
 * Hook for node/flow-specific events (for canvas/workflow builders)
 */
export function useFlowSubscription(
  flowId: string,
  eventTypes: string[],
  callback: (eventType: string, data: any) => void,
  options: UseWebSocketSubscriptionOptions = {},
) {
  const subscriptions = eventTypes.map((eventType) => ({
    eventType: `FLOW:${flowId}:${eventType}`,
    callback: (data: any) => callback(eventType, data),
    options,
  }));

  return useWebSocketSubscriptions(subscriptions, {
    ...options,
    dependencies: [flowId, ...(options.dependencies || [])],
  });
}

/**
 * Hook for node-specific events
 */
export function useNodeSubscription(
  nodeId: string,
  eventTypes: (
    | 'NODE_MOVED'
    | 'NODE_CREATED'
    | 'NODE_DELETED'
    | 'NODE_UPDATED'
  )[],
  callback: (eventType: string, data: any) => void,
  flowId?: string,
  options: UseWebSocketSubscriptionOptions = {},
) {
  const subscriptions = eventTypes.map((eventType) => {
    const fullEventType = flowId
      ? `${eventType}:${flowId}:${nodeId}`
      : `${eventType}:${nodeId}`;

    return {
      eventType: fullEventType,
      callback: (data: any) => callback(eventType, data),
      options,
    };
  });

  return useWebSocketSubscriptions(subscriptions, {
    ...options,
    dependencies: [nodeId, flowId, ...(options.dependencies || [])],
  });
}
