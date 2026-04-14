import {describe, expect, it} from 'vitest';
import {TestFixtureFactory} from './tenant-test-utils';
import {CustomerTestFactory} from '@iotpilot/core/customer/testing/customer-test-factory';
import {TenantBoundaryValidator} from '@iotpilot/core/shared/infrastructure/security/tenant-boundary-validator.simplified';
import {TenantScopedLoggingService} from '@iotpilot/core/shared/infrastructure/logging/tenant-scoped-logging.service.simplified';

describe('Test Import', () => {
    it('should import modules correctly', () => {
        expect(TestFixtureFactory).toBeDefined();
        expect(CustomerTestFactory).toBeDefined();
        expect(TenantBoundaryValidator).toBeDefined();
        expect(TenantScopedLoggingService).toBeDefined();
    });
});
