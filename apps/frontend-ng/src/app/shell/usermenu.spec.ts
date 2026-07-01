import { render, fireEvent } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ThemeService } from '@ng/shared/ui';
import { AuthService } from '../core/auth/auth.service';
import { ApiConfiguration } from '@ng/core/api/generated/api-configuration';
import { UserMenuComponent } from './user-menu.component';
import { TenantMenuComponent } from './tenant-menu.component';
import { AdminStatsService } from '@ng/features/admin/services/admin-stats.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';
import { provideHttpClient } from '@angular/common/http';

type Role = 'USER' | 'ADMIN' | 'SUPERADMIN' | 'READONLY';

const BASE_PROVIDERS = [
  provideHttpClient(),
  { provide: ApiConfiguration, useValue: { rootUrl: '/api' } },
];

function authStub(role: Role) {
  return {
    currentUser: signal({ username: 'Ada', email: 'ada@x.io', role }),
    role: signal(role),
    logout: vi.fn().mockResolvedValue(undefined),
  };
}

function statsStub(data: { deviceCount?: number; userCount?: number } | null = null) {
  return {
    data: signal(data),
    loading: signal(false),
    load: vi.fn().mockResolvedValue(null),
  };
}

function tenantCtxStub() {
  return {
    customer: signal(null),
    isActive: signal(false),
    set: vi.fn(),
    clear: vi.fn(),
  };
}

async function openMenu(role: Role = 'USER') {
  const view = await render(UserMenuComponent, {
    providers: [
      ...BASE_PROVIDERS,
      provideRouter([]),
      { provide: AuthService, useValue: authStub(role) },
      { provide: ThemeService, useValue: { theme: signal('dark'), setTheme: vi.fn() } },
    ],
  });
  fireEvent.click(view.container.querySelector('.avatar') as HTMLElement);
  return view.container;
}

function itemText(container: HTMLElement): string {
  return Array.from(container.querySelectorAll('.menu__item')).map(i => i.textContent?.trim() ?? '').join(' | ');
}

// ─── UserMenuComponent ────────────────────────────────────────────────────────

describe('UserMenuComponent', () => {
  it('renders the user name and email in the head', async () => {
    const container = await openMenu('USER');
    expect(container.querySelector('.menu__name')?.textContent?.trim()).toBe('Ada');
    expect(container.querySelector('.menu__mail')?.textContent?.trim()).toBe('ada@x.io');
  });

  it('offers Sign out', async () => {
    const txt = itemText(await openMenu('USER'));
    expect(txt).toContain('Sign out');
  });

  it('shows profile link and theme toggle', async () => {
    const txt = itemText(await openMenu('USER'));
    expect(txt).toContain('profile');
    expect(txt).toContain('mode');
  });

  it('does not show Grafana, InfluxDB, Debug or Admin panel for SUPERADMIN', async () => {
    const txt = itemText(await openMenu('SUPERADMIN'));
    expect(txt).not.toContain('Grafana');
    expect(txt).not.toContain('InfluxDB');
    expect(txt).not.toContain('Debug');
    expect(txt).not.toContain('Admin panel');
  });

  it('does not show Grafana, InfluxDB, Debug or Admin panel for ADMIN', async () => {
    const txt = itemText(await openMenu('ADMIN'));
    expect(txt).not.toContain('Admin panel');
    expect(txt).not.toContain('Grafana');
  });
});

// ─── TenantMenuComponent ──────────────────────────────────────────────────────

describe('TenantMenuComponent', () => {
  async function renderTenant(role: Role = 'USER', stats = statsStub()) {
    return render(TenantMenuComponent, {
      providers: [
        ...BASE_PROVIDERS,
        provideRouter([]),
        { provide: AuthService, useValue: authStub(role) },
        { provide: AdminStatsService, useValue: stats },
        { provide: TenantContextService, useValue: tenantCtxStub() },
      ],
    });
  }

  it('renders the tenant button with the username as display name', async () => {
    const { container } = await renderTenant('USER');
    expect(container.querySelector('.tenant__name')?.textContent?.trim()).toBe('Ada');
  });

  it('opens a menu when the tenant button is clicked', async () => {
    const { container } = await renderTenant('USER');
    expect(container.querySelector('.menu')).toBeFalsy();
    fireEvent.click(container.querySelector('.tenant') as HTMLElement);
    expect(container.querySelector('.menu')).toBeTruthy();
  });

  it('menu contains Manage users link', async () => {
    const { container } = await renderTenant('USER');
    fireEvent.click(container.querySelector('.tenant') as HTMLElement);
    expect(container.textContent).toContain('Manage users');
  });

  it('shows device count from stats service when menu is open', async () => {
    const stats = statsStub({ deviceCount: 12, userCount: 3 });
    const { container } = await renderTenant('USER', stats);
    fireEvent.click(container.querySelector('.tenant') as HTMLElement);
    expect(container.textContent).toContain('12');
  });
});
