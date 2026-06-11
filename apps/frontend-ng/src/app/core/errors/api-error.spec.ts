import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from './api-error';

/** Helper: build an HttpErrorResponse with a parsed JSON `error` body, as Angular does. */
function httpError(status: number, body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    statusText: 'Error',
    url: 'http://localhost/api/test',
    error: body,
  });
}

describe('ApiError.fromHttp — backend error envelope', () => {
  it('maps a 400 validation payload (details array)', () => {
    // Real shape from the Express ZodError branch.
    const err = ApiError.fromHttp(
      httpError(400, {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: [
          { path: 'email', message: 'Invalid email', code: 'invalid_string' },
          { path: 'password', message: 'Too short', code: 'too_small' },
        ],
        timestamp: '2026-06-11T00:00:00.000Z',
      }),
    );

    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('Validation failed');
    expect(err.isValidation).toBe(true);
    expect(err.validationIssues).toEqual([
      { path: 'email', message: 'Invalid email', code: 'invalid_string' },
      { path: 'password', message: 'Too short', code: 'too_small' },
    ]);
  });

  it('maps a 401 unauthorized payload', () => {
    const err = ApiError.fromHttp(
      httpError(401, { success: false, error: 'Invalid credentials', code: 'UNAUTHORIZED' }),
    );

    expect(err.status).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Invalid credentials');
    expect(err.isUnauthorized).toBe(true);
    expect(err.validationIssues).toEqual([]);
  });

  it('maps a 403 forbidden payload', () => {
    const err = ApiError.fromHttp(
      httpError(403, { success: false, error: 'Access denied', code: 'FORBIDDEN' }),
    );

    expect(err.status).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toBe('Access denied');
    expect(err.isForbidden).toBe(true);
  });

  it('falls back to a status-derived code when the envelope omits one', () => {
    const err = ApiError.fromHttp(httpError(404, { success: false, error: 'Resource not found' }));
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.isNotFound).toBe(true);
  });

  it('treats status 0 as a network error without inspecting the body', () => {
    const err = ApiError.fromHttp(httpError(0, null));
    expect(err.status).toBe(0);
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.isNetworkError).toBe(true);
    expect(err.message).toMatch(/reach the server/i);
  });

  it('handles a non-JSON body (e.g. an HTML 502 from a proxy)', () => {
    const err = ApiError.fromHttp(httpError(502, '<html>Bad Gateway</html>'));
    expect(err.status).toBe(502);
    expect(err.code).toBe('HTTP_ERROR');
    expect(err.message).toContain('Bad Gateway');
  });

  it('is a real Error subclass (instanceof + name)', () => {
    const err = ApiError.fromHttp(httpError(500, { error: 'boom', code: 'INTERNAL_ERROR' }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
  });
});
