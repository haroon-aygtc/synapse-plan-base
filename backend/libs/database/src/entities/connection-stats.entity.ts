import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Connection statistics for WebSocket connections
 */
export interface ConnectionStats {
  totalConnections: number;
  connectionsByOrg: Record<string, number>;
  connectionsByRole: Record<string, number>;
  averageConnectionTime: number;
  peakConnections: number;
  messagesPerMinute: number;
}

@Entity('connection_stats')
@Index(['organizationId', 'timestamp'])
export class ConnectionStatsEntity extends BaseEntity {
  @Column({ type: 'integer', default: 0 })
  totalConnections: number;

  @Column({ type: 'jsonb', default: {} })
  connectionsByOrg: Record<string, number>;

  @Column({ type: 'jsonb', default: {} })
  connectionsByRole: Record<string, number>;

  @Column({ type: 'integer', default: 0 })
  averageConnectionTime: number;

  @Column({ type: 'integer', default: 0 })
  peakConnections: number;

  @Column({ type: 'integer', default: 0 })
  messagesPerMinute: number;

  @Column({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  timestamp: Date;
}
