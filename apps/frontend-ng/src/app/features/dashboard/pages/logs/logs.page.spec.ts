import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { LogsPage } from './logs.page';
import { AdminLogsService } from '../../../admin/services/admin-logs.service';
import { AdminAuditLogsService } from '../../../admin/services/admin-audit-logs.service';
import { AuthService } from '@ng/core/auth/auth.service';
import { ViewportService } from '@ng/core/layout/viewport.service';

function makeLogsSvc() {
  return {
    logs: signal([]),
    pagination: signal({ total: 0, page: 1, limit: 50, pages: 0 }),
    filterOptions: signal({ sources: [], devices: [] }),
    loading: signal(false),
    error: signal(null),
    load: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
  };
}

function makeAuditSvc() {
  return {
    logs: signal([]),
    pagination: signal({ total: 0, page: 1, limit: 50, pages: 0 }),
    filterOptions: signal({ resources: [], eventTypes: [] }),
    loading: signal(false),
    error: signal(null),
    load: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
  };
}

function buildProviders(role = 'ADMIN') {
  return [
    { provide: AdminLogsService, useValue: makeLogsSvc() },
    { provide: AdminAuditLogsService, useValue: makeAuditSvc() },
    { provide: AuthService, useValue: { role: signal(role) } },
    { provide: ViewportService, useValue: { wide: signal(true) } },
  ];
}

describe('LogsPage', () => {
  describe('showAudit', () => {
    it('is true for ADMIN', async () => {
      const { fixture } = await render(LogsPage, { providers: buildProviders('ADMIN') });
      expect(fixture.componentInstance.showAudit()).toBe(true);
    });

    it('is true for SUPERADMIN', async () => {
      const { fixture } = await render(LogsPage, { providers: buildProviders('SUPERADMIN') });
      expect(fixture.componentInstance.showAudit()).toBe(true);
    });

    it('is false for USER', async () => {
      const { fixture } = await render(LogsPage, { providers: buildProviders('USER') });
      expect(fixture.componentInstance.showAudit()).toBe(false);
    });
  });

  describe('activeTab', () => {
    it('starts at ops', async () => {
      const { fixture } = await render(LogsPage, { providers: buildProviders() });
      expect(fixture.componentInstance['activeTab']()).toBe('ops');
    });
  });

  describe('onTabChange', () => {
    it('updates activeTab and resets currentPage to 1', async () => {
      const { fixture } = await render(LogsPage, { providers: buildProviders() });
      const comp = fixture.componentInstance;
      comp['currentPage'].set(3);
      comp['onTabChange']('audit');
      expect(comp['activeTab']()).toBe('audit');
      expect(comp['currentPage']()).toBe(1);
    });
  });

  describe('ionViewWillEnter', () => {
    it('calls svc.load()', async () => {
      const svc = makeLogsSvc();
      const { fixture } = await render(LogsPage, {
        providers: [
          { provide: AdminLogsService, useValue: svc },
          { provide: AdminAuditLogsService, useValue: makeAuditSvc() },
          { provide: AuthService, useValue: { role: signal('ADMIN') } },
          { provide: ViewportService, useValue: { wide: signal(true) } },
        ],
      });
      svc.load.mockClear();
      fixture.componentInstance.ionViewWillEnter();
      expect(svc.load).toHaveBeenCalledTimes(1);
    });
  });
});
