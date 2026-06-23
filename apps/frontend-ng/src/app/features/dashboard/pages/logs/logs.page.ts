import {
  ChangeDetectionStrategy, Component, computed, DestroyRef,
  inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { addIcons } from 'ionicons';
import { downloadOutline, reloadOutline } from 'ionicons/icons';
import {
  IonContent, IonCard, IonCardContent, IonButton, IonIcon, IonBadge, IonSkeletonText,
  EmptyStateComponent,
  UiSearchFieldComponent, UiSelectComponent,
  ViewWillEnter,
} from '@ng/shared/ui';
import { TranslatePipe } from '@ngx-translate/core';
import type { SelectOption } from '@ng/shared/ui';
import { AdminLogsService, AdminLogEntry } from '../../../admin/services/admin-logs.service';
import { TopbarService } from '../../../../shell/topbar.service';

addIcons({ downloadOutline, reloadOutline });

const LEVEL_COLOR: Record<string, string> = {
  DEBUG: 'medium', INFO: 'primary', WARN: 'warning', ERROR: 'danger', FATAL: 'tertiary',
};

@Component({
  selector: 'app-logs',
  templateUrl: 'logs.page.html',
  styleUrls: ['logs.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonContent, IonCard, IonCardContent, IonButton, IonIcon, IonBadge, IonSkeletonText,
    EmptyStateComponent,
    UiSearchFieldComponent, UiSelectComponent,
    TranslatePipe,
  ],
})
export class LogsPage implements ViewWillEnter {
  protected readonly svc = inject(AdminLogsService);
  private readonly topbar = inject(TopbarService);
  private readonly destroyRef = inject(DestroyRef);

  protected levelFilter  = '';
  protected deviceFilter = '';
  protected sourceFilter = '';
  protected readonly searchQuery = signal('');
  protected readonly currentPage = signal(1);

  private readonly searchInput$ = new Subject<string>();

  protected readonly levelOptions: SelectOption[] = [
    { label: 'fields.all_levels', value: '' },
    { label: 'Debug',   value: 'DEBUG' },
    { label: 'Info',    value: 'INFO' },
    { label: 'Warning', value: 'WARN' },
    { label: 'Error',   value: 'ERROR' },
    { label: 'Fatal',   value: 'FATAL' },
  ];

  protected readonly deviceOptions = computed<SelectOption[]>(() => [
    { label: 'fields.all_devices', value: '' },
    ...this.svc.filterOptions().devices.map(d => ({ label: d.hostname, value: d.id })),
  ]);

  protected readonly sourceOptions = computed<SelectOption[]>(() => [
    { label: 'fields.all_sources', value: '' },
    ...this.svc.filterOptions().sources.map(s => ({ label: s, value: s })),
  ]);

  protected readonly hasSourceFilter = computed(
    () => this.svc.filterOptions().sources.length > 0,
  );

  constructor() {
    this.searchInput$.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(q => {
      this.searchQuery.set(q);
      this.currentPage.set(1);
      void this.load();
    });
  }

  ionViewWillEnter(): void {
    this.topbar.set('nav.logs');
    void this.load();
  }

  protected onSearchInput(val: string): void {
    this.searchInput$.next(val);
  }

  protected onFilterChange(): void {
    this.currentPage.set(1);
    void this.load();
  }

  protected goToPage(page: number): void {
    const p = this.svc.pagination();
    if (page < 1 || page > p.pages) return;
    this.currentPage.set(page);
    void this.load();
  }

  protected levelColor(level: string): string {
    return LEVEL_COLOR[level] ?? 'medium';
  }

  protected formatTs(ts: string): string {
    return new Date(ts).toLocaleString();
  }

  private csvCell(value: string): string {
    const s = String(value ?? '');
    const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${guarded.replace(/"/g, '""')}"`;
  }

  protected exportCsv(): void {
    const logs = this.svc.logs();
    if (!logs.length) return;
    const header = 'Timestamp,Level,Device,Source,Message';
    const rows = logs.map((l: AdminLogEntry) => [
      this.csvCell(new Date(l.timestamp).toISOString()),
      this.csvCell(l.level),
      this.csvCell(l.device?.hostname ?? 'Unknown'),
      this.csvCell(l.source ?? 'system'),
      this.csvCell(l.message),
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private load(): Promise<void> {
    return this.svc.load({
      ...(this.levelFilter   ? { level:    this.levelFilter }   : {}),
      ...(this.deviceFilter  ? { deviceId: this.deviceFilter }  : {}),
      ...(this.sourceFilter  ? { source:   this.sourceFilter }  : {}),
      ...(this.searchQuery() ? { search:   this.searchQuery() } : {}),
      page: this.currentPage(),
    });
  }
}
