import { render } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '@ng/core/auth/auth.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';
import { authGuard } from '@ng/core/auth/guards';
import { SettingsHubPage } from './settings-hub.page';
import { SETTINGS_ROUTES } from '../../settings.routes';

async function setup(role = 'ADMIN', isActive = true) {
  return render(SettingsHubPage, {
    providers: [
      provideRouter([
        {
          path: 'settings',
          component: SettingsHubPage,
          children: SETTINGS_ROUTES,
        },
      ]),
      { provide: AuthService, useValue: { role: () => role } },
      { provide: TenantContextService, useValue: { isActive: () => isActive } },
    ],
  });
}

describe('SettingsHubPage', () => {
  it('renders account section items (profile, security, notifications, preferences)', async () => {
    const { getByText } = await setup();

    expect(getByText('Profile')).toBeTruthy();
    expect(getByText('Security')).toBeTruthy();
    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('Preferences')).toBeTruthy();
  });

  it('accountItems contains the 4 expected paths in order', async () => {
    const { fixture } = await setup();
    const paths = fixture.componentInstance.accountItems.map((i) => i.path);
    expect(paths).toEqual(['profile', 'security', 'notifications', 'preferences']);
  });

  it('orgItems contains thresholds, api-keys, and org', async () => {
    const { fixture } = await setup();
    const paths = fixture.componentInstance.orgItems.map((i) => i.path);
    expect(paths).toEqual(['thresholds', 'api-keys', 'org']);
  });

  it('showOrg is true for ADMIN with an active tenant', async () => {
    const { fixture } = await setup('ADMIN', true);
    expect(fixture.componentInstance.showOrg()).toBe(true);
  });

  it('showOrg is false for ADMIN without an active tenant', async () => {
    const { fixture } = await setup('ADMIN', false);
    expect(fixture.componentInstance.showOrg()).toBe(false);
  });

  it('showOrg is false for regular USER regardless of tenant', async () => {
    const { fixture } = await setup('USER', true);
    expect(fixture.componentInstance.showOrg()).toBe(false);
  });

  it('showOrg is false for platform-mode SUPERADMIN (no active customer)', async () => {
    const { fixture } = await setup('SUPERADMIN', false);
    expect(fixture.componentInstance.showOrg()).toBe(false);
  });

  it('showOrg is true for SUPERADMIN acting as a customer (isActive)', async () => {
    const { fixture } = await setup('SUPERADMIN', true);
    expect(fixture.componentInstance.showOrg()).toBe(true);
  });
});

describe('authGuard — settings route', () => {
  it('redirects unauthenticated user to /login with returnUrl', async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isAuthenticated: vi.fn().mockReturnValue(false) },
        },
      ],
    }).compileComponents();

    const result = TestBed.runInInjectionContext(() => {
      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/app/settings/profile' } as RouterStateSnapshot;
      return authGuard(route, state);
    });

    const { Router } = await import('@angular/router');
    const router = TestBed.inject(Router);
    expect(result).toEqual(
      router.createUrlTree(['/login'], { queryParams: { returnUrl: '/app/settings/profile' } }),
    );
  });
});
