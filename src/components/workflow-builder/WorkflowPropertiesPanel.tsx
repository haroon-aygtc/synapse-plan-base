'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

interface WorkflowNode {
  id: string;
  type: 'agent' | 'tool' | 'condition' | 'loop' | 'hitl' | 'start' | 'end';
  position: { x: number; y: number };
  data: Record<string, any>;
}

interface WorkflowPropertiesPanelProps {
  selectedNode: WorkflowNode | null;
  onNodeUpdate: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  variables: Record<string, any>;
  onVariablesUpdate: (variables: Record<string, any>) => void;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export default function WorkflowPropertiesPanel({
  selectedNode,
  onNodeUpdate,
  variables,
  onVariablesUpdate
}: WorkflowPropertiesPanelProps) {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [variableKey, setVariableKey] = useState('');
  const [variableValue, setVariableValue] = useState('');

  useEffect(() => {
    loadAgentsAndTools();
  }, []);

  const loadAgentsAndTools = async () => {
    try {
      setLoading(true);
      const [agentsResponse, toolsResponse] = await Promise.all([
        apiClient.get('/agents', {
          params: {
            page: 1,
            limit: 100,
            isActive: true
          }
        }),
        apiClient.get('/tools', {
          params: {
            page: 1,
            limit: 100,
            isActive: true
          }
        })
      ]);
      
      if (agentsResponse.data.success) {
        const agentData = agentsResponse.data.data;
        setAgents(Array.isArray(agentData) ? agentData : agentData?.data || []);
      }
      
      if (toolsResponse.data.success) {
        const toolData = toolsResponse.data.data;
        setTools(Array.isArray(toolData) ? toolData : toolData?.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load agents and tools:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load agents and tools',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateNodeData = (key: string, value: any) => {
    if (!selectedNode) return;
    
    onNodeUpdate(selectedNode.id, {
      data: {
        ...selectedNode.data,
        [key]: value
      }
    });
  };

  const updateNestedNodeData = (path: string[], value: any) => {
    if (!selectedNode) return;
    
    const newData = { ...selectedNode.data };
    let current = newData;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    
    onNodeUpdate(selectedNode.id, { data: newData });
  };

  const addVariable = () => {
    if (variableKey.trim() && variableValue.trim()) {
      const newVariables = {
        ...variables,
        [variableKey.trim()]: variableValue.trim()
      };
      onVariablesUpdate(newVariables);
      setVariableKey('');
      setVariableValue('');
    }
  };

  const removeVariable = (key: string) => {
    const newVariables = { ...variables };
    delete newVariables[key];
    onVariablesUpdate(newVariables);
  };

  const renderAgentProperties = () => {
    if (!selectedNode) return null;
    
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Agent</label>
          <Select 
            value={selectedNode.data.agentId || ''}
            onValueChange={(value) => updateNodeData('agentId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.filter(agent => agent.isActive).map(agent => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Input Mapping</label>
          <textarea
            className="w-full h-24 p-2 border rounded-md text-sm font-mono"
            value={JSON.stringify(selectedNode.data.inputMapping || {}, null, 2)}
            onChange={(e) => {
              try {
                const mapping = JSON.parse(e.target.value);
                updateNodeData('inputMapping', mapping);
              } catch (error) {
                // Invalid JSON, don't update
              }
            }}
            placeholder='{"input": "${variable}"}'
          />
          <p className="text-xs text-gray-500 mt-1">
            Map workflow variables to agent input. Use ${`{variable}`} syntax.
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Output Mapping</label>
          <textarea
            className="w-full h-24 p-2 border rounded-md text-sm font-mono"
            value={JSON.stringify(selectedNode.data.outputMapping || {}, null, 2)}
            onChange={(e) => {
              try {
                const mapping = JSON.parse(e.target.value);
                updateNodeData('outputMapping', mapping);
              } catch (error) {
                // Invalid JSON, don't update
              }
            }}
            placeholder='{"result": "output"}'
          />
          <p className="text-xs text-gray-500 mt-1">
            Map agent output to workflow variables.
          </p>
        </div>
      </div>
    );
  };

  const renderToolProperties = () => {
    if (!selectedNode) return null;
    
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Tool</label>
          <Select 
            value={selectedNode.data.toolId || ''}
            onValueChange={(value) => updateNodeData('toolId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a tool" />
            </SelectTrigger>
            <SelectContent>
              {tools.filter(tool => tool.isActive).map(tool => (
                <SelectItem key={tool.id} value={tool.id}>
                  {tool.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Function Name</label>
          <Input
            value={selectedNode.data.functionName || 'execute'}
            onChange={(e) => updateNodeData('functionName', e.target.value)}
            placeholder="execute"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Parameter Mapping</label>
          <textarea
            className="w-full h-24 p-2 border rounded-md text-sm font-mono"
            value={JSON.stringify(selectedNode.data.parameterMapping || {}, null, 2)}
            onChange={(e) => {
              try {
                const mapping = JSON.parse(e.target.value);
                updateNodeData('parameterMapping', mapping);
              } catch (error) {
                // Invalid JSON, don't update
              }
            }}
            placeholder='{"param": "${variable}"}'
          />
          <p className="text-xs text-gray-500 mt-1">
            Map workflow variables to tool parameters.
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Output Mapping</label>
          <textarea
            className="w-full h-24 p-2 border rounded-md text-sm font-mono"
            value={JSON.stringify(selectedNode.data.outputMapping || {}, null, 2)}
            onChange={(e) => {
              try {
                const mapping = JSON.parse(e.target.value);
                updateNodeData('outputMapping', mapping);
              } catch (error) {
                // Invalid JSON, don't update
              }
            }}
            placeholder='{"result": "output"}'
          />
          <p className="text-xs text-gray-500 mt-1">
            Map tool output to workflow variables.
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Timeout (ms)</label>
          <Input
            type="number"
            value={selectedNode.data.timeout || 30000}
            onChange={(e) => updateNodeData('timeout', parseInt(e.target.value) || 30000)}
            placeholder="30000"
          />
        </div>
      </div>
    );
  };

  const renderConditionProperties = () => {
    if (!selectedNode) return null;
    
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Condition Expression</label>
          <textarea
            className="w-full h-24 p-2 border rounded-md text-sm font-mono"
            value={selectedNode.data.condition || ''}
            onChange={(e) => updateNodeData('condition', e.target.value)}
            placeholder="${variable} === 'value'"
          />
          <p className="text-xs text-gray-500 mt-1">
            JavaScript expression using workflow variables. Use ${`{variable}`} syntax.
          </p>
        </div>
        
        <div className="bg-blue-50 p-3 rounded-md">
          <h4 className="font-medium text-sm mb-2">Examples:</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>• ${`{status}`} === 'approved'</div>
                    <div>• ${`{count}`} &gt; 10</div>
            <div>• ${`{steps.step1.result}`} !== null</div>
          </div>
        </div>
      </div>
    );
  };

  const renderLoopProperties = () => {
    if (!selectedNode) return null;
    
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Loop Type</label>
          <Select 
            value={selectedNode.data.loop?.type || 'forEach'}
            onValueChange={(value) => updateNestedNodeData(['loop', 'type'], value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="forEach">For Each</SelectItem>
              <SelectItem value="while">While</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {selectedNode.data.loop?.type === 'forEach' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Items Variable</label>
              <Input
                value={selectedNode.data.loop?.items || ''}
                onChange={(e) => updateNestedNodeData(['loop', 'items'], e.target.value)}
                placeholder="${items}"
              />
              <p className="text-xs text-gray-500 mt-1">
                Variable containing array to iterate over.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Item Variable Name</label>
              <Input
                value={selectedNode.data.loop?.itemVariable || 'item'}
                onChange={(e) => updateNestedNodeData(['loop', 'itemVariable'], e.target.value)}
                placeholder="item"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Index Variable Name</label>
              <Input
                value={selectedNode.data.loop?.indexVariable || 'index'}
                onChange={(e) => updateNestedNodeData(['loop', 'indexVariable'], e.target.value)}
                placeholder="index"
              />
            </div>
          </>
        )}
        
        {selectedNode.data.loop?.type === 'while' && (
          <div>
            <label className="block text-sm font-medium mb-2">While Condition</label>
            <textarea
              className="w-full h-20 p-2 border rounded-md text-sm font-mono"
              value={selectedNode.data.loop?.condition || ''}
              onChange={(e) => updateNestedNodeData(['loop', 'condition'], e.target.value)}
              placeholder="${counter} < 10"
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium mb-2">Max Iterations</label>
          <Input
            type="number"
            value={selectedNode.data.loop?.maxIterations || 100}
            onChange={(e) => updateNestedNodeData(['loop', 'maxIterations'], parseInt(e.target.value) || 100)}
            placeholder="100"
          />
        </div>
      </div>
    );
  };

  const renderHitlProperties = () => {
    if (!selectedNode) return null;
    
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Approval Type</label>
          <Select 
            value={selectedNode.data.hitl?.type || 'approval'}
            onValueChange={(value) => updateNestedNodeData(['hitl', 'type'], value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approval">Approval</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="input">Input Required</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <Input
            value={selectedNode.data.hitl?.title || 'Approval Required'}
            onChange={(e) => updateNestedNodeData(['hitl', 'title'], e.target.value)}
            placeholder="Approval Required"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            className="w-full h-20 p-2 border rounded-md text-sm"
            value={selectedNode.data.hitl?.description || ''}
            onChange={(e) => updateNestedNodeData(['hitl', 'description'], e.target.value)}
            placeholder="Please review and approve this step"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Priority</label>
          <Select 
            value={selectedNode.data.hitl?.priority || 'medium'}
            onValueChange={(value) => updateNestedNodeData(['hitl', 'priority'], value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Timeout (ms)</label>
          <Input
            type="number"
            value={selectedNode.data.hitl?.timeout || 86400000}
            onChange={(e) => updateNestedNodeData(['hitl', 'timeout'], parseInt(e.target.value) || 86400000)}
            placeholder="86400000"
          />
          <p className="text-xs text-gray-500 mt-1">
            Time to wait for approval (default: 24 hours)
          </p>
        </div>
      </div>
    );
  };

  const renderNodeProperties = () => {
    if (!selectedNode) {
      return (
        <div className="text-center text-gray-500 py-8">
          <div className="text-4xl mb-2">📝</div>
          <p>Select a node to edit its properties</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Basic Properties */}
        <div>
          <h3 className="text-lg font-medium mb-4">Node Properties</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Label</label>
              <Input
                value={selectedNode.data.label || ''}
                onChange={(e) => updateNodeData('label', e.target.value)}
                placeholder="Enter node label"
              />
            </div>
            
            <div>
              <Badge variant="outline">
                Type: {selectedNode.type}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Type-specific Properties */}
        {selectedNode.type === 'agent' && renderAgentProperties()}
        {selectedNode.type === 'tool' && renderToolProperties()}
        {selectedNode.type === 'condition' && renderConditionProperties()}
        {selectedNode.type === 'loop' && renderLoopProperties()}
        {selectedNode.type === 'hitl' && renderHitlProperties()}
      </div>
    );
  };

  const renderVariables = () => {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Workflow Variables</h3>
        
        {/* Add Variable */}
        <div className="flex gap-2">
          <Input
            placeholder="Variable name"
            value={variableKey}
            onChange={(e) => setVariableKey(e.target.value)}
          />
          <Input
            placeholder="Default value"
            value={variableValue}
            onChange={(e) => setVariableValue(e.target.value)}
          />
          <Button onClick={addVariable} size="sm">
            Add
          </Button>
        </div>
        
        {/* Variables List */}
        <div className="space-y-2">
          {Object.entries(variables).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex-1">
                <span className="font-medium text-sm">{key}</span>
                <span className="text-gray-500 text-sm ml-2">= {String(value)}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeVariable(key)}
                className="text-red-600 hover:text-red-700"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        
        {Object.keys(variables).length === 0 && (
          <div className="text-center text-gray-500 py-4">
            <p>No variables defined</p>
            <p className="text-sm">Add variables to use in your workflow</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="properties" className="flex-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
        </TabsList>
        
        <TabsContent value="properties" className="flex-1 overflow-y-auto">
          {renderNodeProperties()}
        </TabsContent>
        
        <TabsContent value="variables" className="flex-1 overflow-y-auto">
          {renderVariables()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
