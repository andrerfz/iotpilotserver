import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TopbarService } from '@ng/shell/topbar.service';
import { addIcons } from 'ionicons';
import {
  flashOutline,
  serverOutline,
  statsChartOutline,
  hardwareChipOutline,
  thermometerOutline,
  saveOutline,
  addOutline,
  batteryHalfOutline,
} from 'ionicons/icons';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonSkeletonText,
  IonButton,
  IonIcon,
  MetricCardComponent,
  MetricGridComponent,
  DataTableComponent,
  EmptyStateComponent,
  StatusBadgeComponent,
} from '@ng/shared/ui';
import type { ColumnDef } from '@ng/shared/ui';
import type { DeviceCommand } from '@ng/core/api/generated/models/device-command';
import type { MetricPoint } from '@ng/core/api/generated/models/metric-point';
import { DeviceDetailService } from '../../services/device-detail.service';
import { CommandSheetComponent } from '../../components/command-sheet/command-sheet.component';
import { hasSystemMetrics, hasCommands, hasSensorMetrics } from '../../device-capabilities';
import { formatMetric } from '../../metric-format';

addIcons({ flashOutline, serverOutline, statsChartOutline, hardwareChipOutline, thermometerOutline, saveOutline, addOutline, batteryHalfOutline });

function lastVal(series: MetricPoint[] | undefined): number | null {
  if (!series?.length) return null;
  return series[series.length - 1].value ?? null;
}

@Component({
  selector: 'app-device-overview',
  templateUrl: 'device-overview.page.html',
  styleUrls: ['device-overview.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonCard,
    IonCardContent,
    IonSkeletonText,
    IonButton,
    IonIcon,
    MetricCardComponent,
    MetricGridComponent,
    DataTableComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    CommandSheetComponent,
    TranslatePipe,
  ],
})
export class DeviceOverviewPage implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly topbar = inject(TopbarService);
  private readonly svc = inject(DeviceDetailService);
  private readonly commandSheet = viewChild(CommandSheetComponent);

  private readonly deviceId = signal('');
  readonly device = this.svc.device;
  readonly commands = this.svc.deviceCommands;
  readonly showSystemMetrics = computed(() => hasSystemMetrics(this.device.data()?.deviceType));
  readonly showSensorMetrics = computed(() => hasSensorMetrics(this.device.data()?.deviceType));
  readonly showCommands      = computed(() => hasCommands(this.device.data()?.deviceType));

  readonly deviceMetrics = computed(() => {
    const d = this.device.data();
    const mData = this.svc.deviceMetrics.data()?.metrics ?? {};
    return {
      cpu:     d?.cpuUsage ?? null,
      memory:  d?.memoryUsage ?? null,
      // Pi devices have cpuTemp on heartbeat; sensor devices fall back to metric series
      temp:    d?.cpuTemp ?? lastVal(mData['temperature']),
      disk:    d?.diskUsage ?? null,
      battery: lastVal(mData['battery_level']),
    };
  });

  @ViewChild('statusCell') private statusCellTpl!: TemplateRef<{ $implicit: DeviceCommand }>;
  readonly commandColumns = signal<ColumnDef<DeviceCommand>[]>([]);

  constructor() {
    const id = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.deviceId.set(id);

    // Load metric time-series for sensor devices so overview KPI cards can show last values
    effect(() => {
      const dt = this.device.data()?.deviceType;
      if (dt && hasSensorMetrics(dt) && !this.svc.deviceMetrics.data()) {
        void this.svc.deviceMetrics.load({ id: this.deviceId(), period: '24h' });
      }
    });
  }

  ngOnInit(): void {
    this.topbar.set('nav.overview');
    void this.svc.deviceCommands.load({ id: this.deviceId(), limit: 5 });
  }

  ngAfterViewInit(): void {
    this.commandColumns.set([
      { key: 'command', label: 'fields.command' },
      { key: 'status', label: 'fields.status', cellTemplate: this.statusCellTpl },
      { key: 'createdAt', label: 'fields.when' },
    ]);
  }

  readonly formatMetric = formatMetric;

  formatLastSeen(ts: string | null | undefined): string {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  openRunCommand(): void {
    this.commandSheet()?.openForIssue();
  }

  onRetry(): void {
    void this.svc.device.reload();
    void this.svc.deviceCommands.reload();
  }
}
