import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/** Dark-mode background token value (matches tokens.css --bg in dark mode). */
const DARK_BG = '#0f1117';
/** Light-mode background token value (matches tokens.css --bg in light mode). */
const LIGHT_BG = '#f5f5f5';

/**
 * Sets the native status bar style and background color to match the active
 * app theme. No-ops on web (plugin not available in browser context).
 */
@Injectable({ providedIn: 'root' })
export class StatusBarService {
  async applyTheme(theme: 'light' | 'dark'): Promise<void> {
    if (!Capacitor.isPluginAvailable('StatusBar')) return;
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: theme === 'dark' ? DARK_BG : LIGHT_BG });
  }
}
