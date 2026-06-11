import { TestBed } from '@angular/core/testing';
import { Api } from '../api/generated/api';
import { authSessionsDelete } from '../api/generated/fn/auth/auth-sessions-delete';
import { authSessionsGet } from '../api/generated/fn/auth/auth-sessions-get';
import { authSessionsIdDelete } from '../api/generated/fn/auth/auth-sessions-id-delete';
import { Session } from '../api/generated/models/session';
import { SessionsService } from './sessions.service';

class FakeApi {
  private readonly handlers = new Map<unknown, (params?: unknown) => Promise<unknown>>();
  on(fn: unknown, impl: (params?: unknown) => Promise<unknown>): void {
    this.handlers.set(fn, impl);
  }
  invoke(fn: unknown, params?: unknown): Promise<unknown> {
    const handler = this.handlers.get(fn);
    return handler ? handler(params) : Promise.reject(new Error('no handler'));
  }
}

const sessions: Session[] = [
  { id: 's1', createdAt: '2026-06-01T00:00:00Z', expiresAt: '2026-06-08T00:00:00Z', isCurrent: true },
  { id: 's2', createdAt: '2026-06-02T00:00:00Z', expiresAt: '2026-06-09T00:00:00Z', isCurrent: false },
];

describe('SessionsService', () => {
  let api: FakeApi;
  let svc: SessionsService;

  beforeEach(() => {
    api = new FakeApi();
    TestBed.configureTestingModule({
      providers: [SessionsService, { provide: Api, useValue: api }],
    });
    svc = TestBed.inject(SessionsService);
  });

  it('listSessions() unwraps the envelope data array', async () => {
    api.on(authSessionsGet, () => Promise.resolve({ success: true, data: sessions }));
    expect(await svc.listSessions()).toEqual(sessions);
  });

  it('listSessions() returns [] when data is absent', async () => {
    api.on(authSessionsGet, () => Promise.resolve({ success: true }));
    expect(await svc.listSessions()).toEqual([]);
  });

  it('revokeSession(id) passes the id and reports current-session revocation', async () => {
    let sentParams: unknown;
    api.on(authSessionsIdDelete, (params) => {
      sentParams = params;
      return Promise.resolve({ success: true, data: { revoked: true, wasCurrentSession: true } });
    });

    const result = await svc.revokeSession('s1');

    expect(sentParams).toEqual({ id: 's1' });
    expect(result).toEqual({ wasCurrentSession: true });
  });

  it('revokeAllOtherSessions() returns the revoked count', async () => {
    api.on(authSessionsDelete, () => Promise.resolve({ success: true, data: { revokedCount: 3 } }));
    expect(await svc.revokeAllOtherSessions()).toBe(3);
  });

  it('revokeAllOtherSessions() defaults to 0 when count is missing', async () => {
    api.on(authSessionsDelete, () => Promise.resolve({ success: true, data: {} }));
    expect(await svc.revokeAllOtherSessions()).toBe(0);
  });
});
