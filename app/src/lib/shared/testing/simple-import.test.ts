import {describe, expect, it} from 'vitest';

// Import each module separately to isolate the issue
import {TenantTestUtils} from './tenant-test-utils';
import {CustomerTestFactory} from '@/lib/customer/testing/customer-test-factory';
import {TenantBoundaryValidator} from '@/lib/shared/infrastructure/security/tenant-boundary-validator.simplified';

describe('Simple Import Test', () => {
    it('should import modules correctly', () => {
        expect(TenantTestUtils).toBeDefined();
        expect(CustomerTestFactory).toBeDefined();
        expect(TenantBoundaryValidator).toBeDefined();
    });
});