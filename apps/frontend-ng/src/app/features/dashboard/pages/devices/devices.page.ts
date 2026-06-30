import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  addOutline,
  downloadOutline,
  documentOutline,
  codeOutline,
  hardwareChipOutline,
  wifiOutline,
  alertCircleOutline,
  constructOutline,
  checkmarkCircleOutline,
  qrCodeOutline,
  bluetoothOutline,
  globeOutline,
} from 'ionicons/icons';

import {
  BottomSheetComponent,
  DevicePickerComponent,
  EmptyStateComponent,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  MetricCardComponent,
  MetricGridComponent,
  MultiSelectPickerComponent,
  StatusDotComponent,
  SwipeListComponent,
  UiListRowComponent,
  UiSearchFieldComponent,
  ViewWillEnter,
  IonRefresher,
  IonRefresherContent,
} from '@ng/shared/ui';
import type { DevicePickerItem, PickerOption, SwipeAction } from '@ng/shared/ui';
import type { Device } from '@ng/core/api/generated/models/device';
import { TranslatePipe } from '@ngx-translate/core';
import { SocketService } from '@ng/core/realtime/socket.service';
import { DashboardService } from '../../services/dashboard.service';
import { applyDeviceFilters } from '../../filters/device-filters';
import { RegisterDeviceSheetComponent } from '../../components/register-device-sheet/register-device-sheet.component';
import { BleClaimSheetComponent } from '../../components/ble-claim-sheet/ble-claim-sheet.component';
import { TopbarService } from '../../../../shell/topbar.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';
import { DeviceExportService } from '../../services/device-export.service';
import { AuthService } from '@ng/core/auth/auth.service';
import { hasRole } from '@ng/core/auth/roles';
import { AdminDevicesService } from '../../../admin/services/admin-devices.service';
import type { AdminDevice } from '../../../admin/services/admin-devices.service';

addIcons({
  addOutline,
  downloadOutline,
  documentOutline,
  codeOutline,
  hardwareChipOutline,
  wifiOutline,
  alertCircleOutline,
  constructOutline,
  checkmarkCircleOutline,
  qrCodeOutline,
  bluetoothOutline,
  globeOutline,
});

const STATUS_OPTIONS: PickerOption[] = [
  { value: 'ONLINE', label: 'status.online', dot: 'ONLINE' },
  { value: 'OFFLINE', label: 'status.offline', dot: 'OFFLINE' },
  { value: 'MAINTENANCE', label: 'status.maintenance', dot: 'MAINTENANCE' },
  { value: 'ERROR', label: 'severity.error', dot: 'ERROR' },
  { value: 'UNCLAIMED', label: 'status.unclaimed', dot: 'UNCLAIMED' },
];

@Component({
  selector: 'app-devices',
  templateUrl: 'devices.page.html',
  styleUrls: ['devices.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
    UiSearchFieldComponent,
    MetricCardComponent,
    MetricGridComponent,
    SwipeListComponent,
    UiListRowComponent,
    StatusDotComponent,
    EmptyStateComponent,
    DevicePickerComponent,
    MultiSelectPickerComponent,
    RegisterDeviceSheetComponent,
    BleClaimSheetComponent,
    BottomSheetComponent,
    IonRefresher, IonRefresherContent,
    TranslatePipe,
  ],
})
export class DevicesPage implements ViewWillEnter {
  private readonly dashService = inject(DashboardService);
  private readonly socketService = inject(SocketService);
  private readonly router = inject(Router);
  private readonly topbar = inject(TopbarService);
  private readonly tenantCtx = inject(TenantContextService);
  private readonly exportService = inject(DeviceExportService);
  private readonly auth = inject(AuthService);
  readonly adminSvc = inject(AdminDevicesService);

  private readonly exportSheet = viewChild<BottomSheetComponent>('exportSheet');
  readonly devicesLoading = this.dashService.devices.loading;
  readonly devicesError = this.dashService.devices.error;

  protected readonly _deviceRows = signal<Device[]>([]);

  readonly search = signal('');
  readonly statusFilter = signal<string[]>([]);
  readonly platformSearch = signal('');

  /** True when SUPERADMIN has no active tenant — shows cross-tenant admin view. */
  readonly platformMode = computed(
    () => hasRole(this.auth.role(), 'SUPERADMIN') && !this.tenantCtx.isActive(),
  );

  readonly filteredDevices = computed(() =>
    applyDeviceFilters(this._deviceRows(), {
      search: this.search(),
      status: this.statusFilter(),
    }),
  );

  readonly platformFiltered = computed(() => {
    const q = this.platformSearch().toLowerCase();
    const rows = this.adminSvc.devices();
    if (!q) return rows;
    return rows.filter(d =>
      d.hostname.toLowerCase().includes(q) ||
      d.deviceId.toLowerCase().includes(q) ||
      (d.ipAddress?.toLowerCase().includes(q) ?? false),
    );
  });

  readonly devicePickerItems = computed<DevicePickerItem[]>(() =>
    this._deviceRows().map(d => ({
      id: d.id ?? '',
      name: d.hostname ?? d.name ?? d.id ?? '',
      status: d.status ?? 'OFFLINE',
      location: d.location ?? undefined,
    })),
  );

  // Tenant mode KPI counts
  readonly onlineCount = computed(() =>
    this._deviceRows().filter(d => d.status === 'ONLINE').length,
  );
  readonly offlineErrorCount = computed(() =>
    this._deviceRows().filter(d => d.status === 'OFFLINE' || d.status === 'ERROR').length,
  );
  readonly maintenanceCount = computed(() =>
    this._deviceRows().filter(d => d.status === 'MAINTENANCE' || d.status === 'UNCLAIMED').length,
  );
  readonly firmwareCurrentCount = computed(() =>
    this._deviceRows().filter(d => d.status === 'ONLINE' && !!(d as { firmwareVersion?: string }).firmwareVersion).length,
  );
  readonly totalCount = computed(() => this._deviceRows().length);

  readonly deviceRowActions: SwipeAction<Device>[] = [];
  readonly platformRowActions: SwipeAction<AdminDevice>[] = [];

  private readonly registerSheet = viewChild(RegisterDeviceSheetComponent);
  private readonly bleClaimSheet = viewChild(BleClaimSheetComponent);
  private readonly addSheet = viewChild<BottomSheetComponent>('addSheet');

  /** Web Bluetooth present (desktop Chrome/Edge / Electron) → offer the BLE option. */
  protected readonly bleAvailable = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  /** Which add-flow the operator picked; opened after the chooser dismisses. */
  private readonly pendingAdd = signal<'manual' | 'ble' | null>(null);

  constructor() {
    effect(() => {
      const d = this.dashService.devices.data();
      if (d !== null) this._deviceRows.set(d);
    });

    this.socketService
      .on<{ deviceId: string; update: Partial<Device> }>('device:update')
      .pipe(takeUntilDestroyed())
      .subscribe(ev => {
        this._deviceRows.update(rows =>
          rows.map(r => r.id === ev.deviceId ? { ...r, ...ev.update } : r),
        );
      });

    toObservable(this.tenantCtx.customer)
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => {
        if (this.platformMode()) {
          void this.adminSvc.load();
        } else {
          void this.dashService.devices.load({ limit: 50 });
        }
      });
  }

  ionViewWillEnter(): void {
    if (this.platformMode()) {
      this.topbar.set('nav.devices');
      void this.adminSvc.load();
    } else {
      this.topbar.set(
        'nav.devices',
        { icon: 'add-outline', handler: () => this.onRegisterDevice() },
        [{ icon: 'download-outline', label: 'devices.export', handler: () => this.exportSheet()?.open() }],
      );
      void this.dashService.devices.load({ limit: 50 });
    }
  }

  protected onRefresh(ev: Event): void {
    const done = () => ((ev as CustomEvent).target as HTMLIonRefresherElement | null)?.complete();
    if (this.platformMode()) {
      void this.adminSvc.load().finally(done);
    } else {
      void this.dashService.devices.load({ limit: 50 }).finally(done);
    }
  }

  onDeviceRowClick(device: Device): void {
    if (device.id) void this.router.navigate(['/app/devices', device.id]);
  }

  onPlatformRowClick(device: AdminDevice): void {
    void this.router.navigate(['/app/devices', device.id]);
  }

  onExportXlsx(): void {
    void this.exportService.exportXlsx(this.filteredDevices(), 'devices');
  }

  onExportCsv(): void {
    this.exportService.exportCsv(this.filteredDevices(), 'devices');
  }

  onExportPdf(): void {
    void this.exportService.exportPdf(this.filteredDevices(), 'devices');
  }

  onRegisterDevice(): void {
    this.pendingAdd.set(null);
    this.addSheet()?.open();
  }

  protected chooseManual(): void {
    this.pendingAdd.set('manual');
    this.addSheet()?.close();
  }

  protected chooseBle(): void {
    this.pendingAdd.set('ble');
    this.addSheet()?.close();
  }

  /** After the chooser dismisses, open the picked flow (avoids stacked modals). */
  protected onAddSheetDismiss(): void {
    const choice = this.pendingAdd();
    this.pendingAdd.set(null);
    if (choice === 'manual') this.registerSheet()?.open();
    else if (choice === 'ble') void this.bleClaimSheet()?.open();
  }

  onDeviceClaimed(): void {
    void this.dashService.devices.load({ limit: 50 });
  }

  onRetry(): void {
    void this.dashService.devices.load({ limit: 50 });
  }

  readonly statusOptions = STATUS_OPTIONS;
}
