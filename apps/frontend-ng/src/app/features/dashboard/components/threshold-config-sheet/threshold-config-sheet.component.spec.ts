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

const MOCK_THRESHOLDS: Threshold[] = [
  { id: 't1', metricName: 'cpu_usage', value: 80, unit: '%', operator: 'GREATER_THAN', severity: 'HIGH', type: 'STATIC', deviceId: 'dev-1' },
  { id: 't2', metricName: 'memory_usage', value: 90, unit: '%', operator: 'GREATER_THAN', severity: 'HIGH', type: 'STATIC', deviceId: null },
];

function buildSvc(thresholdData: Threshold[] | null = MOCK_THRESHOLDS) {
  return {
    thresholds: makeSurface<Threshold[]>(thresholdData),
    createThreshold: vi.fn().mockResolvedValue(undefined),
    updateThreshold: vi.fn().mockResolvedValue(undefined),
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
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'RASPBERRY_PI' });
      const metrics = comp['activeMetrics']();
      expect(metrics.map(m => m.metricName)).toContain('cpu_usage');
      expect(metrics.map(m => m.metricName)).toContain('memory_usage');
      expect(metrics.map(m => m.metricName)).toContain('temperature');
      expect(metrics.map(m => m.metricName)).toContain('disk_usage');
    });

    it('returns sensor metrics for ESP32C3_SENSOR', async () => {
      const { comp } = await createComp({ deviceId: 'dev-2', deviceType: 'ESP32C3_SENSOR' });
      const metrics = comp['activeMetrics']();
      expect(metrics.map(m => m.metricName)).toContain('sensor_temp');
      expect(metrics.map(m => m.metricName)).toContain('battery');
      expect(metrics.map(m => m.metricName)).not.toContain('cpu_usage');
    });

    it('falls back to system metrics when deviceType is undefined', async () => {
      const { comp } = await createComp({ deviceId: 'dev-3' });
      const metrics = comp['activeMetrics']();
      expect(metrics.map(m => m.metricName)).toContain('cpu_usage');
    });
  });

  describe('scope', () => {
    it('defaults to device scope', async () => {
      const { comp } = await createComp({ deviceId: 'dev-1' });
      expect(comp['scope']()).toBe('device');
    });

    it('switches scope on onScopeChange', async () => {
      const { comp } = await createComp({ deviceId: 'dev-1' });
      comp.onScopeChange('global');
      expect(comp['scope']()).toBe('global');
    });

    it('filters scopedThresholds for device scope', async () => {
      const { comp } = await createComp({ deviceId: 'dev-1' }, buildSvc(MOCK_THRESHOLDS));
      comp['scope'].set('device');
      const filtered = comp['scopedThresholds']();
      expect(filtered.every(t => t.deviceId === 'dev-1')).toBe(true);
    });

    it('filters scopedThresholds for global scope', async () => {
      const { comp } = await createComp({ deviceId: 'dev-1' }, buildSvc(MOCK_THRESHOLDS));
      comp['scope'].set('global');
      const filtered = comp['scopedThresholds']();
      expect(filtered.every(t => t.deviceId == null)).toBe(true);
    });
  });

  describe('getValue', () => {
    it('returns defaultValue when no existing threshold', async () => {
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'RASPBERRY_PI' }, buildSvc([]));
      expect(comp['getValue']('cpu_usage')).toBe(80);
      expect(comp['getValue']('temperature')).toBe(70);
    });

    it('returns loaded threshold value after populateValues', async () => {
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'RASPBERRY_PI' }, buildSvc(MOCK_THRESHOLDS));
      comp['populateValues']();
      expect(comp['getValue']('cpu_usage')).toBe(80);
    });
  });

  describe('setValue', () => {
    it('updates values signal with numeric input', async () => {
      const { comp } = await createComp({ deviceId: 'dev-1' });
      comp['setValue']('cpu_usage', 75);
      expect(comp['getValue']('cpu_usage')).toBe(75);
    });

    it('handles range object input by taking lower value', async () => {
      const { comp } = await createComp({ deviceId: 'dev-1' });
      comp['setValue']('cpu_usage', { lower: 60, upper: 90 });
      expect(comp['getValue']('cpu_usage')).toBe(60);
    });
  });

  describe('onSave', () => {
    it('calls createThreshold for all metrics when no existing thresholds', async () => {
      const svc = buildSvc([]);
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'RASPBERRY_PI' }, svc);
      await comp.onSave();
      expect(svc.createThreshold).toHaveBeenCalledTimes(4);
      expect(svc.createThreshold).toHaveBeenCalledWith(
        expect.objectContaining({ metricName: 'cpu_usage', deviceId: 'dev-1' }),
      );
    });

    it('calls updateThreshold for existing matching threshold', async () => {
      const svc = buildSvc(MOCK_THRESHOLDS);
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'RASPBERRY_PI' }, svc);
      comp['scope'].set('device');
      comp['populateValues']();
      await comp.onSave();
      expect(svc.updateThreshold).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ metricName: 'cpu_usage' }),
      );
    });

    it('passes null deviceId for global scope', async () => {
      const svc = buildSvc([]);
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'RASPBERRY_PI' }, svc);
      comp['scope'].set('global');
      await comp.onSave();
      expect(svc.createThreshold).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: null }),
      );
    });

    it('emits thresholdsSaved on success', async () => {
      const svc = buildSvc([]);
      const { comp } = await createComp({ deviceId: 'dev-1', deviceType: 'RASPBERRY_PI' }, svc);
      const spy = vi.fn();
      comp.thresholdsSaved.subscribe(spy);
      await comp.onSave();
      expect(spy).toHaveBeenCalled();
    });
  });
});
