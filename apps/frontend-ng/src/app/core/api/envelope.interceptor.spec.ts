import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { envelopeInterceptor } from './envelope.interceptor';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('envelopeInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([envelopeInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('strips { success, data, timestamp } down to just data', async () => {
    let result: unknown;
    http.get('/api/widgets').subscribe((r) => (result = r));

    await tick();
    httpMock.expectOne('/api/widgets').flush({
      success: true,
      data: { id: 'w1', name: 'Widget' },
      timestamp: '2026-01-01T00:00:00Z',
    });

    await tick();
    expect(result).toEqual({ id: 'w1', name: 'Widget' });
  });

  it('unwraps to an array when data is an array', async () => {
    let result: unknown;
    http.get('/api/widgets').subscribe((r) => (result = r));

    await tick();
    httpMock.expectOne('/api/widgets').flush({
      success: true,
      data: [1, 2, 3],
      timestamp: '2026-01-01T00:00:00Z',
    });

    await tick();
    expect(result).toEqual([1, 2, 3]);
  });

  it('leaves the envelope untouched when it carries meta (e.g. pagination) — the caller reads meta directly', async () => {
    let result: unknown;
    http.get('/api/admin/logs').subscribe((r) => (result = r));

    await tick();
    const envelope = {
      success: true,
      data: [{ id: 'log-1' }],
      timestamp: '2026-01-01T00:00:00Z',
      meta: { pagination: { total: 1, page: 1, limit: 50, pages: 1 } },
    };
    httpMock.expectOne('/api/admin/logs').flush(envelope);

    await tick();
    expect(result).toEqual(envelope);
  });

  it('leaves non-envelope shapes untouched (e.g. the health check)', async () => {
    let result: unknown;
    http.get('/api/health').subscribe((r) => (result = r));

    await tick();
    const health = { status: 'healthy', timestamp: '2026-01-01T00:00:00Z', uptime: 1 };
    httpMock.expectOne('/api/health').flush(health);

    await tick();
    expect(result).toEqual(health);
  });

  it('leaves a bare array response untouched (not an envelope object)', async () => {
    let result: unknown;
    http.get('/api/widgets').subscribe((r) => (result = r));

    await tick();
    httpMock.expectOne('/api/widgets').flush([1, 2, 3]);

    await tick();
    expect(result).toEqual([1, 2, 3]);
  });
});
