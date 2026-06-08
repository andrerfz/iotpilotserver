import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import {TemplateContext, TemplateResult} from '../types/config';
import {logger} from '../utils/logger';

/**
 * Template engine for generating DDD components
 */
export class TemplateEngine {
  private templatesDir: string;
  private cache: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(templatesDir: string = path.join(__dirname, 'templates')) {
    this.templatesDir = templatesDir;
    this.registerHelpers();
  }

  /**
   * Render a template with context
   */
  async render(templateName: string, context: TemplateContext): Promise<string> {
    const template = await this.loadTemplate(templateName);
    return template(context);
  }

  /**
   * Generate file from template
   */
  async generateFile(
    templateName: string,
    context: TemplateContext,
    outputPath: string,
    options: { force?: boolean; dryRun?: boolean } = {}
  ): Promise<TemplateResult> {
    const content = await this.render(templateName, context);

    if (options.dryRun) {
      logger.info(`DRY RUN: Would create ${outputPath}`);
      return {
        path: outputPath,
        content,
        created: false
      };
    }

    // Check if file exists
    if (fs.existsSync(outputPath) && !options.force) {
      logger.warn(`File already exists: ${outputPath} (use --force to overwrite)`);
      return {
        path: outputPath,
        content,
        created: false
      };
    }

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(outputPath, content);
    logger.debug(`Generated file: ${outputPath}`);

    return {
      path: outputPath,
      content,
      created: true
    };
  }

  /**
   * Load and compile template
   */
  private async loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    if (this.cache.has(templateName)) {
      return this.cache.get(templateName)!;
    }

    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const template = handlebars.compile(templateSource);

    this.cache.set(templateName, template);
    return template;
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // String case helpers
    handlebars.registerHelper('camelCase', (str: string) => {
      return str.replace(/[-_](.)/g, (_, letter) => letter.toUpperCase());
    });

    handlebars.registerHelper('pascalCase', (str: string) => {
      return str
        .replace(/[-_](.)/g, (_, letter) => letter.toUpperCase())
        .replace(/^./, str => str.toUpperCase());
    });

    handlebars.registerHelper('kebabCase', (str: string) => {
      return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    });

    handlebars.registerHelper('snakeCase', (str: string) => {
      return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    });

    // Pluralization helper
    handlebars.registerHelper('plural', (str: string) => {
      // Simple pluralization - can be enhanced
      if (str.endsWith('y')) {
        return str.slice(0, -1) + 'ies';
      }
      if (str.endsWith('s') || str.endsWith('sh') || str.endsWith('ch') || str.endsWith('x') || str.endsWith('z')) {
        return str + 'es';
      }
      return str + 's';
    });

    // Date helper
    handlebars.registerHelper('now', () => {
      return new Date().toISOString();
    });

    // JSON helper
    handlebars.registerHelper('json', (obj: any) => {
      return JSON.stringify(obj, null, 2);
    });

    // Conditional helpers
    handlebars.registerHelper('eq', (a: any, b: any) => {
      return a === b;
    });

    handlebars.registerHelper('neq', (a: any, b: any) => {
      return a !== b;
    });

    handlebars.registerHelper('and', (a: any, b: any) => {
      return a && b;
    });

    handlebars.registerHelper('or', (a: any, b: any) => {
      return a || b;
    });

    // Import style helpers
    handlebars.registerHelper('importNamed', (imports: string[]) => {
      if (!imports || imports.length === 0) return '';
      return `import { ${imports.join(', ')} } from '${imports.join('/')}';`;
    });

    handlebars.registerHelper('importDefault', (module: string, name: string) => {
      return `import ${name} from '${module}';`;
    });
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * List available templates
   */
  listTemplates(): string[] {
    if (!fs.existsSync(this.templatesDir)) {
      return [];
    }

    return fs.readdirSync(this.templatesDir)
      .filter(file => file.endsWith('.hbs'))
      .map(file => file.replace('.hbs', ''));
  }
}
