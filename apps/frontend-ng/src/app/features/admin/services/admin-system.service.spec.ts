import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Api } from '@ng/core/api/generated/api';
import { AdminSystemService } from './admin-system.service';
import { ApiError } from '@ng/core/errors/api-error';

const MOCK_INFO = {
  system: { platform: 'linux', nodeVersion: 'v22', uptime: 1000, memoryUsage: { used: 1, total: 2, percentage: 50 }, cpuUsage: 10 },
  database: { status: 'connected', version: '15', connections: { active: 1, idle: 2, max: 10 }, size: '10MB' },
  application: { version: '1.0.0', environment: 'production', buildDate: '2026-01-01', features: [] },
  recentActivity: [],
};

function makeApi() {
  return { invoke: vi.fn() };
}

function setup(api = makeApi()) {
  TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: api }] });
  return { service: TestBed.inject(AdminSystemService), api };
}

describe('AdminSystemService', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('unwraps the { success, data, timestamp } envelope', async () => {
    const api = makeApi();
    api.invoke.mockResolvedValue({ success: true, data: MOCK_INFO, timestamp: '2026-06-12T00:00:00Z' });
    const { service } = setup(api);

    await service.load();

    expect(service.data()).toEqual(MOCK_INFO);
    expect(service.error()).toBeNull();
  });

  it('sets error signal on API failure', async () => {
    const api = makeApi();
    api.invoke.mockRejectedValue(new ApiError(500, 'SERVER_ERROR', 'Oops'));
    const { service } = setup(api);

    await service.load();

    expect(service.error()).toBeInstanceOf(ApiError);
    expect(service.data()).toBeNull();
  });
});
