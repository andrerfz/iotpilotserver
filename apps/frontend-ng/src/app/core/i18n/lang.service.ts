import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

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

  get current(): SupportedLang {
    const lang = this.translate.getCurrentLang() ?? 'en';
    return SUPPORTED_LANGS.includes(lang as SupportedLang) ? (lang as SupportedLang) : 'en';
  }

  init(): Promise<unknown> {
    this.translate.addLangs([...SUPPORTED_LANGS]);
    const saved = localStorage.getItem(LANG_KEY) as SupportedLang | null;
    const lang = saved && SUPPORTED_LANGS.includes(saved) ? saved : this.detectBrowserLang();
    return this.translate.use(lang).toPromise();
  }

  use(lang: SupportedLang): void {
    localStorage.setItem(LANG_KEY, lang);
    this.translate.use(lang);
  }

  private detectBrowserLang(): SupportedLang {
    const browser = navigator.language.toLowerCase();
    if (browser.startsWith('pt')) return 'pt-br';
    const prefix = browser.split('-')[0] as SupportedLang;
    return SUPPORTED_LANGS.includes(prefix) ? prefix : 'en';
  }
}
