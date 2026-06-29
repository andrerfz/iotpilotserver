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

async function setup() {
  return render(SettingsHubPage, {
    providers: [
      provideRouter([
        {
          path: 'settings',
          component: SettingsHubPage,
          children: SETTINGS_ROUTES,
        },
      ]),
      // Regular (non-SUPERADMIN) context → all tabs visible, including thresholds.
      { provide: AuthService, useValue: { role: () => 'ADMIN' } },
      { provide: TenantContextService, useValue: { isActive: () => false } },
    ],
  });
}

describe('SettingsHubPage', () => {
  it('renders all 4 nav items with correct labels', async () => {
    const { getByText } = await setup();

    expect(getByText('Profile')).toBeTruthy();
    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('Security')).toBeTruthy();
    expect(getByText('System')).toBeTruthy();
  });

  it('nav items have correct routerLink paths', async () => {
    const { fixture } = await setup();
    const component = fixture.componentInstance;

    expect(component.navItems()[0].path).toBe('profile');
    expect(component.navItems()[1].path).toBe('notifications');
    expect(component.navItems()[2].path).toBe('security');
    expect(component.navItems()[3].path).toBe('system');
  });

  it('hides the thresholds tab for a platform-mode SUPERADMIN (no active customer)', async () => {
    const { fixture } = await render(SettingsHubPage, {
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { role: () => 'SUPERADMIN' } },
        { provide: TenantContextService, useValue: { isActive: () => false } },
      ],
    });
    const paths = fixture.componentInstance.navItems().map((t) => t.path);
    expect(paths).not.toContain('thresholds');
  });

  it('shows the thresholds tab for a SUPERADMIN acting as a customer', async () => {
    const { fixture } = await render(SettingsHubPage, {
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { role: () => 'SUPERADMIN' } },
        { provide: TenantContextService, useValue: { isActive: () => true } },
      ],
    });
    const paths = fixture.componentInstance.navItems().map((t) => t.path);
    expect(paths).toContain('thresholds');
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
