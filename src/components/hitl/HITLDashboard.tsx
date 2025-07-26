'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHITLDashboard, useHITLRequests } from '@/hooks/useHITL';
import { HITLRequestViewer } from './HITLRequestViewer';
import { HITLAnalytics } from './HITLAnalytics';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  Filter,
  Search,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HITLDashboardProps {
  className?: string;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  EXPIRED: 'bg-gray-100 text-gray-800 border-gray-200',
  CANCELLED: 'bg-gray-100 text-gray-800 border-gray-200',
  DELEGATED: 'bg-purple-100 text-purple-800 border-purple-200',
};

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
  URGENT: 'bg-red-200 text-red-900',
};

export function HITLDashboard({ className }: HITLDashboardProps) {
  const {
    dashboard,
    loading: dashboardLoading,
    error: dashboardError,
  } = useHITLDashboard();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    sourceType: '',
    search: '',
  });

  const { data: filteredRequests, loading: requestsLoading } = useHITLRequests({
    status: filters.status || undefined,
    priority: filters.priority || undefined,
    sourceType: filters.sourceType as 'agent' | 'tool' | 'workflow' | undefined,
    assignedToMe: activeTab === 'assigned',
    createdByMe: activeTab === 'my-requests',
    limit: 50,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  });

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="w-6 h-6 mr-2" />
        Error loading dashboard: {dashboardError}
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No dashboard data available
      </div>
    );
  }

  const handleRequestClick = (requestId: string) => {
    setSelectedRequestId(requestId);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredRequestsList =
    filteredRequests?.requests.filter((request) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          request.title.toLowerCase().includes(searchLower) ||
          request.description.toLowerCase().includes(searchLower)
        );
      }
      return true;
    }) || [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HITL Dashboard</h1>
          <p className="text-muted-foreground">
            Manage human-in-the-loop requests and approvals
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.analytics.totalRequests}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard.analytics.pendingRequests} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.analytics.totalRequests > 0
                ? Math.round(
                    (dashboard.analytics.approvedRequests /
                      dashboard.analytics.totalRequests) *
                      100,
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard.analytics.approvedRequests} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(dashboard.analytics.averageResponseTime / 1000 / 60)}m
            </div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Escalation Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.analytics.escalationRate}%
            </div>
            <p className="text-xs text-muted-foreground">Requests escalated</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          <TabsTrigger value="assigned">Assigned to Me</TabsTrigger>
          <TabsTrigger value="all-requests">All Requests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* My Recent Requests */}
            <Card>
              <CardHeader>
                <CardTitle>My Recent Requests</CardTitle>
                <CardDescription>
                  Requests you've created recently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.myRequests.slice(0, 5).map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => handleRequestClick(request.id)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{request.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(request.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={priorityColors[request.priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800'}>
                          {request.priority}
                        </Badge>
                        <Badge className={statusColors[request.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {dashboard.myRequests.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No requests found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Assigned to Me */}
            <Card>
              <CardHeader>
                <CardTitle>Assigned to Me</CardTitle>
                <CardDescription>Requests awaiting your action</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.assignedToMe.slice(0, 5).map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => handleRequestClick(request.id)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{request.title}</p>
                        <p className="text-xs text-muted-foreground">
                          From {request.requester.name} •{' '}
                          {formatDistanceToNow(new Date(request.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={priorityColors[request.priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800'}>
                          {request.priority}
                        </Badge>
                        <Badge className={statusColors[request.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                          {request.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {dashboard.assignedToMe.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No requests assigned to you
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="my-requests" className="space-y-4">
          <RequestsList
            requests={dashboard.myRequests}
            onRequestClick={handleRequestClick}
            title="My Requests"
            description="Requests you've created"
          />
        </TabsContent>

        <TabsContent value="assigned" className="space-y-4">
          <RequestsList
            requests={dashboard.assignedToMe}
            onRequestClick={handleRequestClick}
            title="Assigned to Me"
            description="Requests awaiting your action"
          />
        </TabsContent>

        <TabsContent value="all-requests" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search requests..."
                    value={filters.search}
                    onChange={(e) =>
                      handleFilterChange('search', e.target.value)
                    }
                    className="pl-9"
                  />
                </div>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.priority}
                  onValueChange={(value) =>
                    handleFilterChange('priority', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Priorities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.sourceType}
                  onValueChange={(value) =>
                    handleFilterChange('sourceType', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Source Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Sources</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="tool">Tool</SelectItem>
                    <SelectItem value="workflow">Workflow</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() =>
                    setFilters({
                      status: '',
                      priority: '',
                      sourceType: '',
                      search: '',
                    })
                  }
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {requestsLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner />
            </div>
          ) : (
            <RequestsList
              requests={filteredRequestsList}
              onRequestClick={handleRequestClick}
              title="All Requests"
              description="All HITL requests in the system"
            />
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <HITLAnalytics />
        </TabsContent>
      </Tabs>

      {/* Request Viewer Modal */}
      {selectedRequestId && (
        <HITLRequestViewer
          requestId={selectedRequestId}
          open={!!selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
        />
      )}
    </div>
  );
}

interface RequestsListProps {
  requests: any[];
  onRequestClick: (id: string) => void;
  title: string;
  description: string;
}

function RequestsList({
  requests,
  onRequestClick,
  title,
  description,
}: RequestsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onRequestClick(request.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{request.title}</p>
                  <Badge variant="outline" className="text-xs">
                    {request.sourceType}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {request.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>By {request.requester.name}</span>
                  <span>
                    {formatDistanceToNow(new Date(request.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                  {request.assignee && (
                    <span>Assigned to {request.assignee.name}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={priorityColors[request.priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800'}>
                  {request.priority}
                </Badge>
                <Badge className={statusColors[request.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                  {request.status}
                </Badge>
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No requests found
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
