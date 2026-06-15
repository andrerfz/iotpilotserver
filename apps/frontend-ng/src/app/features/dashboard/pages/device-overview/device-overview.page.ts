import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
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
import { addIcons } from 'ionicons';
import {
  flashOutline,
  serverOutline,
  statsChartOutline,
  hardwareChipOutline,
  thermometerOutline,
  saveOutline,
  addOutline,
} from 'ionicons/icons';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonSkeletonText,
  IonButton,
  IonIcon,
  MetricCardComponent,
  DataTableComponent,
  EmptyStateComponent,
  StatusBadgeComponent,
} from '@ng/shared/ui';
import type { ColumnDef } from '@ng/shared/ui';
import type { DeviceCommand } from '@ng/core/api/generated/models/device-command';
import { DeviceDetailService } from '../../services/device-detail.service';
import { CommandSheetComponent } from '../../components/command-sheet/command-sheet.component';

addIcons({ flashOutline, serverOutline, statsChartOutline, hardwareChipOutline, thermometerOutline, saveOutline, addOutline });

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
    DataTableComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    CommandSheetComponent,
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

  readonly deviceMetrics = computed(() => {
    const d = this.device.data();
    return {
      cpu: d?.cpuUsage ?? null,
      memory: d?.memoryUsage ?? null,
      temp: d?.cpuTemp ?? null,
      disk: d?.diskUsage ?? null,
    };
  });

  @ViewChild('statusCell') private statusCellTpl!: TemplateRef<{ $implicit: DeviceCommand }>;
  readonly commandColumns = signal<ColumnDef<DeviceCommand>[]>([]);

  constructor() {
    const id = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.deviceId.set(id);
  }

  ngOnInit(): void {
    this.topbar.set('Overview');
    void this.svc.deviceCommands.load({ id: this.deviceId(), limit: 5 });
  }

  ngAfterViewInit(): void {
    this.commandColumns.set([
      { key: 'command', label: 'Command' },
      { key: 'status', label: 'Status', cellTemplate: this.statusCellTpl },
      { key: 'createdAt', label: 'When' },
    ]);
  }

  metricVal(value: number | null): string {
    return value != null ? value.toFixed(1) : '--';
  }

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
