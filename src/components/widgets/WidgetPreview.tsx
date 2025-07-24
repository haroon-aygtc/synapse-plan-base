'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageCircle,
  Send,
  Bot,
  User,
  Minimize2,
  Maximize2,
  X,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetConfiguration {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
    fontSize: number;
    fontFamily?: string;
  };
  layout: {
    width: number;
    height: number;
    position: string;
    responsive: boolean;
  };
  behavior: {
    autoOpen: boolean;
    showWelcomeMessage: boolean;
    enableTypingIndicator: boolean;
    enableSoundNotifications: boolean;
  };
  branding: {
    showLogo: boolean;
    companyName?: string;
    logoUrl?: string;
    showPoweredBy?: boolean;
    poweredByText?: string;
  };
}

interface Widget {
  id?: string;
  name: string;
  description?: string;
  type: 'agent' | 'tool' | 'workflow';
  sourceId: string;
  configuration: WidgetConfiguration;
  isActive: boolean;
  isDeployed: boolean;
  version: string;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface WidgetPreviewProps {
  widget: Widget;
  device: 'desktop' | 'mobile' | 'tablet';
}

export function WidgetPreview({ widget, device }: WidgetPreviewProps) {
  const [isOpen, setIsOpen] = useState(widget.configuration.behavior.autoOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (
      widget.configuration.behavior.showWelcomeMessage &&
      messages.length === 0
    ) {
      setMessages([
        {
          id: 'welcome',
          content: `Hello! I'm your ${widget.type} assistant. How can I help you today?`,
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    }
  }, [
    widget.configuration.behavior.showWelcomeMessage,
    widget.type,
    messages.length,
  ]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Simulate bot response
    if (widget.configuration.behavior.enableTypingIndicator) {
      setIsTyping(true);
    }

    setTimeout(() => {
      setIsTyping(false);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `This is a preview response from your ${widget.type}. In the actual widget, this would be processed by your configured ${widget.type}.`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1500);
  };

  const getDeviceStyles = () => {
    switch (device) {
      case 'mobile':
        return {
          width: Math.min(widget.configuration.layout.width, 320),
          height: Math.min(widget.configuration.layout.height, 568),
        };
      case 'tablet':
        return {
          width: Math.min(widget.configuration.layout.width, 768),
          height: Math.min(widget.configuration.layout.height, 1024),
        };
      default:
        return {
          width: widget.configuration.layout.width,
          height: widget.configuration.layout.height,
        };
    }
  };

  const deviceStyles = getDeviceStyles();

  const widgetStyles = {
    backgroundColor: widget.configuration.theme.backgroundColor,
    color: widget.configuration.theme.textColor,
    borderRadius: `${widget.configuration.theme.borderRadius}px`,
    fontSize: `${widget.configuration.theme.fontSize}px`,
    fontFamily: widget.configuration.theme.fontFamily || 'Inter, sans-serif',
    width: `${deviceStyles.width}px`,
    height: `${deviceStyles.height}px`,
  };

  const primaryButtonStyles = {
    backgroundColor: widget.configuration.theme.primaryColor,
    borderColor: widget.configuration.theme.primaryColor,
  };

  if (!isOpen) {
    return (
      <div className="relative">
        <div className="flex justify-center mb-4">
          <Badge variant="outline">Preview Mode</Badge>
        </div>
        <div className="flex justify-center">
          <Button
            onClick={() => setIsOpen(true)}
            className="rounded-full w-16 h-16 shadow-lg"
            style={primaryButtonStyles}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex justify-center mb-4">
        <Badge variant="outline">Preview Mode - {device}</Badge>
      </div>

      <div
        className="border shadow-lg overflow-hidden flex flex-col"
        style={widgetStyles}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 border-b"
          style={{ backgroundColor: widget.configuration.theme.primaryColor }}
        >
          <div className="flex items-center gap-2">
            {widget.configuration.branding.showLogo && (
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                {widget.configuration.branding.logoUrl ? (
                  <img
                    src={widget.configuration.branding.logoUrl}
                    alt="Logo"
                    className="w-4 h-4 rounded-full"
                  />
                ) : (
                  <Bot className="h-4 w-4 text-gray-600" />
                )}
              </div>
            )}
            <div className="text-white">
              <div className="font-medium text-sm">
                {widget.configuration.branding.companyName || widget.name}
              </div>
              <div className="text-xs opacity-90">Online</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-2',
                      message.sender === 'user'
                        ? 'justify-end'
                        : 'justify-start',
                    )}
                  >
                    {message.sender === 'bot' && (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-3 w-3 text-gray-600" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] p-2 rounded-lg text-sm',
                        message.sender === 'user'
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-900',
                      )}
                      style={{
                        backgroundColor:
                          message.sender === 'user'
                            ? widget.configuration.theme.primaryColor
                            : undefined,
                      }}
                    >
                      {message.content}
                    </div>
                    {message.sender === 'user' && (
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3 w-3 text-gray-600" />
                    </div>
                    <div className="bg-gray-100 p-2 rounded-lg text-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1"
                  style={{
                    fontSize: `${widget.configuration.theme.fontSize}px`,
                    fontFamily: widget.configuration.theme.fontFamily,
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  size="sm"
                  style={primaryButtonStyles}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Footer */}
            {widget.configuration.branding.showPoweredBy && (
              <div className="px-3 py-2 border-t bg-gray-50">
                <div className="text-xs text-gray-500 text-center">
                  {widget.configuration.branding.poweredByText ||
                    'Powered by SynapseAI'}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
