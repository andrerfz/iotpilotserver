# TODO: Fix Test Configuration

## Problem

After the DDD migration, most tests are failing due to vitest path resolution issues. The `vite-tsconfig-paths` plugin isn't correctly resolving `@/lib/*` imports.

## Failing Tests

### Unit Tests (13 files)
All unit tests fail with "Failed to load url @/lib/..." errors:
- `src/__tests__/unit/lib/device/domain/**/*.test.ts`
- `src/__tests__/unit/lib/shared/application/bus/*.test.ts`
- `src/__tests__/unit/lib/user/application/commands/*.test.ts`
- `src/__tests__/unit/influxdb.unit.test.ts`

### Integration Tests (Most files)
Similar path resolution issues in:
- `src/__tests__/integration/**/*.test.ts`
- `src/__tests__/e2e/**/*.test.ts`

### Working Tests
- ✅ `src/__tests__/integration/api-routes-auth.integration.test.ts` (21 tests passing)

## Root Cause

1. **Vitest path resolution**: Even with `vite-tsconfig-paths` plugin, vitest can't resolve TypeScript path aliases
2. **Outdated test code**: Many tests reference old pre-DDD file structures
3. **Missing files**: Some tests import files that were removed/renamed during DDD migration

## Solutions to Try

### Option 1: Fix vitest.config.ts
- Try different vitest plugins for path resolution
- Manually map all `@/*` paths in vitest config
- Consider using relative imports in tests instead

### Option 2: Update test imports
- Change from `@/lib/device/domain/entities/device.entity` 
- To relative: `../../../lib/device/domain/entities/device.entity`

### Option 3: Fix tsconfig paths
- Ensure `tsconfig.json` paths are correct
- Make sure vitest is reading the right tsconfig

## Current State

- **Pre-commit**: ✅ Working (lint + type-check)
- **Pre-push**: ⚠️ Tests temporarily disabled
- **Husky**: ✅ Fully configured and working

## Next Steps

1. Debug why `vite-tsconfig-paths` isn't working
2. Update vitest.config.ts with working path resolution
3. Fix/update any tests with outdated imports
4. Re-enable tests in `.husky/pre-push`
5. Verify all tests pass before pushing

## Files to Check

- `app/vitest.config.ts` - Main vitest configuration
- `app/tsconfig.json` - TypeScript path mappings
- `.husky/pre-push` - Commented-out test commands
- Test files with broken imports

## Related Issues

- Auth integration tests work, proving Docker test infrastructure is sound
- The issue is specifically with vitest module resolution, not the tests themselves
