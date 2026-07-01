import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@ng/core/auth/auth.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';
import { SettingsHubPage } from './settings-hub.page';

/**
 * SettingsHubPage is no longer mounted in the router (AccountHubPage and
 * OrgHubPage replaced it). These tests verify the component class shape in
 * case it is revived or repurposed.
 */
function makeInstance(role = 'ADMIN', isActive = true): SettingsHubPage {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { role: () => role } },
      { provide: TenantContextService, useValue: { isActive: () => isActive } },
    ],
  });
  return TestBed.runInInjectionContext(() => new SettingsHubPage());
}

describe('SettingsHubPage (class only)', () => {
  it('accountItems lists the 4 personal settings paths', () => {
    const page = makeInstance();
    const paths = page.accountItems.map((i) => i.path);
    expect(paths).toEqual(['profile', 'security', 'notifications', 'preferences']);
  });

  it('orgItems lists the 3 tenant settings paths', () => {
    const page = makeInstance();
    const paths = page.orgItems.map((i) => i.path);
    expect(paths).toEqual(['thresholds', 'api-keys', 'org']);
  });

  it('showOrg is true for ADMIN with an active tenant', () => {
    expect(makeInstance('ADMIN', true).showOrg()).toBe(true);
  });

  it('showOrg is false for ADMIN without an active tenant', () => {
    expect(makeInstance('ADMIN', false).showOrg()).toBe(false);
  });

  it('showOrg is false for platform-mode SUPERADMIN', () => {
    expect(makeInstance('SUPERADMIN', false).showOrg()).toBe(false);
  });
});
