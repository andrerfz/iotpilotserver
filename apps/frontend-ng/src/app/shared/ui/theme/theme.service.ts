import { effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '@ng/core/api/generated/api-configuration';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'iotpilot.theme';

function resolveEffective(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyToDom(effective: 'light' | 'dark'): void {
  const html = document.documentElement;
  html.setAttribute('data-theme', effective);
  html.classList.toggle('dark', effective === 'dark');
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfiguration);

  private readonly _theme = signal<Theme>(this.getInitialTheme());
  /** Current theme preference ('light' | 'dark' | 'system'). */
  readonly theme = this._theme.asReadonly();

  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  private mediaListener = () => {
    if (this._theme() === 'system') applyToDom(resolveEffective('system'));
  };

  constructor() {
    // Apply immediately from the localStorage-cached preference to avoid flash.
    applyToDom(resolveEffective(this._theme()));

    // Re-apply whenever the signal changes.
    effect(() => {
      const t = this._theme();
      applyToDom(resolveEffective(t));
    });

    // Live system preference tracking.
    this.mediaQuery.addEventListener('change', this.mediaListener);
  }

  /** Set the active theme, persist to localStorage + server. */
  setTheme(theme: Theme): void {
    this._theme.set(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    void this.persistToServer(theme);
  }

  /**
   * Load server-side preference (called once by APP_INITIALIZER after auth).
   * Silently falls back to the cached localStorage value on error.
   */
  async loadFromServer(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ data?: { theme?: Theme } } | { theme?: Theme }>(
          `${this.apiConfig.rootUrl}/settings/system`,
        ),
      );
      const theme: Theme | undefined =
        (res as { data?: { theme?: Theme } }).data?.theme ??
        (res as { theme?: Theme }).theme;

      if (theme && ['light', 'dark', 'system'].includes(theme)) {
        this._theme.set(theme);
        localStorage.setItem(STORAGE_KEY, theme);
      }
    } catch {
      // Non-fatal: keep the cached / default preference.
    }
  }

  private getInitialTheme(): Theme {
    const cached = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (cached && ['light', 'dark', 'system'].includes(cached)) return cached;
    return 'dark'; // default: dark (NOC context, matches prototype default)
  }

  private async persistToServer(theme: Theme): Promise<void> {
    try {
      await firstValueFrom(
        this.http.put(`${this.apiConfig.rootUrl}/settings/system`, { theme }),
      );
    } catch {
      // Non-fatal: localStorage is the authoritative client-side cache.
    }
  }
}
