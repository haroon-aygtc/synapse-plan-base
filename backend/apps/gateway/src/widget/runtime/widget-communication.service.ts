import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Widget } from '@database/entities/widget.entity';
import { WebSocketService } from '../../websocket/websocket.service';
import { WidgetSecurityService } from '../security/widget-security.service';
import * as crypto from 'crypto';

export interface CrossOriginMessage {
    id: string;
    type: 'request' | 'response' | 'event' | 'heartbeat';
    action: string;
    payload: any;
    timestamp: Date;
    origin: string;
    signature?: string;
    sessionId: string;
    widgetId: string;
}

export interface MessageHandler {
    action: string;
    handler: (message: CrossOriginMessage, context: MessageContext) => Promise<any>;
    requiresAuth: boolean;
    rateLimited: boolean;
}

export interface MessageContext {
    widgetId: string;
    sessionId: string;
    origin: string;
    userId?: string;
    organizationId: string;
    connectionId: string;
}

export interface CommunicationChannel {
    id: string;
    widgetId: string;
    sessionId: string;
    origin: string;
    established: Date;
    lastActivity: Date;
    isActive: boolean;
    messageCount: number;
    errorCount: number;
    metadata: Record<string, any>;
}

export interface MessageQueue {
    channelId: string;
    messages: CrossOriginMessage[];
    maxSize: number;
    processingRate: number;
    lastProcessed: Date;
}

@Injectable()
export class WidgetCommunicationService {
    private readonly logger = new Logger(WidgetCommunicationService.name);
    private readonly messageHandlers = new Map<string, MessageHandler>();
    private readonly communicationChannels = new Map<string, CommunicationChannel>();
    private readonly messageQueues = new Map<string, MessageQueue>();
    private readonly pendingResponses = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();

    constructor(
        @InjectRepository(Widget)
        private widgetRepository: Repository<Widget>,
        private websocketService: WebSocketService,
        private securityService: WidgetSecurityService,
    ) {
        this.initializeCommunicationService();
    }

    private initializeCommunicationService(): void {
        this.logger.log('Initializing Widget Communication Service...');

        // Set up default message handlers
        this.setupDefaultHandlers();

        // Set up cleanup intervals
        setInterval(() => this.cleanupInactiveChannels(), 300000); // Every 5 minutes
        setInterval(() => this.processMessageQueues(), 1000); // Every second
        setInterval(() => this.sendHeartbeats(), 30000); // Every 30 seconds

        this.logger.log('Widget Communication Service initialized successfully');
    }

    private setupDefaultHandlers(): void {
        // Register default message handlers
        this.registerHandler({
            action: 'ping',
            handler: this.handlePing.bind(this),
            requiresAuth: false,
            rateLimited: false,
        });

        this.registerHandler({
            action: 'authenticate',
            handler: this.handleAuthentication.bind(this),
            requiresAuth: false,
            rateLimited: true,
        });

        this.registerHandler({
            action: 'execute',
            handler: this.handleExecution.bind(this),
            requiresAuth: true,
            rateLimited: true,
        });

        this.registerHandler({
            action: 'getStatus',
            handler: this.handleStatusRequest.bind(this),
            requiresAuth: true,
            rateLimited: false,
        });
    }

    public registerHandler(handler: MessageHandler): void {
        this.messageHandlers.set(handler.action, handler);
        this.logger.debug(`Registered message handler for action: ${handler.action}`);
    }

    public async establishChannel(
        widgetId: string,
        sessionId: string,
        origin: string,
        connectionId: string,
        metadata: Record<string, any> = {}
    ): Promise<CommunicationChannel> {
        const channelId = `${widgetId}-${sessionId}-${connectionId}`;

        // Validate widget exists and is active
        const widget = await this.widgetRepository.findOne({
            where: { id: widgetId, isActive: true },
            relations: ['organization']
        });

        if (!widget) {
            throw new Error(`Widget ${widgetId} not found or inactive`);
        }

        // Validate origin against allowed domains
        if (!this.securityService.validateOrigin(origin, widget.configuration.security.allowedDomains)) {
            throw new Error(`Origin ${origin} not allowed for widget ${widgetId}`);
        }

        const channel: CommunicationChannel = {
            id: channelId,
            widgetId,
            sessionId,
            origin,
            established: new Date(),
            lastActivity: new Date(),
            isActive: true,
            messageCount: 0,
            errorCount: 0,
            metadata,
        };

        this.communicationChannels.set(channelId, channel);

        // Initialize message queue for this channel
        this.messageQueues.set(channelId, {
            channelId,
            messages: [],
            maxSize: 1000,
            processingRate: 100, // messages per second
            lastProcessed: new Date(),
        });

        this.logger.log(`Established communication channel: ${channelId}`);
        return channel;
    }

    public async sendMessage(
        channelId: string,
        message: Omit<CrossOriginMessage, 'id' | 'timestamp' | 'signature'>
    ): Promise<void> {
        const channel = this.communicationChannels.get(channelId);
        if (!channel || !channel.isActive) {
            throw new Error(`Channel ${channelId} not found or inactive`);
        }

        const fullMessage: CrossOriginMessage = {
            ...message,
            id: crypto.randomUUID(),
            timestamp: new Date(),
        };

        // Sign the message for security
        fullMessage.signature = await this.securityService.signMessage(fullMessage);

        // Add to message queue
        const queue = this.messageQueues.get(channelId);
        if (queue) {
            queue.messages.push(fullMessage);
            if (queue.messages.length > queue.maxSize) {
                queue.messages.shift(); // Remove oldest message
            }
        }

        // Send via WebSocket
        if (channel.metadata.userId) {
            await this.websocketService.broadcastToUser(
                channel.metadata.userId,
                'widget-message',
                fullMessage
            );
        } else {
            // If no userId, broadcast to session room
            await this.websocketService.broadcastToRoom(
                `session_${channel.sessionId}`,
                'widget-message',
                fullMessage
            );
        }

        // Update channel activity
        channel.lastActivity = new Date();
        channel.messageCount++;

        this.logger.debug(`Sent message ${fullMessage.id} to channel ${channelId}`);
    }

    public async processMessage(
        channelId: string,
        message: CrossOriginMessage
    ): Promise<any> {
        const channel = this.communicationChannels.get(channelId);
        if (!channel || !channel.isActive) {
            throw new Error(`Channel ${channelId} not found or inactive`);
        }

        try {
            // Verify message signature
            const isValid = await this.securityService.verifyMessage(message);
            if (!isValid) {
                throw new Error('Invalid message signature');
            }

            // Get message handler
            const handler = this.messageHandlers.get(message.action);
            if (!handler) {
                throw new Error(`No handler found for action: ${message.action}`);
            }

            // Check authentication if required
            if (handler.requiresAuth) {
                const isAuthenticated = await this.securityService.validateSession(
                    message.sessionId,
                    message.widgetId
                );
                if (!isAuthenticated) {
                    throw new Error('Authentication required');
                }
            }

            // Check rate limiting if enabled
            if (handler.rateLimited) {
                const isAllowed = await this.securityService.checkRateLimit(
                    channelId,
                    message.action
                );
                if (!isAllowed) {
                    throw new Error('Rate limit exceeded');
                }
            }

            // Create message context
            const context: MessageContext = {
                widgetId: message.widgetId,
                sessionId: message.sessionId,
                origin: message.origin,
                organizationId: channel.metadata.organizationId,
                connectionId: channelId,
            };

            // Execute handler
            const result = await handler.handler(message, context);

            // Send response if this was a request
            if (message.type === 'request') {
                await this.sendMessage(channelId, {
                    type: 'response',
                    action: message.action,
                    payload: result,
                    origin: 'platform',
                    sessionId: message.sessionId,
                    widgetId: message.widgetId,
                });
            }

            // Update channel activity
            channel.lastActivity = new Date();
            channel.messageCount++;

            return result;
        } catch (error) {
            this.logger.error(`Error processing message ${message.id}:`, error);

            // Update error count
            channel.errorCount++;

            // Send error response if this was a request
            if (message.type === 'request') {
                await this.sendMessage(channelId, {
                    type: 'response',
                    action: message.action,
                    payload: { error: error.message },
                    origin: 'platform',
                    sessionId: message.sessionId,
                    widgetId: message.widgetId,
                });
            }

            throw error;
        }
    }

    public async closeChannel(channelId: string): Promise<void> {
        const channel = this.communicationChannels.get(channelId);
        if (channel) {
            channel.isActive = false;
            this.communicationChannels.delete(channelId);
            this.messageQueues.delete(channelId);

            this.logger.log(`Closed communication channel: ${channelId}`);
        }
    }

    public getChannelStatus(channelId: string): CommunicationChannel | null {
        return this.communicationChannels.get(channelId) || null;
    }

    public getActiveChannels(): CommunicationChannel[] {
        return Array.from(this.communicationChannels.values()).filter(
            channel => channel.isActive
        );
    }

    // Default message handlers
    private async handlePing(
        message: CrossOriginMessage,
        context: MessageContext
    ): Promise<any> {
        return {
            pong: true,
            timestamp: new Date(),
            channelId: context.connectionId,
        };
    }

    private async handleAuthentication(
        message: CrossOriginMessage,
        context: MessageContext
    ): Promise<any> {
        const { token } = message.payload;

        const authResult = await this.securityService.authenticateWidget(
            token,
            context.widgetId,
            context.sessionId
        );

        if (authResult.success) {
            // Update context with user information
            const channel = this.communicationChannels.get(context.connectionId);
            if (channel) {
                channel.metadata.userId = authResult.userId;
                channel.metadata.organizationId = authResult.organizationId;
            }
        }

        return authResult;
    }

    private async handleExecution(
        message: CrossOriginMessage,
        context: MessageContext
    ): Promise<any> {
        const { input, options } = message.payload;

        // This would integrate with the widget execution engine
        // For now, return a placeholder response
        return {
            executionId: crypto.randomUUID(),
            status: 'completed',
            result: {
                message: 'Widget execution completed',
                input,
                options,
                context,
            },
            timestamp: new Date(),
        };
    }

    private async handleStatusRequest(
        message: CrossOriginMessage,
        context: MessageContext
    ): Promise<any> {
        const channel = this.communicationChannels.get(context.connectionId);

        return {
            channelId: context.connectionId,
            widgetId: context.widgetId,
            sessionId: context.sessionId,
            isActive: channel?.isActive || false,
            messageCount: channel?.messageCount || 0,
            errorCount: channel?.errorCount || 0,
            lastActivity: channel?.lastActivity,
            uptime: channel ? Date.now() - channel.established.getTime() : 0,
        };
    }

    // Cleanup and maintenance methods
    private cleanupInactiveChannels(): void {
        const now = new Date();
        const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

        for (const [channelId, channel] of this.communicationChannels.entries()) {
            const timeSinceActivity = now.getTime() - channel.lastActivity.getTime();

            if (timeSinceActivity > inactiveThreshold) {
                this.logger.debug(`Cleaning up inactive channel: ${channelId}`);
                this.closeChannel(channelId);
            }
        }
    }

    private processMessageQueues(): void {
        for (const [channelId, queue] of this.messageQueues.entries()) {
            if (queue.messages.length === 0) continue;

            const now = new Date();
            const timeSinceLastProcess = now.getTime() - queue.lastProcessed.getTime();
            const messagesPerSecond = queue.processingRate;
            const maxMessagesToProcess = Math.floor(
                (timeSinceLastProcess / 1000) * messagesPerSecond
            );

            if (maxMessagesToProcess > 0) {
                const messagesToProcess = queue.messages.splice(0, maxMessagesToProcess);
                queue.lastProcessed = now;

                // Process messages (this would integrate with actual processing logic)
                this.logger.debug(
                    `Processed ${messagesToProcess.length} messages for channel ${channelId}`
                );
            }
        }
    }

    private async sendHeartbeats(): Promise<void> {
        const heartbeatPromises = Array.from(this.communicationChannels.entries())
            .filter(([_, channel]) => channel.isActive)
            .map(async ([channelId, channel]) => {
                try {
                    await this.sendMessage(channelId, {
                        type: 'heartbeat',
                        action: 'heartbeat',
                        payload: {
                            timestamp: new Date(),
                            channelId,
                        },
                        origin: 'platform',
                        sessionId: channel.sessionId,
                        widgetId: channel.widgetId,
                    });
                } catch (error) {
                    this.logger.error(`Failed to send heartbeat to channel ${channelId}:`, error);
                }
            });

        await Promise.allSettled(heartbeatPromises);
    }

    // Utility methods for external integration
    public async sendRequest(
        channelId: string,
        action: string,
        payload: any,
        timeout: number = 30000
    ): Promise<any> {
        const channel = this.communicationChannels.get(channelId);
        if (!channel || !channel.isActive) {
            throw new Error(`Channel ${channelId} not found or inactive`);
        }

        const requestId = crypto.randomUUID();

        return new Promise((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                this.pendingResponses.delete(requestId);
                reject(new Error(`Request ${requestId} timed out`));
            }, timeout);

            this.pendingResponses.set(requestId, {
                resolve,
                reject,
                timeout: timeoutHandle,
            });

            this.sendMessage(channelId, {
                type: 'request',
                action,
                payload: { ...payload, requestId },
                origin: 'platform',
                sessionId: channel.sessionId,
                widgetId: channel.widgetId,
            }).catch(error => {
                this.pendingResponses.delete(requestId);
                clearTimeout(timeoutHandle);
                reject(error);
            });
        });
    }

    public handleResponse(message: CrossOriginMessage): void {
        const requestId = message.payload?.requestId;
        if (!requestId) return;

        const pendingResponse = this.pendingResponses.get(requestId);
        if (pendingResponse) {
            clearTimeout(pendingResponse.timeout);
            this.pendingResponses.delete(requestId);

            if (message.payload.error) {
                pendingResponse.reject(new Error(message.payload.error));
            } else {
                pendingResponse.resolve(message.payload);
            }
        }
    }
}