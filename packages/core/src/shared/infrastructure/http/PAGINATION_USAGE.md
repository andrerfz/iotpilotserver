# Pagination Utility Usage Guide

## Overview

The `Pagination` utility provides standardized pagination structure for API responses, ensuring consistency and DRY principle.

## Standard Pagination Structure

```typescript
{
  page: number;        // Current page (1-based)
  limit: number;       // Items per page
  total: number;       // Total items
  totalPages: number;  // Total pages
  hasMore: boolean;    // Has next page
  hasPrevious: boolean; // Has previous page
}
```

## Basic Usage

### Create Pagination Metadata

```typescript
import { Pagination } from '@/lib/shared/infrastructure/http/pagination.util';
import { ApiResponse } from '@/lib/shared/infrastructure/http/api-response.util';

// From page/limit/total
const pagination = Pagination.create(page, limit, total);
return ApiResponse.okPaginated(data, pagination);

// From offset/limit/total (converts to page-based)
const pagination = Pagination.fromOffset(offset, limit, total);
return ApiResponse.okPaginated(data, pagination);
```

### Parse from Query Parameters

```typescript
const { page, limit, skip, validation } = Pagination.fromQueryParams(
    new URL(request.url).searchParams,
    20,  // default limit
    100  // max limit
);

if (!validation.isValid) {
    return ApiResponse.badRequest('Invalid pagination', validation.errors);
}

// Use in database query
const items = await repository.findMany({
    skip,
    take: limit
});

const total = await repository.count();
const pagination = Pagination.create(page, limit, total);

return ApiResponse.okPaginated(items, pagination);
```

## Migration Example

### Before (Inconsistent)
```typescript
// ❌ Different formats across routes
return NextResponse.json({
    users,
    pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)  // Inconsistent naming
    }
});

return NextResponse.json({
    items,
    pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        hasMore: result.hasMore,  // Different structure
        totalPages: Math.ceil(result.total / result.limit)
    }
});
```

### After (Standardized)
```typescript
// ✅ Consistent format everywhere
const pagination = Pagination.create(page, limit, total);
return ApiResponse.okPaginated(users, pagination);

// Response structure:
{
  "success": true,
  "data": [...users...],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasMore": true,
      "hasPrevious": false
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Real-World Example

```typescript
export async function GET(request: NextRequest) {
    try {
        // Parse and validate pagination
        const { page, limit, skip, validation } = Pagination.fromQueryParams(
            new URL(request.url).searchParams,
            20,  // default
            100  // max
        );

        if (!validation.isValid) {
            return ApiResponse.badRequest('Invalid pagination', validation.errors);
        }

        // Query database
        const [items, total] = await Promise.all([
            repository.findMany({ skip, take: limit }),
            repository.count()
        ]);

        // Create standardized pagination
        const pagination = Pagination.create(page, limit, total);

        // Return with pagination
        return ApiResponse.okPaginated(items, pagination);
    } catch (error) {
        return ApiResponse.internalError('Failed to fetch items');
    }
}
```

## Benefits

1. **Consistency**: All pagination responses follow the same structure
2. **DRY**: No repeated pagination calculation logic
3. **Type Safety**: TypeScript types for pagination metadata
4. **Validation**: Built-in validation for pagination parameters
5. **Flexibility**: Supports both page-based and offset-based pagination

## Response Structure

### Paginated Success Response
```json
{
  "success": true,
  "data": [...items...],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasMore": true,
      "hasPrevious": false
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

