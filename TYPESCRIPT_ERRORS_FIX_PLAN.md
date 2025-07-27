# IoT Pilot TypeScript Compilation Errors - Fix Plan

## Executive Summary
The IoT Pilot application has **510+ TypeScript compilation errors** preventing the build from completing. These errors are categorized into 10 main groups with clear dependencies and fix priorities.

## Error Categories & Statistics

| Category | Error Code | Count | Priority | Description |
|----------|------------|-------|----------|-------------|
| **Import Resolution** | TS2307 | 150+ | 🔴 **CRITICAL** | Missing module declarations |
| **Type Incompatibility** | TS2345 | 120+ | 🔴 **CRITICAL** | Type mismatches between imports |
| **Missing Properties** | TS2339 | 80+ | 🟡 **HIGH** | Classes missing required properties |
| **Constructor Issues** | TS2554, TS2673 | 40+ | 🟡 **HIGH** | Constructor argument mismatches |
| **Value Object Issues** | TS2416 | 15+ | 🟡 **HIGH** | VO inheritance problems |
| **Tenant Context Issues** | TS2345 | 50+ | 🔴 **CRITICAL** | Multiple conflicting TenantContext types |
| **Error Handling** | TS18046 | 60+ | 🟠 **MEDIUM** | Unknown error types |
| **Parameter Issues** | TS7006, TS1016 | 30+ | 🟠 **MEDIUM** | Implicit any types, parameter ordering |
| **Database/Prisma** | TS2305, TS2344 | 20+ | 🟡 **HIGH** | Database type issues |
| **Service Container** | TS2554 | 10+ | 🟠 **MEDIUM** | DI configuration issues |

## 🔴 CRITICAL PRIORITY (Fix First - Blocks Everything Else)

### 1. Tenant Context Architecture Conflict
**Issue**: Multiple `TenantContext` types exist in different locations causing conflicts.

**Affected Files**: 50+ files across all bounded contexts

**Root Cause**:
- `src/lib/shared/domain/tenant-context.ts`
- `src/lib/shared/application/context/tenant-context.vo.ts`

**Fix Strategy**:
1. **Consolidate to single TenantContext** - Choose one authoritative implementation
2. **Update all imports** to use the consolidated type
3. **Migrate properties** from the discarded implementation

**Priority**: Must be fixed FIRST - affects 50+ files

### 2. Module Resolution Issues (TS2307)
**Most Critical Missing Modules**:

| Module | Files Affected | Impact |
|--------|----------------|--------|
| `domain.exception` | 4 files | Domain layer foundation |
| `alert.repository` | 3 files | Monitoring system |
| `alert-type.vo` | 2 files | Alert system |
| `device.repository` | 5 files | Device management |
| `user.repository` | 6 files | User management |
| `tenant-context` | 50+ files | **CRITICAL** |
| `structured-logger` | 3 files | Logging system |
| `rate-limit-config.vo` | 1 file | Rate limiting |
| `rate-limit.store` | 1 file | Rate limiting |
| `dockerode` | 2 files | Docker integration |

**Fix Strategy**:
1. **Create missing domain files** (exceptions, interfaces, VOs)
2. **Fix import paths** to match actual file locations
3. **Add missing npm dependencies** (dockerode)

## 🟡 HIGH PRIORITY (Core Domain & Infrastructure)

### 3. Value Object Implementation Issues (TS2416)
**Affected VOs**: `Email`, `IpAddress`

**Issue**: Override methods don't match base class signatures

**Files**:
- `src/lib/shared/domain/value-objects/email.vo.ts`
- `src/lib/shared/domain/value-objects/ip-address.vo.ts`

**Fix Strategy**:
1. Update `equals()` method signatures to accept `ValueObject<EmailProps>`
2. Update `toJSON()` method return types
3. Ensure proper inheritance from `ValueObject` base class

### 4. Customer Entity Issues (TS2344, TS2416)
**Files**:
- `src/lib/customer/domain/entities/customer.entity.ts`
- `src/lib/customer/infrastructure/persistence/customer.repository.ts`

**Issues**:
- `getTenantId()` return type mismatch (`string | null` vs `CustomerId`)
- Entity doesn't satisfy `ITenantScoped` constraint

**Fix Strategy**:
1. Change `getTenantId()` to return `CustomerId | null`
2. Update repository to handle nullable customer IDs
3. Fix entity inheritance from `TenantScopedEntity`

### 5. Device Domain Issues
**Files**: Multiple device-related files

**Issues**:
- Missing domain exceptions (`DeviceAlreadyActiveException`, `DeviceAlreadyInactiveException`)
- Repository interface mismatches
- Value object constructor issues (`DeviceId` private constructor)

**Fix Strategy**:
1. Create missing exception classes
2. Fix repository interfaces
3. Update value object constructors to use factory methods

### 6. Database/Prisma Issues (TS2305, TS2693)
**Files**:
- `src/lib/device/infrastructure/repositories/prisma-device-command.repository.ts`
- `src/lib/customer/testing/customer-test-factory.ts`

**Issues**:
- Missing Prisma types (`DeviceCommand`, `CommandStatus`)
- Using type names as values (`Customer`, `Device`)

**Fix Strategy**:
1. Update Prisma schema to include missing types
2. Generate Prisma client
3. Fix factory constructors to use proper instantiation

## 🟠 MEDIUM PRIORITY (Application & Infrastructure Services)

### 7. Service Container Issues (TS2554)
**File**: `src/lib/shared/infrastructure/container/service-container.ts`

**Issue**: Incorrect argument counts in dependency registration

**Fix Strategy**:
1. Review service registration calls
2. Fix argument counts to match method signatures
3. Ensure proper dependency injection configuration

### 8. Alert Service Issues (TS2739, TS7006)
**File**: `src/lib/monitoring/application/services/alert-service.ts`

**Issues**:
- Missing severity level mappings
- Implicit `any` types in alert processing
- Missing factory methods on value objects

**Fix Strategy**:
1. Add missing severity level enum values
2. Add proper type annotations
3. Implement missing factory methods (`fromString`)

### 9. Error Handling Issues (TS18046)
**Files**: 60+ files with `error: unknown` issues

**Issue**: Error parameters typed as `unknown` instead of `Error`

**Fix Strategy**:
1. Add proper error type guards
2. Use `error instanceof Error` checks
3. Add proper error handling patterns

### 10. Parameter Ordering Issues (TS1016)
**Files**: Multiple files with parameter ordering problems

**Issue**: Required parameters following optional ones

**Fix Strategy**:
1. Reorder method parameters
2. Make parameters consistently optional or required
3. Update all call sites

## 🔵 LOW PRIORITY (UI & Testing)

### 11. UI Component Issues
**Files**: Next.js API routes and components

**Issues**:
- Wrong parameter types passed to commands/queries
- Missing factory methods on command/query classes

**Fix Strategy**:
1. Add `create()` factory methods to commands/queries
2. Fix parameter types in API routes
3. Update React hooks to use correct types

### 12. Testing Issues
**Files**: Test factories and test files

**Issues**:
- Missing imports in test factories
- Factory constructor issues

**Fix Strategy**:
1. Fix import paths in test files
2. Update factory methods to use proper constructors

## 📋 IMPLEMENTATION PLAN

### Phase 1: Foundation (Critical Path)
1. **Resolve Tenant Context Conflict** (1-2 days)
   - Choose single authoritative TenantContext
   - Update all imports across codebase
   - Test compilation after changes

2. **Fix Core Domain Imports** (1 day)
   - Create missing domain files (exceptions, interfaces)
   - Fix import paths to match file structure
   - Add missing npm dependencies

3. **Fix Value Objects** (0.5 day)
   - Update Email and IpAddress VO implementations
   - Fix inheritance issues

### Phase 2: Domain Layer (High Priority)
4. **Fix Customer Entity** (0.5 day)
   - Update entity and repository implementations
   - Fix tenant scoping

5. **Fix Device Domain** (1 day)
   - Create missing exceptions
   - Fix repository interfaces
   - Update value object constructors

6. **Fix Database Layer** (0.5 day)
   - Update Prisma schema
   - Regenerate client
   - Fix factory constructors

### Phase 3: Application Layer (Medium Priority)
7. **Fix Service Container** (0.5 day)
   - Correct dependency registration
   - Fix argument counts

8. **Fix Alert Service** (1 day)
   - Add missing severity mappings
   - Fix type annotations
   - Add factory methods

9. **Fix Error Handling** (1 day)
   - Add error type guards
   - Update error handling patterns

10. **Fix Parameter Issues** (0.5 day)
    - Reorder method parameters
    - Update call sites

### Phase 4: UI & Testing (Low Priority)
11. **Fix UI Components** (1 day)
    - Add factory methods to commands/queries
    - Fix API route parameter types

12. **Fix Testing** (0.5 day)
    - Update test imports
    - Fix factory methods

## ⚠️ RISK MITIGATION

### Dependency Analysis
- **Tenant Context**: Affects 50+ files - fix first
- **Domain Imports**: Block domain layer compilation
- **Value Objects**: Used throughout application
- **Database**: Required for data persistence

### Testing Strategy
- **Compile after each phase** to catch regressions
- **Run existing tests** to ensure functionality preserved
- **Manual testing** of critical paths (auth, device management)

### Rollback Plan
- **Git branches** for each phase
- **Incremental commits** for easy rollback
- **Backup** of working state before major changes

## 📊 SUCCESS METRICS

- **Compilation**: Zero TypeScript errors
- **Build**: Successful Docker build completion
- **Tests**: All existing tests pass
- **Functionality**: Core features (auth, device management) work

## 🕐 ESTIMATED TIMELINE

- **Phase 1**: 3-4 days (Foundation)
- **Phase 2**: 2-3 days (Domain)
- **Phase 3**: 3-4 days (Application)
- **Phase 4**: 1-2 days (UI/Testing)
- **Total**: 9-13 days for complete fix

## 🎯 IMMEDIATE NEXT STEPS

1. **Start with Tenant Context consolidation** (Day 1)
2. **Create missing domain files** (Day 1-2)
3. **Fix value object implementations** (Day 2)
4. **Compile and validate** after each major change

---

**Note**: This plan prioritizes fixes that unblock the most dependencies while minimizing risk of breaking existing functionality. Each phase builds upon the previous one, ensuring a stable foundation before moving to complex application logic.
