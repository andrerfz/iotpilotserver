import { render, fireEvent } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ThemeService } from '@ng/shared/ui';
import { AuthService } from '../core/auth/auth.service';
import { ToastService } from '../core/errors/toast.service';
import { HOST_IS_LOCAL } from './host';
import { UserMenuComponent } from './user-menu.component';
import { TenantMenuComponent } from './tenant-menu.component';

type Role = 'USER' | 'ADMIN' | 'SUPERADMIN' | 'READONLY';

function authStub(role: Role) {
  return {
    currentUser: signal({ username: 'Ada', email: 'ada@x.io', role }),
    role: signal(role),
    logout: vi.fn().mockResolvedValue(undefined),
  };
}

async function openMenu(role: Role, hostIsLocal: boolean) {
  const view = await render(UserMenuComponent, {
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: authStub(role) },
      { provide: ThemeService, useValue: { theme: signal('dark'), setTheme: vi.fn() } },
      { provide: ToastService, useValue: { success: vi.fn() } },
      { provide: HOST_IS_LOCAL, useValue: hostIsLocal },
    ],
  });
  fireEvent.click(view.container.querySelector('.avatar') as HTMLElement);
  return view.container;
}

function itemText(container: HTMLElement): string {
  return Array.from(container.querySelectorAll('.menu__item')).map(i => i.textContent?.trim() ?? '').join(' | ');
}

// ─── UserMenu role × host matrix (legacy parity) ─────────────────────────────

describe('UserMenuComponent — role × host matrix', () => {
  it('SUPERADMIN on localhost sees Grafana, InfluxDB, Debug and Admin panel', async () => {
    const txt = itemText(await openMenu('SUPERADMIN', true));
    expect(txt).toContain('Grafana');
    expect(txt).toContain('InfluxDB');
    expect(txt).toContain('Debug');
    expect(txt).toContain('Admin panel');
  });

  it('SUPERADMIN on a remote host hides Grafana/InfluxDB/Debug (keeps Admin panel)', async () => {
    const txt = itemText(await openMenu('SUPERADMIN', false));
    expect(txt).not.toContain('Grafana');
    expect(txt).not.toContain('InfluxDB');
    expect(txt).not.toContain('Debug');
    expect(txt).toContain('Admin panel');
  });

  it('ADMIN on localhost has no infra links but keeps Admin panel', async () => {
    const txt = itemText(await openMenu('ADMIN', true));
    expect(txt).not.toContain('Grafana');
    expect(txt).not.toContain('InfluxDB');
    expect(txt).not.toContain('Debug');
    expect(txt).toContain('Admin panel');
  });

  it('USER on localhost has neither infra links nor Admin panel', async () => {
    const txt = itemText(await openMenu('USER', true));
    expect(txt).not.toContain('Grafana');
    expect(txt).not.toContain('Admin panel');
  });

  it('renders the user name and email in the head', async () => {
    const container = await openMenu('USER', true);
    expect(container.querySelector('.menu__name')?.textContent?.trim()).toBe('Ada');
    expect(container.querySelector('.menu__mail')?.textContent?.trim()).toBe('ada@x.io');
  });

  it('always offers Sign out', async () => {
    const txt = itemText(await openMenu('USER', false));
    expect(txt).toContain('Sign out');
  });
});

// ─── TenantMenu (display-only v1) ─────────────────────────────────────────────

describe('TenantMenuComponent', () => {
  it('renders the tenant name and plan · region', async () => {
    const { container } = await render(TenantMenuComponent, {
      inputs: { name: 'Globex', region: 'US-East', plan: 'Enterprise' },
      providers: [provideRouter([])],
    });
    expect(container.querySelector('.tenant__name')?.textContent?.trim()).toBe('Globex');
    const meta = container.querySelector('.tenant__meta')?.textContent ?? '';
    expect(meta).toContain('Enterprise');
    expect(meta).toContain('US-East');
  });

  it('opens a popover with stats and tenant nav', async () => {
    const { container } = await render(TenantMenuComponent, {
      inputs: { name: 'Globex', deviceCount: 12, userCount: 3 },
      providers: [provideRouter([])],
    });
    expect(container.querySelector('.menu')).toBeFalsy();
    fireEvent.click(container.querySelector('.tenant') as HTMLElement);
    expect(container.querySelector('.menu')).toBeTruthy();
    expect(container.textContent).toContain('Manage users');
    expect(container.textContent).toContain('12');
  });
});
