import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiConfiguration } from '@ng/core/api/generated/api-configuration';
import { ThemeService, Theme } from './theme.service';

const API_ROOT = 'http://localhost:3100';

describe('ThemeService', () => {
  let service: ThemeService;
  let httpController: HttpTestingController;
  let originalMatchMedia: typeof window.matchMedia;

  function mockMatchMedia(prefersDark: boolean) {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: prefersDark,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  }

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    localStorage.clear();
    mockMatchMedia(false);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ThemeService,
        {
          provide: ApiConfiguration,
          useValue: Object.assign(new ApiConfiguration(), { rootUrl: API_ROOT }),
        },
      ],
    });

    service = TestBed.inject(ThemeService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    localStorage.clear();
    httpController.verify();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
  });

  it('defaults to dark theme when no localStorage cache', () => {
    expect(service.theme()).toBe('dark');
  });

  it('reads initial theme from localStorage', () => {
    localStorage.setItem('iotpilot.theme', 'light');
    // Recreate to pick up the new localStorage value.
    TestBed.resetTestingModule();
    mockMatchMedia(false);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ThemeService,
        {
          provide: ApiConfiguration,
          useValue: Object.assign(new ApiConfiguration(), { rootUrl: API_ROOT }),
        },
      ],
    });
    const svc = TestBed.inject(ThemeService);
    expect(svc.theme()).toBe('light');
    TestBed.inject(HttpTestingController).verify();
  });

  it('setTheme updates signal, localStorage, and calls the API', async () => {
    service.setTheme('light');
    expect(service.theme()).toBe('light');
    expect(localStorage.getItem('iotpilot.theme')).toBe('light');

    await Promise.resolve(); // flush micro-task for the PUT
    const req = httpController.expectOne(`${API_ROOT}/settings/system`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ theme: 'light' });
    req.flush({});
  });

  it('setTheme to system applies the effective (light) theme to <html>', () => {
    mockMatchMedia(false); // prefersDark = false → effective = light
    service.setTheme('system');
    TestBed.flushEffects();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    httpController.expectOne(`${API_ROOT}/settings/system`).flush({});
  });

  it('setTheme to system applies dark when prefers-color-scheme is dark', () => {
    mockMatchMedia(true); // prefersDark = true → effective = dark
    service.setTheme('system');
    TestBed.flushEffects();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    httpController.expectOne(`${API_ROOT}/settings/system`).flush({});
  });

  it('setTheme to light sets data-theme="light" and removes .dark', () => {
    service.setTheme('light');
    TestBed.flushEffects();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    httpController.expectOne(`${API_ROOT}/settings/system`).flush({});
  });

  it('setTheme to dark sets data-theme="dark" and adds .dark', () => {
    service.setTheme('dark');
    TestBed.flushEffects();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    httpController.expectOne(`${API_ROOT}/settings/system`).flush({});
  });

  it('loadFromServer updates theme from server response (data envelope)', async () => {
    const promise = service.loadFromServer();

    const req = httpController.expectOne(`${API_ROOT}/settings/system`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: { theme: 'light' } });

    await promise;
    expect(service.theme()).toBe('light');
    expect(localStorage.getItem('iotpilot.theme')).toBe('light');
  });

  it('loadFromServer handles flat response (no data envelope)', async () => {
    const promise = service.loadFromServer();
    httpController.expectOne(`${API_ROOT}/settings/system`).flush({ theme: 'system' });
    await promise;
    expect(service.theme()).toBe('system');
  });

  it('loadFromServer ignores invalid theme value', async () => {
    const promise = service.loadFromServer();
    httpController
      .expectOne(`${API_ROOT}/settings/system`)
      .flush({ data: { theme: 'invalid' as Theme } });
    await promise;
    expect(service.theme()).toBe('dark'); // unchanged default
  });

  it('loadFromServer silently fails on error', async () => {
    const promise = service.loadFromServer();
    httpController
      .expectOne(`${API_ROOT}/settings/system`)
      .error(new ProgressEvent('error'));
    await expect(promise).resolves.toBeUndefined();
    expect(service.theme()).toBe('dark'); // unchanged
  });
});
