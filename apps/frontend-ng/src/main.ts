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
import { envelopeInterceptor } from './app/core/api/envelope.interceptor';
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
    // envelopeInterceptor after authInterceptor: auth's 401-refresh retry calls
    // `next(...)` internally, which must still pass through envelope-stripping.
    provideHttpClient(withInterceptors([authInterceptor, envelopeInterceptor])),
    provideApi(),
    ...(Capacitor.isNativePlatform() ? provideNativeTokenStorage() : [provideTokenStorage()]),
    provideBle(),
    provideQueryHandler(GetHealthHandler),
    provideAppInitializer(() => { inject(ThemeService); }),
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    provideEchartsCore({ echarts: () => import('echarts') }),
    provideTranslateService({ fallbackLang: 'en' }),
    provideTranslateHttpLoader({ prefix: './assets/i18n/', suffix: '.json' }),
    provideAppInitializer(() => inject(LangService).init()),
  ],
}).catch((err) => console.error(err));
