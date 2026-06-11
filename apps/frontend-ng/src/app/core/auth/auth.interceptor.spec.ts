import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideApi } from '../api/api.config';
import { WITH_CREDENTIALS } from '../api/http-context';
import { ApiError } from '../errors/api-error';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { InMemoryTokenStorage, TokenStorage } from './token.storage';

/** Flush pending microtasks between async interceptor boundaries. */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const sessionUser = { id: 'u1', email: 'a@b.c', username: 'a', role: 'ADMIN', customerId: 'c1' };

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokens: TokenStorage;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        AuthService,
        provideApi(),
        { provide: TokenStorage, useClass: InMemoryTokenStorage },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(TokenStorage);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('attaches the bearer token to protected requests', async () => {
    await tokens.set('tok-123');
    http.get('/api/widgets').subscribe();

    await tick();
    const req = httpMock.expectOne('/api/widgets');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-123');
    req.flush({ ok: true });
  });

  it('does not attach a bearer to skip-listed routes (e.g. /auth/login)', async () => {
    await tokens.set('tok-123');
    http.post('/api/auth/login', { email: 'a', password: 'b' }).subscribe();

    await tick();
    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ success: true, data: {} });
  });

  it('sets withCredentials when the WITH_CREDENTIALS context flag is on', async () => {
    const context = new HttpContext().set(WITH_CREDENTIALS, true);
    http.get('/api/anything', { context }).subscribe();

    await tick();
    const req = httpMock.expectOne('/api/anything');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ ok: true });
  });

  it('refreshes on 401 then transparently retries the original request', async () => {
    await tokens.set('stale');
    let result: unknown;
    http.get('/api/widgets').subscribe((r) => (result = r));

    await tick();
    const first = httpMock.expectOne('/api/widgets');
    expect(first.request.headers.get('Authorization')).toBe('Bearer stale');
    first.flush({ error: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    // Interceptor calls AuthService.refresh() → POST /auth/refresh.
    await tick();
    const refresh = httpMock.expectOne('/api/auth/refresh');
    refresh.flush({ success: true, data: { user: sessionUser, token: 'fresh' } });

    // Original request retried once, now with the fresh token.
    await tick();
    const retry = httpMock.expectOne('/api/widgets');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer fresh');
    retry.flush({ ok: true });

    await tick();
    expect(result).toEqual({ ok: true });
    expect(await tokens.get()).toBe('fresh');
  });

  it('coalesces concurrent 401s into a single refresh (single-flight)', async () => {
    await tokens.set('stale');
    http.get('/api/a').subscribe();
    http.get('/api/b').subscribe();

    await tick();
    httpMock.expectOne('/api/a').flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/b').flush({}, { status: 401, statusText: 'Unauthorized' });

    await tick();
    // Only ONE refresh despite two 401s.
    const refresh = httpMock.expectOne('/api/auth/refresh');
    refresh.flush({ success: true, data: { user: sessionUser, token: 'fresh' } });

    await tick();
    httpMock.expectOne('/api/a').flush({ ok: 'a' });
    httpMock.expectOne('/api/b').flush({ ok: 'b' });
    await tick();
    expect(await tokens.get()).toBe('fresh');
  });

  it('redirects to /login and surfaces ApiError when refresh fails', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await tokens.set('stale');
    let caught: unknown;
    http.get('/api/widgets').subscribe({ error: (e) => (caught = e) });

    await tick();
    httpMock.expectOne('/api/widgets').flush({}, { status: 401, statusText: 'Unauthorized' });

    await tick();
    httpMock.expectOne('/api/auth/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });

    await tick();
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.objectContaining({ queryParams: expect.any(Object) }));
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(401);
    expect(await tokens.get()).toBeNull();
  });

  it('does not refresh on a 401 from a skip-listed route', async () => {
    let caught: unknown;
    http.post('/api/auth/login', {}).subscribe({ error: (e) => (caught = e) });

    await tick();
    httpMock
      .expectOne('/api/auth/login')
      .flush({ error: 'bad creds' }, { status: 401, statusText: 'Unauthorized' });

    await tick();
    // No refresh attempt for a credential-route 401.
    httpMock.expectNone('/api/auth/refresh');
    expect(caught).toBeInstanceOf(ApiError);
  });

  it('maps non-401 errors to ApiError', async () => {
    await tokens.set('tok');
    let caught: unknown;
    http.get('/api/widgets').subscribe({ error: (e) => (caught = e) });

    await tick();
    httpMock
      .expectOne('/api/widgets')
      .flush({ error: 'boom', code: 'INTERNAL_ERROR' }, { status: 500, statusText: 'Server Error' });

    await tick();
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(500);
  });
});
