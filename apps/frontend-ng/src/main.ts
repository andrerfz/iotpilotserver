import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAppInitializer, inject } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideEchartsCore } from 'ngx-echarts';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withPreloading,
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideApi } from './app/core/api/api.config';
import { authInterceptor } from './app/core/auth/auth.interceptor';
import { AuthService } from './app/core/auth/auth.service';
import { provideTokenStorage } from './app/core/auth/token.storage';
import { provideNativeTokenStorage } from './app/core/native/native.providers';
import { provideBle } from './app/core/ble/ble.providers';
import { provideQueryHandler } from './app/core/cqrs/query-bus';
import { GetHealthHandler } from './app/core/cqrs/example/get-health.handler';
import { ThemeService } from './app/shared/ui/theme/theme.service';
import { LangService } from './app/core/i18n/lang.service';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideApi(),
    ...(Capacitor.isNativePlatform() ? provideNativeTokenStorage() : [provideTokenStorage()]),
    provideBle(),
    provideQueryHandler(GetHealthHandler),
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      const theme = inject(ThemeService);
      // loadFromServer() must run after restoreSession() resolves: it needs the
      // bearer token attached (via the auth interceptor) to fetch the signed-in
      // user's stored preference, and a synced-then-stable session before
      // applying it — otherwise it'd race an unauthenticated 401 or overwrite a
      // theme choice made before the session was confirmed.
      return auth.restoreSession().then(() => theme.loadFromServer());
    }),
    provideEchartsCore({ echarts: () => import('echarts') }),
    provideTranslateService({ fallbackLang: 'en' }),
    provideTranslateHttpLoader({ prefix: './assets/i18n/', suffix: '.json' }),
    provideAppInitializer(() => inject(LangService).init()),
  ],
}).catch((err) => console.error(err));
