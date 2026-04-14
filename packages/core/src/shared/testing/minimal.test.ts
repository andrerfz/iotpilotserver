import {describe, expect, it} from 'vitest';
import {TestFixtureFactory} from './tenant-test-utils';
import {TenantBoundaryValidator} from '../infrastructure/security/tenant-boundary-validator.simplified';

describe('Minimal Test', () => {
    it('should import modules correctly', () => {
        expect(TestFixtureFactory).toBeDefined();
        expect(TenantBoundaryValidator).toBeDefined();
    });
});
