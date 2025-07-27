import {describe, expect, it} from 'vitest';
import {TenantTestUtils} from './tenant-test-utils';
import {CustomerTestFactory} from '@/lib/customer/testing/customer-test-factory';
import {TenantBoundaryValidator} from '@/lib/shared/infrastructure/security/tenant-boundary-validator.simplified';
import {TenantScopedLoggingService} from '@/lib/shared/infrastructure/logging/tenant-scoped-logging.service.simplified';

describe('Test Import', () => {
    it('should import modules correctly', () => {
        expect(TenantTestUtils).toBeDefined();
        expect(CustomerTestFactory).toBeDefined();
        expect(TenantBoundaryValidator).toBeDefined();
        expect(TenantScopedLoggingService).toBeDefined();
    });
});