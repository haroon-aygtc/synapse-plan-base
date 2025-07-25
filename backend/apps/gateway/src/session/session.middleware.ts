import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SessionService } from './session.service';
import { ISessionContext } from '@shared/interfaces';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      sessionContext?: ISessionContext;
      sessionToken?: string;
    }
  }
}

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SessionMiddleware.name);

  constructor(private readonly sessionService: SessionService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract session token from various sources
      const sessionToken = this.extractSessionToken(req);

      if (sessionToken) {
        // Get session context
        const sessionContext = await this.sessionService.getSessionContext(sessionToken);

        if (sessionContext) {
          // Attach session context to request
          req.sessionContext = sessionContext;
          req.sessionToken = sessionToken;

          // Update session access time
          await this.sessionService.updateSession(sessionToken, {
            metadata: {
              lastRequestPath: req.path,
              lastRequestMethod: req.method,
              lastRequestTime: new Date(),
            },
          });

          this.logger.debug(
            `Session context attached: ${sessionContext.sessionId} for user ${sessionContext.userId}`
          );
        } else {
          this.logger.warn(`Invalid session token: ${sessionToken}`);
        }
      }

      next();
    } catch (error) {
      this.logger.error(`Session middleware error: ${error.message}`, error.stack);
      next(); // Continue without session context
    }
  }

  private extractSessionToken(req: Request): string | null {
    // Try multiple sources for session token

    // 1. Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. Custom session header
    const sessionHeader = req.headers['x-session-token'] as string;
    if (sessionHeader) {
      return sessionHeader;
    }

    // 3. Query parameter
    const sessionQuery = req.query.sessionToken as string;
    if (sessionQuery) {
      return sessionQuery;
    }

    // 4. Cookie
    const sessionCookie = req.cookies?.sessionToken;
    if (sessionCookie) {
      return sessionCookie;
    }

    return null;
  }
}
