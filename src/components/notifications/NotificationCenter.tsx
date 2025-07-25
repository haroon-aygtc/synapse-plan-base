'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Settings, Filter, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationPreferences } from './NotificationPreferences';
import { formatDistanceToNow } from 'date-fns';

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

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showPreferences, setShowPreferences] = useState(false);

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter((notification: Notification) => {
    switch (activeTab) {
      case 'unread':
        return !notification.readAt;
      case 'important':
        return notification.priority === 'HIGH' || notification.priority === 'CRITICAL';
      case 'system':
        return notification.sourceModule === 'system' || notification.eventType?.includes('system');
      default:
        return true;
    }
  });

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.readAt) {
      await markAsRead(notification.id);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteNotification = async (notificationId: string) => {
    await deleteNotification(notificationId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-500';
      case 'HIGH':
        return 'bg-orange-500';
      case 'MEDIUM': return "";
        return 'bg-blue-500';
      case 'LOW':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'Critical';
      case 'HIGH':
        return 'High';
      case 'MEDIUM':
        return 'Medium';
      case 'LOW':
        return 'Low';
      default:
        return 'Unknown';
    }
  };

  const getSourceModuleIcon = (sourceModule?: string) => {
    switch (sourceModule) {
      case 'agent':
        return '🤖';
      case 'tool':
        return '🔧';
      case 'workflow':
        return '⚡';
      case 'knowledge':
        return '📚';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  return (
    <div className={className}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Notifications</SheetTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreferences(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshNotifications}
                  disabled={loading}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <SheetDescription>
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                : 'You\'re all caught up!'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">
                  Unread
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 w-4 rounded-full p-0 text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="important">Important</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filteredNotifications.length} notification{filteredNotifications.length === 1 ? '' : 's'}
                </p>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    disabled={loading}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>

              <TabsContent value={activeTab} className="mt-4">
                <ScrollArea className="h-[500px]">
                  {loading && notifications.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center h-32 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Failed to load notifications</p>
                        <Button variant="outline" size="sm" onClick={refreshNotifications}>
                          Try again
                        </Button>
                      </div>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-center">
                      <div>
                        <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {activeTab === 'unread'
                            ? 'No unread notifications'
                            : activeTab === 'important'
                            ? 'No important notifications'
                            : activeTab === 'system'
                            ? 'No system notifications'
                            : 'No notifications yet'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredNotifications.map((notification: Notification) => (
                        <Card
                          key={notification.id}
                          className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                            !notification.readAt ? 'border-l-4 border-l-primary bg-muted/20' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <div className="text-lg">
                                  {getSourceModuleIcon(notification.sourceModule)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-medium truncate">
                                      {notification.title}
                                    </h4>
                                    <div
                                      className={`w-2 h-2 rounded-full ${getPriorityColor(
                                        notification.priority,
                                      )}`}
                                      title={getPriorityLabel(notification.priority)}
                                    />
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(notification.createdAt), {
                                        addSuffix: true,
                                      })}
                                    </span>
                                    {notification.sourceModule && (
                                      <Badge variant="outline" className="text-xs">
                                        {notification.sourceModule}
                                      </Badge>
                                    )}
                                    {notification.priority === 'CRITICAL' && (
                                      <Badge variant="destructive" className="text-xs">
                                        Critical
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <div onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {!notification.readAt && (
                                    <DropdownMenuItem
                                      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id);
                                      }}
                                    >
                                      <Check className="h-4 w-4 mr-2" />
                                      Mark as read
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                                      e.stopPropagation();
                                      handleDeleteNotification(notification.id);
                                    }}
                                    className="text-destructive"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Notification Preferences Modal */}
      {showPreferences && (
        <NotificationPreferences
          isOpen={showPreferences}
          onClose={() => setShowPreferences(false)}
        />
      )}
    </div>
  );
}
