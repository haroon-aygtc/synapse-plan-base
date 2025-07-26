import { Repository, ObjectLiteral } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Global entity utilities for consistent entity creation and management
 */
export class EntityUtil {
  /**
   * Safe entity save with error handling
   */
  static async safeSave<T extends ObjectLiteral>(
    repository: Repository<T>,
    entity: T,
    errorMessage: string
  ): Promise<T> {
    try {
      return await repository.save(entity);
    } catch (error) {
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Safe entity find with error handling
   */
  static async safeFind<T extends ObjectLiteral>(
    repository: Repository<T>,
    options: any,
    errorMessage: string
  ): Promise<T[]> {
    try {
      return await repository.find(options);
    } catch (error) {
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Safe entity findOne with error handling
   */
  static async safeFindOne<T extends ObjectLiteral>(
    repository: Repository<T>,
    options: any,
    errorMessage: string
  ): Promise<T | null> {
    try {
      return await repository.findOne(options);
    } catch (error) {
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Safe entity update with error handling
   */
  static async safeUpdate<T extends ObjectLiteral>(
    repository: Repository<T>,
    criteria: any,
    data: any,
    errorMessage: string
  ): Promise<void> {
    try {
      await repository.update(criteria, data);
    } catch (error) {
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Safe entity delete with error handling
   */
  static async safeDelete<T extends ObjectLiteral>(
    repository: Repository<T>,
    criteria: any,
    errorMessage: string
  ): Promise<void> {
    try {
      await repository.delete(criteria);
    } catch (error) {
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper to prepare entity data with timestamps
   */
  static prepareEntityData<T extends { createdAt?: Date; updatedAt?: Date }>(
    data: Partial<T>,
    includeId: boolean = false
  ): Partial<T> {
    const now = new Date();
    const prepared: any = { ...data };
    
    if (includeId && !(data as any).id) {
      prepared.id = uuidv4();
    }
    
    if (!data.createdAt) {
      prepared.createdAt = now;
    }
    
    if (!data.updatedAt) {
      prepared.updatedAt = now;
    }
    
    return prepared;
  }
}

/**
 * Type-safe entity creation helper
 */
export type EntityCreateData<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Type-safe entity update helper
 */
export type EntityUpdateData<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>> & {
  updatedAt?: Date;
}; 