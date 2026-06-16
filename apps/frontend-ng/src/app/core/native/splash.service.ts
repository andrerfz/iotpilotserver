import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Hides the native splash screen after the app shell has rendered.
 * No-ops on web (plugin not available in browser context).
 */
@Injectable({ providedIn: 'root' })
export class SplashService {
  async hide(): Promise<void> {
    if (!Capacitor.isPluginAvailable('SplashScreen')) return;
    await SplashScreen.hide({ fadeOutDuration: 300 });
  }
}
