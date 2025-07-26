// Global type declarations to fix common TypeScript issues

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

// Fix for missing compression types
declare module 'compression' {
  import { RequestHandler } from 'express';
  function compression(options?: any): RequestHandler;
  export = compression;
}

// Fix for helmet types
declare module 'helmet' {
  import { RequestHandler } from 'express';
  function helmet(options?: any): RequestHandler;
  export = helmet;
}

// Global error handling utility type
export type SafeError = {
  message: string;
  stack?: string;
  code?: string;
  response?: any;
};

// Global utility function type
export type ErrorHandler = (error: unknown) => SafeError;

// Global entity creation helper type
export type EntityCreateOptions<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export {}; 