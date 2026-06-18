import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewChild,
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
} from 'ionicons/icons';

import {
  BottomSheetComponent,
  DataTableComponent,
  DevicePickerComponent,
  EmptyStateComponent,
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  MetricCardComponent,
  MultiSelectPickerComponent,
  StatusBadgeComponent,
  StatusDotComponent,
  UiSearchFieldComponent,
  ViewWillEnter,
  IonRefresher,
  IonRefresherContent,
} from '@ng/shared/ui';
import type { ColumnDef, DevicePickerItem, PickerOption } from '@ng/shared/ui';
import type { Device } from '@ng/core/api/generated/models/device';
import { SocketService } from '@ng/core/realtime/socket.service';
import { DashboardService } from '../../services/dashboard.service';
import { applyDeviceFilters } from '../../filters/device-filters';
import { RegisterDeviceSheetComponent } from '../../components/register-device-sheet/register-device-sheet.component';
import { TopbarService } from '../../../../shell/topbar.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';
import { DeviceExportService } from '../../services/device-export.service';

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
});

const STATUS_OPTIONS: PickerOption[] = [
  { value: 'ONLINE', label: 'Online', dot: 'ONLINE' },
  { value: 'OFFLINE', label: 'Offline', dot: 'OFFLINE' },
  { value: 'MAINTENANCE', label: 'Maintenance', dot: 'MAINTENANCE' },
  { value: 'ERROR', label: 'Error', dot: 'ERROR' },
  { value: 'UNCLAIMED', label: 'Unclaimed', dot: 'UNCLAIMED' },
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
    DataTableComponent,
    StatusBadgeComponent,
    StatusDotComponent,
    EmptyStateComponent,
    DevicePickerComponent,
    MultiSelectPickerComponent,
    RegisterDeviceSheetComponent,
    BottomSheetComponent,
    IonRefresher, IonRefresherContent,
  ],
})
export class DevicesPage implements AfterViewInit, ViewWillEnter {
  private readonly dashService = inject(DashboardService);
  private readonly socketService = inject(SocketService);
  private readonly router = inject(Router);
  private readonly topbar = inject(TopbarService);
  private readonly tenantCtx = inject(TenantContextService);
  private readonly exportService = inject(DeviceExportService);

  private readonly exportSheet = viewChild<BottomSheetComponent>('exportSheet');
  readonly devicesLoading = this.dashService.devices.loading;
  readonly devicesError = this.dashService.devices.error;

  protected readonly _deviceRows = signal<Device[]>([]);
  protected readonly _selectedIds = signal<string[]>([]);

  readonly search = signal('');
  readonly statusFilter = signal<string[]>([]);

  readonly filteredDevices = computed(() =>
    applyDeviceFilters(this._deviceRows(), {
      search: this.search(),
      status: this.statusFilter(),
    }),
  );

  readonly devicePickerItems = computed<DevicePickerItem[]>(() =>
    this._deviceRows().map(d => ({
      id: d.id ?? '',
      name: d.hostname ?? d.name ?? d.id ?? '',
      status: d.status ?? 'OFFLINE',
      location: d.location ?? undefined,
    })),
  );

  // KPI counts
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

  readonly selectedCount = computed(() => this._selectedIds().length);
  readonly selectedDevices = computed(() =>
    this._deviceRows().filter(d => this._selectedIds().includes(d.id ?? '')),
  );

  @ViewChild('deviceCell') private deviceCellTpl!: TemplateRef<{ $implicit: Device }>;
  @ViewChild('statusCell') private statusCellTpl!: TemplateRef<{ $implicit: Device }>;

  private readonly registerSheet = viewChild(RegisterDeviceSheetComponent);
  readonly columns = signal<ColumnDef<Device>[]>([]);

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
        .subscribe(() => void this.dashService.devices.load({ limit: 50 }));
  }

  ionViewWillEnter(): void {
    this.topbar.set('Devices', { icon: 'add-outline', handler: () => this.onRegisterDevice() });
    void this.dashService.devices.load({ limit: 50 });
  }

  protected onRefresh(ev: Event): void {
    void this.dashService.devices.load({ limit: 50 }).finally(() => {
      ((ev as CustomEvent).target as HTMLIonRefresherElement | null)?.complete();
    });
  }

  ngAfterViewInit(): void {
    this.columns.set([
      { key: 'hostname', label: 'Device', sortable: true, cellTemplate: this.deviceCellTpl },
      { key: 'status', label: 'Status', sortable: true, cellTemplate: this.statusCellTpl },
      { key: 'location', label: 'Location' },
      { key: 'cpuUsage', label: 'CPU', sortable: true },
      { key: 'memoryUsage', label: 'Memory', sortable: true },
      { key: 'lastSeen', label: 'Last seen' },
    ]);
  }

  onDeviceRowClick(device: Device): void {
    if (device.id) void this.router.navigate(['/app/devices', device.id]);
  }

  onSelectionChange(devices: Device[]): void {
    this._selectedIds.set(devices.map(d => d.id ?? ''));
  }

  onExportSelected(): void {
    this.exportSheet()?.open();
  }

  onExportXlsx(): void {
    void this.exportService.exportXlsx(this.selectedDevices(), 'devices');
  }

  onExportCsv(): void {
    this.exportService.exportCsv(this.selectedDevices(), 'devices');
  }

  onRegisterDevice(): void {
    this.registerSheet()?.open();
  }

  onDeviceClaimed(): void {
    void this.dashService.devices.load({ limit: 50 });
  }

  onRetry(): void {
    void this.dashService.devices.load({ limit: 50 });
  }

  readonly statusOptions = STATUS_OPTIONS;
}
