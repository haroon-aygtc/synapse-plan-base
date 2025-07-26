import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { SubscriptionPlan } from '@shared/interfaces';

@Entity('billing_subscriptions')
@Index(['organizationId', 'status'])
@Index(['stripeSubscriptionId'])
export class BillingSubscription extends BaseEntity {
  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.FREE,
  })
  plan: SubscriptionPlan;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeSubscriptionId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeCustomerId?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  currentPeriodStart?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  currentPeriodEnd?: Date;

  @Column({ type: 'boolean', default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount?: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => Organization, (organization) => organization.id)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;
} 