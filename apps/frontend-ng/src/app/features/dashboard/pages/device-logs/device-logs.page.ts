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
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { addIcons } from 'ionicons';
import { closeOutline, refreshOutline } from 'ionicons/icons';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonInput,
  IonSkeletonText,
  DataTableComponent,
  EmptyStateComponent,
  UiSearchFieldComponent,
  UiSelectComponent,
} from '@ng/shared/ui';
import type { ColumnDef, SelectOption } from '@ng/shared/ui';
import type { DeviceLogEntry } from '@ng/core/api/generated/models/device-log-entry';
import type { GetDeviceLogs$Params } from '@ng/core/api/generated/fn/devices/get-device-logs';
import { DeviceDetailService } from '../../services/device-detail.service';

addIcons({ closeOutline, refreshOutline });

type LogLevel = 'ALL' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

const LEVEL_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All levels' },
  { value: 'DEBUG', label: 'DEBUG' },
  { value: 'INFO', label: 'INFO' },
  { value: 'WARN', label: 'WARN' },
  { value: 'ERROR', label: 'ERROR' },
  { value: 'FATAL', label: 'FATAL' },
];

@Component({
  selector: 'app-device-logs',
  templateUrl: 'device-logs.page.html',
  styleUrls: ['device-logs.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonInput,
    IonSkeletonText,
    DataTableComponent,
    EmptyStateComponent,
    UiSearchFieldComponent,
    UiSelectComponent,
  ],
})
export class DeviceLogsPage implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly svc = inject(DeviceDetailService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly deviceId = signal('');
  readonly logs = this.svc.deviceLogs;

  readonly levelFilter = signal<LogLevel>('ALL');
  readonly search = signal('');
  readonly sourceFilter = signal('');
  readonly autoRefresh = signal(false);

  readonly hasFilters = computed(
    () => this.levelFilter() !== 'ALL' || this.search() !== '' || this.sourceFilter() !== '',
  );

  readonly levelOptions = LEVEL_OPTIONS;

  @ViewChild('tsCell') private tsCellTpl!: TemplateRef<{ $implicit: DeviceLogEntry }>;
  @ViewChild('levelCell') private levelCellTpl!: TemplateRef<{ $implicit: DeviceLogEntry }>;
  @ViewChild('sourceCell') private sourceCellTpl!: TemplateRef<{ $implicit: DeviceLogEntry }>;
  @ViewChild('messageCell') private messageCellTpl!: TemplateRef<{ $implicit: DeviceLogEntry }>;
  readonly columns = signal<ColumnDef<DeviceLogEntry>[]>([]);

  constructor() {
    const id = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.deviceId.set(id);
  }

  ngOnInit(): void {
    void this.svc.deviceLogs.load({ id: this.deviceId(), limit: 100 });
    interval(10000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.autoRefresh()) void this.svc.deviceLogs.reload();
      });
  }

  ngAfterViewInit(): void {
    this.columns.set([
      { key: 'timestamp', label: 'When', cellTemplate: this.tsCellTpl },
      { key: 'level', label: 'Level', cellTemplate: this.levelCellTpl },
      { key: 'source', label: 'Source', cellTemplate: this.sourceCellTpl },
      { key: 'message', label: 'Message', cellTemplate: this.messageCellTpl },
    ]);
  }

  private buildParams(): GetDeviceLogs$Params {
    const p: GetDeviceLogs$Params = { id: this.deviceId(), limit: 100 };
    const lvl = this.levelFilter();
    if (lvl !== 'ALL') p.level = lvl;
    if (this.search()) p.search = this.search();
    if (this.sourceFilter()) p.source = this.sourceFilter();
    return p;
  }

  onLevelChange(level: string): void {
    this.levelFilter.set(level as LogLevel);
    void this.svc.deviceLogs.load(this.buildParams());
  }

  onSearchChange(q: string): void {
    this.search.set(q);
    void this.svc.deviceLogs.load(this.buildParams());
  }

  onSourceChange(src: string): void {
    this.sourceFilter.set(src);
    void this.svc.deviceLogs.load(this.buildParams());
  }

  onClearFilters(): void {
    this.levelFilter.set('ALL');
    this.search.set('');
    this.sourceFilter.set('');
    void this.svc.deviceLogs.load({ id: this.deviceId(), limit: 100 });
  }

  onRefresh(): void {
    void this.svc.deviceLogs.load(this.buildParams());
  }

  onRetry(): void {
    void this.svc.deviceLogs.load(this.buildParams());
  }

  formatTs(ts: string | undefined): string {
    if (!ts) return '—';
    return new Date(ts).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }
}
