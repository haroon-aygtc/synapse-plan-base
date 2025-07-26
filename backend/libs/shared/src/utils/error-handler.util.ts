import { Logger } from '@nestjs/common';

/**
 * Global error handling utilities for consistent error processing across the application
 */
export class ErrorHandlerUtil {
  private static readonly logger = new Logger(ErrorHandlerUtil.name);

  /**
   * Safely extract error message from unknown error type
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return 'Unknown error occurred';
  }

  /**
   * Safely extract error stack from unknown error type
   */
  static getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }
    if (error && typeof error === 'object' && 'stack' in error) {
      return String(error.stack);
    }
    return undefined;
  }

  /**
   * Safely extract error code from unknown error type
   */
  static getErrorCode(error: unknown): string | undefined {
    if (error instanceof Error && 'code' in error) {
      return (error as any).code;
    }
    if (error && typeof error === 'object' && 'code' in error) {
      return String(error.code);
    }
    return undefined;
  }

  /**
   * Safely extract error response from unknown error type
   */
  static getErrorResponse(error: unknown): any {
    if (error && typeof error === 'object' && 'response' in error) {
      return (error as any).response;
    }
    return undefined;
  }

  /**
   * Create a safe error object from unknown error
   */
  static createSafeError(error: unknown): {
    message: string;
    stack?: string;
    code?: string;
    response?: any;
  } {
    return {
      message: this.getErrorMessage(error),
      stack: this.getErrorStack(error),
      code: this.getErrorCode(error),
      response: this.getErrorResponse(error),
    };
  }

  /**
   * Log error with consistent formatting
   */
  static logError(logger: Logger, message: string, error: unknown, context?: string): void {
    const safeError = this.createSafeError(error);
    const contextPrefix = context ? `[${context}] ` : '';
    
    logger.error(
      `${contextPrefix}${message}: ${safeError.message}`,
      safeError.stack
    );
  }

  /**
   * Handle async operations with consistent error handling
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    logger: Logger,
    errorMessage: string,
    context?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logError(logger, errorMessage, error, context);
      throw error;
    }
  }

  /**
   * Handle sync operations with consistent error handling
   */
  static handleSync<T>(
    operation: () => T,
    logger: Logger,
    errorMessage: string,
    context?: string
  ): T {
    try {
      return operation();
    } catch (error) {
      this.logError(logger, errorMessage, error, context);
      throw error;
    }
  }
}

/**
 * Global error handling decorator for methods
 */
export function HandleErrors(errorMessage: string, context?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const logger = new Logger(target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        ErrorHandlerUtil.logError(logger, errorMessage, error, context);
        throw error;
      }
    };

    return descriptor;
  };
} 