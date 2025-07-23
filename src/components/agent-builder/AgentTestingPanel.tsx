"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Square,
  MessageSquare,
  BarChart,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Send,
  Bot,
  User,
  Loader2,
  TrendingUp,
  Target,
  Award,
} from "lucide-react";
import { AgentAPI, type AgentExecutionResult, type AgentTestResult } from "@/lib/agent-api";
import { useToast } from "@/components/ui/use-toast";

interface AgentTestingPanelProps {
  agentId?: string;
  onExecutionResult?: (result: AgentExecutionResult) => void;
  className?: string;
}

interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    tokensUsed?: number;
    cost?: number;
    executionTime?: number;
    toolCalls?: any[];
    knowledgeSearches?: any[];
  };
}

export default function AgentTestingPanel({
  agentId,
  onExecutionResult,
  className = "",
}: AgentTestingPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("chat");
  const [isExecuting, setIsExecuting] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  
  // Chat state
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Testing state
  const [testName, setTestName] = useState("");
  const [testType, setTestType] = useState<"unit" | "integration" | "performance" | "ab_test">("unit");
  const [testInput, setTestInput] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [testResults, setTestResults] = useState<AgentTestResult[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);
  
  // Performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState({
    averageResponseTime: 0,
    totalExecutions: 0,
    successRate: 0,
    totalCost: 0,
    totalTokens: 0,
  });

  // Execute agent with chat input
  const handleSendMessage = async () => {
    if (!currentInput.trim() || !agentId || isExecuting) return;

    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: currentInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput("");
    setIsExecuting(true);

    try {
      const result = await AgentAPI.executeAgent(agentId, {
        input: currentInput,
        sessionId,
        includeToolCalls: true,
        includeKnowledgeSearch: true,
      });

      const assistantMessage: ConversationMessage = {
        id: result.id,
        role: "assistant",
        content: result.output,
        timestamp: new Date(),
        metadata: {
          tokensUsed: result.tokensUsed,
          cost: result.cost,
          executionTime: result.executionTimeMs,
          toolCalls: result.toolCalls,
          knowledgeSearches: result.knowledgeSearches,
        },
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update performance metrics
      setPerformanceMetrics(prev => ({
        averageResponseTime: (prev.averageResponseTime * prev.totalExecutions + result.executionTimeMs) / (prev.totalExecutions + 1),
        totalExecutions: prev.totalExecutions + 1,
        successRate: result.status === 'COMPLETED' ? 
          (prev.successRate * prev.totalExecutions + 1) / (prev.totalExecutions + 1) :
          (prev.successRate * prev.totalExecutions) / (prev.totalExecutions + 1),
        totalCost: prev.totalCost + (result.cost || 0),
        totalTokens: prev.totalTokens + (result.tokensUsed || 0),
      }));

      if (onExecutionResult) {
        onExecutionResult(result);
      }

      toast({
        title: "Message sent successfully",
        description: `Response generated in ${result.executionTimeMs}ms`,
      });
    } catch (error) {
      console.error('Error executing agent:', error);
      toast({
        title: "Error",
        description: "Failed to execute agent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Run a test case
  const handleRunTest = async () => {
    if (!testName.trim() || !testInput.trim() || !agentId || isRunningTest) return;

    setIsRunningTest(true);

    try {
      const result = await AgentAPI.testAgent(agentId, {
        testName,
        testType,
        testInput: { input: testInput },
        expectedOutput: expectedOutput ? { output: expectedOutput } : undefined,
      });

      setTestResults(prev => [result, ...prev]);
      
      toast({
        title: result.passed ? "Test Passed" : "Test Failed",
        description: `Test "${testName}" completed with ${result.passed ? 'success' : 'failure'}`,
        variant: result.passed ? "default" : "destructive",
      });

      // Clear form
      setTestName("");
      setTestInput("");
      setExpectedOutput("");
    } catch (error) {
      console.error('Error running test:', error);
      toast({
        title: "Error",
        description: "Failed to run test. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  // Clear conversation
  const handleClearConversation = () => {
    setMessages([]);
    setPerformanceMetrics({
      averageResponseTime: 0,
      totalExecutions: 0,
      successRate: 0,
      totalCost: 0,
      totalTokens: 0,
    });
  };

  // Handle Enter key in chat input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className={`h-full bg-background ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Agent Testing
          {performanceMetrics.totalExecutions > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {performanceMetrics.totalExecutions} executions
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Test your agent with real conversations and automated test cases
        </CardDescription>
      </CardHeader>

      <CardContent className="h-[calc(100%-120px)]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Live Chat
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Test Cases
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Metrics
            </TabsTrigger>
          </TabsList>

          {/* Live Chat Tab */}
          <TabsContent value="chat" className="h-[calc(100%-60px)] flex flex-col">
            <div className="flex-1 flex flex-col">
              {/* Messages */}
              <ScrollArea className="flex-1 border rounded-lg p-4 mb-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Start a conversation with your agent</p>
                      <p className="text-sm">Type a message below to begin testing</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            {message.role === 'user' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </div>
                          <div className={`rounded-lg p-3 ${
                            message.role === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            {message.metadata && (
                              <div className="mt-2 pt-2 border-t border-border/20">
                                <div className="flex items-center gap-4 text-xs opacity-70">
                                  {message.metadata.executionTime && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {message.metadata.executionTime}ms
                                    </span>
                                  )}
                                  {message.metadata.tokensUsed && (
                                    <span className="flex items-center gap-1">
                                      <Zap className="h-3 w-3" />
                                      {message.metadata.tokensUsed} tokens
                                    </span>
                                  )}
                                  {message.metadata.cost && (
                                    <span>${message.metadata.cost.toFixed(4)}</span>
                                  )}
                                </div>
                                {message.metadata.toolCalls && message.metadata.toolCalls.length > 0 && (
                                  <div className="mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {message.metadata.toolCalls.length} tool call(s)
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message here..."
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 min-h-[60px] resize-none"
                  disabled={isExecuting || !agentId}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleSendMessage}
                    disabled={!currentInput.trim() || isExecuting || !agentId}
                    className="h-[60px] px-4"
                  >
                    {isExecuting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {messages.length > 0 && (
                <div className="flex justify-between items-center mt-2">
                  <div className="text-xs text-muted-foreground">
                    Session ID: {sessionId.slice(0, 8)}...
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearConversation}
                  >
                    Clear Conversation
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Test Cases Tab */}
          <TabsContent value="testing" className="h-[calc(100%-60px)] flex flex-col">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* Test Creation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Create Test Case</CardTitle>
                  <CardDescription>
                    Define test scenarios to validate agent behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Test Name</label>
                    <Input
                      placeholder="e.g., Customer greeting test"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Test Type</label>
                    <Select value={testType} onValueChange={(value: any) => setTestType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unit">Unit Test</SelectItem>
                        <SelectItem value="integration">Integration Test</SelectItem>
                        <SelectItem value="performance">Performance Test</SelectItem>
                        <SelectItem value="ab_test">A/B Test</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Test Input</label>
                    <Textarea
                      placeholder="Enter the input message for testing..."
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Expected Output (Optional)</label>
                    <Textarea
                      placeholder="Enter expected response for validation..."
                      value={expectedOutput}
                      onChange={(e) => setExpectedOutput(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <Button
                    onClick={handleRunTest}
                    disabled={!testName.trim() || !testInput.trim() || isRunningTest || !agentId}
                    className="w-full"
                  >
                    {isRunningTest ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Running Test...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Test
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Test Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Results</CardTitle>
                  <CardDescription>
                    View test execution results and performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {testResults.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No test results yet</p>
                          <p className="text-sm">Run a test to see results here</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {testResults.map((result, index) => (
                          <Card key={result.testId} className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {result.passed ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-500" />
                                )}
                                <span className="font-medium">Test #{testResults.length - index}</span>
                              </div>
                              <Badge variant={result.passed ? "default" : "destructive"}>
                                {result.passed ? "PASSED" : "FAILED"}
                              </Badge>
                            </div>
                            
                            {result.score !== undefined && (
                              <div className="mb-2">
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Score</span>
                                  <span>{Math.round(result.score * 100)}%</span>
                                </div>
                                <Progress value={result.score * 100} className="h-2" />
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Response Time:</span>
                                <span className="ml-1 font-medium">{result.metrics.responseTime}ms</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Tokens:</span>
                                <span className="ml-1 font-medium">{result.metrics.tokenUsage}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Cost:</span>
                                <span className="ml-1 font-medium">${result.metrics.cost.toFixed(4)}</span>
                              </div>
                              {result.metrics.accuracy !== undefined && (
                                <div>
                                  <span className="text-muted-foreground">Accuracy:</span>
                                  <span className="ml-1 font-medium">{Math.round(result.metrics.accuracy * 100)}%</span>
                                </div>
                              )}
                            </div>
                            
                            {result.errorMessage && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                                {result.errorMessage}
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="h-[calc(100%-60px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Avg Response Time</span>
                </div>
                <div className="text-2xl font-bold">
                  {Math.round(performanceMetrics.averageResponseTime)}ms
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Success Rate</span>
                </div>
                <div className="text-2xl font-bold">
                  {Math.round(performanceMetrics.successRate * 100)}%
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Total Tokens</span>
                </div>
                <div className="text-2xl font-bold">
                  {performanceMetrics.totalTokens.toLocaleString()}
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Total Cost</span>
                </div>
                <div className="text-2xl font-bold">
                  ${performanceMetrics.totalCost.toFixed(4)}
                </div>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>
                  Detailed metrics from your agent testing sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {performanceMetrics.totalExecutions === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <div className="text-center">
                      <BarChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No performance data yet</p>
                      <p className="text-sm">Start testing to see metrics</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Execution Summary</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total Executions:</span>
                            <span className="font-medium">{performanceMetrics.totalExecutions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Successful:</span>
                            <span className="font-medium text-green-600">
                              {Math.round(performanceMetrics.successRate * performanceMetrics.totalExecutions)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Failed:</span>
                            <span className="font-medium text-red-600">
                              {performanceMetrics.totalExecutions - Math.round(performanceMetrics.successRate * performanceMetrics.totalExecutions)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Cost Analysis</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Cost per Execution:</span>
                            <span className="font-medium">
                              ${(performanceMetrics.totalCost / performanceMetrics.totalExecutions).toFixed(4)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tokens per Execution:</span>
                            <span className="font-medium">
                              {Math.round(performanceMetrics.totalTokens / performanceMetrics.totalExecutions)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
