import * as fs from 'fs';
import * as path from 'path';
import {DDDConfig, GenerateOptions} from '../types/config';
import {configManager} from '../config/config-manager';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * CLI Validators
 */
export class Validators {
  /**
   * Validate configuration file
   */
  static validateConfiguration(configPath?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const config = configManager.loadConfig(configPath);

      // Validate base directory
      if (!config.baseDir) {
        errors.push('baseDir is required in configuration');
      } else if (!fs.existsSync(config.baseDir)) {
        errors.push(`baseDir '${config.baseDir}' does not exist`);
      }

      // Validate domains
      if (!config.domains || config.domains.length === 0) {
        errors.push('At least one domain must be defined');
      } else {
        // Check for duplicate domains
        const uniqueDomains = new Set(config.domains);
        if (uniqueDomains.size !== config.domains.length) {
          errors.push('Duplicate domains found in configuration');
        }

        // Validate domain configurations
        for (const domain of config.domains) {
          const domainErrors = this.validateDomainConfig(config, domain);
          errors.push(...domainErrors.errors);
          warnings.push(...domainErrors.warnings);
        }
      }

      // Validate generation settings
      if (typeof config.generation.generateTests !== 'boolean') {
        warnings.push('generation.generateTests should be a boolean');
      }

      if (typeof config.generation.generateDocs !== 'boolean') {
        warnings.push('generation.generateDocs should be a boolean');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  /**
   * Validate domain configuration
   */
  static validateDomainConfig(config: DDDConfig, domainName: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.domainConfigs[domainName]) {
      errors.push(`Domain '${domainName}' is listed but has no configuration`);
      return { valid: false, errors, warnings };
    }

    const domainConfig = config.domainConfigs[domainName];

    // Validate domain properties
    if (!domainConfig.name) {
      errors.push(`Domain '${domainName}' missing name`);
    }

    if (!domainConfig.description) {
      warnings.push(`Domain '${domainName}' missing description`);
    }

    if (!domainConfig.basePath) {
      errors.push(`Domain '${domainName}' missing basePath`);
    }

    // Validate base path
    if (domainConfig.basePath) {
      const fullPath = path.join(config.baseDir, domainConfig.basePath);
      if (!fs.existsSync(fullPath)) {
        warnings.push(`Domain path '${fullPath}' does not exist (will be created during init)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate project structure
   */
  static validateProjectStructure(config: DDDConfig, domainName?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const domainsToCheck = domainName ? [domainName] : config.domains;

    for (const domain of domainsToCheck) {
      const domainConfig = config.domainConfigs[domain];
      if (!domainConfig) {
        errors.push(`Domain '${domain}' not found in configuration`);
        continue;
      }

      const domainPath = path.join(config.baseDir, domainConfig.basePath);

      // Check domain directory
      if (!fs.existsSync(domainPath)) {
        warnings.push(`Domain directory missing: ${domainPath}`);
        continue; // Skip further checks if domain directory doesn't exist
      }

      // Check required directories
      const requiredDirs = [
        'domain',
        'domain/entities',
        'domain/value-objects',
        'application',
        'application/commands',
        'application/queries',
        'infrastructure',
        'infrastructure/repositories'
      ];

      for (const dir of requiredDirs) {
        const fullPath = path.join(domainPath, dir);
        if (!fs.existsSync(fullPath)) {
          warnings.push(`Missing directory: ${fullPath}`);
        }
      }

      // Check basic index files
      const indexFiles = [
        'domain/entities/index.ts',
        'domain/value-objects/index.ts',
        'application/commands/index.ts',
        'application/queries/index.ts',
        'infrastructure/repositories/index.ts'
      ];

      for (const file of indexFiles) {
        const fullPath = path.join(domainPath, file);
        if (!fs.existsSync(fullPath)) {
          warnings.push(`Missing index file: ${fullPath}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate generate options
   */
  static validateGenerateOptions(options: GenerateOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate type
    const validTypes = ['entity', 'value-object', 'repository', 'command', 'query', 'service'];
    if (!validTypes.includes(options.type)) {
      errors.push(`Invalid type '${options.type}'. Valid types: ${validTypes.join(', ')}`);
    }

    // Validate name
    if (!options.name || options.name.trim().length === 0) {
      errors.push('Name is required');
    } else {
      // Check name format
      if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(options.name)) {
        errors.push('Name must start with a letter and contain only letters, numbers, hyphens, and underscores');
      }

      // Warn about long names
      if (options.name.length > 50) {
        warnings.push('Name is quite long, consider using a shorter name');
      }
    }

    // Validate domain
    if (!options.domain || options.domain.trim().length === 0) {
      errors.push('Domain is required');
    }

    // Validate properties JSON if provided
    if (options.properties) {
      try {
        JSON.parse(JSON.stringify(options.properties));
      } catch (error) {
        errors.push('Properties must be valid JSON');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate that component can be generated
   */
  static validateComponentGeneration(
    config: DDDConfig,
    options: GenerateOptions
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if domain exists
    if (!config.domains.includes(options.domain)) {
      errors.push(`Domain '${options.domain}' not found. Available domains: ${config.domains.join(', ')}`);
      return { valid: false, errors, warnings };
    }

    const domainConfig = config.domainConfigs[options.domain];

    // Check domain-specific restrictions
    switch (options.type) {
      case 'entity':
        if (!domainConfig.entities.generateEvents && !domainConfig.entities.generateRepositories) {
          warnings.push(`Domain '${options.domain}' has entities disabled`);
        }
        break;

      case 'value-object':
        if (!domainConfig.valueObjects.generateValidation && !domainConfig.valueObjects.generateFactories) {
          warnings.push(`Domain '${options.domain}' has value objects disabled`);
        }
        break;

      case 'repository':
        if (!domainConfig.infrastructure.generatePrismaRepos && !domainConfig.infrastructure.generateMappers) {
          warnings.push(`Domain '${options.domain}' has repositories disabled`);
        }
        break;

      case 'command':
        if (!domainConfig.application.generateHandlers) {
          warnings.push(`Domain '${options.domain}' has command handlers disabled`);
        }
        break;

      case 'query':
        if (!domainConfig.application.generateQueries) {
          warnings.push(`Domain '${options.domain}' has queries disabled`);
        }
        break;
    }

    // Check for existing files
    const filesToCheck = this.getFilesForComponent(config, options);
    for (const file of filesToCheck) {
      if (fs.existsSync(file)) {
        if (!options.force) {
          warnings.push(`File already exists: ${file} (use --force to overwrite)`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get files that would be generated for a component
   */
  private static getFilesForComponent(config: DDDConfig, options: GenerateOptions): string[] {
    const domainConfig = config.domainConfigs[options.domain];
    const domainPath = path.join(config.baseDir, domainConfig.basePath);
    const kebabName = this.toKebabCase(options.name);
    const files: string[] = [];

    switch (options.type) {
      case 'entity':
        files.push(path.join(domainPath, 'domain/entities', `${kebabName}.entity.ts`));
        if (config.generation.generateTests) {
          files.push(path.join('src/__tests__/unit/lib', domainConfig.basePath, 'domain/entities', `${kebabName}.entity.test.ts`));
        }
        break;

      case 'value-object':
        files.push(path.join(domainPath, 'domain/value-objects', `${kebabName}.vo.ts`));
        if (config.generation.generateTests) {
          files.push(path.join('src/__tests__/unit/lib', domainConfig.basePath, 'domain/value-objects', `${kebabName}.vo.test.ts`));
        }
        break;

      case 'repository':
        files.push(path.join(domainPath, 'domain/interfaces', `${kebabName}.repository.ts`));
        if (domainConfig.infrastructure.generatePrismaRepos) {
          files.push(path.join(domainPath, 'infrastructure/repositories', `prisma-${kebabName}.repository.ts`));
        }
        if (domainConfig.infrastructure.generateMappers) {
          files.push(path.join(domainPath, 'infrastructure/mappers', `${kebabName}.mapper.ts`));
        }
        break;

      case 'command':
        files.push(path.join(domainPath, 'application/commands', `${kebabName}.command.ts`));
        if (domainConfig.application.generateHandlers) {
          files.push(path.join(domainPath, 'application/commands', `${kebabName}.handler.ts`));
        }
        break;

      case 'query':
        files.push(path.join(domainPath, 'application/queries', `${kebabName}.query.ts`));
        if (domainConfig.application.generateQueries) {
          files.push(path.join(domainPath, 'application/queries', `${kebabName}.handler.ts`));
        }
        break;
    }

    return files;
  }

  /**
   * Convert string to kebab-case
   */
  private static toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Format validation result for display
   */
  static formatResult(result: ValidationResult): string {
    let output = '';

    if (result.errors.length > 0) {
      output += '❌ Errors:\n';
      result.errors.forEach(error => {
        output += `  - ${error}\n`;
      });
    }

    if (result.warnings.length > 0) {
      output += '⚠️  Warnings:\n';
      result.warnings.forEach(warning => {
        output += `  - ${warning}\n`;
      });
    }

    if (result.valid && result.errors.length === 0 && result.warnings.length === 0) {
      output += '✅ All validations passed\n';
    }

    return output;
  }
}
