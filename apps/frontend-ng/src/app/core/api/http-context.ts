import { HttpContextToken } from '@angular/common/http';

/**
 * Per-request flag asking the auth interceptor (T4) to send the request with
 * credentials so the browser attaches the httpOnly `auth-token` cookie.
 *
 * Only the web cookie-refresh bootstrap sets this (see AuthService.refresh).
 * Every other request stays `withCredentials: false` and authenticates with the
 * Bearer header — the canonical transport (fe-core Q2). Until T4's interceptor
 * lands, this token is inert (set but not yet acted upon).
 */
export const WITH_CREDENTIALS = new HttpContextToken<boolean>(() => false);
