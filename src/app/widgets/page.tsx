'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Play,
  Pause,
  Settings,
  Copy,
  Trash2,
  BarChart3,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useWidgets } from '@/hooks/useWidgets';
import { Widget } from '@/lib/sdk/types';
import { WidgetMarketplace } from '@/components/widgets/WidgetMarketplace';

export default function WidgetsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'agent' | 'tool' | 'workflow'
  >('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');

  const {
    widgets,
    loading,
    error,
    pagination,
    fetchWidgets,
    deleteWidget,
    deployWidget,
    undeployWidget,
    updateWidget,
    cloneWidget,
    generateEmbedCode,
  } = useWidgets({
    search: search || undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  });

  useEffect(() => {
    fetchWidgets();
  }, [search, typeFilter, statusFilter]);

  const handleDelete = async (widget: Widget) => {
    if (!confirm(`Are you sure you want to delete "${widget.name}"?`)) return;

    try {
      await deleteWidget(widget.id);
      toast({
        title: 'Widget deleted',
        description: `"${widget.name}" has been deleted successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete widget. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (widget: Widget) => {
    try {
      await updateWidget(widget.id, { isActive: !widget.isActive });
      toast({
        title: 'Widget updated',
        description: `Widget has been ${!widget.isActive ? 'activated' : 'deactivated'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update widget status.',
        variant: 'destructive',
      });
    }
  };

  const handleDeploy = async (widget: Widget) => {
    try {
      if (widget.isDeployed) {
        await undeployWidget(widget.id);
        toast({
          title: 'Widget undeployed',
          description: 'Widget has been undeployed successfully.',
        });
      } else {
        await deployWidget(widget.id, { environment: 'production' });
        toast({
          title: 'Widget deployed',
          description: 'Widget has been deployed successfully.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to deploy/undeploy widget.',
        variant: 'destructive',
      });
    }
  };

  const handleClone = async (widget: Widget) => {
    try {
      await cloneWidget(widget.id, {
        name: `${widget.name} (Copy)`,
      });
      toast({
        title: 'Widget cloned',
        description: 'Widget has been cloned successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clone widget.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyEmbedCode = async (widget: Widget) => {
    if (!widget.isDeployed) {
      toast({
        title: 'Widget not deployed',
        description: 'Please deploy the widget first to get embed code.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const embedData = await generateEmbedCode(widget.id, {
        format: 'javascript',
      });
      await navigator.clipboard.writeText(embedData.code);
      toast({
        title: 'Embed code copied',
        description: 'Embed code has been copied to clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate embed code.',
        variant: 'destructive',
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'agent':
        return 'bg-blue-100 text-blue-800';
      case 'tool':
        return 'bg-green-100 text-green-800';
      case 'workflow':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Error Loading Widgets
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => fetchWidgets()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Widgets</h1>
              <p className="text-gray-600 mt-1">
                Create and manage embeddable widgets from your agents, tools,
                and workflows
              </p>
            </div>
            <Button
              onClick={() => router.push('/widgets/create')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Widget
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search widgets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value: any) => setTypeFilter(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="agent">Agents</SelectItem>
                <SelectItem value="tool">Tools</SelectItem>
                <SelectItem value="workflow">Workflows</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value: any) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Widget Marketplace Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Widget Marketplace
            </h2>
            <Button
              variant="outline"
              onClick={() => router.push('/widgets/marketplace')}
            >
              Browse All Templates
            </Button>
          </div>
          <WidgetMarketplace
            showCreateButton={false}
            onTemplateSelect={(template) => {
              // Handle template selection for quick widget creation
              router.push(`/widgets/create?template=${template.id}`);
            }}
          />
        </div>

        {/* Widgets Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : widgets.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No widgets found
            </h3>
            <p className="text-gray-600 mb-4">
              {search || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by creating your first widget from a template above or build from scratch.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => router.push('/widgets/create')}>
                Create Widget
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/widgets/templates')}
              >
                Browse Templates
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Your Widgets
              </h2>
              <div className="text-sm text-gray-500">
                {widgets.length} of {pagination.total} widgets
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {widgets.map((widget) => (
                <Card
                  key={widget.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">
                          {widget.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {widget.description || 'No description provided'}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/widgets/${widget.id}/edit`)
                            }
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleClone(widget)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Clone
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCopyEmbedCode(widget)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Embed Code
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/widgets/${widget.id}/analytics`)
                            }
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(widget)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className={getTypeColor(widget.type)}>
                          {widget.type}
                        </Badge>
                        <Badge
                          variant={widget.isActive ? 'default' : 'secondary'}
                        >
                          {widget.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {widget.isDeployed && (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-600"
                          >
                            Deployed
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Usage:</span>
                          <span className="font-medium">
                            {widget.usageCount || 0} executions
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Created:</span>
                          <span>
                            {new Date(widget.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {widget.lastUsed && (
                          <div className="flex justify-between">
                            <span>Last used:</span>
                            <span>
                              {new Date(widget.lastUsed).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant={widget.isActive ? 'outline' : 'default'}
                          onClick={() => handleToggleStatus(widget)}
                          className="flex-1"
                        >
                          {widget.isActive ? (
                            <>
                              <Pause className="h-3 w-3 mr-1" /> Deactivate
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 mr-1" /> Activate
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant={widget.isDeployed ? 'outline' : 'default'}
                          onClick={() => handleDeploy(widget)}
                          className="flex-1"
                          disabled={!widget.isActive}
                        >
                          {widget.isDeployed ? 'Undeploy' : 'Deploy'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => fetchWidgets()}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => fetchWidgets()}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
