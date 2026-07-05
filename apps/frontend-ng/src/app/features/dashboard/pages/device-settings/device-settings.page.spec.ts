import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { DeviceSettingsPage } from './device-settings.page';
import { DeviceDetailService } from '../../services/device-detail.service';
import { ToastService } from '@ng/core/errors/toast.service';
import type { Device } from '@ng/core/api/generated/models/device';
import type { DeviceSettings } from '@ng/core/api/generated/models/device-settings';

function makeSurface<T>(data: T | null = null) {
  return {
    data: signal(data),
    loading: signal(false),
    error: signal(null),
    load: vi.fn().mockResolvedValue(data),
    reload: vi.fn().mockResolvedValue(data),
  };
}

const MOCK_DEVICE: Device = {
  id: 'dev-1',
  hostname: 'pi-kitchen',
  status: 'ONLINE',
  deviceType: 'PI_4',
};

const MOCK_SETTINGS: DeviceSettings = {
  hostname: 'pi-kitchen',
  location: 'Kitchen shelf',
  description: 'Temp/humidity sensor',
  tags: ['prod', 'sensor-array'],
  reportingInterval: 300,
  heartbeatInterval: 120,
};

function buildRoute(id = 'dev-1') {
  return {
    parent: { snapshot: { paramMap: { get: () => id } } },
    snapshot: { paramMap: { get: () => id } },
  };
}

async function setup(settingsData: DeviceSettings | null = MOCK_SETTINGS) {
  const updateSettings = vi.fn().mockResolvedValue(undefined);
  const svc = {
    device: makeSurface<Device>(MOCK_DEVICE),
    deviceSettings: makeSurface<DeviceSettings>(settingsData),
    updateSettings,
  };
  const view = await render(DeviceSettingsPage, {
    imports: [RouterTestingModule],
    providers: [
      { provide: DeviceDetailService, useValue: svc },
      { provide: ActivatedRoute, useValue: buildRoute() },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  });
  return { ...view, svc, updateSettings };
}

describe('DeviceSettingsPage', () => {
  it('populates hostname/location/description from loaded settings', async () => {
    const { fixture } = await setup();
    const comp = fixture.componentInstance;
    expect(comp.formData.hostname).toBe('pi-kitchen');
    expect(comp.formData.location).toBe('Kitchen shelf');
    expect(comp.formData.description).toBe('Temp/humidity sensor');
  });

  it('joins tags into a comma-separated string for editing', async () => {
    const { fixture } = await setup();
    expect(fixture.componentInstance.tagsText).toBe('prod, sensor-array');
  });

  it('onSave splits tagsText back into an array and sends hostname/location/description', async () => {
    const { fixture, updateSettings } = await setup();
    const comp = fixture.componentInstance;
    comp.formData.hostname = 'pi-kitchen-renamed';
    comp.tagsText = 'prod, new-tag, ';

    await comp.onSave();

    expect(updateSettings).toHaveBeenCalledOnce();
    const [, payload] = updateSettings.mock.calls[0];
    expect(payload.hostname).toBe('pi-kitchen-renamed');
    expect(payload.location).toBe('Kitchen shelf');
    expect(payload.description).toBe('Temp/humidity sensor');
    expect(payload.tags).toEqual(['prod', 'new-tag']);
  });

  it('handles an empty tags list', async () => {
    const { fixture } = await setup({ ...MOCK_SETTINGS, tags: [] });
    expect(fixture.componentInstance.tagsText).toBe('');
  });
});
