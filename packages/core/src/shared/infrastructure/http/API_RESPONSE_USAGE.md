# API Response Utility Usage Guide

## Overview

The `ApiResponse` utility provides standardized response creation for API routes, ensuring DRY principle and consistent API structure across the codebase.

## Basic Usage

```typescript
import { ApiResponse } from '@/lib/shared/infrastructure/http/api-response.util';

// Success responses
return ApiResponse.ok(data);                    // 200 OK
return ApiResponse.created(data);               // 201 Created
return ApiResponse.success(data, 200, {        // Custom success
    correlationId: 'xxx',
    meta: { pagination: {...} }
});

// Error responses
return ApiResponse.unauthorized('Session expired');
return ApiResponse.forbidden('Admin access required');
return ApiResponse.notFound('User not found');
return ApiResponse.badRequest('Invalid input', validationErrors);
return ApiResponse.internalError('Database error');
```

## Response Structure

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-01-15T10:30:00.000Z",
  "correlationId": "xxx-xxx-xxx",
  "meta": { ... }  // Optional
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "UNAUTHORIZED",
  "details": { ... },  // Optional
  "timestamp": "2025-01-15T10:30:00.000Z",
  "correlationId": "xxx-xxx-xxx"
}
```

## Available Methods

### Success Methods
- `ApiResponse.ok(data, correlationId?, meta?)` - 200 OK
- `ApiResponse.created(data, correlationId?)` - 201 Created
- `ApiResponse.success(data, status, options?)` - Custom success

### Error Methods
- `ApiResponse.badRequest(message, details?, correlationId?)` - 400
- `ApiResponse.unauthorized(message, details?, correlationId?)` - 401
- `ApiResponse.forbidden(message, details?, correlationId?)` - 403
- `ApiResponse.notFound(message, details?, correlationId?)` - 404
- `ApiResponse.conflict(message, details?, correlationId?)` - 409
- `ApiResponse.unprocessableEntity(message, details?, correlationId?)` - 422
- `ApiResponse.tooManyRequests(message, details?, correlationId?)` - 429
- `ApiResponse.internalError(message, details?, correlationId?)` - 500
- `ApiResponse.error(message, status, options?)` - Custom error

## Migration Example

### Before (Repetitive)
```typescript
// ❌ DRY violation
return NextResponse.json(
    { error: 'Session expired' },
    { status: 401 }
);

return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
);

return NextResponse.json(
    { error: 'User not found' },
    { status: 404 }
);
```

### After (DRY)
```typescript
// ✅ Standardized and DRY
return ApiResponse.unauthorized('Session expired');
return ApiResponse.unauthorized('Authentication required');
return ApiResponse.notFound('User not found');
```

## Real-World Examples

### API Route Handler
```typescript
export async function GET(request: NextRequest) {
    try {
        const user = await getUser();
        
        if (!user) {
            return ApiResponse.notFound('User not found');
        }
        
        return ApiResponse.ok(user);
    } catch (error) {
        return ApiResponse.internalError('Failed to fetch user');
    }
}
```

### With Validation
```typescript
const validationResult = schema.safeParse(body);
if (!validationResult.success) {
    return ApiResponse.unprocessableEntity(
        'Validation failed',
        validationResult.error.errors
    );
}
```

### With Correlation ID
```typescript
const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();

if (!authorized) {
    return ApiResponse.forbidden(
        'Insufficient permissions',
        { requiredRole: 'ADMIN' },
        correlationId
    );
}
```

## Benefits

1. **DRY Principle**: No repeated response structure
2. **Consistency**: All API responses follow the same structure
3. **Type Safety**: TypeScript types for responses
4. **Maintainability**: Change response structure in one place
5. **Developer Experience**: Simple, intuitive API

