import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { Notification } from './notification.entity';
import { NotificationType } from '@shared/enums';

@Entity('notification_templates')
@Index(['organizationId', 'isActive'])
@Index(['type', 'category'])
@Index(['name'])
export class NotificationTemplate extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', nullable: true })
  htmlBody: string;

  @Column({ type: 'jsonb', nullable: true })
  variables: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object';
    required: boolean;
    defaultValue?: any;
    description?: string;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  styling: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    fontSize?: string;
    logo?: string;
    headerImage?: string;
    footerText?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  deliverySettings: {
    email?: {
      fromName?: string;
      fromEmail?: string;
      replyTo?: string;
      priority?: 'high' | 'normal' | 'low';
    };
    sms?: {
      fromNumber?: string;
    };
    webhook?: {
      timeout?: number;
      retryPolicy?: {
        maxRetries: number;
        retryDelay: number;
        backoffMultiplier: number;
      };
    };
    push?: {
      badge?: number;
      sound?: string;
      category?: string;
    };
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updater: User;

  @OneToMany(() => Notification, (notification) => notification.template)
  notifications: Notification[];

  // Helper methods
  renderSubject(variables: Record<string, any>): string {
    return this.interpolateTemplate(this.subject, variables);
  }

  renderBody(variables: Record<string, any>): string {
    return this.interpolateTemplate(this.body, variables);
  }

  renderHtmlBody(variables: Record<string, any>): string {
    if (!this.htmlBody) return this.renderBody(variables);
    return this.interpolateTemplate(this.htmlBody, variables);
  }

  private interpolateTemplate(
    template: string,
    variables: Record<string, any>,
  ): string {
    return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, key) => {
      const value = this.getNestedValue(variables, key.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  validateVariables(variables: Record<string, any>): {
    isValid: boolean;
    missingRequired: string[];
    invalidTypes: string[];
  } {
    const missingRequired: string[] = [];
    const invalidTypes: string[] = [];

    if (this.variables) {
      for (const variable of this.variables) {
        const value = variables[variable.name];

        if (variable.required && (value === undefined || value === null)) {
          missingRequired.push(variable.name);
          continue;
        }

        if (value !== undefined && !this.isValidType(value, variable.type)) {
          invalidTypes.push(variable.name);
        }
      }
    }

    return {
      isValid: missingRequired.length === 0 && invalidTypes.length === 0,
      missingRequired,
      invalidTypes,
    };
  }

  private isValidType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));
      case 'object':
        return typeof value === 'object' && value !== null;
      default:
        return true;
    }
  }
}
