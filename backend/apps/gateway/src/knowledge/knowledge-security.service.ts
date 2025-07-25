import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeDocument, DocumentVisibility } from '@database/entities';
import { UserRole } from '@shared/enums';
import * as crypto from 'crypto';

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
  private readonly logger = new Logger(KnowledgeSecurityService.name);
  private readonly virusPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload=/gi,
    /onerror=/gi,
    /onclick=/gi,
  ];

  constructor(
    @InjectRepository(KnowledgeDocument)
    private readonly documentRepository: Repository<KnowledgeDocument>
  ) {}

  async checkDocumentAccess(
    documentId: string,
    context: SecurityContext,
    action: 'read' | 'write' | 'delete' | 'share' = 'read'
  ): Promise<boolean> {
    try {
      const document = await this.documentRepository.findOne({
        where: { id: documentId },
        select: ['id', 'userId', 'organizationId', 'visibility'],
      });

      if (!document) {
        return false;
      }

      // Organization isolation - documents can only be accessed within the same org
      if (document.organizationId !== context.organizationId) {
        this.logger.warn(
          `Cross-organization access attempt: user ${context.userId} tried to access document ${documentId}`
        );
        return false;
      }

      const permissions = await this.getDocumentPermissions(document, context);

      switch (action) {
        case 'read':
          return permissions.canRead;
        case 'write':
          return permissions.canWrite;
        case 'delete':
          return permissions.canDelete;
        case 'share':
          return permissions.canShare;
        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`Error checking document access: ${error.message}`);
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
    // Simple in-memory rate limiting
    // In production, use Redis or similar
    const key = `upload_rate_${userId}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxUploads = 10; // 10 uploads per minute

    // This is a simplified implementation
    // In production, implement proper rate limiting with Redis
    return { allowed: true };
  }

  async auditDocumentAccess(
    documentId: string,
    context: SecurityContext,
    action: string,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    const auditLog = {
      timestamp: new Date(),
      documentId,
      userId: context.userId,
      organizationId: context.organizationId,
      action,
      success,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
      sessionId: metadata?.sessionId,
    };

    // In production, store audit logs in a dedicated table or external service
    this.logger.log(`Audit: ${JSON.stringify(auditLog)}`);
  }

  async encryptSensitiveContent(content: string, organizationId: string): Promise<string> {
    // Simple encryption for demonstration
    // In production, use proper encryption with key management
    const key = this.getOrganizationKey(organizationId);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  async decryptSensitiveContent(encryptedContent: string, organizationId: string): Promise<string> {
    try {
      const key = this.getOrganizationKey(organizationId);
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt content', error);
      throw new Error('Content decryption failed');
    }
  }

  private getOrganizationKey(organizationId: string): string {
    // In production, retrieve from secure key management service
    return crypto.createHash('sha256').update(`${organizationId}secret_salt`).digest('hex');
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
    // Simplified quota checking
    // In production, implement proper quota management

    switch (action) {
      case 'upload':
        return {
          allowed: true,
          currentUsage: 0,
          limit: 1000, // 1000 uploads per month
        };
      case 'search':
        return {
          allowed: true,
          currentUsage: 0,
          limit: 10000, // 10000 searches per month
        };
      case 'storage':
        return {
          allowed: true,
          currentUsage: 0,
          limit: 10 * 1024 * 1024 * 1024, // 10GB storage
        };
      default:
        return {
          allowed: false,
          currentUsage: 0,
          limit: 0,
        };
    }
  }
}
