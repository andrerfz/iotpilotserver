import { Injectable, computed, signal } from '@angular/core';

/**
 * Single source of "is this a compact (mobile/tablet) viewport". Used to switch
 * presentation between the desktop `ui-data-table` and a mobile swipe list, sharing
 * the same data + actions. The 1080px breakpoint matches the shell's split-pane
 * (rail ↔ bottom-nav), and covers the compiled Capacitor app too (its webview is
 * narrow), so no platform-specific check is needed.
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly mql =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(min-width: 1080px)')
      : null;

  private readonly _wide = signal(this.mql?.matches ?? true);

  /** True on wide viewports (desktop, ≥1080px). */
  readonly wide = this._wide.asReadonly();
  /** True on compact viewports (mobile/tablet, <1080px). */
  readonly compact = computed(() => !this._wide());

  constructor() {
    this.mql?.addEventListener('change', (e) => this._wide.set(e.matches));
  }
}
