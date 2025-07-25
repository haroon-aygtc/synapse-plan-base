import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { Agent } from './agent.entity';
import { Tool } from './tool.entity';
import { Workflow } from './workflow.entity';

export interface WidgetTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontSize: number;
  fontFamily?: string;
  customCSS?: string;
}

export interface WidgetLayout {
  width: number;
  height: number;
  position:
    | 'bottom-right'
    | 'bottom-left'
    | 'top-right'
    | 'top-left'
    | 'center'
    | 'fullscreen';
  responsive: boolean;
  zIndex?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
}

export interface WidgetBehavior {
  autoOpen: boolean;
  showWelcomeMessage: boolean;
  enableTypingIndicator: boolean;
  enableSoundNotifications: boolean;
  sessionTimeout?: number;
  maxMessages?: number;
  enableFileUpload?: boolean;
  enableVoiceInput?: boolean;
}

export interface WidgetBranding {
  showLogo: boolean;
  companyName?: string;
  logoUrl?: string;
  customHeader?: string;
  customFooter?: string;
  poweredByText?: string;
  showPoweredBy?: boolean;
}

export interface WidgetSecurity {
  allowedDomains: string[];
  requireAuth: boolean;
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit?: number;
  };
  enableCORS?: boolean;
  csrfProtection?: boolean;
  encryptData?: boolean;
}

export interface WidgetConfiguration {
  theme: WidgetTheme;
  layout: WidgetLayout;
  behavior: WidgetBehavior;
  branding: WidgetBranding;
  security: WidgetSecurity;
}

export interface WidgetAnalyticsData {
  views: number;
  interactions: number;
  conversions: number;
  averageSessionDuration: number;
  bounceRate: number;
  lastAccessed: Date;
  topPages: Array<{ url: string; views: number; interactions: number }>;
  deviceBreakdown: { desktop: number; mobile: number; tablet: number };
  browserBreakdown: Record<string, number>;
  geographicData: Array<{
    country: string;
    views: number;
    interactions: number;
  }>;
}

export interface WidgetDeploymentInfo {
  environment: 'staging' | 'production';
  customDomain?: string;
  enableAnalytics: boolean;
  enableCaching: boolean;
  deployedAt: Date;
  lastUpdated: Date;
  status: 'active' | 'inactive' | 'error';
  embedCode: {
    javascript: string;
    iframe: string;
    react: string;
    vue: string;
    angular: string;
  };
  urls: {
    standalone: string;
    embed: string;
    api: string;
  };
}

@Entity('widgets')
@Index(['organizationId', 'type'])
@Index(['organizationId', 'isActive'])
@Index(['sourceId', 'sourceType'])
export class Widget extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  @Index()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ['agent', 'tool', 'workflow'] })
  @Index()
  type!: 'agent' | 'tool' | 'workflow';

  @Column({ name: 'source_id' })
  @Index()
  sourceId!: string;

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: ['agent', 'tool', 'workflow'],
  })
  sourceType!: 'agent' | 'tool' | 'workflow';

  @Column({ type: 'jsonb' })
  configuration!: WidgetConfiguration;

  @Column({ name: 'is_active', default: true })
  @Index()
  isActive!: boolean;

  @Column({ name: 'is_deployed', default: false })
  @Index()
  isDeployed!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  deploymentInfo?: WidgetDeploymentInfo;

  @Column({ type: 'jsonb', default: '{}' })
  analyticsData!: WidgetAnalyticsData;

  @Column({ name: 'template_id', nullable: true })
  templateId?: string;

  @Column({ name: 'is_template', default: false })
  @Index()
  isTemplate!: boolean;

  @Column({ name: 'template_category', nullable: true })
  templateCategory?: string;

  @Column({ type: 'text', array: true, default: '{}' })
  templateTags!: string[];

  @Column({
    name: 'template_rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
  })
  templateRating!: number;

  @Column({ name: 'template_downloads', default: 0 })
  templateDownloads!: number;

  @Column({ name: 'is_public_template', default: false })
  @Index()
  isPublicTemplate!: boolean;

  @Column({ name: 'template_preview_image', type: 'text', nullable: true })
  templatePreviewImage?: string;

  @Column({ name: 'template_demo_url', type: 'text', nullable: true })
  templateDemoUrl?: string;

  @Column({ name: 'template_rating_count', default: 0 })
  templateRatingCount!: number;

  @Column({ name: 'template_featured', default: false })
  @Index()
  templateFeatured!: boolean;

  @Column({ name: 'version', default: '1.0.0' })
  version!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'usage_count', default: 0 })
  usageCount!: number;

  @Column({ name: 'last_used_at', nullable: true })
  lastUsedAt?: Date;

  @Column({
    name: 'performance_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  performanceScore?: number;

  @Column({
    name: 'accessibility_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  accessibilityScore?: number;

  @Column({
    name: 'seo_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  seoScore?: number;

  // Relationships
  @Column({ name: 'user_id' })
  @Index()
  userId!: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId!: string;

  @ManyToOne(() => Organization, { eager: false })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  // Dynamic relationships based on sourceType
  @ManyToOne(() => Agent, { eager: false, nullable: true })
  @JoinColumn({ name: 'source_id' })
  agent?: Agent;

  @ManyToOne(() => Tool, { eager: false, nullable: true })
  @JoinColumn({ name: 'source_id' })
  tool?: Tool;

  @ManyToOne(() => Workflow, { eager: false, nullable: true })
  @JoinColumn({ name: 'source_id' })
  workflow?: Workflow;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Helper methods
  getSourceEntity(): Agent | Tool | Workflow | undefined {
    switch (this.sourceType) {
      case 'agent':
        return this.agent;
      case 'tool':
        return this.tool;
      case 'workflow':
        return this.workflow;
      default:
        return undefined;
    }
  }

  updateAnalytics(data: Partial<WidgetAnalyticsData>): void {
    this.analyticsData = {
      ...this.analyticsData,
      ...data,
      lastAccessed: new Date(),
    };
    this.usageCount += 1;
    this.lastUsedAt = new Date();
  }

  generateEmbedCode(
    format: 'javascript' | 'iframe' | 'react' | 'vue' | 'angular',
  ): string {
    const baseUrl =
      process.env.WIDGET_BASE_URL || 'https://widgets.synapseai.com';
    const widgetUrl = `${baseUrl}/widget/${this.id}`;

    switch (format) {
      case 'javascript':
        return `<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${baseUrl}/embed.js';
    script.setAttribute('data-widget-id', '${this.id}');
    script.setAttribute('data-config', '${JSON.stringify(this.configuration)}');
    document.head.appendChild(script);
  })();
</script>`;

      case 'iframe':
        return `<iframe
  src="${widgetUrl}"
  width="${this.configuration.layout.width}"
  height="${this.configuration.layout.height}"
  frameborder="0"
  style="border: none; border-radius: ${this.configuration.theme.borderRadius}px;"
  title="${this.name} Widget"
></iframe>`;

      case 'react':
        return `import { SynapseWidget } from '@synapseai/react-widget';

function MyComponent() {
  return (
    <SynapseWidget
      widgetId="${this.id}"
      config={${JSON.stringify(this.configuration, null, 2)}}
    />
  );
}`;

      case 'vue':
        return `<template>
  <SynapseWidget
    :widget-id="'${this.id}'"
    :config="widgetConfig"
  />
</template>

<script>
import { SynapseWidget } from '@synapseai/vue-widget';

export default {
  components: {
    SynapseWidget
  },
  data() {
    return {
      widgetConfig: ${JSON.stringify(this.configuration, null, 6)}
    };
  }
};
</script>`;

      case 'angular':
        return `import { Component } from '@angular/core';

@Component({
  selector: 'app-widget',
  template: \`
    <synapse-widget
      widgetId="${this.id}"
      [config]="widgetConfig">
    </synapse-widget>
  \`
})
export class WidgetComponent {
  widgetConfig = ${JSON.stringify(this.configuration, null, 2)};
}`;

      default:
        return '';
    }
  }

  isOwner(userId: string): boolean {
    return this.userId === userId;
  }

  canAccess(userId: string, organizationId: string): boolean {
    return this.userId === userId || this.organizationId === organizationId;
  }

  incrementDownloads(): void {
    this.templateDownloads += 1;
  }

  updateRating(newRating: number): void {
    // This would typically involve more complex rating calculation
    this.templateRating = newRating;
  }
}
