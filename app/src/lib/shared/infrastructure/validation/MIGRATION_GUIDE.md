# Migration Guide: From Zod to ValidationService

This guide explains how to migrate from direct `import { z } from 'zod'` to using the `ValidationService` abstraction.

## Quick Start

### Before (Direct Zod)
```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(18).optional()
});

const data = schema.parse(body);
```

### After (ValidationService)
```typescript
import { validator } from '@/lib/shared/infrastructure/validation/validation-helper';

const v = validator();
const schema = v.object({
  name: v.string({ min: 1, max: 100 }),
  email: v.string({ email: true }),
  age: v.optional(v.number({ min: 18 }))
});

const data = schema.parse(body);
```

## Common Patterns

### String Validation
```typescript
// Before
z.string().min(1).max(100)
z.string().email()
z.string().ip()
z.string().datetime()

// After
v.string({ min: 1, max: 100 })
v.string({ email: true })
v.string({ ip: true })
v.string({ datetime: true })
```

### Number Validation
```typescript
// Before
z.number().min(0).max(100)
z.number().int()
z.number().positive()

// After
v.number({ min: 0, max: 100 })
v.number({ int: true })
v.number({ positive: true })
```

### Optional Fields
```typescript
// Before
z.string().optional()

// After
v.optional(v.string())
```

### Enums
```typescript
// Before
z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE'])

// After
v.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE'] as const)
```

### Objects
```typescript
// Before
z.object({
  name: z.string(),
  email: z.string().email()
})

// After
v.object({
  name: v.string(),
  email: v.string({ email: true })
})
```

### Arrays
```typescript
// Before
z.array(z.string())

// After
v.array(v.string())
```

## Advanced Features

### Complex Schemas (Still Use Zod)
For complex schemas with `.transform()`, `.pipe()`, or other advanced Zod features, you can:

1. **Use `fromZodSchema()` helper:**
```typescript
import { validator } from '@/lib/shared/infrastructure/validation/validation-helper';
import { z } from 'zod';

const v = validator();
const complexZodSchema = z.string().transform(Number).pipe(z.number().min(1));
const schema = (v as any).fromZodSchema(complexZodSchema);
```

2. **Keep using Zod directly (backward compatible):**
The validation middleware accepts both `Schema` and `ZodSchema`, so you can keep complex schemas as-is during migration.

## Error Handling

### Before
```typescript
try {
  const data = schema.parse(body);
} catch (error) {
  if (error instanceof z.ZodError) {
    // handle validation error
  }
}
```

### After
```typescript
try {
  const data = schema.parse(body);
} catch (error) {
  // ValidationService throws errors with { errors: ValidationError[] } format
  if (error && typeof error === 'object' && 'errors' in error) {
    const validationErrors = (error as any).errors;
    // handle validation error
  }
}
```

## Migration Checklist

- [ ] Replace `import { z } from 'zod'` with `import { validator } from '@/lib/shared/infrastructure/validation/validation-helper'`
- [ ] Replace `z.` calls with `v.` (where `v = validator()`)
- [ ] Update string validations to use options object
- [ ] Update number validations to use options object
- [ ] Replace `.optional()` with `v.optional()`
- [ ] Update error handling to use ValidationError format
- [ ] Test all validation scenarios

## Files to Migrate

See `grep -r "import.*from 'zod'" app/src/app/api` for complete list.

Priority files:
- `app/src/app/api/auth/api-keys/route.ts` ✅ (Example completed)
- `app/src/app/api/heartbeat/route.ts` (In progress)
- `app/src/app/api/users/route.ts`
- `app/src/app/api/devices/route.ts`
- All other API route files

## Benefits

1. **DDD Alignment**: Domain layer doesn't depend on Zod
2. **Testability**: Easy to mock ValidationService in tests
3. **Flexibility**: Can swap validation implementations
4. **Consistency**: Matches pattern with CryptoService, HttpClient, PrismaService

