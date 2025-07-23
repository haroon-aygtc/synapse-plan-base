'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Settings, 
  TestTube, 
  BarChart3, 
  Store, 
  Zap,
  Sparkles,
  Brain,
  MessageSquare,
  Play,
  Save,
  Share2
} from 'lucide-react';

import { AIAssistedConfiguration } from './AIAssistedConfiguration';
import { VisualAgentBuilder } from './VisualAgentBuilder';
import { AgentTestingInterface } from './AgentTestingInterface';
import { AgentPerformanceDashboard } from './AgentPerformanceDashboard';
import { AgentMarketplace } from './AgentMarketplace';
import { AgentToolLinking } from './AgentToolLinking';
import { AgentKnowledgeIntegration } from './AgentKnowledgeIntegration';
import { LiveAgentPreview } from './LiveAgentPreview';
import { useAgentBuilder } from '@/hooks/useAgentBuilder';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';

export function AgentBuilderInterface() {
  const { user } = useAuth();
  const {
    currentAgent,
    isLoading,
    saveAgent,
    testAgent,
    deployAgent,
    updateAgent
  } = useAgentBuilder();

  const [activeTab, setActiveTab] = useState('configure');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAgent = useCallback(async () => {
    if (!currentAgent) return;
    
    setIsSaving(true);
    try {
      await saveAgent(currentAgent);
      toast({
        title: 'Agent Saved',
        description: 'Your agent has been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save agent. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [currentAgent, saveAgent]);

  const handleTestAgent = useCallback(async () => {
    if (!currentAgent) return;
    
    try {
      await testAgent(currentAgent.id, {
        testType: 'integration',
        testName: 'Quick Test',
        testInput: { input: 'Hello, test the agent functionality' }
      });
      setActiveTab('testing');
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Failed to test agent. Please check configuration.',
        variant: 'destructive',
      });
    }
  }, [currentAgent, testAgent]);

  const handleDeployAgent = useCallback(async () => {
    if (!currentAgent) return;
    
    try {
      await deployAgent(currentAgent.id);
      toast({
        title: 'Agent Deployed',
        description: 'Your agent is now live and ready to use.',
      });
    } catch (error) {
      toast({
        title: 'Deployment Failed',
        description: 'Failed to deploy agent. Please try again.',
        variant: 'destructive',
      });
    }
  }, [currentAgent, deployAgent]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading Agent Builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Bot className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold">Agent Builder</h1>
                  <p className="text-sm text-muted-foreground">
                    {currentAgent?.name || 'New Agent'}
                  </p>
                </div>
              </div>
              {currentAgent && (
                <Badge variant={currentAgent.isActive ? 'default' : 'secondary'}>
                  {currentAgent.isActive ? 'Active' : 'Draft'}
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewOpen(true)}
                className="hidden md:flex"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestAgent}
                disabled={!currentAgent}
              >
                <TestTube className="h-4 w-4 mr-2" />
                Test
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAgent}
                disabled={!currentAgent || isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                size="sm"
                onClick={handleDeployAgent}
                disabled={!currentAgent}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                Deploy
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <div className="border-b bg-muted/30">
            <div className="container mx-auto px-4">
              <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-none lg:flex">
                <TabsTrigger value="configure" className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Configure</span>
                </TabsTrigger>
                <TabsTrigger value="visual" className="flex items-center space-x-2">
                  <Brain className="h-4 w-4" />
                  <span className="hidden sm:inline">Visual</span>
                </TabsTrigger>
                <TabsTrigger value="testing" className="flex items-center space-x-2">
                  <TestTube className="h-4 w-4" />
                  <span className="hidden sm:inline">Testing</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="tools" className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Tools</span>
                </TabsTrigger>
                <TabsTrigger value="marketplace" className="flex items-center space-x-2">
                  <Store className="h-4 w-4" />
                  <span className="hidden sm:inline">Market</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <TabsContent value="configure" className="h-full m-0 p-0">
                  <AIAssistedConfiguration />
                </TabsContent>

                <TabsContent value="visual" className="h-full m-0 p-0">
                  <VisualAgentBuilder />
                </TabsContent>

                <TabsContent value="testing" className="h-full m-0 p-0">
                  <AgentTestingInterface />
                </TabsContent>

                <TabsContent value="analytics" className="h-full m-0 p-0">
                  <AgentPerformanceDashboard />
                </TabsContent>

                <TabsContent value="tools" className="h-full m-0 p-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 h-full">
                    <Card className="h-fit">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Settings className="h-5 w-5" />
                          <span>Tool Integration</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AgentToolLinking />
                      </CardContent>
                    </Card>

                    <Card className="h-fit">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Brain className="h-5 w-5" />
                          <span>Knowledge Sources</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AgentKnowledgeIntegration />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="marketplace" className="h-full m-0 p-0">
                  <AgentMarketplace />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>
      </div>

      {/* Live Preview Modal */}
      <LiveAgentPreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        agent={currentAgent}
      />
    </div>
  );
}