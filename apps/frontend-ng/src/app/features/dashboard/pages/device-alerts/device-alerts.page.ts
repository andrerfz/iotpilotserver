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
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { addIcons } from 'ionicons';
import { refreshOutline, settingsOutline } from 'ionicons/icons';
import {
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
  EmptyStateComponent,
  MetricCardComponent,
  MultiSelectPickerComponent,
  SeverityBadgeComponent,
  StatusBadgeComponent,
} from '@ng/shared/ui';
import type { ColumnDef, PickerOption } from '@ng/shared/ui';
import type { Alert } from '@ng/core/api/generated/models/alert';
import { AlertsStream } from '@ng/core/realtime/alerts.stream';
import { DeviceDetailService } from '../../services/device-detail.service';
import { DashboardService } from '../../services/dashboard.service';
import { ToastService } from '@ng/core/errors/toast.service';
import { ThresholdConfigSheetComponent } from '../../components/threshold-config-sheet/threshold-config-sheet.component';

addIcons({ refreshOutline, settingsOutline });

type AlertState = 'OPEN' | 'ACK' | 'RESOLVED';

function alertState(a: Alert): AlertState {
  if (a.resolved) return 'RESOLVED';
  if (a.acknowledgedAt) return 'ACK';
  return 'OPEN';
}

const SEVERITY_OPTIONS: PickerOption[] = [
  { value: 'CRITICAL', label: 'Critical', severity: 'CRITICAL' },
  { value: 'ERROR', label: 'Error', severity: 'ERROR' },
  { value: 'WARNING', label: 'Warning', severity: 'WARNING' },
  { value: 'INFO', label: 'Info', severity: 'INFO' },
];

const STATE_OPTIONS: PickerOption[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ACK', label: 'Acknowledged' },
  { value: 'RESOLVED', label: 'Resolved' },
];

@Component({
  selector: 'app-device-alerts',
  templateUrl: 'device-alerts.page.html',
  styleUrls: ['device-alerts.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
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
    MultiSelectPickerComponent,
    SeverityBadgeComponent,
    StatusBadgeComponent,
    ThresholdConfigSheetComponent,
  ],
})
export class DeviceAlertsPage implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly svc = inject(DeviceDetailService);
  private readonly dashSvc = inject(DashboardService);
  private readonly alertsStream = inject(AlertsStream);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly thresholdSheet = viewChild(ThresholdConfigSheetComponent);

  protected readonly deviceId = signal('');

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

  readonly maxTrendCount = computed(() =>
    Math.max(1, ...(this.trend.data() ?? []).map(p => p.count ?? 0)),
  );

  readonly hasFilters = computed(
    () => this.severityFilter().length > 0 || this.stateFilter().length > 0,
  );

  @ViewChild('severityCell') private severityCellTpl!: TemplateRef<{ $implicit: Alert }>;
  @ViewChild('titleCell') private titleCellTpl!: TemplateRef<{ $implicit: Alert }>;
  @ViewChild('stateCell') private stateCellTpl!: TemplateRef<{ $implicit: Alert }>;
  @ViewChild('triggeredCell') private triggeredCellTpl!: TemplateRef<{ $implicit: Alert }>;
  @ViewChild('actionsCell') private actionsCellTpl!: TemplateRef<{ $implicit: Alert }>;
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
    void this.svc.deviceAlerts.load({ id: this.deviceId() });
    void this.dashSvc.alertsTrend.load({ deviceId: this.deviceId(), period: '7d' });
  }

  ngAfterViewInit(): void {
    this.columns.set([
      { key: 'severity', label: 'Severity', sortable: true, cellTemplate: this.severityCellTpl },
      { key: 'title', label: 'Alert', cellTemplate: this.titleCellTpl },
      { key: 'type', label: 'Type' },
      { key: 'resolved', label: 'State', cellTemplate: this.stateCellTpl },
      { key: 'createdAt', label: 'Triggered', cellTemplate: this.triggeredCellTpl },
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
    } catch (e) {
      void this.toast.error(e instanceof Error ? e.message : 'Failed to acknowledge alert');
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
    } catch (e) {
      void this.toast.error(e instanceof Error ? e.message : 'Failed to resolve alert');
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
      void this.toast.error(e instanceof Error ? e.message : 'Bulk acknowledge failed');
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
      void this.toast.error(e instanceof Error ? e.message : 'Bulk resolve failed');
    }
  }

  alertState(a: Alert): AlertState {
    return alertState(a);
  }

  trendBarHeight(count: number | undefined): number {
    const max = this.maxTrendCount();
    return max > 0 ? Math.round(((count ?? 0) / max) * 100) : 0;
  }

  formatTrendDate(date: string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
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
