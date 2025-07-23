'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAgentBuilder } from '@/hooks/useAgentBuilder';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from '@/components/ui/use-toast';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Search, 
  ArrowRight, 
  Check, 
  X,
  Info,
  AlertCircle,
  Zap,
  Database,
  Code,
  Globe,
  FileText,
  Mail,
  Calendar,
  Calculator,
  DollarSign
} from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: ToolParameter[];
  returnType: string;
  isEnabled: boolean;
  authRequired: boolean;
  icon: string;
}

interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: any;
}

interface ToolMapping {
  toolId: string;
  parameterMappings: Record<string, string>;
  isConfigured: boolean;
}

export function AgentToolLinking() {
  const { currentAgent, updateAgent, isLoading } = useAgentBuilder();
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [toolMappings, setToolMappings] = useState<Record<string, ToolMapping>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [activeTab, setActiveTab] = useState('available');

  // Fetch available tools
  useEffect(() => {
    const fetchTools = async () => {
      setIsLoadingTools(true);
      try {
        const response = await fetch('/api/tools');
        if (response.ok) {
          const data = await response.json();
          setAvailableTools(data);
        } else {
          throw new Error('Failed to fetch tools');
        }
      } catch (error) {
        console.error('Error fetching tools:', error);
        toast({
          title: 'Error',
          description: 'Failed to load available tools',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingTools(false);
      }
    };

    fetchTools();
  }, []);

  // Initialize selected tools from current agent
  useEffect(() => {
    if (currentAgent?.tools) {
      setSelectedTools(currentAgent.tools);
      
      // Initialize tool mappings from agent metadata
      const mappings: Record<string, ToolMapping> = {};
      if (currentAgent.metadata?.toolMappings) {
        Object.entries(currentAgent.metadata.toolMappings).forEach(([toolId, mapping]) => {
          mappings[toolId] = mapping as ToolMapping;
        });
      }
      setToolMappings(mappings);
    }
  }, [currentAgent]);

  const handleToolToggle = useCallback((toolId: string, isEnabled: boolean) => {
    if (isEnabled) {
      setSelectedTools(prev => [...prev, toolId]);
    } else {
      setSelectedTools(prev => prev.filter(id => id !== toolId));
    }
  }, []);

  const handleParameterMapping = useCallback((toolId: string, paramName: string, value: string) => {
    setToolMappings(prev => {
      const currentMapping = prev[toolId] || { 
        toolId, 
        parameterMappings: {}, 
        isConfigured: false 
      };
      
      const updatedMapping = {
        ...currentMapping,
        parameterMappings: {
          ...currentMapping.parameterMappings,
          [paramName]: value
        }
      };
      
      // Check if all required parameters are mapped
      const tool = availableTools.find(t => t.id === toolId);
      if (tool) {
        const requiredParams = tool.parameters.filter(p => p.required);
        updatedMapping.isConfigured = requiredParams.every(
          p => !!updatedMapping.parameterMappings[p.name]
        );
      }
      
      return {
        ...prev,
        [toolId]: updatedMapping
      };
    });
  }, [availableTools]);

  const saveToolConfiguration = useCallback(async () => {
    if (!currentAgent) return;
    
    try {
      await updateAgent({
        ...currentAgent,
        tools: selectedTools,
        metadata: {
          ...currentAgent.metadata,
          toolMappings
        }
      });
      
      toast({
        title: 'Tools Updated',
        description: 'Tool configuration has been saved successfully',
      });
    } catch (error) {
      console.error('Error saving tool configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to save tool configuration',
        variant: 'destructive',
      });
    }
  }, [currentAgent, selectedTools, toolMappings, updateAgent]);

  const filteredTools = availableTools.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedToolsData = availableTools.filter(tool => 
    selectedTools.includes(tool.id)
  );

  const getToolIcon = (iconName: string) => {
    const icons = {
      'search': <Search className="h-4 w-4" />,
      'database': <Database className="h-4 w-4" />,
      'code': <Code className="h-4 w-4" />,
      'globe': <Globe className="h-4 w-4" />,
      'file': <FileText className="h-4 w-4" />,
      'mail': <Mail className="h-4 w-4" />,
      'calendar': <Calendar className="h-4 w-4" />,
      'calculator': <Calculator className="h-4 w-4" />,
      'payment': <DollarSign className="h-4 w-4" />,
      'default': <Settings className="h-4 w-4" />
    };
    
    return icons[iconName as keyof typeof icons] || icons.default;
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
          <h2 className="text-xl font-semibold">Tool Integration</h2>
          <p className="text-sm text-muted-foreground">
            Connect your agent to external tools and APIs
          </p>
        </div>
        <Button onClick={saveToolConfiguration}>
          <Check className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">Available Tools</TabsTrigger>
          <TabsTrigger value="configured">Configured Tools ({selectedTools.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="available" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {isLoadingTools ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {filteredTools.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No tools found matching your search</p>
                  </div>
                ) : (
                  filteredTools.map((tool) => (
                    <Card key={tool.id} className={selectedTools.includes(tool.id) ? 'border-primary' : ''}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                              {getToolIcon(tool.icon)}
                            </div>
                            <CardTitle className="text-base">{tool.name}</CardTitle>
                          </div>
                          <Switch
                            checked={selectedTools.includes(tool.id)}
                            onCheckedChange={(checked) => handleToolToggle(tool.id, checked)}
                          />
                        </div>
                        <CardDescription>{tool.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="flex items-center justify-between text-xs">
                          <Badge variant="outline">{tool.category}</Badge>
                          {tool.authRequired && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                              Auth Required
                            </Badge>
                          )}
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
          {selectedToolsData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No tools configured yet</p>
              <p className="text-sm">Select tools from the Available Tools tab</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-6">
                {selectedToolsData.map((tool) => (
                  <Card key={tool.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            {getToolIcon(tool.icon)}
                          </div>
                          <CardTitle className="text-base">{tool.name}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToolToggle(tool.id, false)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-sm">
                          <span className="font-medium">Return Type:</span> {tool.returnType}
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Parameters</Label>
                          {tool.parameters.map((param) => (
                            <div key={param.name} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">
                                  {param.name}
                                  {param.required && <span className="text-destructive">*</span>}
                                </Label>
                                <Badge variant="outline" className="text-xs">
                                  {param.type}
                                </Badge>
                              </div>
                              <Input
                                placeholder={`Map ${param.name}...`}
                                value={toolMappings[tool.id]?.parameterMappings[param.name] || ''}
                                onChange={(e) => handleParameterMapping(tool.id, param.name, e.target.value)}
                                className="h-8 text-sm"
                              />
                              <p className="text-xs text-muted-foreground">{param.description}</p>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-muted-foreground">
                            {toolMappings[tool.id]?.isConfigured ? (
                              <span className="flex items-center text-green-600">
                                <Check className="h-3 w-3 mr-1" />
                                Properly configured
                              </span>
                            ) : (
                              <span className="flex items-center text-amber-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Missing required parameters
                              </span>
                            )}
                          </span>
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            Test
                          </Button>
                        </div>
                      </div>
                    </CardContent>
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