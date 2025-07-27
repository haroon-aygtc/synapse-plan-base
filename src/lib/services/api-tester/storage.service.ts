import type { SavedTest, TestCollection, AuthConfig, Environment } from '@/types/api-tester'

export class StorageService {
  /**
   * Save test configuration to localStorage
   * Will be implemented in task 9
   */
  saveTest(test: SavedTest): void {
    throw new Error('Not implemented - will be implemented in task 9')
  }

  /**
   * Load saved tests from localStorage
   * Will be implemented in task 9
   */
  loadSavedTests(): SavedTest[] {
    throw new Error('Not implemented - will be implemented in task 9')
  }

  /**
   * Delete saved test
   * Will be implemented in task 9
   */
  deleteTest(testId: string): void {
    throw new Error('Not implemented - will be implemented in task 9')
  }

  /**
   * Save authentication config for environment
   * Will be implemented in task 5
   */
  saveAuthConfig(environment: string, config: AuthConfig): void {
    throw new Error('Not implemented - will be implemented in task 5')
  }

  /**
   * Load authentication config for environment
   * Will be implemented in task 5
   */
  loadAuthConfig(environment: string): AuthConfig | null {
    throw new Error('Not implemented - will be implemented in task 5')
  }

  /**
   * Save environment configurations
   * Will be implemented in task 8
   */
  saveEnvironments(environments: Environment[]): void {
    throw new Error('Not implemented - will be implemented in task 8')
  }

  /**
   * Load environment configurations
   * Will be implemented in task 8
   */
  loadEnvironments(): Environment[] {
    throw new Error('Not implemented - will be implemented in task 8')
  }
}