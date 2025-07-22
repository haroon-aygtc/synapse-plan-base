'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';
import { getToken } from '@/lib/auth';

// Create a local API instance for this component
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
  }
};
import { Loader2 } from 'lucide-react';

interface NotificationPreference {
  id: string;
  userId: string;
  eventType: string;
  type: 'IN_APP' | 'EMAIL' | 'SMS' | 'WEBHOOK' | 'PUSH';
  enabled: boolean;
  deliveryTime?: 'IMMEDIATE' | 'SCHEDULED' | 'BATCHED';
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

interface NotificationPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
}

const notificationTypes = [
  { id: 'IN_APP', label: 'In-App' },
  { id: 'EMAIL', label: 'Email' },
  { id: 'SMS', label: 'SMS' },
  { id: 'PUSH', label: 'Push' },
];

const eventCategories = [
  {
    id: 'system',
    label: 'System',
    events: [
      { id: 'system.notification', label: 'System Notifications' },
      { id: 'system.health.check', label: 'Health Checks' },
      { id: 'system.error', label: 'System Errors' },
    ],
  },
  {
    id: 'agent',
    label: 'Agent',
    events: [
      { id: 'agent.execution.started', label: 'Agent Execution Started' },
      { id: 'agent.execution.completed', label: 'Agent Execution Completed' },
      { id: 'agent.execution.failed', label: 'Agent Execution Failed' },
    ],
  },
  {
    id: 'workflow',
    label: 'Workflow',
    events: [
      { id: 'workflow.execution.started', label: 'Workflow Started' },
      { id: 'workflow.execution.completed', label: 'Workflow Completed' },
      { id: 'workflow.execution.failed', label: 'Workflow Failed' },
      { id: 'workflow.approval.requested', label: 'Approval Requested' },
    ],
  },
  {
    id: 'tool',
    label: 'Tool',
    events: [
      { id: 'tool.execution.failed', label: 'Tool Execution Failed' },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    events: [
      { id: 'billing.quota.exceeded', label: 'Quota Exceeded' },
      { id: 'billing.payment.processed', label: 'Payment Processed' },
      { id: 'billing.subscription.updated', label: 'Subscription Updated' },
    ],
  },
];

export function NotificationPreferences({
  isOpen,
  onClose,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('IN_APP');

  useEffect(() => {
    if (isOpen) {
      fetchPreferences();
    }
  }, [isOpen]);

  const fetchPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/notifications/preferences');
      if (response.data.success) {
        setPreferences(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch preferences');
      }
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
      setError('Failed to fetch notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePreference = async (
    eventType: string,
    notificationType: string,
    enabled: boolean
  ) => {
    // Find existing preference or create a new one
    const existingPreference = preferences.find(
      (p) => p.eventType === eventType && p.type === notificationType
    );

    try {
      setSaving(true);
      let response;
      
      if (existingPreference) {
        // Update existing preference
        response = await api.put(`/notifications/preferences/${existingPreference.id}`, {
          enabled,
        });
      } else {
        // Create new preference
        response = await api.post('/notifications/preferences', {
          eventType,
          type: notificationType,
          enabled,
        });
      }

      if (response.data.success) {
        // Update local state
        setPreferences((prev) => {
          if (existingPreference) {
            return prev.map((p) =>
              p.id === existingPreference.id ? { ...p, enabled } : p
            );
          } else {
            return [...prev, response.data.data];
          }
        });
      } else {
        setError(response.data.message || 'Failed to update preference');
      }
    } catch (err) {
      console.error('Error updating notification preference:', err);
      setError('Failed to update notification preference');
    } finally {
      setSaving(false);
    }
  };

  const isPreferenceEnabled = (eventType: string, notificationType: string) => {
    const preference = preferences.find(
      (p) => p.eventType === eventType && p.type === notificationType
    );
    return preference ? preference.enabled : false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notification Preferences</DialogTitle>
          <DialogDescription>
            Configure how and when you want to receive notifications.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchPreferences}>Try Again</Button>
          </div>
        ) : (
          <div className="py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4">
                {notificationTypes.map((type) => (
                  <TabsTrigger key={type.id} value={type.id}>
                    {type.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {notificationTypes.map((notificationType) => (
                <TabsContent
                  key={notificationType.id}
                  value={notificationType.id}
                  className="space-y-6 mt-4"
                >
                  {eventCategories.map((category) => (
                    <div key={category.id} className="space-y-4">
                      <h3 className="text-lg font-medium">{category.label}</h3>
                      <div className="space-y-2">
                        {category.events.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center justify-between py-2 border-b"
                          >
                            <Label htmlFor={`${event.id}-${notificationType.id}`} className="flex-1">
                              {event.label}
                            </Label>
                            <Switch
                              id={`${event.id}-${notificationType.id}`}
                              checked={isPreferenceEnabled(event.id, notificationType.id)}
                              onCheckedChange={(checked) =>
                                handleTogglePreference(event.id, notificationType.id, checked)
                              }
                              disabled={saving}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
