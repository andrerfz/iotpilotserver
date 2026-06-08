/**
 * Validation Helper Utility
 * 
 * Provides convenient access to ValidationService for creating schemas
 * This makes it easier to migrate from direct zod imports to ValidationService
 */

import {ValidationService} from '../../domain/interfaces/validation-service.interface';
import {AppContainer} from '../container/app-container';

/**
 * Get the ValidationService instance from DI container
 * This is a convenience function to avoid repeating AppContainer.resolve() calls
 */
export function getValidationService(): ValidationService {
  return AppContainer.resolve<ValidationService>('ValidationService');
}

/**
 * Convenience alias - shorter name for common usage
 * Usage: const v = validator();
 *        const schema = v.object({ ... });
 */
export const validator = getValidationService;

/**
 * Re-export ValidationService type for convenience
 */
export type { ValidationService } from '../../domain/interfaces/validation-service.interface';
export type { Schema, ValidationResult, ValidationError } from '../../domain/interfaces/validation-service.interface';

