import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { hardwareChipOutline, speedometerOutline, notificationsOutline, checkmark } from 'ionicons/icons';
import {
  IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon,
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
  DateRangePickerComponent, DateRangeValue,
  AppLogoComponent, NetworkStatusComponent, MaintenanceBannerComponent,
  UiCollectionComponent, UiScopePillComponent, UiSectionComponent,
  UiSettingRowComponent, UiPageComponent, UiSkeletonComponent,
} from '@ng/shared/ui';

interface DeviceRow extends Record<string, unknown> {
  id: number;
  name: string;
  status: string;
  cpu: number;
}

addIcons({ hardwareChipOutline, speedometerOutline, notificationsOutline, checkmark });

/**
 * Provisional kit showcase (route `/__ui`). Covers every barrel export.
 * Dev-only route (gated by isDevMode() in app.routes).
 */
@Component({
  selector: 'app-demo-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle, IonButton, IonIcon,
    StatusBadgeComponent, StatusDotComponent, SeverityBadgeComponent,
    RoleBadgeComponent, DeviceTypeBadgeComponent,
    UiInputComponent, UiSwitchComponent, UiCheckboxComponent, UiSelectComponent,
    SparklineComponent, MetricCardComponent, EmptyStateComponent,
    DataTableComponent,
    FilterChipComponent, BottomSheetComponent,
    MultiSelectPickerComponent, DevicePickerComponent, UserPickerComponent, DateRangePickerComponent,
    AppLogoComponent, NetworkStatusComponent, MaintenanceBannerComponent,
    UiCollectionComponent, UiScopePillComponent, UiSectionComponent,
    UiSettingRowComponent, UiPageComponent, UiSkeletonComponent,
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
            <ui-metric-card label="Devices online" value="128" delta="+4" deltaDir="up" [spark]="spark">
              <ion-icon icon name="hardware-chip-outline"></ion-icon>
            </ui-metric-card>
            <ui-metric-card label="Avg CPU" value="42" unit="%" delta="-3%" deltaDir="down" [spark]="spark"
              iconColor="var(--warning)" iconBg="color-mix(in srgb, var(--warning) 15%, transparent)">
              <ion-icon icon name="speedometer-outline"></ion-icon>
            </ui-metric-card>
            <ui-metric-card label="Open alerts" value="7"
              iconColor="var(--danger)" iconBg="color-mix(in srgb, var(--danger) 15%, transparent)">
              <ion-icon icon name="notifications-outline"></ion-icon>
            </ui-metric-card>
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
              (chipClick)="statusSheet.open()"
              (clear)="statusFilter.set('')">
            </ui-filter-chip>
            <ui-filter-chip label="Region" value="Europe" [active]="true" [count]="2"></ui-filter-chip>
            <ui-filter-chip label="Type"></ui-filter-chip>
          </div>
          <p class="muted">status filter: {{ statusFilter() || '—' }}</p>

          <ui-bottom-sheet
            #statusSheet
            title="Filter by status"
            sub="Pick one device status"
            saveLabel="Apply"
            [saveDisabled]="!draftStatus()"
            [count]="draftStatus() ? 1 : null"
            (willOpen)="draftStatus.set(statusFilter())"
            (save)="statusFilter.set(draftStatus())">
            <div class="optlist">
              @for (opt of statusOptions; track opt.value) {
                <div class="opt" [class.opt--sel]="draftStatus() === opt.value"
                  role="button" tabindex="0"
                  (click)="draftStatus.set(opt.value)"
                  (keydown.enter)="draftStatus.set(opt.value)">
                  <div class="opt__title">{{ opt.label }}</div>
                  <div class="opt__check"><ion-icon name="checkmark"></ion-icon></div>
                </div>
              }
            </div>
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
            users={{ pickedUsers().length }} · period={{ periodLabel() }}
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

        <!-- T13 — Orphan kit components (built, not yet adopted by any real page) -->
        <section class="card">
          <h2>T13 — Collection, scope pill, settings section/row, skeleton, page scaffold</h2>

          <p class="cal-label">ui-scope-pill</p>
          <div class="row">
            <ui-scope-pill scope="personal"></ui-scope-pill>
            <ui-scope-pill scope="tenant"></ui-scope-pill>
            <ui-scope-pill scope="platform"></ui-scope-pill>
            <ui-scope-pill scope="device"></ui-scope-pill>
          </div>

          <p class="cal-label">ui-skeleton</p>
          <div class="card inner">
            <ui-skeleton [lines]="3" [widths]="['40%', '100%', '70%']"></ui-skeleton>
          </div>

          <p class="cal-label">ui-section + ui-setting-row</p>
          <div class="card inner" style="padding:0;">
            <ui-section title="Notifications" description="Choose how you want to be notified">
              <ion-button aside size="small" fill="clear">Reset</ion-button>
              <ui-setting-row label="Email alerts" description="Send a copy of every alert to your email">
                <ui-switch [(ngModel)]="notify"></ui-switch>
              </ui-setting-row>
              <ui-setting-row label="Push notifications">
                <ui-switch></ui-switch>
              </ui-setting-row>
            </ui-section>
          </div>

          <p class="cal-label">ui-collection (resize the window to see it swap table ↔ swipe list)</p>
          <div class="card inner">
            <ui-collection
              [columns]="columns"
              [rows]="rows"
              mobilePrimary="name"
              mobileSecondary="status"
              [rowClickable]="true"
              (rowClick)="lastClicked.set($event.name)">
            </ui-collection>
          </div>

          <p class="cal-label">ui-page (scaffold: title/subtitle/actions/tabs/loading — shown inline, not full-screen)</p>
          <div class="card inner" style="padding:0; overflow:hidden;">
            <ui-page [title]="pageDemoTitle()" subtitle="Full page scaffold with header, actions and loading state" [loading]="pageDemoLoading()">
              <div actions>
                <ion-button size="small" fill="outline" (click)="pageDemoLoading.set(!pageDemoLoading())">
                  Toggle loading
                </ion-button>
              </div>
              <p class="muted" style="padding:0 0 8px;">Page body content goes here.</p>
            </ui-page>
          </div>
        </section>
      </div>
    </ion-content>
  `,
  styles: [`
    .demo { max-width: 980px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
    .card { background: var(--surface); border: 1px solid var(--ui-border); border-radius: var(--r); padding: 18px 20px; }
    .card.inner { margin-top: 14px; }
    .spark-demo { display: flex; flex-direction: column; gap: 8px; }
    .spark-demo__label { font-family: var(--font-mono); font-size: var(--fs-label); letter-spacing: var(--ls-label); text-transform: uppercase; color: var(--text-dim); }
    h2 { font-size: 14px; color: var(--text); margin: 0 0 14px; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 12px; }
    .grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 12px; }
    .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 14px; }
    .muted { font-size: 12px; color: var(--text-muted); margin: 4px 0 0; }
    @media (max-width: 640px) { .grid2, .grid3 { grid-template-columns: 1fr; } }

    /* option rows for the T7 status sheet (mirrors the picker's .opt look) */
    .optlist { display: flex; flex-direction: column; gap: 3px; }
    .opt { display: flex; align-items: center; gap: 11px; padding: 9px 10px;
      border-radius: var(--r-sm); cursor: pointer; border: 1px solid transparent; transition: background .1s; }
    .opt:hover { background: var(--surface-2); }
    .opt:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
    .opt--sel { background: var(--primary-weak); border-color: var(--primary-line); }
    .opt__title { flex: 1; min-width: 0; font-size: 13.5px; font-weight: 500; }
    .opt__check { width: 19px; height: 19px; border-radius: 6px; border: 1.5px solid var(--border-strong);
      display: grid; place-items: center; flex: none; }
    .opt__check ion-icon { width: 12px; height: 12px; color: var(--primary-ink); opacity: 0; }
    .opt--sel .opt__check { background: var(--primary); border-color: var(--primary); }
    .opt--sel .opt__check ion-icon { opacity: 1; }
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
  protected readonly period = signal<DateRangeValue>('24h');
  protected readonly periodLabel = computed(() => {
    const v = this.period();
    return typeof v === 'string' ? v : `${v.start} → ${v.end}`;
  });
  protected readonly statusPickerOptions: PickerOption[] = [
    { value: 'ONLINE', label: 'Online', dot: 'ONLINE' },
    { value: 'OFFLINE', label: 'Offline', dot: 'OFFLINE' },
    { value: 'MAINTENANCE', label: 'Maintenance', dot: 'MAINTENANCE' },
  ];
  protected readonly demoDevices: DevicePickerItem[] = this.rows.map(r => ({
    id: r.name, name: r.name, status: r.status, location: 'Rack A',
  }));
  // T13 — orphan components
  protected readonly pageDemoTitle = signal('Devices');
  protected readonly pageDemoLoading = signal(false);

  protected readonly demoUsers: UserPickerItem[] = [
    { id: 'u1', name: 'Ada Lovelace', email: 'ada@iot.io', role: 'ADMIN' },
    { id: 'u2', name: 'Bo Turing', email: 'bo@iot.io', role: 'USER' },
    { id: 'u3', name: 'Cy Hopper', email: 'cy@iot.io', role: 'SUPERADMIN' },
  ];
}
