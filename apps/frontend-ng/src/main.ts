import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAppInitializer, inject } from '@angular/core';
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
import { provideQueryHandler } from './app/core/cqrs/query-bus';
import { GetHealthHandler } from './app/core/cqrs/example/get-health.handler';
import { ThemeService } from './app/shared/ui/theme/theme.service';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideApi(),
    // On native (Capacitor) platforms use SecureStorage for the session token;
    // on web keep it in memory (httpOnly cookie handles persistence on reload).
    ...(Capacitor.isNativePlatform() ? provideNativeTokenStorage() : [provideTokenStorage()]),
    // CQRS: register query/command handlers via DI multi-providers.
    provideQueryHandler(GetHealthHandler),
    // Apply saved theme before any route renders (constructor does the work).
    provideAppInitializer(() => { inject(ThemeService); }),
    // Restore any existing session before the first route renders.
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    provideEchartsCore({ echarts: () => import('echarts') }),
  ],
}).catch((err) => console.error(err));
