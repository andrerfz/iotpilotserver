import {describe, expect, it} from 'vitest';

import {TestFixtureFactory} from './tenant-test-utils';
import {CustomerTestFactory} from '@iotpilot/core/customer/testing/customer-test-factory';
import {TenantBoundaryValidator} from '@iotpilot/core/shared/infrastructure/security/tenant-boundary-validator.simplified';

describe('Simple Import Test', () => {
    it('should import modules correctly', () => {
        expect(TestFixtureFactory).toBeDefined();
        expect(CustomerTestFactory).toBeDefined();
        expect(TenantBoundaryValidator).toBeDefined();
    });
});
