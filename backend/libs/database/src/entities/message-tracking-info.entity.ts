/**
 * Information for tracking WebSocket messages
 */
export interface MessageTrackingInfo {
  messageId: string;
  event: string;
  organizationId: string;
  userId?: string;
  timestamp: Date;
  payload?: any;
  size?: number;
}