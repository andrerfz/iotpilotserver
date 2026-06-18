import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiConfiguration } from '@ng/core/api/generated/api-configuration';
import { SettingsApiKeysPage } from './settings-api-keys.page';

const MOCK_KEYS = [
  {
    id: 'key-001',
    name: 'Sensor A',
    maskedKey: '****abcd',
    expiresAt: null,
    createdAt: '2025-01-01T00:00:00Z',
    isActive: true,
    lastUsedAt: null,
  },
  {
    id: 'key-002',
    name: 'Sensor B',
    maskedKey: '****efgh',
    expiresAt: null,
    createdAt: '2025-01-02T00:00:00Z',
    isActive: true,
    lastUsedAt: '2025-01-10T00:00:00Z',
  },
];

async function setup() {
  const result = await render(SettingsApiKeysPage, {
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ApiConfiguration, useValue: { rootUrl: '/api' } },
    ],
  });
  const ctrl = TestBed.inject(HttpTestingController);
  return { ...result, ctrl };
}

describe('SettingsApiKeysPage', () => {
  it('loads and displays API keys', async () => {
    const { fixture, ctrl, findByText } = await setup();
    const req = ctrl.expectOne('/api/auth/api-keys');
    req.flush({ success: true, data: MOCK_KEYS });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(await findByText('Sensor A')).toBeTruthy();
    expect(await findByText('Sensor B')).toBeTruthy();
    ctrl.verify();
  });

  it('creates a key and shows the full key banner', async () => {
    const { fixture, ctrl, findByText } = await setup();
    const listReq = ctrl.expectOne('/api/auth/api-keys');
    listReq.flush({ success: true, data: [] });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp.nameCtrl.setValue('My Key');
    // Start create but don't await — let the test drive the HTTP interactions
    const createPromise = comp.onCreate();
    fixture.detectChanges();

    const postReq = ctrl.expectOne((req) => req.method === 'POST');
    postReq.flush({
      success: true,
      data: {
        message: 'Created',
        apiKey: {
          id: 'new-001',
          name: 'My Key',
          key: 'iot_' + 'a'.repeat(64),
          expiresAt: null,
          createdAt: '2025-06-01T00:00:00Z',
        },
      },
    });
    // Let onCreate proceed to loadKeys() after the POST flush
    await fixture.whenStable();
    const reload = ctrl.expectOne('/api/auth/api-keys');
    reload.flush({ success: true, data: [] });
    await createPromise;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(await findByText(/copy it now/i)).toBeTruthy();
    ctrl.verify();
  });

  it('deletes a key and removes it from the list', async () => {
    const { fixture, ctrl } = await setup();
    const listReq = ctrl.expectOne('/api/auth/api-keys');
    listReq.flush({ success: true, data: MOCK_KEYS });
    await fixture.whenStable();
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    void comp.onDelete('key-001');

    const delReq = ctrl.expectOne((req) => req.method === 'DELETE');
    delReq.flush({ success: true, data: { message: 'Deleted', keyId: 'key-001' } });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(comp.keys().find((k) => k.id === 'key-001')).toBeUndefined();
    ctrl.verify();
  });
});
