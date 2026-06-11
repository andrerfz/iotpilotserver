import { inject, Injectable } from '@angular/core';
import { Api } from '../api/generated/api';
import { listSessions as listSessionsRequest } from '../api/generated/fn/auth/list-sessions';
import { revokeOtherSessions } from '../api/generated/fn/auth/revoke-other-sessions';
import { revokeSession as revokeSessionRequest } from '../api/generated/fn/auth/revoke-session';
import { Session } from '../api/generated/models/session';

/**
 * Active-session management over `/auth/sessions*`. Consumed by fe-settings
 * (security page) to let a user see and revoke their sessions.
 */
@Injectable({ providedIn: 'root' })
export class SessionsService {
  private readonly api = inject(Api);

  /** List the current user's active sessions (the current one is flagged `isCurrent`). */
  async listSessions(): Promise<Session[]> {
    const res = await this.api.invoke(listSessionsRequest, {});
    return res.data ?? [];
  }

  /** Revoke one session by id. Returns whether the revoked session was the current one. */
  async revokeSession(id: string): Promise<{ wasCurrentSession: boolean }> {
    const res = await this.api.invoke(revokeSessionRequest, { id });
    return { wasCurrentSession: res.data?.wasCurrentSession ?? false };
  }

  /** Revoke every session except the current one. Returns how many were revoked. */
  async revokeAllOtherSessions(): Promise<number> {
    const res = await this.api.invoke(revokeOtherSessions, {});
    return res.data?.revokedCount ?? 0;
  }
}
