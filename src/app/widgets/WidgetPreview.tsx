'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Smartphone, Tablet, MessageCircle, Send, Minimize2, X, Bot, Wrench, Workflow } from 'lucide-react';
import { WidgetConfiguration } from '@/lib/sdk/types';

interface Message {
  id: number;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
}

interface WidgetPreviewProps {
  configuration: WidgetConfiguration;
  sourceType?: 'agent' | 'tool' | 'workflow';
  sourceName?: string;
}

export function WidgetPreview({ configuration, sourceType, sourceName }: WidgetPreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'bot',
      content: configuration.behavior.showWelcomeMessage
        ? `Hello! I'm your ${sourceType || 'AI'} assistant. How can I help you today?`
        : 'Hello! How can I help you today?',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const deviceDimensions = {
    desktop: { width: configuration.layout.width, height: configuration.layout.height },
    tablet: { width: Math.min(configuration.layout.width, 400), height: Math.min(configuration.layout.height, 500) },
    mobile: { width: Math.min(configuration.layout.width, 320), height: Math.min(configuration.layout.height, 400) },
  };

  const currentDimensions = deviceDimensions[device];

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    if (configuration.behavior.enableTypingIndicator) {
      setIsTyping(true);
    }

    // Simulate bot response
    setTimeout(() => {
      setIsTyping(false);
      const botMessage: Message = {
        id: messages.length + 2,
        type: 'bot',
        content: `This is a preview response from your ${sourceType || 'AI assistant'}. In the actual widget, this would be powered by your ${sourceName || sourceType || 'source'}.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1500);
  };

  const getSourceIcon = () => {
    switch (sourceType) {
      case 'agent': return <Bot className="h-4 w-4" />;
      case 'tool': return <Wrench className="h-4 w-4" />;
      case 'workflow': return <Workflow className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const widgetStyle = {
    backgroundColor: configuration.theme.backgroundColor,
    color: configuration.theme.textColor,
    borderRadius: `${configuration.theme.borderRadius}px`,
    fontSize: `${configuration.theme.fontSize}px`,
    fontFamily: configuration.theme.fontFamily || 'system-ui, sans-serif',
    width: configuration.layout.responsive ? '100%' : `${currentDimensions.width}px`,
    height: isMinimized ? 'auto' : `${currentDimensions.height}px`,
    maxWidth: `${currentDimensions.width}px`,
    maxHeight: `${currentDimensions.height}px`,
  };

  return (
    <div className="space-y-4">
      {/* Device Selector */}
      <Tabs value={device} onValueChange={(value: any) => setDevice(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="desktop" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Desktop
          </TabsTrigger>
          <TabsTrigger value="tablet" className="flex items-center gap-2">
            <Tablet className="h-4 w-4" />
            Tablet
          </TabsTrigger>
          <TabsTrigger value="mobile" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Mobile
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Widget Preview */}
      <div className="relative">
        <div 
          className="border border-gray-200 shadow-lg overflow-hidden transition-all duration-300"
          style={widgetStyle}
        >
          {/* Widget Header */}
          <div 
            className="flex items-center justify-between p-3 border-b"
            style={{ 
              backgroundColor: configuration.theme.primaryColor,
              color: '#ffffff',
              borderColor: configuration.theme.secondaryColor + '20'
            }}
          >
            <div className="flex items-center gap-2">
              {getSourceIcon()}
              <span className="font-medium">
                {sourceName || `${sourceType || 'AI'} Assistant`}
              </span>
              {sourceType && (
                <Badge variant="secondary" className="text-xs">
                  {sourceType}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto" style={{ height: currentDimensions.height - 120 }}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-2 rounded-lg ${
                        message.type === 'user'
                          ? 'text-white'
                          : 'border'
                      }`}
                      style={{
                        backgroundColor: message.type === 'user' 
                          ? configuration.theme.primaryColor 
                          : configuration.theme.backgroundColor,
                        borderColor: message.type === 'bot' ? configuration.theme.secondaryColor + '40' : 'transparent',
                        color: message.type === 'user' ? '#ffffff' : configuration.theme.textColor,
                      }}
                    >
                      <div className="text-sm">{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isTyping && configuration.behavior.enableTypingIndicator && (
                  <div className="flex justify-start">
                    <div 
                      className="p-2 rounded-lg border"
                      style={{
                        backgroundColor: configuration.theme.backgroundColor,
                        borderColor: configuration.theme.secondaryColor + '40',
                        color: configuration.theme.textColor,
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-xs ml-2">Typing...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-3 border-t" style={{ borderColor: configuration.theme.secondaryColor + '20' }}>
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                    style={{
                      backgroundColor: configuration.theme.backgroundColor,
                      borderColor: configuration.theme.secondaryColor + '40',
                      color: configuration.theme.textColor,
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    size="sm"
                    disabled={!inputValue.trim()}
                    style={{ backgroundColor: configuration.theme.primaryColor }}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Branding */}
          {configuration.branding.showPoweredBy && (
            <div className="px-3 py-1 text-xs text-center opacity-60 border-t" style={{ borderColor: configuration.theme.secondaryColor + '20' }}>
              {configuration.branding.poweredByText || 'Powered by SynapseAI'}
            </div>
          )}
        </div>

        {/* Position Indicator */}
        <div className="absolute -top-6 right-0 text-xs text-gray-500">
          Position: {configuration.layout.position.replace('-', ' ')}
        </div>
      </div>

      {/* Preview Info */}
      <div className="text-sm text-gray-600 space-y-1">
        <div>Dimensions: {currentDimensions.width}×{currentDimensions.height}px</div>
        <div>Device: {device}</div>
        <div>Responsive: {configuration.layout.responsive ? 'Yes' : 'No'}</div>
        {sourceType && sourceName && (
          <div>Source: {sourceName} ({sourceType})</div>
        )}
      </div>
    </div>
  );
}
