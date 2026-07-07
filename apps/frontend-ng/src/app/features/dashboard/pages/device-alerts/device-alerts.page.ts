import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TopbarService } from '@ng/shell/topbar.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { addIcons } from 'ionicons';
import { refreshOutline, settingsOutline, trashOutline } from 'ionicons/icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  AlertTrendChartComponent,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonSkeletonText,
  IonText,
  DataTableComponent,
  SwipeListComponent,
  EmptyStateComponent,
  MetricCardComponent,
  MetricGridComponent,
  MultiSelectPickerComponent,
  SeverityBadgeComponent,
  StatusBadgeComponent,
} from '@ng/shared/ui';
import type { ColumnDef, PickerOption, SwipeAction } from '@ng/shared/ui';
import { ViewportService } from '@ng/core/layout/viewport.service';
import type { Alert } from '@ng/core/api/generated/models/alert';
import { AlertsStream } from '@ng/core/realtime/alerts.stream';
import { DeviceDetailService } from '../../services/device-detail.service';
import { DashboardService } from '../../services/dashboard.service';
import { ToastService } from '@ng/core/errors/toast.service';
import { ThresholdConfigSheetComponent } from '../../components/threshold-config-sheet/threshold-config-sheet.component';
import { AlertDetailSheetComponent } from '../../components/alert-detail-sheet/alert-detail-sheet.component';

addIcons({ refreshOutline, settingsOutline, trashOutline });

type AlertState = 'OPEN' | 'ACK' | 'RESOLVED';

function alertState(a: Alert): AlertState {
  if (a.resolved) return 'RESOLVED';
  if (a.acknowledgedAt) return 'ACK';
  return 'OPEN';
}

const SEVERITY_OPTIONS: PickerOption[] = [
  { value: 'CRITICAL', label: 'severity.critical', severity: 'CRITICAL' },
  { value: 'ERROR', label: 'severity.error', severity: 'ERROR' },
  { value: 'WARNING', label: 'severity.warning', severity: 'WARNING' },
  { value: 'INFO', label: 'severity.info', severity: 'INFO' },
];

const STATE_OPTIONS: PickerOption[] = [
  { value: 'OPEN', label: 'status.open' },
  { value: 'ACK', label: 'status.acknowledged' },
  { value: 'RESOLVED', label: 'status.resolved' },
];

@Component({
  selector: 'app-device-alerts',
  templateUrl: 'device-alerts.page.html',
  styleUrls: ['device-alerts.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertTrendChartComponent,
    TranslatePipe,
    IonContent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonButton,
    IonIcon,
    IonSkeletonText,
    IonText,
    DataTableComponent,
    EmptyStateComponent,
    MetricCardComponent,
    MetricGridComponent,
    MultiSelectPickerComponent,
    SeverityBadgeComponent,
    StatusBadgeComponent,
    ThresholdConfigSheetComponent,
    AlertDetailSheetComponent,
    SwipeListComponent,
  ],
})
export class DeviceAlertsPage implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly topbar = inject(TopbarService);
  protected readonly svc = inject(DeviceDetailService);
  private readonly dashSvc = inject(DashboardService);
  private readonly alertsStream = inject(AlertsStream);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly t = inject(TranslateService);
  protected readonly vp = inject(ViewportService);
  private readonly thresholdSheet = viewChild(ThresholdConfigSheetComponent);

  protected readonly deviceId = signal('');

  // Swipe actions for the mobile list (desktop uses the inline action column).
  protected readonly alertActions: SwipeAction<Alert>[] = [
    { key: 'ack', label: 'alerts.acknowledge', color: 'warning', show: (a) => !a.resolved && !a.acknowledgedAt },
    { key: 'resolve', label: 'alerts.resolve', color: 'success', show: (a) => !a.resolved },
    { key: 'delete', label: 'common.delete', icon: 'trash-outline', color: 'danger' },
  ];

  onSwipeAction(ev: { key: string; item: Alert }): void {
    if (ev.key === 'ack') void this.onAcknowledge(ev.item);
    else if (ev.key === 'resolve') void this.onResolve(ev.item);
    else if (ev.key === 'delete') void this.onDeleteAlert(ev.item);
  }

  readonly alerts = this.svc.deviceAlerts;
  readonly trend = this.dashSvc.alertsTrend;

  readonly localAlerts = signal<Alert[]>([]);
  readonly selectedAlerts = signal<Alert[]>([]);
  readonly actionLoading = signal<string | null>(null);

  readonly severityFilter = signal<string[]>([]);
  readonly stateFilter = signal<string[]>([]);

  readonly severityOptions = SEVERITY_OPTIONS;
  readonly stateOptions = STATE_OPTIONS;

  readonly openCount = computed(
    () => this.localAlerts().filter(a => alertState(a) === 'OPEN').length,
  );
  readonly ackCount = computed(
    () => this.localAlerts().filter(a => alertState(a) === 'ACK').length,
  );
  readonly resolvedCount = computed(
    () => this.localAlerts().filter(a => alertState(a) === 'RESOLVED').length,
  );

  readonly filteredAlerts = computed(() => {
    let list = this.localAlerts();
    if (this.severityFilter().length) {
      list = list.filter(a => this.severityFilter().includes(a.severity ?? ''));
    }
    if (this.stateFilter().length) {
      list = list.filter(a => this.stateFilter().includes(alertState(a)));
    }
    return list;
  });

  readonly hasFilters = computed(
    () => this.severityFilter().length > 0 || this.stateFilter().length > 0,
  );

  @ViewChild('severityCell') private severityCellTpl!: TemplateRef<{ $implicit: Alert }>;
  @ViewChild('titleCell') private titleCellTpl!: TemplateRef<{ $implicit: Alert }>;
  @ViewChild('stateCell') private stateCellTpl!: TemplateRef<{ $implicit: Alert }>;
  @ViewChild('triggeredCell') private triggeredCellTpl!: TemplateRef<{ $implicit: Alert }>;
  @ViewChild('actionsCell') private actionsCellTpl!: TemplateRef<{ $implicit: Alert }>;
  @ViewChild('detailSheet') private detailSheet?: AlertDetailSheetComponent;

  openDetail(alert: Alert): void {
    this.detailSheet?.open(alert);
  }
  readonly columns = signal<ColumnDef<Alert>[]>([]);

  constructor() {
    const id = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.deviceId.set(id);

    toObservable(this.svc.deviceAlerts.data)
      .pipe(filter(Boolean), takeUntilDestroyed())
      .subscribe(data => this.localAlerts.set(data));

    this.alertsStream.alerts$
      .pipe(
        filter(a => a.deviceId === this.deviceId()),
        takeUntilDestroyed(),
      )
      .subscribe(a => this.localAlerts.update(list => [a, ...list]));
  }

  ngOnInit(): void {
    this.topbar.set('topbar.alerts');
    void this.svc.deviceAlerts.load({ id: this.deviceId() });
    void this.dashSvc.alertsTrend.load({ deviceId: this.deviceId(), period: '7d' });
  }

  ngAfterViewInit(): void {
    this.columns.set([
      { key: 'severity', label: 'fields.severity', sortable: true, cellTemplate: this.severityCellTpl },
      { key: 'title', label: 'fields.alert', cellTemplate: this.titleCellTpl },
      { key: 'type', label: 'fields.type' },
      { key: 'resolved', label: 'fields.state', cellTemplate: this.stateCellTpl },
      { key: 'createdAt', label: 'fields.triggered', cellTemplate: this.triggeredCellTpl },
      { key: 'id', label: '', cellTemplate: this.actionsCellTpl },
    ]);
  }

  onRefresh(): void {
    void this.svc.deviceAlerts.load({ id: this.deviceId() });
  }

  onOpenThresholds(): void {
    this.thresholdSheet()?.openSheet();
  }

  onSelectionChange(alerts: Alert[]): void {
    this.selectedAlerts.set(alerts);
  }

  async onAcknowledge(alert: Alert): Promise<void> {
    if (!alert.id || this.actionLoading() === alert.id) return;
    this.actionLoading.set(alert.id);
    try {
      await this.svc.updateAlert(this.deviceId(), alert.id, 'acknowledge');
      this.localAlerts.update(list =>
        list.map(a => a.id === alert.id ? { ...a, acknowledgedAt: new Date().toISOString() } : a),
      );
      void this.toast.success('Alert acknowledged');
      this.detailSheet?.close();
    } catch (e) {
      void this.toast.error(e instanceof Error ? e.message : this.t.instant('device_alerts.msg_ack_failed'));
    } finally {
      this.actionLoading.set(null);
    }
  }

  async onResolve(alert: Alert): Promise<void> {
    if (!alert.id || this.actionLoading() === alert.id) return;
    this.actionLoading.set(alert.id);
    try {
      await this.svc.updateAlert(this.deviceId(), alert.id, 'resolve');
      this.localAlerts.update(list =>
        list.map(a => a.id === alert.id ? { ...a, resolved: true, resolvedAt: new Date().toISOString() } : a),
      );
      void this.toast.success('Alert resolved');
      this.detailSheet?.close();
    } catch (e) {
      void this.toast.error(e instanceof Error ? e.message : this.t.instant('device_alerts.msg_resolve_failed'));
    } finally {
      this.actionLoading.set(null);
    }
  }

  async onDeleteAlert(alert: Alert): Promise<void> {
    if (!alert.id || this.actionLoading() === alert.id) return;
    this.actionLoading.set(alert.id);
    try {
      await this.svc.deleteAlert(this.deviceId(), alert.id);
      this.localAlerts.update(list => list.filter(a => a.id !== alert.id));
      void this.toast.success(this.t.instant('device_alerts.msg_deleted'));
    } catch (e) {
      void this.toast.error(e instanceof Error ? e.message : this.t.instant('device_alerts.msg_delete_failed'));
    } finally {
      this.actionLoading.set(null);
    }
  }

  async onBulkAcknowledge(): Promise<void> {
    const targets = this.selectedAlerts().filter(a => !a.acknowledgedAt && !a.resolved);
    if (!targets.length) return;
    try {
      await Promise.all(targets.map(a => this.svc.updateAlert(this.deviceId(), a.id!, 'acknowledge')));
      this.localAlerts.update(list =>
        list.map(a =>
          targets.some(t => t.id === a.id) ? { ...a, acknowledgedAt: new Date().toISOString() } : a,
        ),
      );
      this.selectedAlerts.set([]);
      void this.toast.success(`${targets.length} alerts acknowledged`);
    } catch (e) {
      void this.toast.error(e instanceof Error ? e.message : this.t.instant('device_alerts.msg_bulk_ack_failed'));
    }
  }

  async onBulkResolve(): Promise<void> {
    const targets = this.selectedAlerts().filter(a => !a.resolved);
    if (!targets.length) return;
    try {
      await Promise.all(targets.map(a => this.svc.updateAlert(this.deviceId(), a.id!, 'resolve')));
      this.localAlerts.update(list =>
        list.map(a =>
          targets.some(t => t.id === a.id) ? { ...a, resolved: true, resolvedAt: new Date().toISOString() } : a,
        ),
      );
      this.selectedAlerts.set([]);
      void this.toast.success(`${targets.length} alerts resolved`);
    } catch (e) {
      void this.toast.error(e instanceof Error ? e.message : this.t.instant('device_alerts.msg_bulk_resolve_failed'));
    }
  }

  alertState(a: Alert): AlertState {
    return alertState(a);
  }

  formatAge(ts: string | undefined): string {
    if (!ts) return '—';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
}
