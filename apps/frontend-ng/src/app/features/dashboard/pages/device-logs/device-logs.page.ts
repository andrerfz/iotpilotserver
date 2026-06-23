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
import { TranslatePipe } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { TopbarService } from '@ng/shell/topbar.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { addIcons } from 'ionicons';
import { closeOutline, refreshOutline, optionsOutline, syncOutline } from 'ionicons/icons';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
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

addIcons({ closeOutline, refreshOutline, optionsOutline, syncOutline });

type LogLevel = 'ALL' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

const LEVEL_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'fields.all_levels' },
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
    TranslatePipe,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonSkeletonText,
    DataTableComponent,
    EmptyStateComponent,
    UiSearchFieldComponent,
    UiSelectComponent,
  ],
})
export class DeviceLogsPage implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly topbar = inject(TopbarService);
  private readonly svc = inject(DeviceDetailService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly deviceId = signal('');
  readonly logs = this.svc.deviceLogs;

  readonly levelFilter = signal<LogLevel>('ALL');
  readonly search = signal('');
  readonly autoRefresh = signal(false);
  readonly filterOpen = signal(false);
  readonly searchInMessages = signal(true);
  readonly searchInSource = signal(true);

  readonly hasFilters = computed(
    () => this.levelFilter() !== 'ALL' || this.search() !== '',
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
    this.topbar.set('nav.logs');
    void this.svc.deviceLogs.load({ id: this.deviceId(), limit: 100 });
    interval(10000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.autoRefresh()) void this.svc.deviceLogs.reload();
      });
  }

  ngAfterViewInit(): void {
    this.columns.set([
      { key: 'timestamp', label: 'fields.when', cellTemplate: this.tsCellTpl },
      { key: 'level', label: 'fields.level', cellTemplate: this.levelCellTpl },
      { key: 'source', label: 'fields.source', cellTemplate: this.sourceCellTpl },
      { key: 'message', label: 'fields.message', cellTemplate: this.messageCellTpl },
    ]);
  }

  private buildParams(): GetDeviceLogs$Params {
    const p: GetDeviceLogs$Params = { id: this.deviceId(), limit: 100 };
    const lvl = this.levelFilter();
    if (lvl !== 'ALL') p.level = lvl;
    if (this.search()) {
      if (this.searchInMessages()) p.search = this.search();
      if (this.searchInSource()) p.source = this.search();
    }
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

  onScopeChange(): void {
    void this.svc.deviceLogs.load(this.buildParams());
  }

  toggleFilter(): void { this.filterOpen.update(o => !o); }
  toggleAutoRefresh(): void { this.autoRefresh.update(o => !o); }
  toggleSearchInMessages(): void { this.searchInMessages.update(o => !o); this.onScopeChange(); }
  toggleSearchInSource(): void { this.searchInSource.update(o => !o); this.onScopeChange(); }

  onClearFilters(): void {
    this.levelFilter.set('ALL');
    this.search.set('');
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
