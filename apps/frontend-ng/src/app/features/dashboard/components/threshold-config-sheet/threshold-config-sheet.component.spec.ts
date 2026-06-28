import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { provideHttpClient } from '@angular/common/http';
import { ThresholdConfigSheetComponent } from './threshold-config-sheet.component';
import { DeviceDetailService } from '../../services/device-detail.service';
import { ToastService } from '@ng/core/errors/toast.service';
import type { Threshold } from '@ng/core/api/generated/models/threshold';

function makeSurface<T>(data: T | null = null) {
  return {
    data: signal(data),
    loading: signal(false),
    error: signal(null),
    load: vi.fn().mockResolvedValue(data),
    reload: vi.fn().mockResolvedValue(data),
  };
}

// A sensor device 'dev-1' with its own sensor_temp override (24) and an inherited
// global battery default (15, deviceId null — no per-device battery row).
const MOCK_THRESHOLDS: Threshold[] = [
  { id: 't1', metricName: 'sensor_temp', value: 24, unit: '°C', operator: 'GREATER_THAN', severity: 'HIGH', type: 'STATIC', deviceId: 'dev-1' },
  { id: 't2', metricName: 'battery', value: 15, unit: '%', operator: 'LESS_THAN', severity: 'HIGH', type: 'STATIC', deviceId: null },
];

function buildSvc(thresholdData: Threshold[] | null = MOCK_THRESHOLDS) {
  return {
    thresholds: makeSurface<Threshold[]>(thresholdData),
    createThreshold: vi.fn().mockResolvedValue(undefined),
    updateThreshold: vi.fn().mockResolvedValue(undefined),
    deleteThreshold: vi.fn().mockResolvedValue(undefined),
  };
}

function buildProviders(svc = buildSvc()) {
  return [
    provideHttpClient(),
    { provide: DeviceDetailService, useValue: svc },
    { provide: ToastService, useValue: { success: vi.fn().mockResolvedValue(undefined), error: vi.fn().mockResolvedValue(undefined) } },
  ];
}

async function createComp(inputs: Record<string, unknown>, svc = buildSvc()) {
  const result = await render(ThresholdConfigSheetComponent, {
    inputs,
    providers: buildProviders(svc),
  });
  return { ...result, comp: result.fixture.componentInstance, svc };
}

describe('ThresholdConfigSheetComponent', () => {
  describe('activeMetrics', () => {
    it('returns system metrics for RASPBERRY_PI', async () => {
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'PI_4' });
      const metrics = comp['activeMetrics']();
      expect(metrics.map(m => m.metricName)).toEqual(['cpu_usage', 'memory_usage', 'temperature', 'disk_usage']);
    });

    it('returns sensor metrics for ESP32C3_SENSOR', async () => {
      const { comp } = await createComp({ deviceId: 'dev-2', deviceType: 'ESP32C3_SENSOR' });
      const metrics = comp['activeMetrics']();
      expect(metrics.map(m => m.metricName)).toEqual(['sensor_temp', 'battery']);
    });
  });

  describe('inheritance', () => {
    it('marks a metric with its own device row as overridden', async () => {
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'ESP32C3_SENSOR' });
      comp['populateValues']();
      expect(comp['isOverridden']('sensor_temp')).toBe(true);
      expect(comp['displayValue']('sensor_temp')).toBe(24);
    });

    it('inherits the global value when the device has no own row', async () => {
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'ESP32C3_SENSOR' });
      comp['populateValues']();
      expect(comp['isOverridden']('battery')).toBe(false);
      expect(comp['inheritedSource']('battery')).toBe('global');
      expect(comp['displayValue']('battery')).toBe(15);
    });

    it('falls back to the built-in default when no global exists', async () => {
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'ESP32C3_SENSOR' }, buildSvc([]));
      comp['populateValues']();
      expect(comp['inheritedSource']('sensor_temp')).toBe('default');
      expect(comp['displayValue']('sensor_temp')).toBe(8);
    });
  });

  describe('toggleOverride', () => {
    it('turning on seeds the value from the inherited value', async () => {
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'ESP32C3_SENSOR' });
      comp['populateValues']();
      comp['toggleOverride']('battery', true);
      expect(comp['isOverridden']('battery')).toBe(true);
      expect(comp['displayValue']('battery')).toBe(15);
    });
  });

  describe('onSave', () => {
    it('updates the existing device row for an overridden metric', async () => {
      const svc = buildSvc(MOCK_THRESHOLDS);
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'ESP32C3_SENSOR' }, svc);
      comp['populateValues']();
      await comp.onSave();
      expect(svc.updateThreshold).toHaveBeenCalledWith('t1', expect.objectContaining({ metricName: 'sensor_temp' }));
    });

    it('creates a device row when an inherited metric is overridden', async () => {
      const svc = buildSvc(MOCK_THRESHOLDS);
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'ESP32C3_SENSOR' }, svc);
      comp['populateValues']();
      comp['toggleOverride']('battery', true);
      comp['setValue']('battery', 30);
      await comp.onSave();
      expect(svc.createThreshold).toHaveBeenCalledWith(
        expect.objectContaining({ metricName: 'battery', deviceId: 'dev-1', value: 30 }),
      );
    });

    it('deletes the device row when an override is turned off', async () => {
      const svc = buildSvc(MOCK_THRESHOLDS);
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'ESP32C3_SENSOR' }, svc);
      comp['populateValues']();
      comp['toggleOverride']('sensor_temp', false);
      await comp.onSave();
      expect(svc.deleteThreshold).toHaveBeenCalledWith('t1');
    });

    it('emits thresholdsSaved on success', async () => {
      const svc = buildSvc([]);
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'ESP32C3_SENSOR' }, svc);
      const spy = vi.fn();
      comp.thresholdsSaved.subscribe(spy);
      await comp.onSave();
      expect(spy).toHaveBeenCalled();
    });
  });
});
