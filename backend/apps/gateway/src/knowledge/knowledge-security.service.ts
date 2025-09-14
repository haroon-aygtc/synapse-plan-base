import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeDocument, DocumentVisibility } from '@database/entities';
import { UserRole } from '@shared/interfaces';
import { logSafeError } from '@shared/utils/error-guards';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

import * as crypto from 'crypto';
import { Buffer } from 'buffer';
import { CustomLoggerService } from '@shared/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from '@shared/monitoring/monitoring.service';

export interface SecurityContext {
  userId: string;
  organizationId: string;
  role: UserRole;
  teamIds?: string[];
}

export interface AccessPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
}

@Injectable()
export class KnowledgeSecurityService {
  private readonly logger: CustomLoggerService;
  private readonly virusPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload=/gi,
    /onerror=/gi,
    /onclick=/gi,
  ];
  private readonly redisPrefix = 'knowledge:security:';
  private readonly auditLogPrefix = 'knowledge:audit:';

  constructor(
    @InjectRepository(KnowledgeDocument)
    private readonly documentRepository: Repository<KnowledgeDocument>,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly monitoring: MonitoringService
  ) {
    this.logger = new CustomLoggerService(this.configService, KnowledgeSecurityService.name);
  }

  async checkDocumentAccess(
    documentId: string,
    context: SecurityContext,
    action: 'read' | 'write' | 'delete' | 'share' = 'read'
  ): Promise<boolean> {
    const startTime = Date.now();
    let hasAccess = false;

    try {
      const document = await this.documentRepository.findOne({
        where: { id: documentId },
        select: ['id', 'userId', 'organizationId', 'visibility'],
      });

      if (!document) {
        this.monitoring.recordMetric({
          name: 'document_access_check',
          value: 1,
          tags: {
            action,
            result: 'document_not_found',
            organization_id: context.organizationId,
            user_id: context.userId
          }
        });
        return false;
      }

      // Organization isolation - documents can only be accessed within the same org
      if (document.organizationId !== context.organizationId) {
        this.logger.warn(
          `Cross-organization access attempt: user ${context.userId} tried to access document ${documentId}`
        );

        this.monitoring.recordMetric({
          name: 'document_access_check',
          value: 1,
          tags: {
            action,
            result: 'cross_organization_denied',
            organization_id: context.organizationId,
            user_id: context.userId
          }
        });

        return false;
      }

      const permissions = await this.getDocumentPermissions(document, context);

      switch (action) {
        case 'read':
          hasAccess = permissions.canRead;
          break;
        case 'write':
          hasAccess = permissions.canWrite;
          break;
        case 'delete':
          hasAccess = permissions.canDelete;
          break;
        case 'share':
          hasAccess = permissions.canShare;
          break;
        default:
          hasAccess = false;
      }

      // Record access check metrics
      this.monitoring.recordMetric({
        name: 'document_access_check',
        value: 1,
        tags: {
          action,
          result: hasAccess ? 'allowed' : 'denied',
          organization_id: context.organizationId,
          user_id: context.userId,
          document_visibility: document.visibility
        }
      });

      // Record performance metrics
      const duration = Date.now() - startTime;
      this.monitoring.recordMetric({
        name: 'document_access_check_duration',
        value: duration,
        tags: {
          action,
          organization_id: context.organizationId
        }
      });

      return hasAccess;
    } catch (error) {
      logSafeError(this.logger, error, 'Error checking document access');

      this.monitoring.recordMetric({
        name: 'document_access_check',
        value: 1,
        tags: {
          action,
          result: 'error',
          organization_id: context.organizationId,
          user_id: context.userId
        }
      });

      return false;
    }
  }

  async getDocumentPermissions(
    document: Pick<KnowledgeDocument, 'userId' | 'organizationId' | 'visibility'>,
    context: SecurityContext
  ): Promise<AccessPermissions> {
    // Super admin has full access
    if (context.role === UserRole.SUPER_ADMIN) {
      return {
        canRead: true,
        canWrite: true,
        canDelete: true,
        canShare: true,
      };
    }

    // Organization admin has full access within their org
    if (context.role === UserRole.ORG_ADMIN && document.organizationId === context.organizationId) {
      return {
        canRead: true,
        canWrite: true,
        canDelete: true,
        canShare: true,
      };
    }

    // Document owner has full access
    if (document.userId === context.userId) {
      return {
        canRead: true,
        canWrite: true,
        canDelete: true,
        canShare: true,
      };
    }

    // Check visibility-based permissions
    switch (document.visibility) {
      case DocumentVisibility.PRIVATE:
        return {
          canRead: false,
          canWrite: false,
          canDelete: false,
          canShare: false,
        };

      case DocumentVisibility.TEAM:
        // In a real implementation, you would check team membership
        // For now, allow read access for developers in the same org
        const canAccessTeam = context.role === UserRole.DEVELOPER;
        return {
          canRead: canAccessTeam,
          canWrite: false,
          canDelete: false,
          canShare: false,
        };

      case DocumentVisibility.ORGANIZATION:
        const canAccessOrg = [UserRole.DEVELOPER, UserRole.ORG_ADMIN].includes(context.role);
        return {
          canRead: canAccessOrg,
          canWrite: false,
          canDelete: false,
          canShare: canAccessOrg,
        };

      default:
        return {
          canRead: false,
          canWrite: false,
          canDelete: false,
          canShare: false,
        };
    }
  }

  async filterDocumentsByAccess(
    documents: KnowledgeDocument[],
    context: SecurityContext
  ): Promise<KnowledgeDocument[]> {
    const accessibleDocuments: KnowledgeDocument[] = [];

    for (const document of documents) {
      const hasAccess = await this.checkDocumentAccess(document.id, context, 'read');
      if (hasAccess) {
        accessibleDocuments.push(document);
      }
    }

    return accessibleDocuments;
  }

  async validateDocumentUpload(
    buffer: Buffer,
    filename: string,
    context: SecurityContext
  ): Promise<{
    isValid: boolean;
    issues: string[];
    sanitizedContent?: Buffer;
  }> {
    const issues: string[] = [];
    let sanitizedContent = buffer;

    // File size validation (max 50MB)
    if (buffer.length > 50 * 1024 * 1024) {
      issues.push('File size exceeds maximum limit of 50MB');
    }

    // Filename validation
    if (!this.isValidFilename(filename)) {
      issues.push('Invalid filename - contains prohibited characters');
    }

    // Content validation
    const contentValidation = await this.validateContent(buffer);
    if (!contentValidation.isValid) {
      issues.push(...contentValidation.issues);
    } else if (contentValidation.sanitizedContent) {
      sanitizedContent = contentValidation.sanitizedContent;
    }

    // Rate limiting check
    const rateLimitCheck = await this.checkUploadRateLimit(context.userId);
    if (!rateLimitCheck.allowed) {
      issues.push(`Upload rate limit exceeded. Try again in ${rateLimitCheck.retryAfter} seconds`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      sanitizedContent: issues.length === 0 ? sanitizedContent : undefined,
    };
  }

  private isValidFilename(filename: string): boolean {
    // Check for prohibited characters and patterns
    const prohibitedPatterns = [
      /\.\./, // Directory traversal
      /[<>:"|?*]/, // Windows prohibited characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
      /^\./, // Hidden files
    ];

    return (
      filename.length > 0 &&
      filename.length <= 255 &&
      !prohibitedPatterns.some((pattern) => pattern.test(filename))
    );
  }

  private async validateContent(buffer: Buffer): Promise<{
    isValid: boolean;
    issues: string[];
    sanitizedContent?: Buffer;
  }> {
    const issues: string[] = [];
    const content = buffer.toString('utf-8', 0, Math.min(10000, buffer.length));

    // Check for malicious patterns
    for (const pattern of this.virusPatterns) {
      if (pattern.test(content)) {
        issues.push('Potentially malicious content detected');
        break;
      }
    }

    // Check for suspicious file headers
    const header = buffer.slice(0, 10).toString('hex');
    if (this.isSuspiciousFileType(header)) {
      issues.push('Suspicious file type detected');
    }

    // Sanitize content if needed
    let sanitizedContent: Buffer | undefined;
    if (issues.length === 0) {
      // Remove potentially dangerous content
      const sanitized = content.replace(/<script[^>]*>.*?<\/script>/gi, '');
      if (sanitized !== content) {
        sanitizedContent = Buffer.from(sanitized, 'utf-8');
        this.logger.log('Content sanitized - removed script tags');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      sanitizedContent,
    };
  }

  private isSuspiciousFileType(header: string): boolean {
    // Check for executable file headers
    const suspiciousHeaders = [
      '4d5a', // PE executable
      '7f454c46', // ELF executable
      'cafebabe', // Java class file
      '504b0304', // ZIP (could contain executables)
    ];

    return suspiciousHeaders.some((suspicious) => header.startsWith(suspicious));
  }

  private async checkUploadRateLimit(userId: string): Promise<{
    allowed: boolean;
    retryAfter?: number;
  }> {
    try {
      const key = `${this.redisPrefix}upload_rate:${userId}`;
      const now = Date.now();
      const windowMs = this.configService.get('UPLOAD_RATE_WINDOW_MS', 60 * 1000); // 1 minute
      const maxUploads = this.configService.get('UPLOAD_RATE_LIMIT', 10); // 10 uploads per minute
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const windowKey = `${key}:${windowStart}`;

      // Get current count from Redis
      const currentCount = await this.cacheManager.get<number>(windowKey) || 0;

      if (currentCount >= maxUploads) {
        const nextWindow = windowStart + windowMs;
        const retryAfter = Math.ceil((nextWindow - now) / 1000);

        this.monitoring.recordMetric({
          name: 'upload_rate_limit_exceeded',
          value: 1,
          tags: { user_id: userId }
        });

        return { allowed: false, retryAfter };
      }

      // Increment counter with TTL
      await this.cacheManager.set(windowKey, currentCount + 1, windowMs);

      this.monitoring.recordMetric({
        name: 'upload_rate_limit_check',
        value: 1,
        tags: { user_id: userId, allowed: 'true' }
      });

      return { allowed: true };
    } catch (error) {
      logSafeError(this.logger, error, 'Rate limit check failed');
      // Fail open - allow upload if rate limiting fails
      return { allowed: true };
    }
  }

  async auditDocumentAccess(
    documentId: string,
    context: SecurityContext,
    action: string,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const auditLog = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        documentId,
        userId: context.userId,
        organizationId: context.organizationId,
        action,
        success,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
        sessionId: metadata?.sessionId,
        severity: success ? 'info' : 'warning',
        source: 'knowledge_security_service',
      };

      // Store in Redis for immediate access and analysis
      const auditKey = `${this.auditLogPrefix}${auditLog.id}`;
      await this.cacheManager.set(auditKey, auditLog, 7 * 24 * 60 * 60 * 1000); // 7 days TTL

      // Store in organization-specific audit log
      const orgAuditKey = `${this.auditLogPrefix}org:${context.organizationId}:${Date.now()}`;
      await this.cacheManager.set(orgAuditKey, auditLog, 30 * 24 * 60 * 60 * 1000); // 30 days TTL

      // Record metrics for monitoring
      this.monitoring.recordMetric({
        name: 'document_access_audit',
        value: 1,
        tags: {
          action,
          success: success.toString(),
          organization_id: context.organizationId,
          user_id: context.userId
        }
      });

      // Log security events
      if (!success) {
        this.logger.warn(`Security event: ${action} failed for document ${documentId}`, JSON.stringify({
          userId: context.userId,
          organizationId: context.organizationId,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          sessionId: metadata?.sessionId,
        }));
      }

      // In production, also send to external audit service (e.g., Splunk, ELK)
      this.logger.log(`Audit logged: ${auditLog.id}`, JSON.stringify(auditLog));
    } catch (error) {
      logSafeError(this.logger, error, 'Failed to log audit event');
      // Don't throw - audit logging failure shouldn't break the main flow
    }
  }

  async encryptSensitiveContent(content: string, organizationId: string): Promise<string> {
    try {
      const key = await this.getOrganizationKey(organizationId);
      const iv = crypto.randomBytes(16); // Generate random IV for each encryption
      const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv);

      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Combine IV + authTag + encrypted data
      const result = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;

      this.monitoring.recordMetric({
        name: 'content_encrypted',
        value: 1,
        tags: { organization_id: organizationId }
      });

      return result;
    } catch (error) {
      logSafeError(this.logger, error, 'Content encryption failed');
      throw new Error('Content encryption failed');
    }
  }

  async decryptSensitiveContent(encryptedContent: string, organizationId: string): Promise<string> {
    try {
      const key = await this.getOrganizationKey(organizationId);
      const parts = encryptedContent.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted content format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipherGCM('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      this.monitoring.recordMetric({
        name: 'content_decrypted',
        value: 1,
        tags: { organization_id: organizationId }
      });

      return decrypted;
    } catch (error) {
      logSafeError(this.logger, error, 'Content decryption failed');
      throw new Error('Content decryption failed');
    }
  }

  private async getOrganizationKey(organizationId: string): Promise<Buffer> {
    try {
      // Check if key is cached in Redis
      const cacheKey = `${this.redisPrefix}org_key:${organizationId}`;
      const cachedKey = await this.cacheManager.get<string>(cacheKey);

      if (cachedKey) {
        return Buffer.from(cachedKey, 'hex');
      }

      // Generate or retrieve key from secure key management
      const masterKey = this.configService.get('ENCRYPTION_MASTER_KEY');
      if (!masterKey) {
        throw new Error('Encryption master key not configured');
      }

      // Derive organization-specific key using HKDF
      const salt = Buffer.from(organizationId, 'utf8');
      const key = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');

      // Cache the key for 1 hour
      await this.cacheManager.set(cacheKey, key.toString('hex'), 60 * 60 * 1000);

      return key;
    } catch (error) {
      logSafeError(this.logger, error, 'Failed to get organization encryption key');
      throw new Error('Key retrieval failed');
    }
  }

  async validateSearchQuery(
    query: string,
    context: SecurityContext
  ): Promise<{
    isValid: boolean;
    sanitizedQuery?: string;
    issues: string[];
  }> {
    const issues: string[] = [];
    let sanitizedQuery = query;

    // Check query length
    if (query.length > 1000) {
      issues.push('Query too long - maximum 1000 characters allowed');
    }

    // Check for SQL injection patterns
    const sqlPatterns = [
      /('|(\-\-)|(;)|(\|)|(\*)|(%))/i,
      /(union|select|insert|update|delete|drop|create|alter)/i,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(query)) {
        issues.push('Query contains prohibited patterns');
        break;
      }
    }

    // Sanitize query
    if (issues.length === 0) {
      sanitizedQuery = query
        .replace(/[<>"']/g, '') // Remove potentially dangerous characters
        .trim();
    }

    return {
      isValid: issues.length === 0,
      sanitizedQuery: issues.length === 0 ? sanitizedQuery : undefined,
      issues,
    };
  }

  async checkOrganizationQuota(
    organizationId: string,
    action: 'upload' | 'search' | 'storage'
  ): Promise<{
    allowed: boolean;
    currentUsage: number;
    limit: number;
    resetDate?: Date;
  }> {
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const quotaKey = `${this.redisPrefix}quota:${organizationId}:${action}:${monthKey}`;

      // Get current usage from Redis
      const currentUsage = await this.cacheManager.get<number>(quotaKey) || 0;

      // Get quota limits from configuration
      const limits = {
        upload: this.configService.get('QUOTA_UPLOADS_PER_MONTH', 1000),
        search: this.configService.get('QUOTA_SEARCHES_PER_MONTH', 10000),
        storage: this.configService.get('QUOTA_STORAGE_BYTES', 10 * 1024 * 1024 * 1024), // 10GB
      };

      const limit = limits[action];
      const allowed = currentUsage < limit;

      // Calculate reset date (first day of next month)
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // Record quota check metrics
      this.monitoring.recordMetric({
        name: 'quota_check',
        value: 1,
        tags: {
          action,
          organization_id: organizationId,
          allowed: allowed.toString(),
          usage_ratio: (currentUsage / limit).toString()
        }
      });

      if (!allowed) {
        this.logger.warn(`Quota exceeded for ${action}`, JSON.stringify({
          organizationId,
          currentUsage,
          limit,
          resetDate
        }));
      }

      return {
        allowed,
        currentUsage,
        limit,
        resetDate,
      };
    } catch (error) {
      logSafeError(this.logger, error, 'Quota check failed');
      // Fail open - allow operation if quota check fails
      return {
        allowed: true,
        currentUsage: 0,
        limit: Number.MAX_SAFE_INTEGER,
      };
    }
  }

  async incrementQuotaUsage(
    organizationId: string,
    action: 'upload' | 'search' | 'storage',
    amount: number = 1
  ): Promise<void> {
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const quotaKey = `${this.redisPrefix}quota:${organizationId}:${action}:${monthKey}`;

      // Increment usage counter
      const currentUsage = await this.cacheManager.get<number>(quotaKey) || 0;
      const newUsage = currentUsage + amount;

      // Set TTL to end of month
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const ttl = endOfMonth.getTime() - now.getTime();

      await this.cacheManager.set(quotaKey, newUsage, ttl);

      this.monitoring.recordMetric({
        name: 'quota_usage_incremented',
        value: amount,
        tags: {
          action,
          organization_id: organizationId
        }
      });
    } catch (error) {
      logSafeError(this.logger, error, 'Failed to increment quota usage');
      // Don't throw - quota tracking failure shouldn't break the main flow
    }
  }
}
