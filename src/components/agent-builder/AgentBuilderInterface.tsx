"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAgentBuilderStore } from "@/store/agentBuilderStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Settings,
  Palette,
  Zap,
  TestTube,
  BarChart3,
  Sparkles,
  Eye,
  Code,
  HelpCircle,
  ChevronRight,
  CheckCircle,
} from "lucide-react";

// Import all the components
import { AIAssistedConfiguration } from "./AIAssistedConfiguration";
import { VisualAgentBuilder } from "./VisualAgentBuilder";
import { ComponentPalette } from "./ComponentPalette";
import AgentTestingInterface from "./AgentTestingInterface";
import { AgentPerformanceDashboard } from "./AgentPerformanceDashboard";
import { AgentToolLinking } from "./AgentToolLinking";
import { AgentKnowledgeIntegration } from "./AgentKnowledgeIntegration";
import { AgentMarketplace } from "./AgentMarketplace";
import { OnboardingSystem } from "./OnboardingSystem";
import { NaturalLanguageProcessor } from "./NaturalLanguageProcessor";

const COMPONENT_CATEGORIES = [
  {
    id: "core",
    name: "Core Components",
    icon: <Bot className="h-4 w-4" />,
    components: [
      {
        id: "agent",
        name: "Agent",
        description: "Main AI agent component",
        icon: <Bot className="h-5 w-5" />,
        color: "bg-blue-500",
        type: "agent",
      },
      {
        id: "trigger",
        name: "Trigger",
        description: "Event trigger",
        icon: <Zap className="h-5 w-5" />,
        color: "bg-yellow-500",
        type: "trigger",
      },
      {
        id: "condition",
        name: "Condition",
        description: "Logic condition",
        icon: <Settings className="h-5 w-5" />,
        color: "bg-purple-500",
        type: "condition",
      },
    ],
  },
];

export function AgentBuilderInterface() {
  const {
    activeTab,
    setActiveTab,
    showAIAssistant,
    showVisualBuilder,
    showComponentPalette,
    toggleAIAssistant,
    toggleVisualBuilder,
    toggleComponentPalette,
    onboarding,
    startOnboarding,
    currentAgent,
    discoverFeature,
  } = useAgentBuilderStore();

  const [completionProgress, setCompletionProgress] = useState(0);

  // Calculate completion progress
  useEffect(() => {
    if (currentAgent) {
      let completed = 0;
      const total = 6;

      if (currentAgent.name) completed++;
      if (currentAgent.description) completed++;
      if (currentAgent.personality) completed++;
      if (currentAgent.model) completed++;
      if (currentAgent.capabilities && currentAgent.capabilities.length > 0)
        completed++;
      if (currentAgent.tools && currentAgent.tools.length > 0) completed++;

      setCompletionProgress((completed / total) * 100);
    }
  }, [currentAgent]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as any);
    discoverFeature(`tab-${tab}`);
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case "basic":
        return <Bot className="h-4 w-4" />;
      case "personality":
        return <Palette className="h-4 w-4" />;
      case "model":
        return <Settings className="h-4 w-4" />;
      case "capabilities":
        return <Zap className="h-4 w-4" />;
      case "visual":
        return <Code className="h-4 w-4" />;
      case "testing":
        return <TestTube className="h-4 w-4" />;
      case "performance":
        return <BarChart3 className="h-4 w-4" />;
      case "marketplace":
        return <Bot className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getTabBadge = (tab: string) => {
    switch (tab) {
      case "basic":
        return currentAgent?.name ? (
          <CheckCircle className="h-3 w-3 text-green-500" />
        ) : null;
      case "personality":
        return currentAgent?.personality ? (
          <CheckCircle className="h-3 w-3 text-green-500" />
        ) : null;
      case "model":
        return currentAgent?.model ? (
          <CheckCircle className="h-3 w-3 text-green-500" />
        ) : null;
      case "capabilities":
        return currentAgent?.capabilities?.length ? (
          <CheckCircle className="h-3 w-3 text-green-500" />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Onboarding System */}
      <OnboardingSystem />

      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Agent Builder</h1>
                <p className="text-xs text-muted-foreground">
                  {currentAgent?.name || "Create your AI agent"}
                </p>
              </div>
            </div>

            {completionProgress > 0 && (
              <div className="flex items-center space-x-2">
                <Progress value={completionProgress} className="w-24 h-2" />
                <span className="text-xs text-muted-foreground">
                  {Math.round(completionProgress)}% complete
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!onboarding.isActive && (
              <Button variant="outline" size="sm" onClick={startOnboarding}>
                <HelpCircle className="h-4 w-4 mr-2" />
                Tutorial
              </Button>
            )}

            <Button
              variant={showAIAssistant ? "default" : "outline"}
              size="sm"
              onClick={toggleAIAssistant}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Assistant
            </Button>

            <Button
              variant={showVisualBuilder ? "default" : "outline"}
              size="sm"
              onClick={toggleVisualBuilder}
            >
              <Eye className="h-4 w-4 mr-2" />
              Visual Builder
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar - Component Palette */}
        <AnimatePresence>
          {showComponentPalette && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-r bg-card/50 backdrop-blur-sm overflow-hidden"
            >
              <div className="p-4 border-b">
                <h3 className="font-semibold flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Components</span>
                </h3>
              </div>
              <ComponentPalette categories={COMPONENT_CATEGORIES} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="flex-1 flex flex-col"
          >
            <div className="border-b">
              <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0">
                {[
                  { id: "basic", label: "Basic Setup" },
                  { id: "personality", label: "Personality" },
                  { id: "model", label: "AI Model" },
                  { id: "capabilities", label: "Capabilities" },
                  { id: "visual", label: "Visual Builder" },
                  { id: "testing", label: "Testing" },
                  { id: "performance", label: "Performance" },
                  { id: "marketplace", label: "Marketplace" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <div className="flex items-center space-x-2">
                      {getTabIcon(tab.id)}
                      <span>{tab.label}</span>
                      {getTabBadge(tab.id)}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="basic" className="h-full m-0 p-0">
                <div className="h-full flex">
                  <div className="flex-1 overflow-auto">
                    <div className="p-6">
                      <NaturalLanguageProcessor />
                    </div>
                  </div>
                  {showAIAssistant && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 400, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="border-l bg-card/50 backdrop-blur-sm overflow-auto"
                    >
                      <AIAssistedConfiguration />
                    </motion.div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="personality" className="h-full m-0 p-0">
                <div className="h-full overflow-auto p-6">
                  <AIAssistedConfiguration />
                </div>
              </TabsContent>

              <TabsContent value="model" className="h-full m-0 p-0">
                <div className="h-full overflow-auto p-6">
                  <AIAssistedConfiguration />
                </div>
              </TabsContent>

              <TabsContent value="capabilities" className="h-full m-0 p-0">
                <div className="h-full flex">
                  <div className="flex-1 overflow-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                      <AgentToolLinking />
                      <AgentKnowledgeIntegration />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="visual" className="h-full m-0 p-0">
                {showVisualBuilder ? (
                  <VisualAgentBuilder />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <Card className="w-96">
                      <CardContent className="p-6 text-center">
                        <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          Visual Builder
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Enable the visual builder to create workflows with
                          drag-and-drop components.
                        </p>
                        <Button onClick={toggleVisualBuilder}>
                          <Eye className="h-4 w-4 mr-2" />
                          Enable Visual Builder
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="testing" className="h-full m-0 p-0">
                <AgentTestingInterface
                  agentId={currentAgent?.id || ""}
                  agentConfiguration={currentAgent || {}}
                  className="h-full"
                />
              </TabsContent>

              <TabsContent value="performance" className="h-full m-0 p-0">
                <div className="h-full overflow-auto">
                  <AgentPerformanceDashboard />
                </div>
              </TabsContent>

              <TabsContent value="marketplace" className="h-full m-0 p-0">
                <div className="h-full overflow-auto">
                  <AgentMarketplace />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
