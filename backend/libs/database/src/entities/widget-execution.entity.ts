import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Widget } from './widget.entity';
import { User } from './user.entity';
import { Session } from './session.entity';

export interface WidgetExecutionContext {
  userAgent: string;
  ipAddress: string;
  referrer?: string;
  sessionId: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browserInfo: {
    name: string;
    version: string;
  };
  geolocation?: {
    country: string;
    region: string;
    city: string;
  };
}

export interface WidgetExecutionInput {
  type: 'message' | 'action' | 'file_upload' | 'voice_input';
  content: any;
  metadata?: Record<string, any>;
}

export interface WidgetExecutionOutput {
  type: 'response' | 'action' | 'error' | 'redirect';
  content: any;
  metadata?: Record<string, any>;
}

export interface WidgetExecutionMetrics {
  startTime: Date;
  endTime: Date;
  duration: number;
  tokensUsed?: number;
  apiCalls: number;
  errorCount: number;
  cacheHits: number;
  cacheMisses: number;
}

@Entity('widget_executions')
@Index(['widgetId', 'createdAt'])
@Index(['sessionId', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['userId', 'createdAt'])
export class WidgetExecution extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'widget_id' })
  @Index()
  widgetId!: string;

  @ManyToOne(() => Widget, { eager: false })
  @JoinColumn({ name: 'widget_id' })
  widget!: Widget;

  @Column({ name: 'session_id' })
  @Index()
  sessionId!: string;

  @ManyToOne(() => Session, { eager: false })
  @JoinColumn({ name: 'session_id' })
  session!: Session;

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId?: string;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'completed', 'failed', 'timeout'],
  })
  @Index()
  status!: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';

  @Column({ type: 'jsonb' })
  context!: WidgetExecutionContext;

  @Column({ type: 'jsonb' })
  input!: WidgetExecutionInput;

  @Column({ type: 'jsonb', nullable: true })
  output?: WidgetExecutionOutput;

  @Column({ type: 'jsonb', nullable: true })
  metrics?: WidgetExecutionMetrics;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'jsonb', nullable: true })
  errorDetails?: Record<string, any>;

  @Column({ name: 'execution_time_ms', nullable: true })
  executionTimeMs?: number;

  @Column({ name: 'tokens_used', default: 0 })
  tokensUsed!: number;

  @Column({ name: 'api_calls_made', default: 0 })
  apiCallsMade!: number;

  @Column({ name: 'cache_hit', default: false })
  cacheHit!: boolean;

  @Column({
    name: 'cost_usd',
    type: 'decimal',
    precision: 10,
    scale: 6,
    default: 0,
  })
  costUsd!: number;

  @Column({ name: 'message', nullable: true })
  message?: string;

  @Column({ name: 'action', nullable: true })
  action?: string;

  @Column({ name: 'file_upload', nullable: true })
  fileUpload?: string;

  @Column({ name: 'voice_input', nullable: true })
  voiceInput?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Helper methods
  markAsRunning(): void {
    this.status = 'running';
    if (this.metrics) {
      this.metrics.startTime = new Date();
    }
  }

  markAsCompleted(
    output: WidgetExecutionOutput,
    metrics?: Partial<WidgetExecutionMetrics>,
  ): void {
    this.status = 'completed';
    this.output = output;

    if (metrics && this.metrics) {
      this.metrics = {
        ...this.metrics,
        ...metrics,
        endTime: new Date(),
        duration: Date.now() - this.metrics.startTime.getTime(),
      };
      this.executionTimeMs = this.metrics.duration;
    }
  }

  markAsFailed(error: string, details?: Record<string, any>): void {
    this.status = 'failed';
    this.errorMessage = error;
    this.errorDetails = details;

    if (this.metrics) {
      this.metrics.endTime = new Date();
      this.metrics.duration = Date.now() - this.metrics.startTime.getTime();
      this.metrics.errorCount += 1;
      this.executionTimeMs = this.metrics.duration;
    }
  }

  markAsTimeout(): void {
    this.status = 'timeout';
    this.errorMessage = 'Execution timed out';

    if (this.metrics) {
      this.metrics.endTime = new Date();
      this.metrics.duration = Date.now() - this.metrics.startTime.getTime();
      this.executionTimeMs = this.metrics.duration;
    }
  }

  updateMetrics(metrics: Partial<WidgetExecutionMetrics>): void {
    if (this.metrics) {
      this.metrics = { ...this.metrics, ...metrics };
    }
  }

  addApiCall(): void {
    this.apiCallsMade += 1;
    if (this.metrics) {
      this.metrics.apiCalls += 1;
    }
  }

  addTokenUsage(tokens: number): void {
    this.tokensUsed += tokens;
    if (this.metrics) {
      this.metrics.tokensUsed = (this.metrics.tokensUsed || 0) + tokens;
    }
  }

  setCacheHit(hit: boolean): void {
    this.cacheHit = hit;
    if (this.metrics) {
      if (hit) {
        this.metrics.cacheHits += 1;
      } else {
        this.metrics.cacheMisses += 1;
      }
    }
  }

  calculateCost(): void {
    // This would implement actual cost calculation based on tokens, API calls, etc.
    const tokenCost = this.tokensUsed * 0.000002; // Example rate
    const apiCallCost = this.apiCallsMade * 0.001; // Example rate
    this.costUsd = tokenCost + apiCallCost;
  }

  isSuccessful(): boolean {
    return this.status === 'completed';
  }

  isFailed(): boolean {
    return this.status === 'failed' || this.status === 'timeout';
  }

  getDuration(): number {
    return this.executionTimeMs || 0;
  }
}
