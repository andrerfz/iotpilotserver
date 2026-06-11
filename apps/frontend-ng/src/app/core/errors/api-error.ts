import { HttpErrorResponse } from '@angular/common/http';

/**
 * A single field-level validation issue, as emitted by the backend for 400/422
 * responses (`details: [{ path, message, code? }]` — see the Express
 * `extractErrorDetails` ZodError branch).
 */
export interface ApiValidationIssue {
  path: string;
  message: string;
  code?: string;
}

/** Shape of the backend error envelope (`{ success:false, error, code, details, timestamp }`). */
interface ErrorEnvelope {
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
}

const STATUS_CODE: Record<number, string> = {
  0: 'NETWORK_ERROR',
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

function codeForStatus(status: number): string {
  return STATUS_CODE[status] ?? 'HTTP_ERROR';
}

/**
 * Normalized application error mapped from the backend error envelope.
 *
 * Every HTTP failure that reaches the app should be turned into an `ApiError`
 * (by the auth interceptor / feature services) so the rest of the codebase
 * never inspects raw `HttpErrorResponse` shapes or guesses at payloads.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    // Restore the prototype chain (transpilation target < ES2015 safety).
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /** Build an ApiError from Angular's HttpErrorResponse, tolerating non-envelope bodies. */
  static fromHttp(err: HttpErrorResponse): ApiError {
    // status 0 → request never reached the server (offline, CORS, DNS).
    if (err.status === 0) {
      return new ApiError(
        0,
        'NETWORK_ERROR',
        'Unable to reach the server. Check your connection and try again.',
      );
    }

    const body = err.error as ErrorEnvelope | string | null | undefined;

    if (body && typeof body === 'object') {
      const message = body.error ?? body.message ?? err.message ?? 'Request failed';
      const code = body.code ?? codeForStatus(err.status);
      return new ApiError(err.status, code, message, body.details);
    }

    // Non-JSON body: HTML error page, plain-text proxy error, or empty.
    const message =
      typeof body === 'string' && body.trim().length > 0
        ? body
        : (err.message ?? 'Request failed');
    return new ApiError(err.status, codeForStatus(err.status), message);
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidation(): boolean {
    return this.status === 400 || this.status === 422 || this.code === 'VALIDATION_ERROR';
  }

  /** Field-level issues when the backend returned a validation `details` array; [] otherwise. */
  get validationIssues(): ApiValidationIssue[] {
    if (!Array.isArray(this.details)) {
      return [];
    }
    return this.details
      .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
      .map((d) => ({
        path: typeof d['path'] === 'string' ? (d['path'] as string) : '',
        message: typeof d['message'] === 'string' ? (d['message'] as string) : '',
        code: typeof d['code'] === 'string' ? (d['code'] as string) : undefined,
      }));
  }
}
