"use client";

import React, { useState, useRef, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Bot,
  User,
  Play,
  Square,
  RotateCcw,
  Download,
  Upload,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Database,
  FileText,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { type AgentConfiguration } from "@/lib/ai-assistant";

interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    responseTime?: number;
    tokensUsed?: number;
    cost?: number;
    toolCalls?: Array<{
      toolId: string;
      input: any;
      output: any;
      executionTime: number;
    }>;
    knowledgeSearches?: Array<{
      query: string;
      results: any[];
      sources: string[];
    }>;
  };
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  expectedOutcomes: string[];
  category: string;
}

interface AgentTestingInterfaceProps {
  agentId: string;
  agentConfiguration: Partial<AgentConfiguration>;
  onConfigurationUpdate?: (config: Partial<AgentConfiguration>) => void;
  className?: string;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: "greeting",
    name: "Basic Greeting",
    description: "Test basic greeting and introduction",
    messages: [
      { role: "user", content: "Hello, can you help me?" },
    ],
    expectedOutcomes: ["Friendly greeting", "Offers assistance", "Professional tone"],
    category: "basic",
  },
  {
    id: "complex-query",
    name: "Complex Query",
    description: "Test handling of complex multi-part questions",
    messages: [
      {
        role: "user",
        content: "I need help with my account billing, but I also want to know about your premium features and how to upgrade. Can you also tell me about your refund policy?",
      },
    ],
    expectedOutcomes: ["Addresses all parts", "Structured response", "Clear information"],
    category: "advanced",
  },
  {
    id: "error-handling",
    name: "Error Handling",
    description: "Test response to unclear or invalid requests",
    messages: [
      { role: "user", content: "asdfghjkl qwerty" },
    ],
    expectedOutcomes: ["Asks for clarification", "Remains helpful", "Suggests alternatives"],
    category: "edge-case",
  },
  {
    id: "conversation-flow",
    name: "Conversation Flow",
    description: "Test multi-turn conversation memory",
    messages: [
      { role: "user", content: "I'm having trouble with my password" },
      { role: "assistant", content: "I can help you reset your password. What's your email address?" },
      { role: "user", content: "It's john@example.com" },
      { role: "assistant", content: "Thanks! I've sent a password reset link to john@example.com. Is there anything else I can help you with?" },
      { role: "user", content: "What was my email again?" },
    ],
    expectedOutcomes: ["Remembers email", "Maintains context", "Consistent responses"],
    category: "memory",
  },
];

export default function AgentTestingInterface({
  agentId,
  agentConfiguration,
  onConfigurationUpdate,
  className,
}: AgentTestingInterfaceProps) {
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(
    () => `test-session-${Date.now()}`,
  );
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Array<{
    scenarioId: string;
    passed: boolean;
    score: number;
    feedback: string;
  }>>([]);
  const [activeTab, setActiveTab] = useState("chat");
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation, streamingResponse]);

  const sendMessage = async (content: string, isScenario = false) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setConversation(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingResponse("");

    try {
      // In production, this would be a real API call
      const response = await fetch(`/api/agents/${agentId}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: content,
          sessionId,
          includeToolCalls: true,
          includeKnowledgeSearch: true,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Simulate streaming response
      const mockResponse = generateMockResponse(content, agentConfiguration);
      
      // Simulate streaming by revealing characters gradually
      for (let i = 0; i <= mockResponse.content.length; i++) {
        setStreamingResponse(mockResponse.content.slice(0, i));
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      const assistantMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: mockResponse.content,
        timestamp: new Date(),
        metadata: mockResponse.metadata,
      };

      setConversation(prev => [...prev, assistantMessage]);
      
      // If this was a scenario test, evaluate the response
      if (isScenario && selectedScenario) {
        const scenario = TEST_SCENARIOS.find(s => s.id === selectedScenario);
        if (scenario) {
          const evaluation = evaluateResponse(mockResponse.content, scenario);
          setTestResults(prev => [
            ...prev.filter(r => r.scenarioId !== selectedScenario),
            {
              scenarioId: selectedScenario,
              passed: evaluation.score >= 0.7,
              score: evaluation.score,
              feedback: evaluation.feedback,
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ConversationMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingResponse("");
    }
  };

  const generateMockResponse = (input: string, config: Partial<AgentConfiguration>) => {
    // Mock response generation based on configuration
    const personality = config.personality || "helpful";
    const tone = config.tone || "friendly";
    
    let response = "";
    const responseTime = Math.random() * 2000 + 500; // 0.5-2.5 seconds
    const tokensUsed = Math.floor(Math.random() * 150) + 50;
    const cost = tokensUsed * 0.00002;

    // Generate response based on input and personality
    if (input.toLowerCase().includes("hello") || input.toLowerCase().includes("hi")) {
      if (personality === "professional") {
        response = "Good day! I'm here to assist you with your inquiries. How may I help you today?";
      } else if (personality === "friendly") {
        response = "Hello there! I'm excited to help you out. What can I do for you?";
      } else {
        response = "Hi! I'm ready to help. What would you like to know?";
      }
    } else if (input.toLowerCase().includes("help")) {
      response = "I'd be happy to help you! I can assist with a wide range of topics including customer support, technical questions, and general information. What specific area would you like help with?";
    } else if (input.toLowerCase().includes("password")) {
      response = "I can help you with password-related issues. For security reasons, I'll need to verify your identity first. Could you please provide your email address associated with the account?";
    } else if (input.toLowerCase().includes("billing")) {
      response = "I can assist you with billing questions. Let me help you understand your charges and payment options. What specific billing question do you have?";
    } else if (input.includes("asdfghjkl") || input.includes("qwerty")) {
      response = "I'm not sure I understand that request. Could you please rephrase your question or let me know what specific help you need? I'm here to assist you!";
    } else {
      response = `I understand you're asking about "${input}". Let me provide you with helpful information on this topic. Based on your question, I can offer several insights and suggestions.`;
    }

    // Add tool calls simulation
    const toolCalls = [];
    if (input.toLowerCase().includes("search") || input.toLowerCase().includes("find")) {
      toolCalls.push({
        toolId: "web-search",
        input: { query: input },
        output: { results: ["Mock search result 1", "Mock search result 2"] },
        executionTime: 1200,
      });
    }

    // Add knowledge search simulation
    const knowledgeSearches = [];
    if (input.toLowerCase().includes("policy") || input.toLowerCase().includes("documentation")) {
      knowledgeSearches.push({
        query: input,
        results: ["Relevant policy document", "FAQ entry"],
        sources: ["company-policy.pdf", "faq-database"],
      });
    }

    return {
      content: response,
      metadata: {
        responseTime,
        tokensUsed,
        cost,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        knowledgeSearches: knowledgeSearches.length > 0 ? knowledgeSearches : undefined,
      },
    };
  };

  const evaluateResponse = (response: string, scenario: TestScenario) => {
    // Mock evaluation logic
    let score = 0.5; // Base score
    let feedback = "Response evaluation: ";

    // Check for expected outcomes
    scenario.expectedOutcomes.forEach(outcome => {
      if (outcome.toLowerCase().includes("greeting") && 
          (response.toLowerCase().includes("hello") || response.toLowerCase().includes("hi"))) {
        score += 0.2;
        feedback += "✓ Includes greeting. ";
      } else if (outcome.toLowerCase().includes("helpful") && 
                 response.toLowerCase().includes("help")) {
        score += 0.2;
        feedback += "✓ Offers help. ";
      } else if (outcome.toLowerCase().includes("clarification") && 
                 response.toLowerCase().includes("understand")) {
        score += 0.3;
        feedback += "✓ Asks for clarification. ";
      }
    });

    return { score: Math.min(score, 1), feedback };
  };

  const runScenario = async (scenario: TestScenario) => {
    setSelectedScenario(scenario.id);
    setActiveTab("chat");
    
    // Clear conversation and start fresh
    setConversation([]);
    setSessionId(`scenario-${scenario.id}-${Date.now()}`);
    
    // Send the first message from the scenario
    if (scenario.messages.length > 0) {
      await sendMessage(scenario.messages[0].content, true);
    }
  };

  const clearConversation = () => {
    setConversation([]);
    setSessionId(`test-session-${Date.now()}`);
    setSelectedScenario(null);
  };

  const exportConversation = () => {
    const exportData = {
      agentId,
      sessionId,
      agentConfiguration,
      conversation,
      testResults,
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-test-${agentId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(currentMessage);
    }
  };

  return (
    <div className={`h-full ${className}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <TabsList>
            <TabsTrigger value="chat">Live Testing</TabsTrigger>
            <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
            <TabsTrigger value="results">Test Results</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={clearConversation}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button variant="outline" size="sm" onClick={exportConversation}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col p-0">
          <div className="flex-1 flex">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {conversation.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex gap-3 max-w-[80%] ${
                          message.role === "user" ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {message.role === "user" ? (
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-primary-foreground" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                              <Bot className="h-4 w-4 text-secondary-foreground" />
                            </div>
                          )}
                        </div>
                        <div
                          className={`rounded-lg p-3 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {message.metadata && (
                            <div className="mt-2 pt-2 border-t border-border/20">
                              <div className="flex items-center gap-4 text-xs opacity-70">
                                {message.metadata.responseTime && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {(message.metadata.responseTime / 1000).toFixed(1)}s
                                  </div>
                                )}
                                {message.metadata.tokensUsed && (
                                  <div className="flex items-center gap-1">
                                    <Zap className="h-3 w-3" />
                                    {message.metadata.tokensUsed} tokens
                                  </div>
                                )}
                                {message.metadata.cost && (
                                  <div>${message.metadata.cost.toFixed(4)}</div>
                                )}
                              </div>
                              {message.metadata.toolCalls && (
                                <div className="mt-1">
                                  <div className="text-xs opacity-70">Tool calls:</div>
                                  {message.metadata.toolCalls.map((call, index) => (
                                    <Badge key={index} variant="outline" className="text-xs mr-1">
                                      {call.toolId}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {message.metadata.knowledgeSearches && (
                                <div className="mt-1">
                                  <div className="text-xs opacity-70">Knowledge sources:</div>
                                  {message.metadata.knowledgeSearches.map((search, index) => (
                                    <div key={index} className="text-xs opacity-70">
                                      {search.sources.join(", ")}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Streaming response */}
                  {isStreaming && streamingResponse && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex gap-3 max-w-[80%]">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                            <Bot className="h-4 w-4 text-secondary-foreground" />
                          </div>
                        </div>
                        <div className="rounded-lg p-3 bg-secondary">
                          <p className="text-sm whitespace-pre-wrap">{streamingResponse}</p>
                          <div className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Loading indicator */}
                  {isLoading && !isStreaming && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                            <Bot className="h-4 w-4 text-secondary-foreground" />
                          </div>
                        </div>
                        <div className="rounded-lg p-3 bg-secondary">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              {/* Input Area */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => sendMessage(currentMessage)}
                    disabled={isLoading || !currentMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Session Info Sidebar */}
            <div className="w-80 border-l p-4 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Session Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Session ID:</span>
                    <span className="font-mono text-xs">{sessionId.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Messages:</span>
                    <span>{conversation.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model:</span>
                    <span>{agentConfiguration.model || "gpt-3.5-turbo"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Temperature:</span>
                    <span>{agentConfiguration.temperature || 0.7}</span>
                  </div>
                </div>
              </div>
              
              {selectedScenario && (
                <div>
                  <h3 className="font-semibold mb-2">Active Scenario</h3>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium text-sm">
                      {TEST_SCENARIOS.find(s => s.id === selectedScenario)?.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {TEST_SCENARIOS.find(s => s.id === selectedScenario)?.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scenarios" className="flex-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEST_SCENARIOS.map((scenario) => {
              const result = testResults.find(r => r.scenarioId === scenario.id);
              return (
                <Card key={scenario.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{scenario.name}</CardTitle>
                      {result && (
                        <Badge variant={result.passed ? "default" : "destructive"}>
                          {result.passed ? "Passed" : "Failed"}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{scenario.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Expected Outcomes:</p>
                        <div className="flex flex-wrap gap-1">
                          {scenario.expectedOutcomes.map((outcome, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {outcome}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      {result && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Score:</span>
                            <span className="font-bold">{Math.round(result.score * 100)}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{result.feedback}</p>
                        </div>
                      )}
                      
                      <Button
                        onClick={() => runScenario(scenario)}
                        className="w-full"
                        size="sm"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run Test
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="results" className="flex-1 p-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Test Results</h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {testResults.filter(r => r.passed).length} / {testResults.length} Passed
                </Badge>
              </div>
            </div>
            
            {testResults.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No test results yet</p>
                    <p className="text-sm text-muted-foreground">Run some test scenarios to see results here</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {testResults.map((result) => {
                  const scenario = TEST_SCENARIOS.find(s => s.id === result.scenarioId);
                  if (!scenario) return null;
                  
                  return (
                    <Card key={result.scenarioId}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">{scenario.name}</h3>
                            <p className="text-sm text-muted-foreground">{scenario.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={result.passed ? "default" : "destructive"}>
                              {Math.round(result.score * 100)}%
                            </Badge>
                            {result.passed ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Performance Score</span>
                            <span>{Math.round(result.score * 100)}%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                result.score >= 0.8
                                  ? "bg-green-600"
                                  : result.score >= 0.6
                                    ? "bg-yellow-600"
                                    : "bg-red-600"
                              }`}
                              style={{ width: `${result.score * 100}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm">{result.feedback}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
