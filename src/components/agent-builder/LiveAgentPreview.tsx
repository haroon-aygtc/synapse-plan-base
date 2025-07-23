'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Settings, 
  Trash2,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Zap,
  DollarSign
} from 'lucide-react';

import { Agent, AgentExecutionResult, useAgentBuilder } from '@/hooks/useAgentBuilder';
import { toast } from '@/components/ui/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    tokensUsed?: number;
    cost?: number;
    executionTime?: number;
    toolCalls?: Array<{
      toolId: string;
      input: Record<string, any>;
      output: Record<string, any>;
    }>;
    knowledgeSearches?: Array<{
      query: string;
      results: any[];
      sources: string[];
    }>;
  };
}

interface LiveAgentPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
}

export function LiveAgentPreview({ isOpen, onClose, agent }: LiveAgentPreviewProps) {
  const { executeAgent } = useAgentBuilder();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || !agent || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result: AgentExecutionResult = await executeAgent(
        agent.id,
        userMessage.content,
        {
          sessionId,
          context: { conversationHistory: messages.slice(-10) },
          metadata: { source: 'live_preview' }
        }
      );

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
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
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        metadata: {
          executionTime: 0,
          tokensUsed: 0,
          cost: 0,
        },
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Execution Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, agent, isLoading, executeAgent, sessionId, messages]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied',
      description: 'Message copied to clipboard',
    });
  }, []);

  const formatCost = useCallback((cost?: number) => {
    if (!cost) return '$0.00';
    return `$${cost.toFixed(4)}`;
  }, []);

  const formatExecutionTime = useCallback((time?: number) => {
    if (!time) return '0ms';
    return time > 1000 ? `${(time / 1000).toFixed(1)}s` : `${time}ms`;
  }, []);

  if (!agent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>{agent.name} - Live Preview</DialogTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {agent.model}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Temp: {agent.temperature}
                  </Badge>
                  <Badge variant={agent.isActive ? 'default' : 'secondary'} className="text-xs">
                    {agent.isActive ? 'Active' : 'Draft'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearConversation}
                disabled={messages.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {/* Chat Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-1">
          <div className="space-y-4 py-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Start a conversation</p>
                <p className="text-sm">Send a message to test your agent</p>
              </div>
            )}

            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      <div className={`p-1.5 rounded-full ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="h-3 w-3" />
                        ) : (
                          <Bot className="h-3 w-3" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <div className={`rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-6'
                        : 'bg-muted mr-6'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {message.metadata && message.role === 'assistant' && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            {message.metadata.executionTime && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatExecutionTime(message.metadata.executionTime)}</span>
                              </div>
                            )}
                            {message.metadata.tokensUsed && (
                              <div className="flex items-center space-x-1">
                                <Zap className="h-3 w-3" />
                                <span>{message.metadata.tokensUsed} tokens</span>
                              </div>
                            )}
                            {message.metadata.cost && (
                              <div className="flex items-center space-x-1">
                                <DollarSign className="h-3 w-3" />
                                <span>{formatCost(message.metadata.cost)}</span>
                              </div>
                            )}
                          </div>
                          
                          {message.metadata.toolCalls && message.metadata.toolCalls.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs font-medium mb-1">Tool Calls:</div>
                              <div className="space-y-1">
                                {message.metadata.toolCalls.map((call, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {call.toolId}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {message.metadata.knowledgeSearches && message.metadata.knowledgeSearches.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs font-medium mb-1">Knowledge Sources:</div>
                              <div className="space-y-1">
                                {message.metadata.knowledgeSearches.map((search, index) => (
                                  <div key={index} className="text-xs">
                                    <Badge variant="outline" className="text-xs">
                                      {search.sources.length} sources
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-1 ml-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMessage(message.content)}
                        className="h-6 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      {message.role === 'assistant' && (
                        <>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[80%]">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="p-1.5 rounded-full bg-muted">
                      <Bot className="h-3 w-3" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="rounded-lg p-3 bg-muted mr-6">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t pt-4">
          <div className="flex items-center space-x-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>Session: {sessionId.slice(0, 8)}...</span>
              <span>{messages.length} messages</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>Press Enter to send</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}