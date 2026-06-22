import '@analogjs/vitest-angular/setup-zone';

import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { getTestBed, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { of, Subject } from 'rxjs';

// jsdom lacks matchMedia, which Ionic (ion-split-pane breakpoints) and the
// ThemeService ('system' mode) call on connect. Provide an inert stub.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  } as MediaQueryList);
}

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

// Load English translations so the global mock returns real strings.
// Specs that check for DOM text (e.g. getByText('Dashboard')) keep working
// because translate() / instant() return the actual English value, not the key.
let enTranslations: Record<string, unknown> = {};
try {
  enTranslations = JSON.parse(
    readFileSync(resolve(process.cwd(), 'src/assets/i18n/en.json'), 'utf-8'),
  ) as Record<string, unknown>;
} catch {
  // fallback: key pass-through (file not found in this environment)
}

function resolveKey(key: string): string {
  const parts = key.split('.');
  let node: unknown = enTranslations;
  for (const part of parts) {
    if (node && typeof node === 'object' && part in (node as object)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof node === 'string' ? node : key;
}

// Provide a global TranslateService mock so components that import TranslatePipe
// work in specs without each spec having to explicitly provide TranslateService.
// TranslatePipe (v18) calls translateService.translate(key) which must return a
// signal (() => value). Specs that need custom translation can override by providing
// their own TranslateService mock — the spec-level provider added later always wins.
beforeEach(() => {
  // jsdom's sessionStorage/localStorage are a single global shared across all
  // specs in a run. Reset them between specs so any web-storage state can't leak
  // from one spec into the next.
  sessionStorage.clear();
  localStorage.clear();

  TestBed.configureTestingModule({
    providers: [
      {
        provide: TranslateService,
        useValue: {
          instant: (key: string) => resolveKey(key),
          translate: (key: string) => () => resolveKey(key),
          get: (key: string) => of(resolveKey(key)),
          stream: (key: string) => of(resolveKey(key)),
          use: (lang: string) => of(lang),
          addLangs: () => {},
          getCurrentLang: () => 'en',
          currentLang: 'en',
          defaultLang: 'en',
          onLangChange: new Subject(),
          onTranslationChange: new Subject(),
          onDefaultLangChange: new Subject(),
        },
      },
    ],
  });
});
