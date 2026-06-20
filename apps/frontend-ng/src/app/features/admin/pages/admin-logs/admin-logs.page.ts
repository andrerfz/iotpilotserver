import {
  ChangeDetectionStrategy, Component, computed, DestroyRef,
  inject, signal, viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { addIcons } from 'ionicons';
import { downloadOutline, reloadOutline, documentOutline, codeOutline, documentTextOutline } from 'ionicons/icons';
import {
  IonContent, IonCard, IonCardContent, IonButton, IonIcon, IonBadge, IonSkeletonText,
  EmptyStateComponent,
  UiSearchFieldComponent, UiSelectComponent,
  BottomSheetComponent,
  ViewWillEnter,
} from '@ng/shared/ui';
import type { SelectOption } from '@ng/shared/ui';
import { AdminLogsService, AdminLogEntry } from '../../services/admin-logs.service';
import { TopbarService } from '../../../../shell/topbar.service';
import { AdminTabsComponent } from '../../components/admin-tabs.component';

addIcons({ downloadOutline, reloadOutline, documentOutline, codeOutline, documentTextOutline });

const LEVEL_COLOR: Record<string, string> = {
  DEBUG: 'medium', INFO: 'primary', WARN: 'warning', ERROR: 'danger', FATAL: 'tertiary',
};

function toLogRows(logs: AdminLogEntry[]): Record<string, string>[] {
  return logs.map(l => ({
    'Timestamp': new Date(l.timestamp).toISOString(),
    'Level': l.level,
    'Device': l.device?.hostname ?? 'Unknown',
    'Source': l.source ?? 'system',
    'Message': l.message,
  }));
}

@Component({
  selector: 'app-admin-logs',
  templateUrl: 'admin-logs.page.html',
  styleUrls: ['admin-logs.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonContent, IonCard, IonCardContent, IonButton, IonIcon, IonBadge, IonSkeletonText,
    EmptyStateComponent,
    UiSearchFieldComponent, UiSelectComponent,
    BottomSheetComponent,
    AdminTabsComponent,
  ],
})
export class AdminLogsPage implements ViewWillEnter {
  protected readonly svc = inject(AdminLogsService);
  private readonly topbar = inject(TopbarService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly exportSheet = viewChild<BottomSheetComponent>('exportSheet');

  protected levelFilter   = '';
  protected deviceFilter  = '';
  protected sourceFilter  = '';
  protected readonly searchQuery = signal('');
  protected readonly currentPage = signal(1);

  private readonly searchInput$ = new Subject<string>();

  protected readonly levelOptions: SelectOption[] = [
    { label: 'All Levels', value: '' },
    { label: 'Debug',   value: 'DEBUG' },
    { label: 'Info',    value: 'INFO' },
    { label: 'Warning', value: 'WARN' },
    { label: 'Error',   value: 'ERROR' },
    { label: 'Fatal',   value: 'FATAL' },
  ];

  protected readonly deviceOptions = computed<SelectOption[]>(() => [
    { label: 'All Devices', value: '' },
    ...this.svc.filterOptions().devices.map(d => ({ label: d.hostname, value: d.id })),
  ]);

  protected readonly sourceOptions = computed<SelectOption[]>(() => [
    { label: 'All Sources', value: '' },
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
    this.topbar.set('Logs');
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

  protected onExportOpen(): void {
    this.exportSheet()?.open();
  }

  protected async exportXlsx(): Promise<void> {
    const logs = this.svc.logs();
    if (!logs.length) return;
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.json_to_sheet(toLogRows(logs));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Logs');
    writeFile(wb, `logs_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  protected exportCsv(): void {
    const logs = this.svc.logs();
    if (!logs.length) return;
    const rows = toLogRows(logs);
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `logs_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected async exportPdf(): Promise<void> {
    const logs = this.svc.logs();
    if (!logs.length) return;
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const rows = toLogRows(logs);
    const headers = Object.keys(rows[0]);
    const body = rows.map(r => headers.map(h => r[h] ?? ''));
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('System Logs', 14, 15);
    autoTable(doc, {
      head: [headers],
      body,
      startY: 22,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185] },
      columnStyles: { 4: { cellWidth: 'auto' } },
    });
    doc.save(`logs_export_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private load(): Promise<void> {
    return this.svc.load({
      ...(this.levelFilter  ? { level:    this.levelFilter }  : {}),
      ...(this.deviceFilter ? { deviceId: this.deviceFilter } : {}),
      ...(this.sourceFilter ? { source:   this.sourceFilter } : {}),
      ...(this.searchQuery() ? { search:  this.searchQuery() } : {}),
      page: this.currentPage(),
    });
  }
}
