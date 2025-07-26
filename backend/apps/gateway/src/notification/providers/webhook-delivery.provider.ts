import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationDelivery } from '@database/entities';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import * as crypto from 'crypto';

interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  statusText?: string;
  responseTime?: number;
  responseHeaders?: any;
  responseData?: any;
  error?: string;
}

interface WebhookError extends Error {
  response?: {
    status: number;
    statusText: string;
    headers: any;
    data: any;
  };
  config?: {
    metadata?: {
      startTime?: number;
    };
  };
  statusCode?: number;
}

@Injectable()
export class WebhookDeliveryProvider {
  private readonly logger = new Logger(WebhookDeliveryProvider.name);
  private httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.initializeHttpClient();
  }

  private initializeHttpClient(): void {
    this.httpClient = axios.create({
      timeout: this.configService.get<number>('WEBHOOK_TIMEOUT', 30000),
      maxRedirects: 3,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      headers: {
        'User-Agent': 'SynapseAI-Webhook/1.0',
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug(`Webhook request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Webhook request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`Webhook response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        this.logger.error('Webhook response error:', error.message);
        return Promise.reject(error);
      }
    );
  }

  async sendWebhook(delivery: NotificationDelivery): Promise<WebhookDeliveryResult> {
    try {
      const { notification } = delivery;
      const webhookData = delivery.deliveryData?.webhook;

      if (!webhookData?.url) {
        throw new Error('No webhook URL specified');
      }

      const payload = this.buildWebhookPayload(notification, delivery);
      const signature = this.generateSignature(payload, webhookData.url);

      const requestConfig: AxiosRequestConfig = {
        method: (webhookData.method || 'POST').toUpperCase() as any,
        url: webhookData.url,
        data: payload,
        headers: {
          ...webhookData.requestHeaders,
          'X-SynapseAI-Signature': signature,
          'X-SynapseAI-Timestamp': Date.now().toString(),
          'X-SynapseAI-Delivery-ID': delivery.id,
          'X-SynapseAI-Notification-ID': notification.id,
          'X-SynapseAI-Event-Type': notification.eventType || 'notification',
        },
        timeout: this.configService.get<number>('WEBHOOK_TIMEOUT', 30000),
      };

      const startTime = Date.now();
      const response: AxiosResponse = await this.httpClient.request(requestConfig);
      const responseTime = Date.now() - startTime;

      this.logger.debug(`Webhook delivered successfully in ${responseTime}ms`);

      return {
        success: true,
        statusCode: response.status,
        statusText: response.statusText,
        responseTime,
        responseHeaders: response.headers,
        responseData: this.sanitizeResponseData(response.data),
      };
    } catch (error) {
      const webhookError = error as WebhookError;
      const responseTime = webhookError.response
        ? Date.now() - (webhookError.config?.metadata?.startTime || Date.now())
        : 0;

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to send webhook: ${errorMessage}`, errorStack);

      // Extract useful error information
      const errorInfo: WebhookDeliveryResult = {
        success: false,
        error: errorMessage,
        statusCode: webhookError.response?.status,
        statusText: webhookError.response?.statusText,
        responseTime,
        responseHeaders: webhookError.response?.headers,
        responseData: webhookError.response?.data ? this.sanitizeResponseData(webhookError.response.data) : null,
      };

      // Create a new error with additional properties
      const enhancedError = new Error(errorMessage) as WebhookError;
      enhancedError.response = webhookError.response;
      enhancedError.config = webhookError.config;
      enhancedError.statusCode = webhookError.statusCode;

      throw enhancedError;
    }
  }

  private buildWebhookPayload(notification: any, delivery: NotificationDelivery): any {
    return {
      id: notification.id,
      event: notification.eventType || 'notification.sent',
      timestamp: new Date().toISOString(),
      data: {
        notification: {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          status: notification.status,
          eventType: notification.eventType,
          sourceModule: notification.sourceModule,
          correlationId: notification.correlationId,
          data: notification.data,
          metadata: notification.metadata,
          createdAt: notification.createdAt,
          scheduledFor: notification.scheduledFor,
        },
        delivery: {
          id: delivery.id,
          type: delivery.type,
          recipient: delivery.recipient,
          attempt: delivery.retryCount + 1,
          maxRetries: delivery.maxRetries,
        },
        organization: {
          id: notification.organizationId,
        },
        user: {
          id: notification.userId,
        },
      },
    };
  }

  private generateSignature(payload: any, url: string): string {
    const secret = this.configService.get<string>('WEBHOOK_SECRET', 'default-webhook-secret');
    const payloadString = JSON.stringify(payload);

    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  private sanitizeResponseData(data: any): any {
    if (!data) return null;

    // Limit response data size to prevent memory issues
    const maxSize = 10000; // 10KB
    const dataString = JSON.stringify(data);

    if (dataString.length > maxSize) {
      return {
        truncated: true,
        size: dataString.length,
        preview: `${dataString.substring(0, maxSize)}...`,
      };
    }

    return data;
  }

  async testWebhook(url: string, secret?: string): Promise<boolean> {
    try {
      const testPayload = {
        id: 'test-webhook',
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook from SynapseAI',
          test: true,
        },
      };

      const signature = secret
        ? crypto.createHmac('sha256', secret).update(JSON.stringify(testPayload)).digest('hex')
        : this.generateSignature(testPayload, url);

      const response = await this.httpClient.post(url, testPayload, {
        headers: {
          'X-SynapseAI-Signature': signature,
          'X-SynapseAI-Timestamp': Date.now().toString(),
          'X-SynapseAI-Test': 'true',
        },
        timeout: 10000,
      });

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Webhook test failed:', errorMessage);
      return false;
    }
  }

  async sendBatchWebhook(deliveries: NotificationDelivery[]): Promise<Array<{ deliveryId: string; success: boolean; result?: WebhookDeliveryResult; error?: string; statusCode?: number }>> {
    const results: Array<{ deliveryId: string; success: boolean; result?: WebhookDeliveryResult; error?: string; statusCode?: number }> = [];
    const concurrencyLimit = this.configService.get<number>('WEBHOOK_CONCURRENCY_LIMIT', 5);

    // Process webhooks in batches to avoid overwhelming the target servers
    for (let i = 0; i < deliveries.length; i += concurrencyLimit) {
      const batch = deliveries.slice(i, i + concurrencyLimit);

      const batchPromises = batch.map(async (delivery) => {
        try {
          const result = await this.sendWebhook(delivery);
          return { deliveryId: delivery.id, success: true, result };
        } catch (error) {
          const webhookError = error as WebhookError;
          return {
            deliveryId: delivery.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            statusCode: webhookError.statusCode,
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            deliveryId: 'unknown',
            success: false,
            error: result.reason?.message || 'Unknown error',
          });
        }
      });

      // Add delay between batches to be respectful to target servers
      if (i + concurrencyLimit < deliveries.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  verifyWebhookSignature(payload: string, signature: string, secret?: string): boolean {
    try {
      const webhookSecret =
        secret || this.configService.get<string>('WEBHOOK_SECRET', 'default-webhook-secret');
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      this.logger.error('Failed to verify webhook signature:', error);
      return false;
    }
  }
}
