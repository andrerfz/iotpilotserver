import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButton,
  ThemeService,
  StatusBadgeComponent, StatusDotComponent, SeverityBadgeComponent,
  RoleBadgeComponent, DeviceTypeBadgeComponent,
  UiInputComponent, UiSwitchComponent, UiCheckboxComponent, UiSelectComponent, SelectOption,
  SparklineComponent, MetricCardComponent, EmptyStateComponent,
  DataTableComponent, ColumnDef,
  FilterChipComponent, BottomSheetComponent,
  MultiSelectPickerComponent, PickerOption,
  DevicePickerComponent, DevicePickerItem,
  UserPickerComponent, UserPickerItem,
  DateRangePickerComponent,
  AppLogoComponent, NetworkStatusComponent, MaintenanceBannerComponent,
} from '@ng/shared/ui';

interface DeviceRow extends Record<string, unknown> {
  id: number;
  name: string;
  status: string;
  cpu: number;
}

/**
 * Provisional kit showcase (route `/__ui`). Covers T3–T6 barrel exports.
 * T12 will fold this into the full kitchen-sink (shell + remaining components)
 * and exclude it from the production build.
 */
@Component({
  selector: 'app-demo-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButton,
    StatusBadgeComponent, StatusDotComponent, SeverityBadgeComponent,
    RoleBadgeComponent, DeviceTypeBadgeComponent,
    UiInputComponent, UiSwitchComponent, UiCheckboxComponent, UiSelectComponent,
    SparklineComponent, MetricCardComponent, EmptyStateComponent,
    DataTableComponent,
    FilterChipComponent, BottomSheetComponent,
    MultiSelectPickerComponent, DevicePickerComponent, UserPickerComponent, DateRangePickerComponent,
    AppLogoComponent, NetworkStatusComponent, MaintenanceBannerComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>UI Kit — /__ui</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="demo">
        <!-- Theme switcher -->
        <section class="card">
          <h2>Theme — current: {{ theme.theme() }}</h2>
          <div class="row">
            <ion-button size="small" fill="outline" (click)="theme.setTheme('light')">Light</ion-button>
            <ion-button size="small" fill="outline" (click)="theme.setTheme('dark')">Dark</ion-button>
            <ion-button size="small" fill="outline" (click)="theme.setTheme('system')">System</ion-button>
          </div>
        </section>

        <!-- T3 — Badges -->
        <section class="card">
          <h2>T3 — Badges &amp; status dot</h2>
          <div class="row">
            @for (s of statuses; track s) {
              <ui-status-badge [status]="s"></ui-status-badge>
            }
          </div>
          <div class="row">
            <ui-status-dot status="ONLINE" [live]="true"></ui-status-dot>
            <ui-status-dot status="OFFLINE"></ui-status-dot>
            <ui-status-dot status="MAINTENANCE"></ui-status-dot>
          </div>
          <div class="row">
            <ui-severity-badge severity="critical"></ui-severity-badge>
            <ui-severity-badge severity="warning"></ui-severity-badge>
            <ui-severity-badge severity="info"></ui-severity-badge>
          </div>
          <div class="row">
            <ui-role-badge role="READONLY"></ui-role-badge>
            <ui-role-badge role="USER"></ui-role-badge>
            <ui-role-badge role="ADMIN"></ui-role-badge>
            <ui-role-badge role="SUPERADMIN"></ui-role-badge>
          </div>
          <div class="row">
            <ui-device-type-badge type="RASPBERRY_PI"></ui-device-type-badge>
            <ui-device-type-badge type="ESP32"></ui-device-type-badge>
          </div>
        </section>

        <!-- T4 — Form controls -->
        <section class="card">
          <h2>T4 — Form controls (CVA)</h2>
          <div class="grid2">
            <ui-input label="Email" placeholder="you@example.com" [(ngModel)]="email"></ui-input>
            <ui-input label="Password" type="password" placeholder="••••••" [(ngModel)]="password"></ui-input>
            <ui-input label="With error" placeholder="invalid" error="This field is required"></ui-input>
            <ui-select label="Region" [options]="regions" [(ngModel)]="region"></ui-select>
          </div>
          <div class="row">
            <ui-switch label="Notifications" [(ngModel)]="notify"></ui-switch>
            <ui-checkbox label="I agree" [(ngModel)]="agree"></ui-checkbox>
          </div>
          <p class="muted">
            email={{ email() }} · region={{ region() }} · notify={{ notify() }} · agree={{ agree() }}
          </p>
        </section>

        <!-- T5 — Metric / Sparkline / EmptyState -->
        <section class="card">
          <h2>T5 — Metric cards, sparkline, empty state</h2>
          <div class="grid3">
            <ui-metric-card label="Devices online" value="128" delta="+4" deltaDir="up" [spark]="spark"></ui-metric-card>
            <ui-metric-card label="Avg CPU" value="42" unit="%" delta="-3%" deltaDir="down" [spark]="spark"></ui-metric-card>
            <ui-metric-card label="Open alerts" value="7"></ui-metric-card>
          </div>
          <div class="card inner spark-demo">
            <span class="spark-demo__label">Sparkline</span>
            <ui-sparkline [data]="spark"></ui-sparkline>
          </div>
          <div class="card inner">
            <ui-empty-state title="No results" description="Try adjusting your filters"></ui-empty-state>
          </div>
        </section>

        <!-- T6 — DataTable -->
        <section class="card">
          <h2>T6 — DataTable (sortable, selectable, paginated)</h2>
          <ui-data-table
            [columns]="columns"
            [rows]="rows"
            [selectable]="true"
            [rowClickable]="true"
            [pageSize]="5"
            (rowClick)="lastClicked.set($event.name)"
            (selectionChange)="selCount.set($event.length)">
            <ion-button bulkActions size="small" fill="outline">Reboot selected</ion-button>
          </ui-data-table>
          <p class="muted">last row click: {{ lastClicked() || '—' }} · selected: {{ selCount() }}</p>
        </section>

        <!-- T7 — BottomSheet + FilterChip -->
        <section class="card">
          <h2>T7 — BottomSheet + FilterChip</h2>
          <div class="row">
            <ui-filter-chip
              label="Status"
              [value]="statusFilter() || ''"
              [active]="!!statusFilter()"
              (chipClick)="sheetOpen.set(true)"
              (clear)="statusFilter.set('')">
            </ui-filter-chip>
            <ui-filter-chip label="Region" value="Europe" [active]="true" [count]="2"></ui-filter-chip>
            <ui-filter-chip label="Type"></ui-filter-chip>
          </div>
          <p class="muted">status filter: {{ statusFilter() || '—' }}</p>

          <ui-bottom-sheet
            [open]="sheetOpen()"
            title="Filter by status"
            sub="Pick one device status"
            saveLabel="Apply"
            [saveDisabled]="!draftStatus()"
            [count]="draftStatus() ? 1 : null"
            (dismiss)="sheetOpen.set(false)"
            (save)="statusFilter.set(draftStatus()); sheetOpen.set(false)">
            <ui-select
              label="Status"
              [options]="statusOptions"
              [ngModel]="draftStatus()"
              (ngModelChange)="draftStatus.set($event)">
            </ui-select>
          </ui-bottom-sheet>
        </section>

        <!-- T8 — Pickers -->
        <section class="card">
          <h2>T8 — Pickers (multi-select, device, user, date range)</h2>
          <div class="row">
            <ui-multi-select-picker
              label="Status"
              title="Filter by status"
              sub="Pick one or more"
              [options]="statusPickerOptions"
              [value]="pickedStatuses()"
              (valueChange)="pickedStatuses.set($event)">
            </ui-multi-select-picker>

            <ui-device-picker
              [devices]="demoDevices"
              [value]="pickedDevices()"
              (valueChange)="pickedDevices.set($event)">
            </ui-device-picker>

            <ui-user-picker
              [users]="demoUsers"
              [value]="pickedUsers()"
              (valueChange)="pickedUsers.set($event)">
            </ui-user-picker>

            <ui-date-range-picker
              [value]="period()"
              (valueChange)="period.set($event)">
            </ui-date-range-picker>
          </div>
          <p class="muted">
            statuses={{ pickedStatuses().length }} · devices={{ pickedDevices().length }} ·
            users={{ pickedUsers().length }} · period={{ period() }}
          </p>
        </section>

        <!-- T12 — Shell satellites -->
        <section class="card">
          <h2>T12 — Shell satellites (logo, maintenance banner, network status)</h2>
          <div class="row">
            <ui-app-logo></ui-app-logo>
            <ui-app-logo [showText]="false"></ui-app-logo>
          </div>
          <div class="card inner" style="padding:0; overflow:hidden;">
            <ui-maintenance-banner message="Scheduled maintenance tonight 02:00–03:00 UTC."></ui-maintenance-banner>
            <ui-network-status></ui-network-status>
            <p class="muted" style="padding:12px 16px;">
              Network status shows a bar only while offline (toggle your connection to see it).
            </p>
          </div>
        </section>
      </div>
    </ion-content>
  `,
  styles: [`
    .demo { max-width: 980px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 18px 20px; }
    .card.inner { margin-top: 14px; }
    .spark-demo { display: flex; flex-direction: column; gap: 8px; }
    .spark-demo__label { font-family: var(--font-mono); font-size: var(--fs-label); letter-spacing: var(--ls-label); text-transform: uppercase; color: var(--text-dim); }
    h2 { font-size: 14px; color: var(--text); margin: 0 0 14px; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 12px; }
    .grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 12px; }
    .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 14px; }
    .muted { font-size: 12px; color: var(--text-muted); margin: 4px 0 0; }
    @media (max-width: 640px) { .grid2, .grid3 { grid-template-columns: 1fr; } }
  `],
})
export class DemoPage {
  protected readonly theme = inject(ThemeService);

  protected readonly statuses = ['ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR', 'RUNNING', 'COMPLETED', 'FAILED', 'OPEN', 'ACK', 'RESOLVED'];

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly notify = signal(true);
  protected readonly agree = signal(false);
  protected readonly region = signal<string>('eu');
  protected readonly regions: SelectOption[] = [
    { label: 'Europe', value: 'eu' },
    { label: 'North America', value: 'na' },
    { label: 'Asia Pacific', value: 'apac' },
  ];

  protected readonly spark = [12, 18, 14, 22, 19, 28, 24, 31, 27, 34];

  protected readonly columns: ColumnDef<DeviceRow>[] = [
    { key: 'name', label: 'Device', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'cpu', label: 'CPU %', sortable: true, width: '100px' },
  ];
  protected readonly rows: DeviceRow[] = Array.from({ length: 13 }, (_, i) => ({
    id: i + 1,
    name: `rpi-${(i + 1).toString().padStart(2, '0')}`,
    status: ['ONLINE', 'OFFLINE', 'MAINTENANCE'][i % 3],
    cpu: (i * 13) % 100,
  }));

  protected readonly lastClicked = signal('');
  protected readonly selCount = signal(0);

  // T7 — sheet + chip
  protected readonly sheetOpen = signal(false);
  protected readonly statusFilter = signal('');
  protected readonly draftStatus = signal('');
  protected readonly statusOptions: SelectOption[] = [
    { label: 'Online', value: 'ONLINE' },
    { label: 'Offline', value: 'OFFLINE' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
  ];

  // T8 — pickers
  protected readonly pickedStatuses = signal<string[]>([]);
  protected readonly pickedDevices = signal<string[]>([]);
  protected readonly pickedUsers = signal<string[]>([]);
  protected readonly period = signal('24h');
  protected readonly statusPickerOptions: PickerOption[] = [
    { value: 'ONLINE', label: 'Online', dot: 'ONLINE' },
    { value: 'OFFLINE', label: 'Offline', dot: 'OFFLINE' },
    { value: 'MAINTENANCE', label: 'Maintenance', dot: 'MAINTENANCE' },
  ];
  protected readonly demoDevices: DevicePickerItem[] = this.rows.map(r => ({
    id: r.name, name: r.name, status: r.status, location: 'Rack A',
  }));
  protected readonly demoUsers: UserPickerItem[] = [
    { id: 'u1', name: 'Ada Lovelace', email: 'ada@iot.io', role: 'ADMIN' },
    { id: 'u2', name: 'Bo Turing', email: 'bo@iot.io', role: 'USER' },
    { id: 'u3', name: 'Cy Hopper', email: 'cy@iot.io', role: 'SUPERADMIN' },
  ];
}
