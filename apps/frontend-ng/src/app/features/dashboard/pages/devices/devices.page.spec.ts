import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { DevicesPage } from './devices.page';
import { DashboardService } from '../../services/dashboard.service';
import { provideBle } from '@ng/core/ble/ble.providers';
import { SocketService } from '@ng/core/realtime/socket.service';
import { AuthService } from '@ng/core/auth/auth.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';
import { AdminDevicesService } from '../../../admin/services/admin-devices.service';
import type { Device } from '@ng/core/api/generated/models/device';

function makeSurface<T>(data: T | null = null) {
  return {
    data: signal(data),
    loading: signal(false),
    error: signal(null),
    load: vi.fn().mockResolvedValue(data),
    reload: vi.fn().mockResolvedValue(data),
  };
}

const MOCK_DEVICES: Device[] = [
  { id: 'dev-1', hostname: 'pi-kitchen', status: 'ONLINE', deviceType: 'RaspberryPi', location: 'Kitchen' },
  { id: 'dev-2', hostname: 'pi-garage', status: 'OFFLINE', deviceType: 'RaspberryPi' },
  { id: 'dev-3', hostname: 'pi-lab', status: 'ERROR', deviceType: 'RaspberryPi' },
];

function makeAdminSvc(devices = []) {
  return {
    devices: signal(devices),
    stats: signal({ total: 0, online: 0, offline: 0, maintenance: 0, error: 0 }),
    loading: signal(false),
    error: signal(null),
    load: vi.fn().mockResolvedValue(undefined),
    sendCommand: vi.fn().mockResolvedValue(undefined),
  };
}

function buildProviders(overrides: {
  devices?: ReturnType<typeof makeSurface<Device[]>>;
  socketOn?: ReturnType<typeof vi.fn>;
  role?: string;
  isActive?: boolean;
} = {}) {
  const socketOn = overrides.socketOn ?? vi.fn().mockReturnValue(new Subject());
  return [
    {
      provide: DashboardService,
      useValue: {
        devices: overrides.devices ?? makeSurface<Device[]>(MOCK_DEVICES),
        alerts: makeSurface(null),
        monitoringMetrics: makeSurface(null),
      },
    },
    { provide: SocketService, useValue: { on: socketOn } },
    { provide: AuthService, useValue: { role: () => overrides.role ?? 'ADMIN' } },
    { provide: TenantContextService, useValue: { isActive: () => overrides.isActive ?? true, customer: signal(null) } },
    { provide: AdminDevicesService, useValue: makeAdminSvc() },
    provideBle(),
  ];
}

describe('DevicesPage', () => {
  describe('loading state', () => {
    it('renders skeleton elements when loading', async () => {
      const devices = makeSurface<Device[]>(null);
      devices.loading.set(true);
      const { container } = await render(DevicesPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ devices }),
      });
      expect(container.querySelectorAll('.sk').length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('shows empty-state with retry on device load error', async () => {
      const devices = makeSurface<Device[]>(null);
      (devices.error as ReturnType<typeof signal>).set({ message: 'Network failure' });
      await render(DevicesPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ devices }),
      });
      expect(screen.getByText(/Failed to load devices/i)).toBeTruthy();
    });
  });

  describe('ionViewWillEnter', () => {
    it('loads devices with limit 50 when view enters (tenant mode)', async () => {
      const devices = makeSurface<Device[]>(MOCK_DEVICES);
      const { fixture } = await render(DevicesPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ devices }),
      });
      devices.load.mockClear();
      fixture.componentInstance.ionViewWillEnter();
      expect(devices.load).toHaveBeenCalledWith({ limit: 50 });
    });
  });

  describe('KPI counts', () => {
    it('computes online, offline/error, maintenance counts correctly', async () => {
      const { fixture } = await render(DevicesPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      const comp = fixture.componentInstance;
      expect(comp.onlineCount()).toBe(1);
      expect(comp.offlineErrorCount()).toBe(2);
      expect(comp.maintenanceCount()).toBe(0);
    });
  });

  describe('search filter', () => {
    it('filters rows by hostname on search input', async () => {
      const { fixture } = await render(DevicesPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      fixture.componentInstance.search.set('kitchen');
      fixture.detectChanges();
      expect(fixture.componentInstance.filteredDevices().length).toBe(1);
      expect(fixture.componentInstance.filteredDevices()[0].hostname).toBe('pi-kitchen');
    });

    it('returns all rows when search is empty', async () => {
      const { fixture } = await render(DevicesPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      fixture.componentInstance.search.set('');
      fixture.detectChanges();
      expect(fixture.componentInstance.filteredDevices().length).toBe(3);
    });
  });

  describe('status filter', () => {
    it('filters rows by status', async () => {
      const { fixture } = await render(DevicesPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      fixture.componentInstance.statusFilter.set(['ONLINE']);
      fixture.detectChanges();
      expect(fixture.componentInstance.filteredDevices().every(d => d.status === 'ONLINE')).toBe(true);
    });
  });

  describe('device row click', () => {
    it('navigates to /app/devices/{id} on row click', async () => {
      const { fixture } = await render(DevicesPage, {
        imports: [RouterTestingModule],
        providers: buildProviders(),
      });
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      fixture.componentInstance.onDeviceRowClick({ id: 'dev-1', hostname: 'pi-kitchen', status: 'ONLINE' });
      expect(navigateSpy).toHaveBeenCalledWith(['/app/devices', 'dev-1']);
    });
  });

  describe('real-time updates', () => {
    it('patches device row on device:update socket event', async () => {
      const socketSubject = new Subject<{ deviceId: string; update: Partial<Device> }>();
      const socketOn = vi.fn().mockReturnValue(socketSubject.asObservable());

      const { fixture } = await render(DevicesPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ socketOn }),
      });

      socketSubject.next({ deviceId: 'dev-1', update: { status: 'OFFLINE' } });
      fixture.detectChanges();

      const updated = fixture.componentInstance['_deviceRows']().find(d => d.id === 'dev-1');
      expect(updated?.status).toBe('OFFLINE');
    });
  });

  describe('scope-aware mode', () => {
    it('platformMode is false for a regular ADMIN with active tenant', async () => {
      const { fixture } = await render(DevicesPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ role: 'ADMIN', isActive: true }),
      });
      expect(fixture.componentInstance.platformMode()).toBe(false);
    });

    it('platformMode is true for SUPERADMIN without active tenant (platform mode)', async () => {
      const { fixture } = await render(DevicesPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ role: 'SUPERADMIN', isActive: false }),
      });
      expect(fixture.componentInstance.platformMode()).toBe(true);
    });

    it('platformMode is false for SUPERADMIN acting as a tenant (isActive)', async () => {
      const { fixture } = await render(DevicesPage, {
        imports: [RouterTestingModule],
        providers: buildProviders({ role: 'SUPERADMIN', isActive: true }),
      });
      expect(fixture.componentInstance.platformMode()).toBe(false);
    });

    it('in platform mode, ionViewWillEnter calls adminSvc.load (not dashService.devices.load)', async () => {
      const devices = makeSurface<Device[]>(MOCK_DEVICES);
      const adminSvc = makeAdminSvc();
      const { fixture } = await render(DevicesPage, {
        imports: [RouterTestingModule],
        providers: [
          { provide: DashboardService, useValue: { devices, alerts: makeSurface(null), monitoringMetrics: makeSurface(null) } },
          { provide: SocketService, useValue: { on: vi.fn().mockReturnValue(new Subject()) } },
          { provide: AuthService, useValue: { role: () => 'SUPERADMIN' } },
          { provide: TenantContextService, useValue: { isActive: () => false, customer: signal(null) } },
          { provide: AdminDevicesService, useValue: adminSvc },
          provideBle(),
        ],
      });
      devices.load.mockClear();
      adminSvc.load.mockClear();
      fixture.componentInstance.ionViewWillEnter();
      expect(adminSvc.load).toHaveBeenCalledTimes(1);
      expect(devices.load).not.toHaveBeenCalled();
    });
  });
});
