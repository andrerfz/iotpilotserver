import {
  AfterViewInit, ChangeDetectionStrategy, Component,
  computed, inject, signal, TemplateRef, ViewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  refreshOutline, eyeOutline, reloadOutline, hardwareChipOutline,
  checkmarkCircleOutline, closeCircleOutline, warningOutline,
} from 'ionicons/icons';
import {
  IonContent, IonCard, IonCardContent, IonButton, IonIcon, IonSkeletonText,
  AlertController,
  MetricCardComponent, DataTableComponent, EmptyStateComponent,
  StatusBadgeComponent, DeviceTypeBadgeComponent,
  UiSearchFieldComponent, UiSelectComponent,
  ViewWillEnter,
  IonRefresher,
  IonRefresherContent,
} from '@ng/shared/ui';
import type { ColumnDef, SelectOption } from '@ng/shared/ui';
import { AdminDevicesService, AdminDevice } from '../../services/admin-devices.service';
import { TopbarService } from '../../../../shell/topbar.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';
import { AdminTabsComponent } from '../../components/admin-tabs.component';

addIcons({ refreshOutline, eyeOutline, reloadOutline, hardwareChipOutline, checkmarkCircleOutline, closeCircleOutline, warningOutline });

@Component({
  selector: 'app-admin-devices',
  templateUrl: 'admin-devices.page.html',
  styleUrls: ['admin-devices.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, FormsModule,
    IonContent, IonCard, IonCardContent, IonButton, IonIcon, IonSkeletonText,
    MetricCardComponent, DataTableComponent, EmptyStateComponent,
    StatusBadgeComponent, DeviceTypeBadgeComponent,
    UiSearchFieldComponent, UiSelectComponent,
    AdminTabsComponent,
    IonRefresher, IonRefresherContent,
    TranslatePipe,
  ],
})
export class AdminDevicesPage implements AfterViewInit, ViewWillEnter {
  protected readonly svc = inject(AdminDevicesService);
  private readonly alertCtrl = inject(AlertController);
  private readonly topbar = inject(TopbarService);
  private readonly tenantCtx = inject(TenantContextService);

  protected statusFilter = '';
  protected readonly searchQuery = signal('');
  protected readonly actionLoading = signal(false);

  protected readonly cols = signal<ColumnDef<AdminDevice>[]>([]);

  @ViewChild('statusCell') private statusCellTpl!: TemplateRef<{ $implicit: AdminDevice }>;
  @ViewChild('typeCell')   private typeCellTpl!: TemplateRef<{ $implicit: AdminDevice }>;
  @ViewChild('actionsCell') private actionsCellTpl!: TemplateRef<{ $implicit: AdminDevice }>;

  protected readonly statusOptions: SelectOption[] = [
    { label: 'fields.all_statuses', value: '' },
    { label: 'status.online',       value: 'ONLINE' },
    { label: 'status.offline',      value: 'OFFLINE' },
    { label: 'status.maintenance',  value: 'MAINTENANCE' },
    { label: 'severity.error',        value: 'ERROR' },
  ];

  protected readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.svc.devices();
    return this.svc.devices().filter(d =>
      d.hostname.toLowerCase().includes(q) ||
      d.deviceId.toLowerCase().includes(q) ||
      (d.ipAddress?.toLowerCase().includes(q) ?? false),
    );
  });

  constructor() {
    toObservable(this.tenantCtx.customer)
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => void this.svc.load());
  }

  ionViewWillEnter(): void {
    this.topbar.set('nav.devices');
    void this.svc.load();
  }

  protected onRefresh(ev: Event): void {
    void this.svc.load().finally(() => {
      ((ev as CustomEvent).target as HTMLIonRefresherElement | null)?.complete();
    });
  }

  ngAfterViewInit(): void {
    this.cols.set([
      { key: 'hostname',   label: 'fields.hostname',   sortable: true },
      { key: 'deviceId',   label: 'fields.device_id' },
      { key: 'deviceType', label: 'fields.type',       cellTemplate: this.typeCellTpl },
      { key: 'status',     label: 'fields.status',     cellTemplate: this.statusCellTpl },
      { key: 'ipAddress',  label: 'fields.ip_address' },
      { key: 'lastSeen',   label: 'fields.last_seen',  sortable: true },
      { key: 'alertCount', label: 'fields.alerts',     sortable: true },
      { key: 'actions',    label: '',           cellTemplate: this.actionsCellTpl },
    ]);
  }

  protected onStatusChange(val: string): void {
    void this.svc.load(val || undefined);
  }

  protected formatLastSeen(ts: string | undefined): string {
    if (!ts) return 'Never';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  async onRestart(device: AdminDevice): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Restart Device',
      message: `Restart ${device.hostname}? It may be offline for a few minutes.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Restart', role: 'confirm', handler: () => void this.doCommand(device, 'REBOOT') },
      ],
    });
    await alert.present();
  }

  private async doCommand(device: AdminDevice, command: 'REBOOT' | 'RESTART'): Promise<void> {
    this.actionLoading.set(true);
    try {
      await this.svc.sendCommand(device.id, command);
    } finally {
      this.actionLoading.set(false);
    }
  }
}
