import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WidgetAnalytics } from '@database/entities/widget-analytics.entity';
import { Organization } from '@database/entities/organization.entity';

export interface PrivacySettings {
  anonymizeIp: boolean;
  respectDoNotTrack: boolean;
  cookieConsent: boolean;
  dataRetentionDays: number;
  allowCrossDomainTracking: boolean;
  gdprCompliant: boolean;
}

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    @InjectRepository(WidgetAnalytics)
    private widgetAnalyticsRepository: Repository<WidgetAnalytics>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  async processDataWithPrivacyCompliance(
    analyticsData: Partial<WidgetAnalytics>,
    organizationId: string,
    userConsent?: any,
  ): Promise<Partial<WidgetAnalytics>> {
    // Get organization privacy settings
    const privacySettings = await this.getPrivacySettings(organizationId);

    // Apply privacy filters
    let processedData = { ...analyticsData };

    // Anonymize IP address if required
    if (privacySettings.anonymizeIp && processedData.ipAddress) {
      processedData.ipAddress = this.anonymizeIpAddress(processedData.ipAddress);
    }

    // Respect Do Not Track header
    if (privacySettings.respectDoNotTrack && userConsent?.doNotTrack) {
      // Limit data collection for users with DNT enabled
      processedData = this.limitDataCollection(processedData);
    }

    // Check cookie consent
    if (privacySettings.cookieConsent && !userConsent?.cookiesAccepted) {
      // Only collect essential analytics without personal identifiers
      processedData = this.collectEssentialDataOnly(processedData);
    }

    // Apply GDPR compliance measures
    if (privacySettings.gdprCompliant) {
      processedData = await this.applyGdprCompliance(processedData, userConsent);
    }

    return processedData;
  }

  async cleanupExpiredData(organizationId: string): Promise<void> {
    const privacySettings = await this.getPrivacySettings(organizationId);
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - privacySettings.dataRetentionDays);

    // Delete analytics data older than retention period
    const deletedCount = await this.widgetAnalyticsRepository
      .createQueryBuilder()
      .delete()
      .where('date < :retentionDate', { retentionDate })
      .andWhere('widgetId IN (SELECT id FROM widgets WHERE organizationId = :organizationId)', { organizationId })
      .execute();

    this.logger.log(`Cleaned up ${deletedCount.affected} expired analytics records for organization ${organizationId}`);
  }

  async exportUserData(sessionId: string, organizationId: string): Promise<any[]> {
    // Export all data for a specific user session (GDPR right to data portability)
    const userData = await this.widgetAnalyticsRepository.find({
      where: { sessionId },
      select: [
        'id',
        'eventType',
        'date',
        'pageUrl',
        'deviceType',
        'browserName',
        'browserVersion',
        'operatingSystem',
        'country',
        'region',
        'city',
        'properties',
      ],
    });

    return userData.map(record => ({
      ...record,
      ipAddress: '[ANONYMIZED]', // Never export IP addresses
    }));
  }

  async deleteUserData(sessionId: string, organizationId: string): Promise<void> {
    // Delete all data for a specific user session (GDPR right to erasure)
    const deletedCount = await this.widgetAnalyticsRepository
      .createQueryBuilder()
      .delete()
      .where('sessionId = :sessionId', { sessionId })
      .andWhere('widgetId IN (SELECT id FROM widgets WHERE organizationId = :organizationId)', { organizationId })
      .execute();

    this.logger.log(`Deleted ${deletedCount.affected} analytics records for session ${sessionId}`);
  }

  async anonymizeUserData(sessionId: string, organizationId: string): Promise<void> {
    // Anonymize data instead of deleting (alternative to deletion)
    await this.widgetAnalyticsRepository
      .createQueryBuilder()
      .update()
      .set({
        sessionId: 'ANONYMIZED',
        ipAddress: '0.0.0.0',
        properties: {},
      })
      .where('sessionId = :sessionId', { sessionId })
      .andWhere('widgetId IN (SELECT id FROM widgets WHERE organizationId = :organizationId)', { organizationId })
      .execute();

    this.logger.log(`Anonymized analytics data for session ${sessionId}`);
  }

  private async getPrivacySettings(organizationId: string): Promise<PrivacySettings> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    // Default privacy settings - should be configurable per organization
    const defaultSettings: PrivacySettings = {
      anonymizeIp: true,
      respectDoNotTrack: true,
      cookieConsent: true,
      dataRetentionDays: 365, // 1 year default
      allowCrossDomainTracking: false,
      gdprCompliant: true,
    };

    // Merge with organization-specific settings if available
    const orgPrivacySettings = organization?.privacySettings as PrivacySettings | undefined;
    
    return {
      ...defaultSettings,
      ...(orgPrivacySettings || {}),
    };
  }

  private anonymizeIpAddress(ipAddress: string): string {
    // Anonymize IP address by removing last octet for IPv4 or last 80 bits for IPv6
    if (ipAddress.includes(':')) {
      // IPv6 - remove last 80 bits
      const parts = ipAddress.split(':');
      return parts.slice(0, 3).join(':') + '::';
    } else {
      // IPv4 - remove last octet
      const parts = ipAddress.split('.');
      return parts.slice(0, 3).join('.') + '.0';
    }
  }

  private limitDataCollection(data: Partial<WidgetAnalytics>): Partial<WidgetAnalytics> {
    // Limit data collection for users with Do Not Track enabled
    return {
      ...data,
      ipAddress: '0.0.0.0',
      country: undefined,
      region: undefined,
      city: undefined,
      properties: {}, // Remove custom properties
    };
  }

  private collectEssentialDataOnly(data: Partial<WidgetAnalytics>): Partial<WidgetAnalytics> {
    // Only collect essential analytics without personal identifiers
    return {
      eventType: data.eventType,
      date: data.date,
      deviceType: data.deviceType,
      browserName: data.browserName,
      // Remove all potentially identifying information
      sessionId: 'ANONYMOUS',
      ipAddress: '0.0.0.0',
      pageUrl: 'ANONYMOUS',
      userAgent: 'ANONYMOUS',
      properties: {},
    };
  }

  private async applyGdprCompliance(
    data: Partial<WidgetAnalytics>,
    userConsent?: any,
  ): Promise<Partial<WidgetAnalytics>> {
    // Apply GDPR compliance measures
    if (!userConsent?.analyticsConsent) {
      // User hasn't consented to analytics - collect minimal data only
      return this.collectEssentialDataOnly(data);
    }

    // User has consented - apply standard privacy measures
    return {
      ...data,
      ipAddress: data.ipAddress ? this.anonymizeIpAddress(data.ipAddress) : '0.0.0.0',
    };
  }

  async generatePrivacyReport(organizationId: string): Promise<any> {
    // Generate privacy compliance report
    const privacySettings = await this.getPrivacySettings(organizationId);
    
    const totalRecords = await this.widgetAnalyticsRepository
      .createQueryBuilder('analytics')
      .innerJoin('widgets', 'widget', 'widget.id = analytics.widgetId')
      .where('widget.organizationId = :organizationId', { organizationId })
      .getCount();

    const anonymizedRecords = await this.widgetAnalyticsRepository
      .createQueryBuilder('analytics')
      .innerJoin('widgets', 'widget', 'widget.id = analytics.widgetId')
      .where('widget.organizationId = :organizationId', { organizationId })
      .andWhere('analytics.ipAddress = :anonymizedIp', { anonymizedIp: '0.0.0.0' })
      .getCount();

    const oldestRecord = await this.widgetAnalyticsRepository
      .createQueryBuilder('analytics')
      .innerJoin('widgets', 'widget', 'widget.id = analytics.widgetId')
      .where('widget.organizationId = :organizationId', { organizationId })
      .orderBy('analytics.date', 'ASC')
      .getOne();

    return {
      organizationId,
      privacySettings,
      dataStats: {
        totalRecords,
        anonymizedRecords,
        anonymizationRate: totalRecords > 0 ? (anonymizedRecords / totalRecords) * 100 : 0,
        oldestRecordDate: oldestRecord?.date,
        dataRetentionCompliance: this.checkDataRetentionCompliance(oldestRecord?.date, privacySettings.dataRetentionDays),
      },
      complianceStatus: {
        gdprCompliant: privacySettings.gdprCompliant,
        ipAnonymization: privacySettings.anonymizeIp,
        respectsDoNotTrack: privacySettings.respectDoNotTrack,
        cookieConsentRequired: privacySettings.cookieConsent,
      },
      generatedAt: new Date(),
    };
  }

  private checkDataRetentionCompliance(oldestDate?: Date, retentionDays?: number): boolean {
    if (!oldestDate || !retentionDays) return true;
    
    const retentionLimit = new Date();
    retentionLimit.setDate(retentionLimit.getDate() - retentionDays);
    
    return oldestDate >= retentionLimit;
  }
}