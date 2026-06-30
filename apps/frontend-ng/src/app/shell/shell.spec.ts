import { render, fireEvent } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { provideRouter, ActivatedRouteSnapshot } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { ThemeService } from '@ng/shared/ui';
import { AuthService } from '../core/auth/auth.service';
import { ToastService } from '../core/errors/toast.service';
import { TenantContextService } from '../core/auth/tenant-context.service';
import { Api } from '@ng/core/api/generated/api';
import { ApiConfiguration } from '@ng/core/api/generated/api-configuration';
import { breadcrumbFromSnapshot } from './breadcrumbs';
import { RailComponent } from './rail.component';
import { TopbarComponent } from './topbar.component';
import { ShellComponent } from './shell.component';
import { BottomNavComponent } from './bottom-nav.component';

function snap(data: Record<string, unknown>, child: ActivatedRouteSnapshot | null = null): ActivatedRouteSnapshot {
  return { data, firstChild: child } as unknown as ActivatedRouteSnapshot;
}
function themeStub(initial: 'light' | 'dark' | 'system' = 'dark') {
  const theme = signal(initial);
  return { theme, setTheme: vi.fn((v: 'light' | 'dark' | 'system') => theme.set(v)) };
}

function authStub(role: 'ADMIN' | 'USER' | null = 'ADMIN') {
  return { currentUser: signal({ username: 'admin', email: 'a@x.io', role: role ?? 'USER' }), role: signal(role), logout: vi.fn() };
}

const BASE_PROVIDERS = [
  provideHttpClient(),
  { provide: ApiConfiguration, useValue: { rootUrl: '/api' } },
];

// ─── breadcrumbFromSnapshot ───────────────────────────────────────────────────

describe('breadcrumbFromSnapshot', () => {
  it('returns the deepest route breadcrumb in the chain', () => {
    const root = snap({}, snap({ breadcrumb: ['Operate'] }, snap({ breadcrumb: ['Operate', 'Devices'] })));
    expect(breadcrumbFromSnapshot(root)).toEqual(['Operate', 'Devices']);
  });
  it('returns [] when no route declares a breadcrumb', () => {
    expect(breadcrumbFromSnapshot(snap({}, snap({})))).toEqual([]);
  });
  it('returns [] for a null root', () => {
    expect(breadcrumbFromSnapshot(null)).toEqual([]);
  });
});

// ─── RailComponent ─────────────────────────────────────────────────────────

describe('RailComponent', () => {
  it('renders nav groups for an ADMIN user', async () => {
    const { container } = await render(RailComponent, {
      providers: [
        ...BASE_PROVIDERS,
        provideRouter([]),
        { provide: AuthService, useValue: authStub('ADMIN') },
      ],
    });
    const groupLabels = Array.from(container.querySelectorAll('.nav-group__label')).map(g => g.textContent?.trim());
    expect(groupLabels).toContain('Operate');
    expect(groupLabels).toContain('Administer');
  });

  it('shows only Operate group for a non-admin user', async () => {
    const { container } = await render(RailComponent, {
      providers: [
        ...BASE_PROVIDERS,
        provideRouter([]),
        { provide: AuthService, useValue: authStub('USER') },
      ],
    });
    const groupLabels = Array.from(container.querySelectorAll('.nav-group__label')).map(g => g.textContent?.trim());
    expect(groupLabels).toEqual(['Operate']);
  });

  it('wires nav items to their (relative) routerLink targets', async () => {
    const { container } = await render(RailComponent, {
      providers: [
        ...BASE_PROVIDERS,
        provideRouter([]),
        { provide: AuthService, useValue: authStub('USER') },
      ],
    });
    expect(container.querySelector('.nav-item')?.getAttribute('href')).toContain('dashboard');
  });
});

// ─── TopbarComponent ─────────────────────────────────────────────────────────

describe('TopbarComponent', () => {
  it('renders breadcrumb segments with the last marked current + separators between', async () => {
    const { container } = await render(TopbarComponent, {
      inputs: { breadcrumbs: ['Operate', 'Devices'] },
      providers: [
        ...BASE_PROVIDERS,
        { provide: ThemeService, useValue: themeStub() },
      ],
    });
    const segs = container.querySelectorAll('.crumbs__seg');
    expect(Array.from(segs).map(s => s.textContent?.trim())).toEqual(['Operate', 'Devices']);
    expect(segs[1].classList.contains('crumbs__seg--current')).toBe(true);
    expect(container.querySelectorAll('.crumbs__sep').length).toBe(1);
  });

  it('emits openSearch when the search button is clicked', async () => {
    const onSearch = vi.fn();
    const { container } = await render(TopbarComponent, {
      inputs: { breadcrumbs: [] },
      on: { openSearch: onSearch },
      providers: [
        ...BASE_PROVIDERS,
        { provide: ThemeService, useValue: themeStub() },
      ],
    });
    fireEvent.click(container.querySelector('.searchbtn') as HTMLElement);
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});

// ─── ShellComponent ─────────────────────────────────────────────────────────

describe('ShellComponent', () => {
  const providers = () => [
    ...BASE_PROVIDERS,
    provideRouter([]),
    { provide: ThemeService, useValue: themeStub() },
    { provide: AuthService, useValue: authStub('USER') },
    { provide: ToastService, useValue: { success: vi.fn() } },
  ];

  it('renders a split-pane (rail inline ≥1080px) hosting rail, topbar and the outlet', async () => {
    const { container } = await render(ShellComponent, { providers: providers() });
    const sp = container.querySelector('ion-split-pane');
    expect(sp).toBeTruthy();
    expect(sp?.getAttribute('when')).toBe('(min-width: 1080px)');
    expect(container.querySelector('ion-menu')).toBeTruthy();
    expect(container.querySelector('app-rail')).toBeTruthy();
    expect(container.querySelector('app-topbar')).toBeTruthy();
    expect(container.querySelector('ion-router-outlet')).toBeTruthy();
  });

  it('starts with empty breadcrumbs when the route declares none', async () => {
    const { fixture } = await render(ShellComponent, { providers: providers() });
    expect((fixture.componentInstance as ShellComponent).breadcrumbs()).toEqual([]);
  });
});

// ─── BottomNavComponent — adminNav ──────────────────────────────────────────

describe('BottomNavComponent — adminNav', () => {
  function tenantStub(active = true) {
    return {
      isActive: signal(active),
      customer: signal(active ? { id: '1', name: 'Acme', code: 'AC' } : null),
      hydrate: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    };
  }

  const apiStub = { invoke: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }) };

  it('does not produce duplicate label keys in adminNav for an ADMIN with active tenant', async () => {
    const { fixture } = await render(BottomNavComponent, {
      providers: [
        ...BASE_PROVIDERS,
        provideRouter([]),
        { provide: ThemeService, useValue: themeStub() },
        { provide: AuthService, useValue: authStub('ADMIN') },
        { provide: TenantContextService, useValue: tenantStub(true) },
        { provide: Api, useValue: apiStub },
      ],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav: { label: string }[] = (fixture.componentInstance as any).adminNav();
    const labels = nav.map(it => it.label);
    const duplicates = labels.filter((l, i) => labels.indexOf(l) !== i);
    expect(duplicates).toEqual([]);
  });

  it('nav.logs points to the unified logs route (not admin/logs)', async () => {
    const { fixture } = await render(BottomNavComponent, {
      providers: [
        ...BASE_PROVIDERS,
        provideRouter([]),
        { provide: ThemeService, useValue: themeStub() },
        { provide: AuthService, useValue: authStub('ADMIN') },
        { provide: TenantContextService, useValue: tenantStub(true) },
        { provide: Api, useValue: apiStub },
      ],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav: { label: string; path: string }[] = (fixture.componentInstance as any).adminNav();
    const logsItems = nav.filter(it => it.label === 'nav.logs');
    expect(logsItems).toHaveLength(1);
    expect(logsItems[0].path).toBe('logs');
  });
});
