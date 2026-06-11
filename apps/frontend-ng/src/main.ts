import { provideHttpClient } from '@angular/common/http';
import { provideAppInitializer, inject } from '@angular/core';
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

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideApi } from './app/core/api/api.config';
import { AuthService } from './app/core/auth/auth.service';
import { provideTokenStorage } from './app/core/auth/token.storage';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(),
    provideApi(),
    provideTokenStorage(),
    // Restore any existing session before the first route renders.
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ],
}).catch((err) => console.error(err));
