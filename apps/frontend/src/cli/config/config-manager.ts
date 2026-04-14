import * as fs from 'fs';
import * as path from 'path';
import {DDDConfig, DomainConfig} from '../types/config';
import {logger} from '../utils/logger';

/**
 * Configuration Manager for CLI
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: DDDConfig | null = null;
  private configPath: string = '';

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load configuration from file
   */
  loadConfig(configPath?: string): DDDConfig {
    this.configPath = configPath || this.findConfigFile();

    if (!fs.existsSync(this.configPath)) {
      logger.info(`Config file not found at ${this.configPath}, creating default config`);
      this.config = this.createDefaultConfig();
      this.saveConfig();
      return this.config;
    }

    try {
      const configContent = fs.readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(configContent);
      logger.debug(`Loaded config from ${this.configPath}`);
      return this.config!; // Non-null assertion since we just assigned it
    } catch (error) {
      logger.error(`Failed to load config from ${this.configPath}:`, error);
      throw new Error(`Invalid configuration file: ${this.configPath}`);
    }
  }

  /**
   * Save current configuration to file
   */
  saveConfig(): void {
    if (!this.config || !this.configPath) {
      throw new Error('No configuration loaded');
    }

    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      logger.debug(`Saved config to ${this.configPath}`);
    } catch (error) {
      logger.error(`Failed to save config to ${this.configPath}:`, error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): DDDConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<DDDConfig>): void {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    this.config = { ...this.config, ...updates };
  }

  /**
   * Add a new domain configuration
   */
  addDomain(domainName: string, domainConfig: DomainConfig): void {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    if (this.config.domains.includes(domainName)) {
      throw new Error(`Domain '${domainName}' already exists`);
    }

    this.config.domains.push(domainName);
    this.config.domainConfigs[domainName] = domainConfig;
  }

  /**
   * Get domain configuration
   */
  getDomainConfig(domainName: string): DomainConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    const domainConfig = this.config.domainConfigs[domainName];
    if (!domainConfig) {
      throw new Error(`Domain '${domainName}' not found in configuration`);
    }

    return domainConfig;
  }

  /**
   * List all domains
   */
  getDomains(): string[] {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    return [...this.config.domains];
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    if (!this.config) {
      return { valid: false, errors: ['Configuration not loaded'] };
    }

    const errors: string[] = [];

    // Validate base directory
    if (!this.config.baseDir) {
      errors.push('baseDir is required');
    } else if (!fs.existsSync(this.config.baseDir)) {
      errors.push(`baseDir '${this.config.baseDir}' does not exist`);
    }

    // Validate domains
    if (!this.config.domains || !Array.isArray(this.config.domains)) {
      errors.push('domains must be an array');
    } else {
      for (const domain of this.config.domains) {
        if (!this.config.domainConfigs[domain]) {
          errors.push(`Domain '${domain}' is listed but has no configuration`);
        }
      }
    }

    // Validate domain configurations
    for (const [domainName, domainConfig] of Object.entries(this.config.domainConfigs)) {
      if (!domainConfig.name) {
        errors.push(`Domain '${domainName}' missing name`);
      }
      if (!domainConfig.basePath) {
        errors.push(`Domain '${domainName}' missing basePath`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Find configuration file in current directory or parent directories
   */
  private findConfigFile(): string {
    let currentDir = process.cwd();

    while (currentDir !== path.dirname(currentDir)) {
      const configPath = path.join(currentDir, 'ddd.config.json');
      if (fs.existsSync(configPath)) {
        return configPath;
      }
      currentDir = path.dirname(currentDir);
    }

    // Default to current directory
    return path.join(process.cwd(), 'ddd.config.json');
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(): DDDConfig {
    const baseDir = path.join(process.cwd(), 'src', 'lib');

    return {
      baseDir,
      domains: ['shared', 'customer', 'user', 'device', 'monitoring'],
      author: 'IoT Pilot Team',
      license: 'MIT',
      templateEngine: 'handlebars',
      generation: {
        generateTests: true,
        generateDocs: true,
        strictTypes: true,
        importStyle: 'named'
      },
      domainConfigs: {
        shared: {
          name: 'Shared',
          description: 'Shared domain components and utilities',
          basePath: 'shared',
          valueObjects: {
            generateValidation: true,
            generateFactories: true
          },
          entities: {
            generateEvents: false,
            generateRepositories: false
          },
          application: {
            generateHandlers: false,
            generateQueries: false
          },
          infrastructure: {
            generatePrismaRepos: false,
            generateMappers: false
          }
        },
        customer: {
          name: 'Customer',
          description: 'Customer domain for multi-tenant management',
          basePath: 'customer',
          valueObjects: {
            generateValidation: true,
            generateFactories: true
          },
          entities: {
            generateEvents: true,
            generateRepositories: true
          },
          application: {
            generateHandlers: true,
            generateQueries: true
          },
          infrastructure: {
            generatePrismaRepos: true,
            generateMappers: true
          }
        },
        user: {
          name: 'User',
          description: 'User management and authentication',
          basePath: 'user',
          valueObjects: {
            generateValidation: true,
            generateFactories: true
          },
          entities: {
            generateEvents: true,
            generateRepositories: true
          },
          application: {
            generateHandlers: true,
            generateQueries: true
          },
          infrastructure: {
            generatePrismaRepos: true,
            generateMappers: true
          }
        },
        device: {
          name: 'Device',
          description: 'IoT device management',
          basePath: 'device',
          valueObjects: {
            generateValidation: true,
            generateFactories: true
          },
          entities: {
            generateEvents: true,
            generateRepositories: true
          },
          application: {
            generateHandlers: true,
            generateQueries: true
          },
          infrastructure: {
            generatePrismaRepos: true,
            generateMappers: true
          }
        },
        monitoring: {
          name: 'Monitoring',
          description: 'Device monitoring and alerting',
          basePath: 'monitoring',
          valueObjects: {
            generateValidation: true,
            generateFactories: true
          },
          entities: {
            generateEvents: true,
            generateRepositories: true
          },
          application: {
            generateHandlers: true,
            generateQueries: true
          },
          infrastructure: {
            generatePrismaRepos: true,
            generateMappers: true
          }
        }
      }
    };
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();
