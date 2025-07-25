/**
 * Widget Embed Code Generator
 * Generates production-ready embed code for different platforms
 */

import { Widget, WidgetConfiguration } from "@/lib/sdk/types";

export interface EmbedOptions {
  format: "javascript" | "iframe" | "react" | "vue" | "angular";
  containerId?: string;
  width?: string;
  height?: string;
  responsive?: boolean;
  theme?: Record<string, any>;
  customCSS?: string;
  enableAnalytics?: boolean;
  enableCaching?: boolean;
  customDomain?: string;
}

export class WidgetEmbedGenerator {
  private baseURL: string;
  private apiKey: string;
  private cdnURL: string;

  constructor(
    baseURL: string = process.env.NEXT_PUBLIC_WIDGET_URL ||
      "https://widgets.synapseai.com",
    apiKey: string = process.env.WIDGET_API_KEY || "",
    cdnURL: string = process.env.NEXT_PUBLIC_CDN_URL ||
      "https://cdn.synapseai.com",
  ) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.cdnURL = cdnURL;
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    return (
      "sess_" + Date.now() + "_" + Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Generate widget access token
   */
  private generateWidgetToken(widgetId: string, sessionId: string): string {
    // In production, this would be a proper JWT token
    const payload = {
      widgetId,
      sessionId,
      timestamp: Date.now(),
      origin:
        typeof window !== "undefined" ? window.location.origin : "unknown",
    };
    return btoa(JSON.stringify(payload));
  }

  /**
   * Generate embed code for a widget
   */
  generateEmbedCode(widget: Widget, options: EmbedOptions): string {
    switch (options.format) {
      case "javascript":
        return this.generateJavaScriptEmbed(widget, options);
      case "iframe":
        return this.generateIframeEmbed(widget, options);
      case "react":
        return this.generateReactEmbed(widget, options);
      case "vue":
        return this.generateVueEmbed(widget, options);
      case "angular":
        return this.generateAngularEmbed(widget, options);
      default:
        throw new Error(`Unsupported embed format: ${options.format}`);
    }
  }

  /**
   * Generate JavaScript embed code
   */
  private generateJavaScriptEmbed(
    widget: Widget,
    options: EmbedOptions,
  ): string {
    const containerId = options.containerId || "synapse-widget";
    const config = this.mergeConfiguration(widget.configuration, options);
    const sessionId = this.generateSessionId();
    const widgetToken = this.generateWidgetToken(widget.id, sessionId);
    const embedUrl = options.customDomain
      ? `https://${options.customDomain}`
      : this.baseURL;

    return `
<!-- SynapseAI Widget: ${widget.name} -->
<div id="${containerId}"></div>
<script>
(function() {
  'use strict';
  
  // Widget configuration
  const widgetConfig = {
    widgetId: '${widget.id}',
    sessionId: '${sessionId}',
    token: '${widgetToken}',
    baseURL: '${embedUrl}',
    cdnURL: '${this.cdnURL}',
    configuration: ${JSON.stringify(config, null, 4)},
    responsive: ${options.responsive !== false},
    enableAnalytics: ${options.enableAnalytics !== false},
    enableCaching: ${options.enableCaching !== false},
    theme: ${JSON.stringify(options.theme || {}, null, 4)},
    origin: window.location.origin,
    timestamp: Date.now()
  };

  // Security and validation
  function validateOrigin() {
    const allowedDomains = ${JSON.stringify(config.security.allowedDomains)};
    if (allowedDomains.length === 0) return true;
    
    const currentDomain = window.location.hostname;
    return allowedDomains.some(domain => {
      if (domain.startsWith('*.')) {
        return currentDomain.endsWith(domain.substring(2));
      }
      return currentDomain === domain;
    });
  }

  // Rate limiting
  const rateLimiter = {
    requests: [],
    limit: ${config.security.rateLimiting.requestsPerMinute},
    window: 60000, // 1 minute
    
    canMakeRequest: function() {
      const now = Date.now();
      this.requests = this.requests.filter(time => now - time < this.window);
      return this.requests.length < this.limit;
    },
    
    recordRequest: function() {
      this.requests.push(Date.now());
    }
  };

  // Analytics tracking
  function trackEvent(eventType, data = {}) {
    if (!widgetConfig.enableAnalytics) return;
    
    const event = {
      type: eventType,
      widgetId: widgetConfig.widgetId,
      sessionId: widgetConfig.sessionId,
      timestamp: new Date().toISOString(),
      data: {
        ...data,
        userAgent: navigator.userAgent,
        pageUrl: window.location.href,
        referrer: document.referrer
      }
    };
    
    // Send to analytics endpoint
    fetch(widgetConfig.baseURL + '/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + widgetConfig.token
      },
      body: JSON.stringify(event)
    }).catch(err => console.warn('Analytics tracking failed:', err));
  }

  // Device detection
  function getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let deviceType = 'desktop';
    
    if (/Mobile|Android|iPhone/.test(userAgent)) {
      deviceType = /iPad|tablet/i.test(userAgent) ? 'tablet' : 'mobile';
    }
    
    return {
      type: deviceType,
      userAgent,
      screenResolution: {
        width: screen.width,
        height: screen.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  // Create widget container
  function createWidget() {
    // Validate origin
    if (!validateOrigin()) {
      console.error('SynapseAI Widget: Origin not allowed');
      return;
    }
    
    const container = document.getElementById('${containerId}');
    if (!container) {
      console.error('SynapseAI Widget: Container element not found');
      return;
    }

    // Create secure iframe
    const iframe = document.createElement('iframe');
    const iframeSrc = new URL(widgetConfig.baseURL + '/embed/' + widgetConfig.widgetId);
    iframeSrc.searchParams.set('origin', widgetConfig.origin);
    iframeSrc.searchParams.set('session', widgetConfig.sessionId);
    iframeSrc.searchParams.set('token', widgetConfig.token);
    iframeSrc.searchParams.set('theme', JSON.stringify(widgetConfig.theme));
    
    iframe.src = iframeSrc.toString();
    iframe.style.width = '${options.width || config.layout.width + "px"}';
    iframe.style.height = '${options.height || config.layout.height + "px"}';
    iframe.style.border = 'none';
    iframe.style.borderRadius = config.theme.borderRadius + 'px';
    iframe.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    iframe.allow = 'microphone; camera; geolocation';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals';
    iframe.loading = 'lazy';
    iframe.title = '${widget.name} - Powered by SynapseAI';
    
    // Apply responsive styles
    if (widgetConfig.responsive) {
      iframe.style.maxWidth = '100%';
      iframe.style.minHeight = '300px';
    }

    // Apply positioning
    if (widgetConfig.configuration.layout.position !== 'center') {
      iframe.style.position = 'fixed';
      iframe.style.zIndex = widgetConfig.configuration.layout.zIndex || 1000;
      
      const margin = widgetConfig.configuration.layout.margin || { top: 20, right: 20, bottom: 20, left: 20 };
      
      switch (widgetConfig.configuration.layout.position) {
        case 'bottom-right':
          iframe.style.bottom = margin.bottom + 'px';
          iframe.style.right = margin.right + 'px';
          break;
        case 'bottom-left':
          iframe.style.bottom = margin.bottom + 'px';
          iframe.style.left = margin.left + 'px';
          break;
        case 'top-right':
          iframe.style.top = margin.top + 'px';
          iframe.style.right = margin.right + 'px';
          break;
        case 'top-left':
          iframe.style.top = margin.top + 'px';
          iframe.style.left = margin.left + 'px';
          break;
      }
    }

    // Apply custom CSS
    ${
      options.customCSS
        ? `
    const style = document.createElement('style');
    style.textContent = \`${options.customCSS}\`;
    document.head.appendChild(style);
    `
        : ""
    }

    // Message handling for secure communication
    const messageHandler = function(event) {
      if (event.origin !== widgetConfig.baseURL) return;
      
      switch (event.data.type) {
        case 'widget_ready':
          iframe.contentWindow.postMessage({
            type: 'init_config',
            config: widgetConfig,
            deviceInfo: getDeviceInfo()
          }, widgetConfig.baseURL);
          trackEvent('widget_loaded');
          break;
          
        case 'widget_resize':
          if (widgetConfig.responsive && event.data.height) {
            iframe.style.height = event.data.height + 'px';
          }
          break;
          
        case 'widget_interaction':
          if (rateLimiter.canMakeRequest()) {
            rateLimiter.recordRequest();
            trackEvent('widget_interaction', event.data.data);
          }
          break;
          
        case 'widget_conversion':
          trackEvent('widget_conversion', event.data.data);
          break;
          
        case 'widget_error':
          console.error('SynapseAI Widget Error:', event.data.error);
          trackEvent('widget_error', { error: event.data.error });
          break;
          
        case 'widget_close':
          trackEvent('widget_closed');
          break;
      }
    };
    
    window.addEventListener('message', messageHandler);

    // Cleanup function
    window.synapseWidgetCleanup = function() {
      window.removeEventListener('message', messageHandler);
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    // Add iframe to container
    container.appendChild(iframe);

    // Track initial load
    trackEvent('widget_view', {
      deviceInfo: getDeviceInfo(),
      timestamp: Date.now()
    });

    // Performance tracking
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark('synapse-widget-loaded');
    }
  }

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
  
  // Expose global cleanup function
  window.SynapseAI = window.SynapseAI || {};
  window.SynapseAI.cleanup = window.synapseWidgetCleanup;
})();
</script>
${this.generateWidgetStyles(config)}
<!-- End SynapseAI Widget -->`.trim();
  }

  /**
   * Generate iframe embed code
   */
  private generateIframeEmbed(widget: Widget, options: EmbedOptions): string {
    const config = this.mergeConfiguration(widget.configuration, options);
    const width = options.width || config.layout.width + "px";
    const height = options.height || config.layout.height + "px";
    const sessionId = this.generateSessionId();
    const widgetToken = this.generateWidgetToken(widget.id, sessionId);
    const embedUrl = options.customDomain
      ? `https://${options.customDomain}`
      : this.baseURL;

    const iframeParams = new URLSearchParams({
      session: sessionId,
      token: widgetToken,
      theme: JSON.stringify(options.theme || {}),
      responsive: String(options.responsive !== false),
      analytics: String(options.enableAnalytics !== false),
      caching: String(options.enableCaching !== false),
      origin: "{{ORIGIN}}", // Will be replaced by parent page
    });

    const iframeUrl = `${embedUrl}/embed/${widget.id}?${iframeParams.toString()}`;

    return `
<!-- SynapseAI Widget: ${widget.name} -->
<script>
(function() {
  // Replace origin placeholder with actual origin
  const iframeSrc = '${iframeUrl}'.replace('{{ORIGIN}}', encodeURIComponent(window.location.origin));
  
  // Create iframe element
  const iframe = document.createElement('iframe');
  iframe.src = iframeSrc;
  iframe.width = '${width}';
  iframe.height = '${height}';
  iframe.frameBorder = '0';
  iframe.allow = 'microphone; camera; geolocation';
  iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals';
  iframe.loading = 'lazy';
  iframe.title = '${widget.name} - Powered by SynapseAI';
  iframe.style.cssText = \`
    border-radius: ${config.theme.borderRadius}px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    ${options.responsive !== false ? "max-width: 100%;" : ""}
    ${
      config.layout.position !== "center"
        ? `
      position: fixed;
      z-index: ${config.layout.zIndex || 1000};
      ${this.getPositionStyles(config.layout)}
    `
        : ""
    }
  \`;
  
  // Find target container or append to body
  const container = document.getElementById('${options.containerId || "synapse-widget"}') || document.body;
  container.appendChild(iframe);
  
  // Analytics tracking
  if (${options.enableAnalytics !== false}) {
    fetch('${embedUrl}/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${widgetToken}'
      },
      body: JSON.stringify({
        type: 'widget_view',
        widgetId: '${widget.id}',
        sessionId: '${sessionId}',
        timestamp: new Date().toISOString(),
        data: {
          userAgent: navigator.userAgent,
          pageUrl: window.location.href,
          referrer: document.referrer
        }
      })
    }).catch(() => {}); // Silently fail analytics
  }
})();
</script>
<!-- End SynapseAI Widget -->`.trim();
  }

  /**
   * Generate React component embed code
   */
  private generateReactEmbed(widget: Widget, options: EmbedOptions): string {
    const config = this.mergeConfiguration(widget.configuration, options);
    const embedUrl = options.customDomain
      ? `https://${options.customDomain}`
      : this.baseURL;

    return `
import React, { useEffect, useRef, useState, useCallback } from 'react';

// SynapseAI Widget Component: ${widget.name}
const SynapseWidget = ({ 
  onReady, 
  onError,
  onInteraction,
  onConversion,
  className = '',
  style = {},
  theme = {},
  enableAnalytics = true,
  enableCaching = true,
  ...props 
}) => {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const sessionIdRef = useRef(null);
  const widgetTokenRef = useRef(null);

  // Generate session ID and token
  const generateSession = useCallback(() => {
    const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    const payload = {
      widgetId: '${widget.id}',
      sessionId,
      timestamp: Date.now(),
      origin: window.location.origin
    };
    const token = btoa(JSON.stringify(payload));
    
    sessionIdRef.current = sessionId;
    widgetTokenRef.current = token;
    
    return { sessionId, token };
  }, []);

  // Analytics tracking
  const trackEvent = useCallback((eventType, data = {}) => {
    if (!enableAnalytics || !sessionIdRef.current) return;
    
    const event = {
      type: eventType,
      widgetId: '${widget.id}',
      sessionId: sessionIdRef.current,
      timestamp: new Date().toISOString(),
      data: {
        ...data,
        userAgent: navigator.userAgent,
        pageUrl: window.location.href,
        referrer: document.referrer
      }
    };
    
    fetch('${embedUrl}/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + widgetTokenRef.current
      },
      body: JSON.stringify(event)
    }).catch(err => console.warn('Analytics tracking failed:', err));
  }, [enableAnalytics]);

  // Device detection
  const getDeviceInfo = useCallback(() => {
    const userAgent = navigator.userAgent;
    let deviceType = 'desktop';
    
    if (/Mobile|Android|iPhone/.test(userAgent)) {
      deviceType = /iPad|tablet/i.test(userAgent) ? 'tablet' : 'mobile';
    }
    
    return {
      type: deviceType,
      userAgent,
      screenResolution: {
        width: screen.width,
        height: screen.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const { sessionId, token } = generateSession();
    
    const widgetConfig = {
      widgetId: '${widget.id}',
      sessionId,
      token,
      baseURL: '${embedUrl}',
      cdnURL: '${this.cdnURL}',
      configuration: ${JSON.stringify(config, null, 6)},
      responsive: ${options.responsive !== false},
      enableAnalytics,
      enableCaching,
      theme: { ...${JSON.stringify(options.theme || {})}, ...theme },
      origin: window.location.origin,
      timestamp: Date.now()
    };

    // Create secure iframe
    const iframe = document.createElement('iframe');
    const iframeSrc = new URL(widgetConfig.baseURL + '/embed/' + widgetConfig.widgetId);
    iframeSrc.searchParams.set('origin', widgetConfig.origin);
    iframeSrc.searchParams.set('session', widgetConfig.sessionId);
    iframeSrc.searchParams.set('token', widgetConfig.token);
    iframeSrc.searchParams.set('theme', JSON.stringify(widgetConfig.theme));
    
    iframe.src = iframeSrc.toString();
    iframe.style.width = '${options.width || "100%"}';
    iframe.style.height = '${options.height || config.layout.height + "px"}';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '${config.theme.borderRadius}px';
    iframe.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    iframe.allow = 'microphone; camera; geolocation';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals';
    iframe.loading = 'lazy';
    iframe.title = '${widget.name} - Powered by SynapseAI';
    
    iframeRef.current = iframe;

    // Message handler for secure communication
    const handleMessage = (event) => {
      if (event.origin !== widgetConfig.baseURL) return;
      
      switch (event.data.type) {
        case 'widget_ready':
          iframe.contentWindow.postMessage({
            type: 'init_config',
            config: widgetConfig,
            deviceInfo: getDeviceInfo()
          }, widgetConfig.baseURL);
          setIsLoaded(true);
          setError(null);
          trackEvent('widget_loaded');
          onReady && onReady();
          break;
          
        case 'widget_resize':
          if (widgetConfig.responsive && event.data.height) {
            iframe.style.height = event.data.height + 'px';
          }
          break;
          
        case 'widget_interaction':
          trackEvent('widget_interaction', event.data.data);
          onInteraction && onInteraction(event.data.data);
          break;
          
        case 'widget_conversion':
          trackEvent('widget_conversion', event.data.data);
          onConversion && onConversion(event.data.data);
          break;
          
        case 'widget_error':
          const errorMsg = event.data.error;
          setError(errorMsg);
          trackEvent('widget_error', { error: errorMsg });
          onError && onError(errorMsg);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    containerRef.current.appendChild(iframe);

    // Track initial view
    trackEvent('widget_view', {
      deviceInfo: getDeviceInfo(),
      timestamp: Date.now()
    });

    return () => {
      window.removeEventListener('message', handleMessage);
      if (containerRef.current && iframe) {
        containerRef.current.removeChild(iframe);
      }
      trackEvent('widget_unmounted');
    };
  }, [generateSession, trackEvent, getDeviceInfo, theme, enableAnalytics, enableCaching, onReady, onError, onInteraction, onConversion]);

  return (
    <div 
      ref={containerRef}
      className={\`synapse-widget \${className} \${isLoaded ? 'loaded' : 'loading'} \${error ? 'error' : ''}\`}
      style={{
        width: '${options.width || "100%"}',
        height: '${options.height || config.layout.height + "px"}',
        position: 'relative',
        ...style
      }}
      {...props}
    >
      {!isLoaded && (
        <div className="synapse-widget-loading" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '${config.theme.textColor}'
        }}>
          Loading widget...
        </div>
      )}
      {error && (
        <div className="synapse-widget-error" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#ef4444',
          padding: '20px'
        }}>
          Error loading widget: {error}
        </div>
      )}
    </div>
  );
};

export default SynapseWidget;

// Usage:
// <SynapseWidget 
//   onReady={() => console.log('Widget ready')}
//   onError={(error) => console.error('Widget error:', error)}
//   onInteraction={(data) => console.log('Widget interaction:', data)}
//   onConversion={(data) => console.log('Widget conversion:', data)}
//   theme={{ primaryColor: '#3b82f6' }}
//   enableAnalytics={true}
//   enableCaching={true}
// />`.trim();
  }

  /**
   * Generate Vue component embed code
   */
  private generateVueEmbed(widget: Widget, options: EmbedOptions): string {
    const config = this.mergeConfiguration(widget.configuration, options);

    return `
<template>
  <div 
    ref="container"
    class="synapse-widget"
    :style="containerStyle"
  ></div>
</template>

<script>
// SynapseAI Widget Component: ${widget.name}
export default {
  name: 'SynapseWidget',
  props: {
    width: {
      type: String,
      default: '${options.width || "100%"}'
    },
    height: {
      type: String,
      default: '${options.height || config.layout.height + "px"}'
    }
  },
  data() {
    return {
      iframe: null,
      config: ${JSON.stringify(
        {
          widgetId: widget.id,
          baseURL: this.baseURL,
          configuration: config,
          responsive: options.responsive !== false,
        },
        null,
        8,
      )}
    };
  },
  computed: {
    containerStyle() {
      return {
        width: this.width,
        height: this.height
      };
    }
  },
  mounted() {
    this.initializeWidget();
  },
  beforeUnmount() {
    this.cleanup();
  },
  methods: {
    initializeWidget() {
      // Create iframe
      this.iframe = document.createElement('iframe');
      this.iframe.src = this.config.baseURL + '/embed/' + this.config.widgetId + 
                       '?origin=' + encodeURIComponent(window.location.origin);
      this.iframe.style.width = '100%';
      this.iframe.style.height = '100%';
      this.iframe.style.border = 'none';
      this.iframe.style.borderRadius = '${config.theme.borderRadius}px';
      this.iframe.allow = 'microphone; camera; geolocation';
      this.iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';

      // Message handler
      this.handleMessage = (event) => {
        if (event.origin !== this.config.baseURL) return;
        
        switch (event.data.type) {
          case 'ready':
            this.iframe.contentWindow.postMessage({
              type: 'config',
              config: this.config
            }, this.config.baseURL);
            this.$emit('ready');
            break;
          case 'resize':
            if (this.config.responsive) {
              this.iframe.style.height = event.data.height + 'px';
            }
            break;
          case 'error':
            this.$emit('error', event.data.error);
            break;
        }
      };

      window.addEventListener('message', this.handleMessage);
      this.$refs.container.appendChild(this.iframe);
    },
    cleanup() {
      if (this.handleMessage) {
        window.removeEventListener('message', this.handleMessage);
      }
      if (this.iframe && this.$refs.container) {
        this.$refs.container.removeChild(this.iframe);
      }
    }
  }
};
</script>

<style scoped>
.synapse-widget {
  display: block;
  overflow: hidden;
}
</style>

<!-- Usage:
<SynapseWidget 
  @ready="onWidgetReady"
  @error="onWidgetError"
  width="400px"
  height="600px"
/>
-->`.trim();
  }

  /**
   * Generate Angular component embed code
   */
  private generateAngularEmbed(widget: Widget, options: EmbedOptions): string {
    const config = this.mergeConfiguration(widget.configuration, options);

    return `
// synapse-widget.component.ts
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'synapse-widget',
  template: \`
    <div 
      #container
      class="synapse-widget"
      [style.width]="width"
      [style.height]="height">
    </div>
  \`,
  styles: [\`
    .synapse-widget {
      display: block;
      overflow: hidden;
    }
  \`]
})
export class SynapseWidgetComponent implements OnInit, OnDestroy {
  @ViewChild('container', { static: true }) container!: ElementRef;
  
  @Input() width: string = '${options.width || "100%"}';
  @Input() height: string = '${options.height || config.layout.height + "px"}';
  
  @Output() ready = new EventEmitter<void>();
  @Output() error = new EventEmitter<string>();

  private iframe: HTMLIFrameElement | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  
  private config = ${JSON.stringify(
    {
      widgetId: widget.id,
      baseURL: this.baseURL,
      configuration: config,
      responsive: options.responsive !== false,
    },
    null,
    4,
  )};

  ngOnInit(): void {
    this.initializeWidget();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initializeWidget(): void {
    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.src = this.config.baseURL + '/embed/' + this.config.widgetId + 
                     '?origin=' + encodeURIComponent(window.location.origin);
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.border = 'none';
    this.iframe.style.borderRadius = '${config.theme.borderRadius}px';
    this.iframe.allow = 'microphone; camera; geolocation';
    this.iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';

    // Message handler
    this.messageHandler = (event: MessageEvent) => {
      if (event.origin !== this.config.baseURL) return;
      
      switch (event.data.type) {
        case 'ready':
          this.iframe!.contentWindow!.postMessage({
            type: 'config',
            config: this.config
          }, this.config.baseURL);
          this.ready.emit();
          break;
        case 'resize':
          if (this.config.responsive) {
            this.iframe!.style.height = event.data.height + 'px';
          }
          break;
        case 'error':
          this.error.emit(event.data.error);
          break;
      }
    };

    window.addEventListener('message', this.messageHandler);
    this.container.nativeElement.appendChild(this.iframe);
  }

  private cleanup(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
    }
    if (this.iframe && this.container.nativeElement) {
      this.container.nativeElement.removeChild(this.iframe);
    }
  }
}

// Usage in template:
// <synapse-widget 
//   (ready)="onWidgetReady()"
//   (error)="onWidgetError($event)"
//   width="400px"
//   height="600px">
// </synapse-widget>`.trim();
  }

  /**
   * Generate widget styles
   */
  private generateWidgetStyles(config: WidgetConfiguration): string {
    return `
<style>
.synapse-widget {
  font-family: ${config.theme.fontFamily || "system-ui, -apple-system, sans-serif"};
  font-size: ${config.theme.fontSize}px;
  color: ${config.theme.textColor};
  background-color: ${config.theme.backgroundColor};
  border-radius: ${config.theme.borderRadius}px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: all 0.3s ease;
}

.synapse-widget:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

@media (max-width: 768px) {
  .synapse-widget {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
  }
}

${config.theme.customCSS || ""}
</style>`.trim();
  }

  /**
   * Get position styles for CSS
   */
  private getPositionStyles(layout: any): string {
    const margin = layout.margin || {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    };

    switch (layout.position) {
      case "bottom-right":
        return `bottom: ${margin.bottom}px; right: ${margin.right}px;`;
      case "bottom-left":
        return `bottom: ${margin.bottom}px; left: ${margin.left}px;`;
      case "top-right":
        return `top: ${margin.top}px; right: ${margin.right}px;`;
      case "top-left":
        return `top: ${margin.top}px; left: ${margin.left}px;`;
      default:
        return "";
    }
  }

  /**
   * Merge widget configuration with embed options
   */
  private mergeConfiguration(
    widgetConfig: WidgetConfiguration,
    options: EmbedOptions,
  ): WidgetConfiguration {
    return {
      ...widgetConfig,
      theme: {
        ...widgetConfig.theme,
        ...options.theme,
      },
      layout: {
        ...widgetConfig.layout,
        responsive: options.responsive !== false,
      },
    };
  }
}

// Export singleton instance
export const embedGenerator = new WidgetEmbedGenerator();
