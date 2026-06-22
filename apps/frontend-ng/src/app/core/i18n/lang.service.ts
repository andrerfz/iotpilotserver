import { ApplicationRef, inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'fr', 'it'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const LANG_KEY = 'iotpilot_lang';

export const LANG_LABELS: Record<SupportedLang, string> = {
  en: 'English',
  es: 'Español',
  'pt-br': 'Português (BR)',
  fr: 'Français',
  it: 'Italiano',
};

@Injectable({ providedIn: 'root' })
export class LangService {
  private readonly translate = inject(TranslateService);
  private readonly appRef = inject(ApplicationRef);

  get current(): SupportedLang {
    const lang = this.translate.getCurrentLang() ?? 'en';
    return SUPPORTED_LANGS.includes(lang as SupportedLang) ? (lang as SupportedLang) : 'en';
  }

  async init(): Promise<void> {
    this.translate.addLangs([...SUPPORTED_LANGS]);
    const saved = localStorage.getItem(LANG_KEY) as SupportedLang | null;
    const lang = saved && SUPPORTED_LANGS.includes(saved) ? saved : this.detectBrowserLang();
    await firstValueFrom(this.translate.use(lang));
  }

  /**
   * Change the active language, persist to localStorage, and await the
   * translation file load before returning. Callers can await this to
   * guarantee _currentLang is already set before any subsequent rendering.
   * After the load, we call ApplicationRef.tick() so Ionic-cached views
   * that were detached from the CD tree re-render with the new language.
   */
  async use(lang: SupportedLang): Promise<void> {
    localStorage.setItem(LANG_KEY, lang);
    await firstValueFrom(this.translate.use(lang));
    this.appRef.tick();
  }

  private detectBrowserLang(): SupportedLang {
    const browser = navigator.language.toLowerCase();
    if (browser.startsWith('pt')) return 'pt-br';
    const prefix = browser.split('-')[0] as SupportedLang;
    return SUPPORTED_LANGS.includes(prefix) ? prefix : 'en';
  }
}
