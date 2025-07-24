/**
 * Widget Embed Code Generator
 * Generates production-ready embed code for different platforms
 */

import { Widget, WidgetConfiguration } from '@/lib/sdk/types';

export interface EmbedOptions {
  format: 'javascript' | 'iframe' | 'react' | 'vue' | 'angular';
  containerId?: string;
  width?: string;
  height?: string;
  responsive?: boolean;
  theme?: Record<string, any>;
  customCSS?: string;
}

export class WidgetEmbedGenerator {
  private baseURL: string;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_WIDGET_URL || 'https://widgets.synapseai.com') {
    this.baseURL = baseURL;
  }

  /**
   * Generate embed code for a widget
   */
  generateEmbedCode(widget: Widget, options: EmbedOptions): string {
    switch (options.format) {
      case 'javascript':
        return this.generateJavaScriptEmbed(widget, options);
      case 'iframe':
        return this.generateIframeEmbed(widget, options);
      case 'react':
        return this.generateReactEmbed(widget, options);
      case 'vue':
        return this.generateVueEmbed(widget, options);
      case 'angular':
        return this.generateAngularEmbed(widget, options);
      default:
        throw new Error(`Unsupported embed format: ${options.format}`);
    }
  }

  /**
   * Generate JavaScript embed code
   */
  private generateJavaScriptEmbed(widget: Widget, options: EmbedOptions): string {
    const containerId = options.containerId || 'synapse-widget';
    const config = this.mergeConfiguration(widget.configuration, options);
    
    return `
<!-- SynapseAI Widget: ${widget.name} -->
<div id="${containerId}"></div>
<script>
(function() {
  // Widget configuration
  const widgetConfig = ${JSON.stringify({
    widgetId: widget.id,
    baseURL: this.baseURL,
    configuration: config,
    responsive: options.responsive !== false,
    theme: options.theme || {}
  }, null, 2)};

  // Create widget container
  function createWidget() {
    const container = document.getElementById('${containerId}');
    if (!container) {
      console.error('SynapseAI Widget: Container element not found');
      return;
    }

    // Create iframe for secure execution
    const iframe = document.createElement('iframe');
    iframe.src = widgetConfig.baseURL + '/embed/' + widgetConfig.widgetId + 
                 '?origin=' + encodeURIComponent(window.location.origin);
    iframe.style.width = '${options.width || config.layout.width + 'px'}';
    iframe.style.height = '${options.height || config.layout.height + 'px'}';
    iframe.style.border = 'none';
    iframe.style.borderRadius = config.theme.borderRadius + 'px';
    iframe.allow = 'microphone; camera; geolocation';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';
    
    // Apply responsive styles
    if (widgetConfig.responsive) {
      iframe.style.maxWidth = '100%';
      iframe.style.height = 'auto';
      iframe.style.minHeight = '300px';
    }

    // Apply custom CSS
    ${options.customCSS ? `
    const style = document.createElement('style');
    style.textContent = \`${options.customCSS}\`;
    document.head.appendChild(style);
    ` : ''}

    // Set up message communication
    window.addEventListener('message', function(event) {
      if (event.origin !== widgetConfig.baseURL) return;
      
      switch (event.data.type) {
        case 'resize':
          if (widgetConfig.responsive) {
            iframe.style.height = event.data.height + 'px';
          }
          break;
        case 'ready':
          // Widget is ready, send configuration
          iframe.contentWindow.postMessage({
            type: 'config',
            config: widgetConfig
          }, widgetConfig.baseURL);
          break;
        case 'error':
          console.error('SynapseAI Widget Error:', event.data.error);
          break;
      }
    });

    // Add iframe to container
    container.appendChild(iframe);

    // Track widget load
    if (typeof gtag !== 'undefined') {
      gtag('event', 'widget_load', {
        widget_id: widgetConfig.widgetId,
        widget_name: '${widget.name}'
      });
    }
  }

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
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
    const width = options.width || config.layout.width + 'px';
    const height = options.height || config.layout.height + 'px';
    
    const iframeUrl = `${this.baseURL}/embed/${widget.id}?` + 
      new URLSearchParams({
        origin: typeof window !== 'undefined' ? window.location.origin : '',
        theme: JSON.stringify(options.theme || {}),
        responsive: String(options.responsive !== false)
      }).toString();

    return `
<!-- SynapseAI Widget: ${widget.name} -->
<iframe 
  src="${iframeUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  allow="microphone; camera; geolocation"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
  style="border-radius: ${config.theme.borderRadius}px; ${options.responsive !== false ? 'max-width: 100%;' : ''}"
  title="${widget.name} - Powered by SynapseAI">
</iframe>
<!-- End SynapseAI Widget -->`.trim();
  }

  /**
   * Generate React component embed code
   */
  private generateReactEmbed(widget: Widget, options: EmbedOptions): string {
    const config = this.mergeConfiguration(widget.configuration, options);
    
    return `
import React, { useEffect, useRef } from 'react';

// SynapseAI Widget Component: ${widget.name}
const SynapseWidget = ({ 
  onReady, 
  onError, 
  className = '',
  style = {},
  ...props 
}) => {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config = ${JSON.stringify({
      widgetId: widget.id,
      baseURL: this.baseURL,
      configuration: config,
      responsive: options.responsive !== false
    }, null, 6)};

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = config.baseURL + '/embed/' + config.widgetId + 
                 '?origin=' + encodeURIComponent(window.location.origin);
    iframe.style.width = '${options.width || '100%'}';
    iframe.style.height = '${options.height || config.layout.height + 'px'}';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '${config.theme.borderRadius}px';
    iframe.allow = 'microphone; camera; geolocation';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';
    
    iframeRef.current = iframe;

    // Message handler
    const handleMessage = (event) => {
      if (event.origin !== config.baseURL) return;
      
      switch (event.data.type) {
        case 'ready':
          iframe.contentWindow.postMessage({
            type: 'config',
            config
          }, config.baseURL);
          onReady && onReady();
          break;
        case 'resize':
          if (config.responsive) {
            iframe.style.height = event.data.height + 'px';
          }
          break;
        case 'error':
          onError && onError(event.data.error);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    containerRef.current.appendChild(iframe);

    return () => {
      window.removeEventListener('message', handleMessage);
      if (containerRef.current && iframe) {
        containerRef.current.removeChild(iframe);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={\`synapse-widget \${className}\`}
      style={{
        width: '${options.width || '100%'}',
        height: '${options.height || config.layout.height + 'px'}',
        ...style
      }}
      {...props}
    />
  );
};

export default SynapseWidget;

// Usage:
// <SynapseWidget 
//   onReady={() => console.log('Widget ready')}
//   onError={(error) => console.error('Widget error:', error)}
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
      default: '${options.width || '100%'}'
    },
    height: {
      type: String,
      default: '${options.height || config.layout.height + 'px'}'
    }
  },
  data() {
    return {
      iframe: null,
      config: ${JSON.stringify({
        widgetId: widget.id,
        baseURL: this.baseURL,
        configuration: config,
        responsive: options.responsive !== false
      }, null, 8)}
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
  
  @Input() width: string = '${options.width || '100%'}';
  @Input() height: string = '${options.height || config.layout.height + 'px'}';
  
  @Output() ready = new EventEmitter<void>();
  @Output() error = new EventEmitter<string>();

  private iframe: HTMLIFrameElement | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  
  private config = ${JSON.stringify({
    widgetId: widget.id,
    baseURL: this.baseURL,
    configuration: config,
    responsive: options.responsive !== false
  }, null, 4)};

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
  font-family: ${config.theme.fontFamily || 'system-ui, -apple-system, sans-serif'};
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

${config.theme.customCSS || ''}
</style>`.trim();
  }

  /**
   * Merge widget configuration with embed options
   */
  private mergeConfiguration(
    widgetConfig: WidgetConfiguration, 
    options: EmbedOptions
  ): WidgetConfiguration {
    return {
      ...widgetConfig,
      theme: {
        ...widgetConfig.theme,
        ...options.theme
      },
      layout: {
        ...widgetConfig.layout,
        responsive: options.responsive !== false
      }
    };
  }
}

// Export singleton instance
export const embedGenerator = new WidgetEmbedGenerator();