# IoT Pilot DDD CLI

A command-line tool for generating Domain-Driven Design (DDD) components for the IoT Pilot Server project.

## Installation

The CLI is included with the IoT Pilot Server and can be run using npm scripts:

```bash
npm run ddd -- --help
```

Or directly:

```bash
npx ts-node src/cli/index.ts --help
```

## Commands

### Initialize Project

Initialize a new DDD project structure:

```bash
npm run ddd -- init
```

This creates the complete directory structure and configuration file for DDD development.

### Generate Components

Generate DDD components using the following syntax:

```bash
npm run ddd -- generate <type> <name> [options]
```

#### Component Types

- `entity` - Domain entities with behavior
- `value-object` - Immutable value objects
- `repository` - Data access interfaces and implementations
- `command` - Write operations (CQRS)
- `query` - Read operations (CQRS)
- `service` - Domain services and application services

#### Examples

```bash
# Generate an entity
npm run ddd -- generate entity device

# Generate a value object
npm run ddd -- generate value-object device-name

# Generate a repository
npm run ddd -- generate repository device

# Generate a command
npm run ddd -- generate command register-device

# Generate a query
npm run ddd -- generate query list-devices
```

#### Options

- `-d, --domain <domain>` - Domain to generate in (default: shared)
- `-p, --properties <json>` - Additional properties as JSON string
- `-f, --force` - Overwrite existing files
- `--dry-run` - Show what would be generated without creating files
- `-v, --verbose` - Enable verbose logging

### List Domains and Components

```bash
# List all domains
npm run ddd -- list --domains

# Show details for specific domain
npm run ddd -- list --domain device

# List available component types
npm run ddd -- list --components
```

### Validate Structure

Validate the DDD project structure and configuration:

```bash
# Validate everything
npm run ddd -- validate

# Validate only configuration
npm run ddd -- validate --config-only

# Validate only directory structure
npm run ddd -- validate --structure-only

# Validate specific domain
npm run ddd -- validate --domain device
```

## Configuration

The CLI uses a `ddd.config.json` file in the project root. This file is automatically created during initialization and contains:

- Domain definitions and settings
- Generation preferences (tests, docs, strict types)
- Template engine configuration
- Author and license information

### Example Configuration

```json
{
  "baseDir": "src/lib",
  "domains": ["shared", "customer", "user", "device", "monitoring"],
  "author": "IoT Pilot Team",
  "license": "MIT",
  "templateEngine": "handlebars",
  "generation": {
    "generateTests": true,
    "generateDocs": true,
    "strictTypes": true,
    "importStyle": "named"
  },
  "domainConfigs": {
    "device": {
      "name": "Device",
      "description": "IoT device management",
      "basePath": "device",
      "valueObjects": {
        "generateValidation": true,
        "generateFactories": true
      },
      "entities": {
        "generateEvents": true,
        "generateRepositories": true
      },
      "application": {
        "generateHandlers": true,
        "generateQueries": true
      },
      "infrastructure": {
        "generatePrismaRepos": true,
        "generateMappers": true
      }
    }
  }
}
```

## Generated Structure

When you generate components, the CLI creates files following the DDD layered architecture:

```
src/lib/{domain}/
├── domain/
│   ├── entities/
│   │   ├── {name}.entity.ts
│   │   └── index.ts
│   └── value-objects/
│       ├── {name}-id.vo.ts
│       └── index.ts
├── application/
│   ├── commands/
│   │   ├── {name}.command.ts
│   │   └── {name}.handler.ts
│   └── queries/
│       ├── {name}.query.ts
│       └── {name}.handler.ts
└── infrastructure/
    ├── repositories/
    │   ├── {name}.repository.ts
    │   └── prisma-{name}.repository.ts
    └── mappers/
        └── {name}.mapper.ts
```

## Testing

Generated components include unit tests when `generateTests` is enabled in the configuration:

```
src/__tests__/unit/lib/{domain}/
├── domain/
│   └── entities/
│       └── {name}.entity.test.ts
└── domain/
    └── value-objects/
        └── {name}.vo.test.ts
```

## Development

### Adding New Templates

Templates are located in `src/cli/templates/` and use Handlebars syntax. To add a new component type:

1. Create a new `.hbs` template file
2. Add a generation method to `TemplateManager`
3. Update the `generate` command to handle the new type

### Extending Configuration

To add new configuration options:

1. Update the `DDDConfig` interface in `types/config.ts`
2. Modify the `ConfigManager` to handle the new options
3. Update templates to use the new configuration values

## Troubleshooting

### Common Issues

1. **"Domain not found"** - Make sure the domain is listed in `ddd.config.json`
2. **"Template not found"** - Check that template files exist in `src/cli/templates/`
3. **Permission denied** - Ensure write permissions to the target directories

### Debug Mode

Enable verbose logging to see detailed execution information:

```bash
npm run ddd -- generate entity device --verbose
```

### Dry Run

Use dry run to preview what will be generated:

```bash
npm run ddd -- generate entity device --dry-run
```

## Contributing

When contributing to the CLI:

1. Follow the existing code patterns
2. Add tests for new functionality
3. Update this documentation
4. Use TypeScript strict mode
5. Handle errors gracefully

## License

MIT License - see project license file.
