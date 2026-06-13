import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { render } from '@testing-library/angular';
import { CommandSheetComponent } from './command-sheet.component';
import { BottomSheetComponent } from '@ng/shared/ui';
import { DeviceDetailService } from '../../services/device-detail.service';
import { ToastService } from '@ng/core/errors/toast.service';
import type { DeviceCommand } from '@ng/core/api/generated/models/device-command';

function makeSurface<T>(data: T | null = null) {
  return {
    data: signal(data),
    loading: signal(false),
    error: signal(null),
    load: vi.fn().mockResolvedValue(data),
    reload: vi.fn().mockResolvedValue(data),
  };
}

const MOCK_COMMAND: DeviceCommand = {
  id: 'cmd-1',
  command: 'REBOOT',
  status: 'COMPLETED',
  createdAt: '2026-06-13T10:00:00Z',
  executedAt: '2026-06-13T10:00:05Z',
  exitCode: 0,
  output: 'System rebooting...',
};

function buildProviders(sendCommand = vi.fn().mockResolvedValue(MOCK_COMMAND)) {
  return [
    provideHttpClient(),
    {
      provide: DeviceDetailService,
      useValue: {
        device: makeSurface(null),
        deviceCommands: makeSurface<DeviceCommand[]>([]),
        deviceAlerts: makeSurface(null),
        deviceLogs: makeSurface(null),
        thresholds: makeSurface(null),
        sendCommand,
      },
    },
    {
      provide: ToastService,
      useValue: { success: vi.fn().mockResolvedValue(undefined), error: vi.fn().mockResolvedValue(undefined) },
    },
  ];
}

async function renderSheet(inputs: { deviceId: string } = { deviceId: 'dev-1' }) {
  return render(CommandSheetComponent, {
    inputs,
    providers: buildProviders(),
  });
}

describe('CommandSheetComponent', () => {
  beforeEach(() => {
    vi.spyOn(BottomSheetComponent.prototype, 'open').mockImplementation(() => {});
  });

  describe('openForIssue()', () => {
    it('sets mode to issue', async () => {
      const { fixture } = await renderSheet();
      const comp = fixture.componentInstance;
      comp.mode.set('detail');
      comp.openForIssue();
      expect(comp.mode()).toBe('issue');
    });

    it('resets commandType to REBOOT', async () => {
      const { fixture } = await renderSheet();
      const comp = fixture.componentInstance;
      comp.commandType.set('CUSTOM');
      comp.openForIssue();
      expect(comp.commandType()).toBe('REBOOT');
    });

    it('clears args', async () => {
      const { fixture } = await renderSheet();
      const comp = fixture.componentInstance;
      comp.args.set('some args');
      comp.openForIssue();
      expect(comp.args()).toBe('');
    });
  });

  describe('openForDetail()', () => {
    it('sets mode to detail', async () => {
      const { fixture } = await renderSheet();
      const comp = fixture.componentInstance;
      comp.openForDetail(MOCK_COMMAND);
      expect(comp.mode()).toBe('detail');
    });

    it('stores the selected command', async () => {
      const { fixture } = await renderSheet();
      const comp = fixture.componentInstance;
      comp.openForDetail(MOCK_COMMAND);
      expect(comp.selectedCommand()).toEqual(MOCK_COMMAND);
    });
  });

  describe('computed properties', () => {
    it('sheetTitle is "Issue Command" in issue mode', async () => {
      const { fixture } = await renderSheet();
      const comp = fixture.componentInstance;
      comp.mode.set('issue');
      expect(comp.sheetTitle()).toBe('Issue Command');
    });

    it('sheetTitle is "Command Details" in detail mode', async () => {
      const { fixture } = await renderSheet();
      const comp = fixture.componentInstance;
      comp.mode.set('detail');
      expect(comp.sheetTitle()).toBe('Command Details');
    });

    it('sheetSaveLabel is "Run" in issue mode', async () => {
      const { fixture } = await renderSheet();
      const comp = fixture.componentInstance;
      comp.mode.set('issue');
      expect(comp.sheetSaveLabel()).toBe('Run');
    });

    it('sheetSaveLabel is "Close" in detail mode', async () => {
      const { fixture } = await renderSheet();
      const comp = fixture.componentInstance;
      comp.mode.set('detail');
      expect(comp.sheetSaveLabel()).toBe('Close');
    });

    it('showArgs is true only when commandType is CUSTOM', async () => {
      const { fixture } = await renderSheet();
      const comp = fixture.componentInstance;
      comp.commandType.set('REBOOT');
      expect(comp.showArgs()).toBe(false);
      comp.commandType.set('CUSTOM');
      expect(comp.showArgs()).toBe(true);
    });
  });

  describe('onSave() — issue mode', () => {
    it('dispatches sendCommand with correct type', async () => {
      const sendCommand = vi.fn().mockResolvedValue(MOCK_COMMAND);
      const { fixture } = await render(CommandSheetComponent, {
        inputs: { deviceId: 'dev-1' },
        providers: buildProviders(sendCommand),
      });
      const comp = fixture.componentInstance;
      comp.mode.set('issue');
      comp.commandType.set('REBOOT');
      comp.onSave();
      expect(sendCommand).toHaveBeenCalledWith('dev-1', 'REBOOT', undefined);
    });

    it('passes args to sendCommand for CUSTOM commands', async () => {
      const sendCommand = vi.fn().mockResolvedValue(MOCK_COMMAND);
      const { fixture } = await render(CommandSheetComponent, {
        inputs: { deviceId: 'dev-1' },
        providers: buildProviders(sendCommand),
      });
      const comp = fixture.componentInstance;
      comp.mode.set('issue');
      comp.commandType.set('CUSTOM');
      comp.args.set('ls -la /tmp');
      comp.onSave();
      expect(sendCommand).toHaveBeenCalledWith('dev-1', 'CUSTOM', 'ls -la /tmp');
    });

    it('emits commandIssued on successful dispatch', async () => {
      const sendCommand = vi.fn().mockResolvedValue(MOCK_COMMAND);
      const { fixture } = await render(CommandSheetComponent, {
        inputs: { deviceId: 'dev-1' },
        providers: buildProviders(sendCommand),
      });
      const comp = fixture.componentInstance;
      const emitted: DeviceCommand[] = [];
      comp.commandIssued.subscribe(c => emitted.push(c));
      comp.mode.set('issue');
      comp.commandType.set('REBOOT');
      comp.onSave();
      await new Promise(r => setTimeout(r, 10));
      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toEqual(MOCK_COMMAND);
    });
  });

  describe('onSave() — detail mode', () => {
    it('does not call sendCommand', async () => {
      const sendCommand = vi.fn();
      const { fixture } = await render(CommandSheetComponent, {
        inputs: { deviceId: 'dev-1' },
        providers: buildProviders(sendCommand),
      });
      const comp = fixture.componentInstance;
      comp.mode.set('detail');
      comp.onSave();
      expect(sendCommand).not.toHaveBeenCalled();
    });
  });
});
