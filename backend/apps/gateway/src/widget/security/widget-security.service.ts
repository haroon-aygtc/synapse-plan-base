import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Widget } from '@database/entities/widget.entity';
import { WidgetExecution } from '@database/entities/widget-execution.entity';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

export interface SecurityValidationResult {
  isValid: boolean;
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface WidgetSecurityContext {
  origin: string;
  userAgent: string;
  ipAddress: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  requestSignature?: string;
}

export interface RateLimitInfo {
  requestCount: number;
  windowStart: Date;
  windowEnd: Date;
  isLimited: boolean;
  resetTime: Date;
}

export interface SecurityAuditLog {
  id: string;
  widgetId: string;
  eventType: 'access_granted' | 'access_denied' | 'rate_limited' | 'suspicious_activity';
  context: WidgetSecurityContext;
  details: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class WidgetSecurityService {
  private readonly logger = new Logger(WidgetSecurityService.name);
  private readonly rateLimitStore = new Map<string, RateLimitInfo>();
  private readonly securityAuditLogs: SecurityAuditLog[] = [];
  private readonly suspiciousIPs = new Set<string>();
  private readonly trustedOrigins = new Set<string>();

  constructor(
    @InjectRepository(Widget)
    private widgetRepository: Repository<Widget>,
    @InjectRepository(WidgetExecution)
    private widgetExecutionRepository: Repository<WidgetExecution>,
  ) {
    this.initializeSecurity();
  }

  private initializeSecurity(): void {
    this.logger.log('Initializing Widget Security Service...');
    
    // Set up cleanup intervals
    setInterval(() => this.cleanupRateLimitStore(), 60000); // Every minute
    setInterval(() => this.analyzeSecurityPatterns(), 300000); // Every 5 minutes
    
    // Load trusted origins from configuration
    this.loadTrustedOrigins();
    
    this.logger.log('Widget Security Service initialized successfully');
  }

  /**
   * Validate widget access request
   */
  async validateAccess(
    widgetId: string,
    context: WidgetSecurityContext,
  ): Promise<SecurityValidationResult> {
    this.logger.debug(`Validating access for widget ${widgetId} from ${context.origin}`);

    const widget = await this.widgetRepository.findOne({
      where: { id: widgetId, isActive: true, isDeployed: true },
    });

    if (!widget) {
      return {
        isValid: false,
        reason: 'Widget not found or inactive',
        riskLevel: 'high',
        recommendations: ['Verify widget ID and deployment status'],
      };
    }

    const validations = [
      await this.validateOriginInternal(widget, context),
      await this.validateRateLimit(widget, context),
      await this.validateIPAddress(context),
      await this.validateUserAgent(context),
      await this.validateRequestSignature(widget, context),
    ];

    const failedValidations = validations.filter(v => !v.isValid);
    
    if (failedValidations.length > 0) {
      const result: SecurityValidationResult = {
        isValid: false,
        reason: failedValidations.map(v => v.reason).join('; '),
        riskLevel: this.calculateRiskLevel(failedValidations),
        recommendations: failedValidations.flatMap(v => v.recommendations),
      };

      await this.logSecurityEvent(widgetId, 'access_denied', context, {
        failedValidations: failedValidations.map(v => v.reason),
        riskLevel: result.riskLevel,
      });

      return result;
    }

    await this.logSecurityEvent(widgetId, 'access_granted', context, {
      validations: validations.length,
    });

    return {
      isValid: true,
      riskLevel: 'low',
      recommendations: [],
    };
  }

  /**
   * Public method to validate origin against allowed domains
   */
  public validateOrigin(origin: string, allowedDomains: string[]): boolean {
    return this.isOriginAllowed(origin, allowedDomains);
  }

  /**
   * Validate origin against widget's allowed domains (internal)
   */
  private async validateOriginInternal(
    widget: Widget,
    context: WidgetSecurityContext,
  ): Promise<SecurityValidationResult> {
    const allowedDomains = widget.configuration.security.allowedDomains;
    
    // If no restrictions, allow all origins
    if (!allowedDomains || allowedDomains.length === 0) {
      return {
        isValid: true,
        riskLevel: 'medium',
        recommendations: ['Consider restricting allowed domains for better security'],
      };
    }

    // Check if origin is in allowed list
    const isAllowed = this.isOriginAllowed(context.origin, allowedDomains);
    
    if (!isAllowed) {
      return {
        isValid: false,
        reason: `Origin ${context.origin} not in allowed domains`,
        riskLevel: 'high',
        recommendations: [
          'Add the origin to allowed domains',
          'Verify the request is legitimate',
        ],
      };
    }

    return {
      isValid: true,
      riskLevel: 'low',
      recommendations: [],
    };
  }

  /**
   * Validate rate limiting
   */
  private async validateRateLimit(
    widget: Widget,
    context: WidgetSecurityContext,
  ): Promise<SecurityValidationResult> {
    const rateLimitConfig = widget.configuration.security.rateLimiting;
    
    if (!rateLimitConfig.enabled) {
      return {
        isValid: true,
        riskLevel: 'medium',
        recommendations: ['Consider enabling rate limiting for better security'],
      };
    }

    const key = `${widget.id}:${context.ipAddress}`;
    const now = new Date();
    const windowMs = 60 * 1000; // 1 minute window
    
    let rateLimitInfo = this.rateLimitStore.get(key);
    
    if (!rateLimitInfo || now.getTime() > rateLimitInfo.windowEnd.getTime()) {
      // Create new rate limit window
      rateLimitInfo = {
        requestCount: 1,
        windowStart: now,
        windowEnd: new Date(now.getTime() + windowMs),
        isLimited: false,
        resetTime: new Date(now.getTime() + windowMs),
      };
    } else {
      // Increment request count
      rateLimitInfo.requestCount++;
    }

    // Check if rate limit exceeded
    if (rateLimitInfo.requestCount > rateLimitConfig.requestsPerMinute) {
      rateLimitInfo.isLimited = true;
      this.rateLimitStore.set(key, rateLimitInfo);

      await this.logSecurityEvent(widget.id, 'rate_limited', context, {
        requestCount: rateLimitInfo.requestCount,
        limit: rateLimitConfig.requestsPerMinute,
      });

      return {
        isValid: false,
        reason: 'Rate limit exceeded',
        riskLevel: 'medium',
        recommendations: [
          'Wait before making more requests',
          'Implement client-side rate limiting',
        ],
      };
    }

    this.rateLimitStore.set(key, rateLimitInfo);

    return {
      isValid: true,
      riskLevel: 'low',
      recommendations: [],
    };
  }

  /**
   * Validate IP address
   */
  private async validateIPAddress(
    context: WidgetSecurityContext,
  ): Promise<SecurityValidationResult> {
    // Check if IP is in suspicious list
    if (this.suspiciousIPs.has(context.ipAddress)) {
      return {
        isValid: false,
        reason: 'IP address flagged as suspicious',
        riskLevel: 'high',
        recommendations: [
          'Verify the request is legitimate',
          'Contact support if this is a false positive',
        ],
      };
    }

    // Check for private/local IP addresses in production
    if (process.env.NODE_ENV === 'production' && this.isPrivateIP(context.ipAddress)) {
      return {
        isValid: false,
        reason: 'Private IP addresses not allowed in production',
        riskLevel: 'medium',
        recommendations: [
          'Use public IP address',
          'Configure proper network setup',
        ],
      };
    }

    return {
      isValid: true,
      riskLevel: 'low',
      recommendations: [],
    };
  }

  /**
   * Validate user agent
   */
  private async validateUserAgent(
    context: WidgetSecurityContext,
  ): Promise<SecurityValidationResult> {
    if (!context.userAgent || context.userAgent.trim() === '') {
      return {
        isValid: false,
        reason: 'Missing or empty user agent',
        riskLevel: 'medium',
        recommendations: [
          'Ensure user agent is properly set',
          'Check browser configuration',
        ],
      };
    }

    // Check for suspicious user agent patterns
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(context.userAgent)) {
        return {
          isValid: false,
          reason: 'Suspicious user agent detected',
          riskLevel: 'high',
          recommendations: [
            'Use legitimate browser user agent',
            'Contact support if this is a false positive',
          ],
        };
      }
    }

    return {
      isValid: true,
      riskLevel: 'low',
      recommendations: [],
    };
  }

  /**
   * Validate request signature
   */
  private async validateRequestSignature(
    widget: Widget,
    context: WidgetSecurityContext,
  ): Promise<SecurityValidationResult> {
    if (!widget.configuration.security.encryptData) {
      return {
        isValid: true,
        riskLevel: 'medium',
        recommendations: ['Consider enabling request signing for better security'],
      };
    }

    if (!context.requestSignature) {
      return {
        isValid: false,
        reason: 'Missing request signature',
        riskLevel: 'high',
        recommendations: [
          'Include request signature',
          'Verify signing implementation',
        ],
      };
    }

    try {
      const isValid = this.verifyRequestSignature(widget, context);
      
      if (!isValid) {
        return {
          isValid: false,
          reason: 'Invalid request signature',
          riskLevel: 'high',
          recommendations: [
            'Verify signing key and algorithm',
            'Check request payload integrity',
          ],
        };
      }

      return {
        isValid: true,
        riskLevel: 'low',
        recommendations: [],
      };
    } catch (error) {
      return {
        isValid: false,
        reason: `Signature verification failed: ${error.message}`,
        riskLevel: 'high',
        recommendations: [
          'Check signature format',
          'Verify signing implementation',
        ],
      };
    }
  }

  /**
   * Generate secure widget token
   */
  generateWidgetToken(
    widgetId: string,
    sessionId: string,
    userId?: string,
    expiresIn: string = '1h',
  ): string {
    const payload = {
      widgetId,
      sessionId,
      userId,
      iat: Math.floor(Date.now() / 1000),
    };

    const secret = process.env.WIDGET_JWT_SECRET || 'default-secret';
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Verify widget token
   */
  verifyWidgetToken(token: string): any {
    try {
      const secret = process.env.WIDGET_JWT_SECRET || 'default-secret';
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data: any, key?: string): string {
    const encryptionKey = key || process.env.WIDGET_ENCRYPTION_KEY || 'default-key';
    const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData: string, key?: string): any {
    const encryptionKey = key || process.env.WIDGET_ENCRYPTION_KEY || 'default-key';
    const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  /**
   * Get rate limit info for IP
   */
  getRateLimitInfo(widgetId: string, ipAddress: string): RateLimitInfo | null {
    const key = `${widgetId}:${ipAddress}`;
    return this.rateLimitStore.get(key) || null;
  }

  /**
   * Add IP to suspicious list
   */
  flagSuspiciousIP(ipAddress: string, reason: string): void {
    this.suspiciousIPs.add(ipAddress);
    this.logger.warn(`IP ${ipAddress} flagged as suspicious: ${reason}`);
  }

  /**
   * Remove IP from suspicious list
   */
  unflagSuspiciousIP(ipAddress: string): void {
    this.suspiciousIPs.delete(ipAddress);
    this.logger.log(`IP ${ipAddress} removed from suspicious list`);
  }

  /**
   * Sign message for secure communication
   */
  async signMessage(message: any): Promise<string> {
    const secret = process.env.WIDGET_SIGNING_SECRET || 'default-secret';
    const payload = JSON.stringify(message);
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify message signature
   */
  async verifyMessage(message: any): Promise<boolean> {
    if (!message.signature) {
      return false;
    }

    const expectedSignature = await this.signMessage({
      ...message,
      signature: undefined, // Remove signature for verification
    });

    return message.signature === expectedSignature;
  }

  /**
   * Validate session for widget access
   */
  async validateSession(sessionId: string, widgetId: string): Promise<boolean> {
    // This would typically check against a session store
    // For now, return true if sessionId and widgetId are provided
    return !!(sessionId && widgetId);
  }

  /**
   * Check rate limit for specific action
   */
  async checkRateLimit(channelId: string, action: string): Promise<boolean> {
    const key = `${channelId}:${action}`;
    const now = new Date();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 60; // 60 requests per minute per action
    
    let rateLimitInfo = this.rateLimitStore.get(key);
    
    if (!rateLimitInfo || now.getTime() > rateLimitInfo.windowEnd.getTime()) {
      // Create new rate limit window
      rateLimitInfo = {
        requestCount: 1,
        windowStart: now,
        windowEnd: new Date(now.getTime() + windowMs),
        isLimited: false,
        resetTime: new Date(now.getTime() + windowMs),
      };
      this.rateLimitStore.set(key, rateLimitInfo);
      return true;
    }

    rateLimitInfo.requestCount++;
    
    if (rateLimitInfo.requestCount > maxRequests) {
      rateLimitInfo.isLimited = true;
      this.rateLimitStore.set(key, rateLimitInfo);
      return false;
    }

    this.rateLimitStore.set(key, rateLimitInfo);
    return true;
  }

  /**
   * Authenticate widget with token
   */
  async authenticateWidget(
    token: string,
    widgetId: string,
    sessionId: string,
  ): Promise<{ success: boolean; userId?: string; organizationId?: string; error?: string }> {
    try {
      const decoded = this.verifyWidgetToken(token);
      
      if (decoded.widgetId !== widgetId) {
        return {
          success: false,
          error: 'Token widget ID mismatch',
        };
      }

      if (decoded.sessionId !== sessionId) {
        return {
          success: false,
          error: 'Token session ID mismatch',
        };
      }

      return {
        success: true,
        userId: decoded.userId,
        organizationId: decoded.organizationId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }



  /**
   * Get security audit logs
   */
  getSecurityAuditLogs(
    widgetId?: string,
    eventType?: string,
    limit: number = 100,
  ): SecurityAuditLog[] {
    let logs = this.securityAuditLogs;

    if (widgetId) {
      logs = logs.filter(log => log.widgetId === widgetId);
    }

    if (eventType) {
      logs = logs.filter(log => log.eventType === eventType);
    }

    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Private helper methods

  private isOriginAllowed(origin: string, allowedDomains: string[]): boolean {
    // Check exact matches
    if (allowedDomains.includes(origin)) {
      return true;
    }

    // Check wildcard patterns
    for (const domain of allowedDomains) {
      if (domain.startsWith('*.')) {
        const pattern = domain.substring(2);
        if (origin.endsWith(pattern)) {
          return true;
        }
      }
    }

    return false;
  }

  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,
      /^fc00:/,
    ];

    return privateRanges.some(range => range.test(ip));
  }

  private verifyRequestSignature(
    widget: Widget,
    context: WidgetSecurityContext,
  ): boolean {
    // Implementation would verify HMAC signature
    const secret = process.env.WIDGET_SIGNING_SECRET || 'default-secret';
    const payload = `${context.origin}:${context.sessionId}:${context.timestamp.getTime()}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return context.requestSignature === expectedSignature;
  }

  private calculateRiskLevel(
    failedValidations: SecurityValidationResult[],
  ): 'low' | 'medium' | 'high' {
    const highRiskCount = failedValidations.filter(v => v.riskLevel === 'high').length;
    const mediumRiskCount = failedValidations.filter(v => v.riskLevel === 'medium').length;

    if (highRiskCount > 0) {
      return 'high';
    } else if (mediumRiskCount > 1) {
      return 'high';
    } else if (mediumRiskCount > 0) {
      return 'medium';
    }

    return 'low';
  }

  private async logSecurityEvent(
    widgetId: string,
    eventType: SecurityAuditLog['eventType'],
    context: WidgetSecurityContext,
    details: Record<string, any>,
  ): Promise<void> {
    const auditLog: SecurityAuditLog = {
      id: crypto.randomUUID(),
      widgetId,
      eventType,
      context,
      details,
      timestamp: new Date(),
    };

    this.securityAuditLogs.push(auditLog);

    // Keep only last 10000 logs to prevent memory issues
    if (this.securityAuditLogs.length > 10000) {
      this.securityAuditLogs.splice(0, this.securityAuditLogs.length - 10000);
    }

    // Log suspicious activities
    if (eventType === 'access_denied' || eventType === 'suspicious_activity') {
      this.logger.warn(`Security event: ${eventType} for widget ${widgetId}`, {
        context,
        details,
      });
    }
  }

  private cleanupRateLimitStore(): void {
    const now = new Date();
    
    for (const [key, rateLimitInfo] of this.rateLimitStore.entries()) {
      if (now.getTime() > rateLimitInfo.windowEnd.getTime()) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  private analyzeSecurityPatterns(): void {
    // Analyze recent security events for patterns
    const recentLogs = this.securityAuditLogs.filter(
      log => Date.now() - log.timestamp.getTime() < 300000, // Last 5 minutes
    );

    // Check for repeated access denials from same IP
    const ipDenials = new Map<string, number>();
    
    for (const log of recentLogs) {
      if (log.eventType === 'access_denied') {
        const ip = log.context.ipAddress;
        ipDenials.set(ip, (ipDenials.get(ip) || 0) + 1);
      }
    }

    // Flag IPs with too many denials
    for (const [ip, count] of ipDenials.entries()) {
      if (count >= 10) {
        this.flagSuspiciousIP(ip, `${count} access denials in 5 minutes`);
      }
    }
  }

  private loadTrustedOrigins(): void {
    // Load trusted origins from environment or configuration
    const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(',') || [];
    
    for (const origin of trustedOrigins) {
      this.trustedOrigins.add(origin.trim());
    }

    this.logger.log(`Loaded ${this.trustedOrigins.size} trusted origins`);
  }
}