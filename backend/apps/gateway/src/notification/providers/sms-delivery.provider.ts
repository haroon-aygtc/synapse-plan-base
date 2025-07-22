import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationDelivery } from '@database/entities';
import { Twilio } from 'twilio';

@Injectable()
export class SmsDeliveryProvider {
  private readonly logger = new Logger(SmsDeliveryProvider.name);
  private twilioClient: Twilio;
  private fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    this.initializeTwilio();
  }

  private initializeTwilio(): void {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !this.fromNumber) {
      this.logger.warn('Twilio credentials not configured. SMS delivery will be disabled.');
      return;
    }

    try {
      this.twilioClient = new Twilio(accountSid, authToken);
      this.logger.log('Twilio SMS provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Twilio client:', error);
    }
  }

  async sendSms(delivery: NotificationDelivery): Promise<any> {
    if (!this.twilioClient) {
      throw new Error('Twilio client not initialized. Please check your configuration.');
    }

    try {
      const { notification } = delivery;
      const smsData = delivery.deliveryData?.sms;

      if (!smsData?.toNumber) {
        throw new Error('No SMS recipient specified');
      }

      // Format the message
      const messageBody = this.formatSmsMessage(notification.title, notification.message);

      const messageOptions = {
        body: messageBody,
        from: this.fromNumber,
        to: smsData.toNumber,
        statusCallback: this.configService.get<string>('TWILIO_STATUS_CALLBACK_URL'),
        provideFeedback: true,
      };

      const result = await this.twilioClient.messages.create(messageOptions);

      this.logger.debug(`SMS sent successfully: ${result.sid}`);

      return {
        success: true,
        messageId: result.sid,
        status: result.status,
        direction: result.direction,
        price: result.price,
        priceUnit: result.priceUnit,
        segments: result.numSegments,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`, error.stack);
      throw error;
    }
  }

  private formatSmsMessage(title: string, message: string): string {
    // SMS has character limits, so we need to format appropriately
    const maxLength = 1600; // SMS limit
    const prefix = `[SynapseAI] ${title}\n\n`;
    const suffix = '\n\nReply STOP to unsubscribe.';
    
    const availableLength = maxLength - prefix.length - suffix.length;
    let formattedMessage = message;
    
    if (formattedMessage.length > availableLength) {
      formattedMessage = formattedMessage.substring(0, availableLength - 3) + '...';
    }
    
    return `${prefix}${formattedMessage}${suffix}`;
  }

  async getMessageStatus(messageId: string): Promise<any> {
    if (!this.twilioClient) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const message = await this.twilioClient.messages(messageId).fetch();
      return {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        price: message.price,
        priceUnit: message.priceUnit,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        dateSent: message.dateSent,
      };
    } catch (error) {
      this.logger.error(`Failed to get SMS status: ${error.message}`);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.twilioClient) {
      return false;
    }

    try {
      // Test by fetching account info
      await this.twilioClient.api.accounts.list({ limit: 1 });
      return true;
    } catch (error) {
      this.logger.error('SMS connection test failed:', error);
      return false;
    }
  }

  async sendBatchSms(deliveries: NotificationDelivery[]): Promise<any[]> {
    const results = [];
    
    // Process SMS deliveries with rate limiting
    for (let i = 0; i < deliveries.length; i++) {
      try {
        const result = await this.sendSms(deliveries[i]);
        results.push({ deliveryId: deliveries[i].id, success: true, result });
        
        // Rate limiting: wait 100ms between SMS sends to avoid hitting Twilio limits
        if (i < deliveries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        results.push({ 
          deliveryId: deliveries[i].id, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    return results;
  }

  async handleStatusCallback(payload: any): Promise<void> {
    try {
      this.logger.debug('Received SMS status callback:', payload);
      
      // Here you would typically update the delivery status in the database
      // based on the callback payload from Twilio
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = payload;
      
      // Emit event for status update
      // This would be handled by the notification delivery service
    } catch (error) {
      this.logger.error('Failed to handle SMS status callback:', error);
    }
  }
}
