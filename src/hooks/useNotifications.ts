import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useWebSocket } from '@/lib/websocket';
import { getToken } from '@/lib/auth';

// Create a local API instance for this hook
const api = {
  async get(url: string) {
    const token = await getToken();
    return axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
  },
  async put(url: string, data?: any) {
    const token = await getToken();
    return axios.put(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}${url}`, data, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
  },
  async post(url: string, data?: any) {
    const token = await getToken();
    return axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}${url}`, data, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
  },
  async delete(url: string) {
    const token = await getToken();
    return axios.delete(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}${url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
  }
};

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'IN_APP' | 'EMAIL' | 'SMS' | 'WEBHOOK' | 'PUSH';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  eventType?: string;
  sourceModule?: string;
  data?: Record<string, any>;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { subscribe } = useWebSocket();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/notifications');
      if (response.data.success) {
        setNotifications(response.data.data);
        setUnreadCount(response.data.data.filter((n: Notification) => !n.readAt).length);
      } else {
        throw new Error(response.data.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await api.put(`/notifications/${id}/read`);
      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === id
              ? { ...notification, readAt: new Date().toISOString() }
              : notification
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else {
        throw new Error(response.data.message || 'Failed to mark notification as read');
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await api.put('/notifications/read-all');
      if (response.data.success) {
        const now = new Date().toISOString();
        setNotifications((prev) =>
          prev.map((notification) => ({
            ...notification,
            readAt: notification.readAt || now,
          }))
        );
        setUnreadCount(0);
      } else {
        throw new Error(response.data.message || 'Failed to mark all notifications as read');
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      const response = await api.delete(`/notifications/${id}`);
      if (response.data.success) {
        setNotifications((prev) => prev.filter((notification) => notification.id !== id));
        // Update unread count if needed
        setNotifications((prev) => {
          const wasUnread = prev.find((n) => n.id === id && !n.readAt);
          if (wasUnread) {
            setUnreadCount((prevCount) => Math.max(0, prevCount - 1));
          }
          return prev.filter((n) => n.id !== id);
        });
      } else {
        throw new Error(response.data.message || 'Failed to delete notification');
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // Handle real-time notifications
  useEffect(() => {
    const unsubscribe = subscribe('notification.sent', (data: any) => {
      if (data.type === 'new_notification' && data.notification) {
        setNotifications((prev) => [data.notification, ...prev]);
        if (!data.notification.readAt) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  };
}
