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