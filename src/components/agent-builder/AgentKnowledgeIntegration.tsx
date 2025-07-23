'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAgentBuilder } from '@/hooks/useAgentBuilder';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from '@/components/ui/use-toast';
import { 
  Database, 
  Plus, 
  Trash2, 
  Search, 
  Check, 
  X,
  Info,
  AlertCircle,
  FileText,
  Globe,
  Upload,
  RefreshCw,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Filter
} from 'lucide-react';

interface KnowledgeSource {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'ready' | 'indexing' | 'error' | 'empty';
  documentCount: number;
  lastUpdated: string;
  accessLevel: 'private' | 'shared' | 'public';
  owner: string;
  tags: string[];
}

export function AgentKnowledgeIntegration() {
  const { currentAgent, updateAgent, isLoading } = useAgentBuilder();
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [activeTab, setActiveTab] = useState('available');
  const [filterType, setFilterType] = useState<string | null>(null);

  // Fetch knowledge sources
  useEffect(() => {
    const fetchKnowledgeSources = async () => {
      setIsLoadingSources(true);
      try {
        const response = await fetch('/api/knowledge-sources');
        if (response.ok) {
          const data = await response.json();
          setKnowledgeSources(data);
        } else {
          throw new Error('Failed to fetch knowledge sources');
        }
      } catch (error) {
        console.error('Error fetching knowledge sources:', error);
        toast({
          title: 'Error',
          description: 'Failed to load knowledge sources',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingSources(false);
      }
    };

    fetchKnowledgeSources();
  }, []);

  // Initialize selected sources from current agent
  useEffect(() => {
    if (currentAgent?.knowledgeSources) {
      setSelectedSources(currentAgent.knowledgeSources);
    }
  }, [currentAgent]);

  const handleSourceToggle = useCallback((sourceId: string, isEnabled: boolean) => {
    if (isEnabled) {
      setSelectedSources(prev => [...prev, sourceId]);
    } else {
      setSelectedSources(prev => prev.filter(id => id !== sourceId));
    }
  }, []);

  const saveKnowledgeConfiguration = useCallback(async () => {
    if (!currentAgent) return;
    
    try {
      await updateAgent({
        ...currentAgent,
        knowledgeSources: selectedSources,
      });
      
      toast({
        title: 'Knowledge Sources Updated',
        description: 'Knowledge configuration has been saved successfully',
      });
    } catch (error) {
      console.error('Error saving knowledge configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to save knowledge configuration',
        variant: 'destructive',
      });
    }
  }, [currentAgent, selectedSources, updateAgent]);

  const filteredSources = knowledgeSources.filter(source => {
    const matchesSearch = 
      source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = !filterType || source.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const selectedSourcesData = knowledgeSources.filter(source => 
    selectedSources.includes(source.id)
  );

  const sourceTypes = Array.from(new Set(knowledgeSources.map(source => source.type)));

  const getSourceIcon = (type: string) => {
    const icons = {
      'document': <FileText className="h-4 w-4" />,
      'database': <Database className="h-4 w-4" />,
      'web': <Globe className="h-4 w-4" />,
      'default': <Database className="h-4 w-4" />
    };
    
    return icons[type as keyof typeof icons] || icons.default;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-800">Ready</Badge>;
      case 'indexing':
        return <Badge className="bg-yellow-100 text-yellow-800">Indexing</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case 'empty':
        return <Badge className="bg-gray-100 text-gray-800">Empty</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Knowledge Integration</h2>
          <p className="text-sm text-muted-foreground">
            Connect your agent to knowledge sources
          </p>
        </div>
        <Button onClick={saveKnowledgeConfiguration}>
          <Check className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">Available Sources</TabsTrigger>
          <TabsTrigger value="configured">Configured Sources ({selectedSources.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="available" className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search knowledge sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="filter-type" className="text-sm whitespace-nowrap">Filter:</Label>
              <select
                id="filter-type"
                value={filterType || ''}
                onChange={(e) => setFilterType(e.target.value || null)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">All Types</option>
                {sourceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          
          {isLoadingSources ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {filteredSources.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No knowledge sources found matching your search</p>
                  </div>
                ) : (
                  filteredSources.map((source) => (
                    <Card key={source.id} className={selectedSources.includes(source.id) ? 'border-primary' : ''}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                              {getSourceIcon(source.type)}
                            </div>
                            <div>
                              <CardTitle className="text-base">{source.name}</CardTitle>
                              <CardDescription className="text-xs">
                                {source.documentCount.toLocaleString()} documents • Last updated: {formatDate(source.lastUpdated)}
                              </CardDescription>
                            </div>
                          </div>
                          <Switch
                            checked={selectedSources.includes(source.id)}
                            onCheckedChange={(checked) => handleSourceToggle(source.id, checked)}
                            disabled={source.status === 'error' || source.status === 'empty'}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <p className="text-sm mb-2">{source.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(source.status)}
                            <Badge variant="outline">{source.type}</Badge>
                            {source.accessLevel !== 'public' && (
                              <Badge variant="outline" className="flex items-center space-x-1">
                                {source.accessLevel === 'private' ? (
                                  <Lock className="h-3 w-3 mr-1" />
                                ) : (
                                  <Unlock className="h-3 w-3 mr-1" />
                                )}
                                <span>{source.accessLevel}</span>
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            {source.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {source.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{source.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
        
        <TabsContent value="configured" className="space-y-4">
          {selectedSourcesData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No knowledge sources configured yet</p>
              <p className="text-sm">Select sources from the Available Sources tab</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-6">
                {selectedSourcesData.map((source) => (
                  <Card key={source.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            {getSourceIcon(source.type)}
                          </div>
                          <div>
                            <CardTitle className="text-base">{source.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {source.documentCount.toLocaleString()} documents • Last updated: {formatDate(source.lastUpdated)}
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSourceToggle(source.id, false)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-3">{source.description}</p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Status</span>
                          {getStatusBadge(source.status)}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Access Level</span>
                          <Badge variant="outline" className="flex items-center space-x-1">
                            {source.accessLevel === 'private' ? (
                              <Lock className="h-3 w-3 mr-1" />
                            ) : source.accessLevel === 'shared' ? (
                              <Unlock className="h-3 w-3 mr-1" />
                            ) : (
                              <Globe className="h-3 w-3 mr-1" />
                            )}
                            <span>{source.accessLevel}</span>
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Owner</span>
                          <span className="text-sm">{source.owner}</span>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-sm font-medium">Tags</span>
                          <div className="flex flex-wrap gap-1">
                            {source.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-0">
                      <Button variant="outline" size="sm" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refresh
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}