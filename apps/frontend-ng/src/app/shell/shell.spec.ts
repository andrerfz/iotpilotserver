import { render, fireEvent } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { provideRouter, ActivatedRouteSnapshot } from '@angular/router';
import { ThemeService } from '@ng/shared/ui';
import { AuthService } from '../core/auth/auth.service';
import { ToastService } from '../core/errors/toast.service';
import { breadcrumbFromSnapshot } from './breadcrumbs';
import { RailComponent } from './rail.component';
import { TopbarComponent } from './topbar.component';
import { ShellComponent } from './shell.component';

function snap(data: Record<string, unknown>, child: ActivatedRouteSnapshot | null = null): ActivatedRouteSnapshot {
  return { data, firstChild: child } as unknown as ActivatedRouteSnapshot;
}
function themeStub(initial: 'light' | 'dark' | 'system' = 'dark') {
  const theme = signal(initial);
  return { theme, setTheme: vi.fn((v: 'light' | 'dark' | 'system') => theme.set(v)) };
}

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
  it('renders the brand and both nav groups with items + badges', async () => {
    const { container } = await render(RailComponent, { providers: [provideRouter([])] });
    expect(container.querySelector('.brand-name')?.textContent).toContain('IoT Pilot');
    expect([...container.querySelectorAll('.nav-group__label')].map(g => g.textContent?.trim()))
      .toEqual(['Operate', 'Administer']);
    expect(container.querySelectorAll('.nav-item').length).toBe(6);
    expect([...container.querySelectorAll('.nav-item__badge')].map(b => b.textContent?.trim()))
      .toEqual(['10', '4', '2']);
  });

  it('wires nav items to their (relative) routerLink targets', async () => {
    const { container } = await render(RailComponent, { providers: [provideRouter([])] });
    expect(container.querySelector('.nav-item')?.getAttribute('href')).toContain('dashboard');
  });
});

// ─── TopbarComponent ─────────────────────────────────────────────────────────

describe('TopbarComponent', () => {
  it('renders breadcrumb segments with the last marked current + separators between', async () => {
    const { container } = await render(TopbarComponent, {
      inputs: { breadcrumbs: ['Operate', 'Devices'] },
      providers: [{ provide: ThemeService, useValue: themeStub() }],
    });
    const segs = container.querySelectorAll('.crumbs__seg');
    expect([...segs].map(s => s.textContent?.trim())).toEqual(['Operate', 'Devices']);
    expect(segs[1].classList.contains('crumbs__seg--current')).toBe(true);
    expect(container.querySelectorAll('.crumbs__sep').length).toBe(1);
  });

  it('emits openSearch when the search button is clicked', async () => {
    const onSearch = vi.fn();
    const { container } = await render(TopbarComponent, {
      inputs: { breadcrumbs: [] },
      on: { openSearch: onSearch },
      providers: [{ provide: ThemeService, useValue: themeStub() }],
    });
    fireEvent.click(container.querySelector('.searchbtn') as HTMLElement);
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('shows the sun icon in dark mode and toggles to light', async () => {
    const theme = themeStub('dark');
    const { container } = await render(TopbarComponent, {
      inputs: { breadcrumbs: [] },
      providers: [{ provide: ThemeService, useValue: theme }],
    });
    const icon = container.querySelector('.iconbtn ion-icon') as HTMLElement & { name?: string };
    expect(icon.name).toBe('sunny-outline'); // dark → show sun (switch to light)
    fireEvent.click(container.querySelector('.iconbtn') as HTMLElement);
    expect(theme.setTheme).toHaveBeenCalledWith('light');
  });
});

// ─── ShellComponent ─────────────────────────────────────────────────────────

describe('ShellComponent', () => {
  const providers = () => [
    provideRouter([]),
    { provide: ThemeService, useValue: themeStub() },
    { provide: AuthService, useValue: { currentUser: signal(null), role: signal(null), logout: vi.fn() } },
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
