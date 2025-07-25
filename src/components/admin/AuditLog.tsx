'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS_LIST, Permission } from '@/types/global';

interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'failure' | 'warning';
}

interface AuditLogProps {
  className?: string;
}

const severityColors = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const statusIcons = {
  success: CheckCircle,
  failure: XCircle,
  warning: AlertTriangle,
};

const statusColors = {
  success: 'text-green-600',
  failure: 'text-red-600',
  warning: 'text-yellow-600',
};

export function AuditLog({ className }: AuditLogProps) {
  const { hasPermission } = usePermissions();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    severity: '',
    status: '',
    userId: '',
    dateRange: null as any,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Mock data for demonstration
  useEffect(() => {
    const mockLogs: AuditLogEntry[] = [
      {
        id: '1',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        action: 'user.invite',
        resource: 'user',
        resourceId: 'user-2',
        details: { invitedEmail: 'jane@example.com', role: 'DEVELOPER' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date().toISOString(),
        severity: 'medium',
        status: 'success',
      },
      {
        id: '2',
        userId: 'user-1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        action: 'user.role.change',
        resource: 'user',
        resourceId: 'user-3',
        details: { oldRole: 'VIEWER', newRole: 'DEVELOPER' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        severity: 'high',
        status: 'success',
      },
      {
        id: '3',
        userId: 'user-2',
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
        action: 'auth.login.failed',
        resource: 'auth',
        details: { reason: 'invalid_password', attempts: 3 },
        ipAddress: '10.0.0.50',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        severity: 'high',
        status: 'failure',
      },
    ];
    setLogs(mockLogs);
    setPagination((prev) => ({
      ...prev,
      total: mockLogs.length,
      totalPages: 1,
    }));
  }, []);

    if (!hasPermission(PERMISSIONS_LIST.SYSTEM_MONITOR  as Permission)) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have permission to view audit logs.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleExport = () => {
    // Implementation for exporting audit logs
    console.log('Exporting audit logs...');
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionLabel = (action: string) => {
    const actionLabels: Record<string, string> = {
      'user.invite': 'User Invited',
      'user.role.change': 'Role Changed',
      'user.activate': 'User Activated',
      'user.deactivate': 'User Deactivated',
      'auth.login': 'Login',
      'auth.login.failed': 'Login Failed',
      'auth.logout': 'Logout',
      'agent.create': 'Agent Created',
      'agent.update': 'Agent Updated',
      'agent.delete': 'Agent Deleted',
      'tool.create': 'Tool Created',
      'tool.update': 'Tool Updated',
      'tool.delete': 'Tool Deleted',
    };
    return actionLabels[action] || action;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Audit Log</span>
              </CardTitle>
              <CardDescription>
                Track all user actions and system events for security and
                compliance
              </CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by user, action, or resource..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="pl-10"
              />
            </div>
            <Select
              value={filters.action}
              onValueChange={(value) =>
                setFilters({ ...filters, action: value })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                <SelectItem value="user.invite">User Invited</SelectItem>
                <SelectItem value="user.role.change">Role Changed</SelectItem>
                <SelectItem value="auth.login">Login</SelectItem>
                <SelectItem value="auth.login.failed">Login Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.severity}
              onValueChange={(value) =>
                setFilters({ ...filters, severity: value })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters({ ...filters, status: value })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
            <DatePickerWithRange
              date={filters.dateRange}
              onDateChange={(dateRange) =>
                setFilters({ ...filters, dateRange })
              }
            />
          </div>

          {/* Audit Log Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const StatusIcon = statusIcons[log.status];
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {formatTimestamp(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{log.userName}</div>
                              <div className="text-sm text-muted-foreground">
                                {log.userEmail}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {getActionLabel(log.action)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {log.action}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium capitalize">
                              {log.resource}
                            </div>
                            {log.resourceId && (
                              <div className="text-sm text-muted-foreground font-mono">
                                {log.resourceId.substring(0, 8)}...
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <StatusIcon
                              className={`h-4 w-4 ${statusColors[log.status]}`}
                            />
                            <span className="capitalize">{log.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={severityColors[log.severity]}>
                            {log.severity.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.ipAddress}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{' '}
                of {pagination.total} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
