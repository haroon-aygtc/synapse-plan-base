import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationDelivery } from '@database/entities';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailDeliveryProvider {
  private readonly logger = new Logger(EmailDeliveryProvider.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const emailConfig = {
      host: this.configService.get<string>('EMAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('EMAIL_PORT', 587),
      secure: this.configService.get<boolean>('EMAIL_SECURE', false),
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    };

    this.transporter = nodemailer.createTransport(emailConfig);

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('Email transporter verification failed:', error);
      } else {
        this.logger.log('Email transporter is ready to send messages');
      }
    });
  }

  async sendEmail(delivery: NotificationDelivery): Promise<any> {
    try {
      const { notification } = delivery;
      const emailData = delivery.deliveryData?.email;

      if (!emailData || !emailData.toAddresses?.length) {
        throw new Error('No email recipients specified');
      }

      const mailOptions = {
        from: {
          name: this.configService.get<string>('EMAIL_FROM_NAME', 'SynapseAI'),
          address: this.configService.get<string>('EMAIL_FROM_ADDRESS', emailData.fromAddress || this.configService.get<string>('EMAIL_USER')),
        },
        to: emailData.toAddresses,
        cc: emailData.ccAddresses,
        bcc: emailData.bccAddresses,
        subject: emailData.subject || notification.title,
        text: notification.message,
        html: this.generateHtmlContent(notification.title, notification.message, notification.data),
        messageId: `${delivery.id}@synapseai.com`,
        headers: {
          'X-Notification-ID': notification.id,
          'X-Delivery-ID': delivery.id,
          'X-Organization-ID': notification.organizationId,
        },
      };

      const result = await this.transporter.sendMail(mailOptions);

      this.logger.debug(`Email sent successfully: ${result.messageId}`);

      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
        envelope: result.envelope,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }

  private generateHtmlContent(title: string, message: string, data?: any): string {
    const baseUrl = this.configService.get<string>('APP_URL', 'https://app.synapseai.com');
    const logoUrl = `${baseUrl}/logo.png`;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e9ecef;
          }
          .logo {
            max-width: 150px;
            height: auto;
          }
          .title {
            color: #2c3e50;
            font-size: 24px;
            font-weight: 600;
            margin: 20px 0 10px 0;
          }
          .message {
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 20px;
            color: #555;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            font-size: 14px;
            color: #6c757d;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
          }
          .data-section {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${logoUrl}" alt="SynapseAI" class="logo" />
            <h1 class="title">${title}</h1>
          </div>
          
          <div class="message">
            ${message.replace(/\n/g, '<br>')}
          </div>
          
          ${data ? `
            <div class="data-section">
              <strong>Additional Information:</strong><br>
              <pre>${JSON.stringify(data, null, 2)}</pre>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>This notification was sent by SynapseAI</p>
            <p>If you no longer wish to receive these notifications, you can update your preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('Email connection test failed:', error);
      return false;
    }
  }

  async sendBatchEmail(deliveries: NotificationDelivery[]): Promise<any[]> {
    const results = [];
    
    for (const delivery of deliveries) {
      try {
        const result = await this.sendEmail(delivery);
        results.push({ deliveryId: delivery.id, success: true, result });
      } catch (error) {
        results.push({ 
          deliveryId: delivery.id, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    return results;
  }
}
