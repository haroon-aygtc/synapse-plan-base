// Fix for emitToOrganization method
import { WebSocketService } from './websocket.service';

// Add this method to the WebSocketService class
WebSocketService.prototype.emitToOrganization = function (
  organizationId: string,
  event: string,
  payload: any,
): void {
  this.broadcastToOrganization(organizationId, event, payload);
};