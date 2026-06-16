/**
 * The shared/ui barrel — the ONLY import path for Ionic components in feature code.
 * Never import from @ionic/angular or @ionic/angular/standalone in features.
 *
 * Button variant → Ionic props mapping (no wrapper needed; use IonButton directly):
 *   primary  → fill="solid"   color="primary"
 *   subtle   → fill="outline" color="primary"
 *   ghost    → fill="clear"   color="medium"
 *   danger   → fill="solid"   color="danger"
 *   size sm  → size="small"
 */

// Lifecycle interfaces (from @ionic/angular, not standalone)
export { ViewWillEnter } from '@ionic/angular';

// Pull-to-refresh
export { IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';

// Structural (shell-level, exported for convenience in deep shell components)
export { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

// Surfaces
export {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
} from '@ionic/angular/standalone';

// Buttons & chips
export { IonButton, IonChip, IonFab, IonFabButton, IonFabList } from '@ionic/angular/standalone';

// Typography & layout helpers
export {
  IonLabel,
  IonNote,
  IonBadge,
  IonIcon,
  IonText,
} from '@ionic/angular/standalone';

// Form inputs
export { IonInput } from '@ionic/angular/standalone';

// Lists
export {
  IonList,
  IonListHeader,
  IonItem,
  IonItemDivider,
  IonItemGroup,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
} from '@ionic/angular/standalone';

// Feedback
export {
  IonSpinner,
  IonProgressBar,
  IonSkeletonText,
  IonToast,
} from '@ionic/angular/standalone';

// Controllers (service-layer; injected as Angular providers, not used in templates)
export {
  ToastController,
  ModalController,
  ActionSheetController,
  AlertController,
  LoadingController,
  PopoverController,
  AnimationController,
  NavController,
  MenuController,
} from '@ionic/angular/standalone';

// Overlays (used via ModalController / ActionSheetController in services)
export { IonModal, IonBackdrop } from '@ionic/angular/standalone';

// Media
export { IonAvatar, IonThumbnail } from '@ionic/angular/standalone';

// Controls (re-export; custom CVA wrappers added in T4)
export { IonRange, IonToggle } from '@ionic/angular/standalone';

// Segments
export { IonSegment, IonSegmentButton } from '@ionic/angular/standalone';

// Accordion
export { IonAccordion, IonAccordionGroup } from '@ionic/angular/standalone';

// Navigation (shell-level; available here so deep feature templates don't import directly)
export {
  IonNav,
  IonNavLink,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonFooter,
  IonContent,
  IonMenu,
  IonMenuButton,
  IonMenuToggle,
  IonSplitPane,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonTab,
  IonBreadcrumb,
  IonBreadcrumbs,
} from '@ionic/angular/standalone';

// Search
export { IonSearchbar } from '@ionic/angular/standalone';

// Theme service (T2)
export { ThemeService } from './theme/theme.service';
export type { Theme } from './theme/theme.service';

// Custom kit components — filled in by T3–T12; re-exported here to keep the
// import path stable for consumers.
// T3 — Badges
export { StatusBadgeComponent } from './badges/status.badge';
export type { DeviceStatus, CommandStatus, AlertStatus, AnyStatus } from './badges/status.badge';
export { StatusDotComponent } from './badges/status-dot.component';
export { SeverityBadgeComponent } from './badges/severity.badge';
export type { Severity } from './badges/severity.badge';
export { RoleBadgeComponent } from './badges/role.badge';
export type { UserRole } from './badges/role.badge';
export { DeviceTypeBadgeComponent } from './badges/device-type.badge';
// T4 — Form control wrappers (CVA)
export { UiInputComponent } from './forms/ui-input.component';
export { UiSwitchComponent } from './forms/ui-switch.component';
export { UiCheckboxComponent } from './forms/ui-checkbox.component';
export { UiSelectComponent } from './forms/ui-select.component';
export type { SelectOption } from './forms/ui-select.component';
export { UiSearchFieldComponent } from './forms/ui-search-field.component';
// T5 — Metric, Sparkline, EmptyState
export { SparklineComponent } from './data/sparkline.component';
export { MetricCardComponent } from './data/metric-card.component';
export type { DeltaDir } from './data/metric-card.component';
export { UiSkeletonComponent } from './data/skeleton.component';
export { EmptyStateComponent } from './data/empty-state.component';
// T6 — DataTable
export { DataTableComponent } from './data/data-table.component';
export type { ColumnDef } from './data/data-table.component';
// T7 — Sheets
export { BottomSheetComponent } from './sheets/bottom-sheet.component';
export { FilterChipComponent } from './sheets/filter-chip.component';
// T8 — Pickers
export { MultiSelectPickerComponent } from './pickers/multi-select-picker.component';
export type { PickerOption } from './pickers/multi-select-picker.component';
export { DevicePickerComponent } from './pickers/device-picker.component';
export type { DevicePickerItem } from './pickers/device-picker.component';
export { UserPickerComponent } from './pickers/user-picker.component';
export type { UserPickerItem } from './pickers/user-picker.component';
export { DateRangePickerComponent } from './pickers/date-range-picker.component';
export type { DateRangePreset } from './pickers/date-range-picker.component';
// T12 — Shell satellites
export { AppLogoComponent } from './brand/app-logo.component';
export { NetworkStatusComponent } from './feedback/network-status.component';
export { MaintenanceBannerComponent } from './feedback/maintenance-banner.component';
