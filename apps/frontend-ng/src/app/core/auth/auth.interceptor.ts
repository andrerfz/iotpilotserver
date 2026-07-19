import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, Observable, switchMap, throwError } from 'rxjs';
import { WITH_CREDENTIALS } from '../api/http-context';
import { ApiError } from '../errors/api-error';
import { AuthService } from './auth.service';
import { TenantContextService } from './tenant-context.service';
import { TokenStorage } from './token.storage';

/**
 * Endpoints that must NOT carry a bearer token and must NOT trigger the 401
 * refresh-and-retry dance: the credential-issuing routes themselves (a 401 on
 * /auth/refresh means the session is truly gone — retrying would loop) and the
 * device activation route (uses its own activation secret).
 */
const SKIP_AUTH = ['/auth/login', '/auth/refresh', '/auth/register', '/auth/verify-2fa', '/devices/activate'];

function isSkipped(url: string): boolean {
  return SKIP_AUTH.some((path) => url.includes(path));
}

function withBearer<T>(req: HttpRequest<T>, token: string | null, withCreds: boolean): HttpRequest<T> {
  let r = req;
  if (withCreds) {
    r = r.clone({ withCredentials: true });
  }
  if (token) {
    r = r.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return r;
}

/**
 * Attaches the bearer token, normalizes errors to {@link ApiError}, and on a 401
 * performs a single-flight refresh then retries the original request once. A
 * failed refresh clears the session and redirects to /login. Honors the
 * {@link WITH_CREDENTIALS} context flag so the web cookie-refresh works.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStorage);
  const auth = inject(AuthService);
  // Resolved lazily (only on an actual 401) via injector.get(), not inject(Router)
  // up front: this interceptor also carries restoreSession()'s refresh call during
  // the APP_INITIALIZER phase, and eagerly resolving Router there races with
  // IonRouterOutlet's own Router injection during root-component creation,
  // triggering NG0200 (circular dependency) on every cold app load.
  const injector = inject(Injector);
  const tenantCtx = inject(TenantContextService);

  const withCreds = req.context.get(WITH_CREDENTIALS);
  const skipped = isSkipped(req.url);

  return from(tokens.get()).pipe(
    switchMap((token) => {
      let outgoing = withBearer(req, skipped ? null : token, withCreds);
      const activeCustomer = tenantCtx.customer();
      if (activeCustomer && !skipped) {
        outgoing = outgoing.clone({ setHeaders: { 'X-Customer-Id': activeCustomer.id } });
      }

      return next(outgoing).pipe(
        catchError((err: unknown) => {
          if (!(err instanceof HttpErrorResponse)) {
            return throwError(() => err);
          }

          // 401 on a protected request → try to refresh, then retry once.
          if (err.status === 401 && !skipped) {
            return from(auth.refresh()).pipe(
              switchMap((ok): Observable<HttpEvent<unknown>> => {
                if (!ok) {
                  const router = injector.get(Router);
                  router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
                  return throwError(() => ApiError.fromHttp(err));
                }
                return from(tokens.get()).pipe(
                  switchMap((fresh) => next(withBearer(req, fresh, withCreds))),
                );
              }),
            );
          }

          return throwError(() => ApiError.fromHttp(err));
        }),
      );
    }),
  );
};
