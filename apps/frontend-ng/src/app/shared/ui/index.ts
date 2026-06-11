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
} from '@ionic/angular/standalone';

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
// export { StatusBadgeComponent, StatusDotComponent, SeverityBadgeComponent, RoleBadgeComponent, DeviceTypeBadgeComponent } from './badges';
// T4 — Form control wrappers
// export { UiInputComponent, UiSwitchComponent, UiCheckboxComponent, UiSelectComponent } from './forms';
// T5 — Cards & states
// export { MetricCardComponent, SparklineComponent, EmptyStateComponent } from './data';
// T6 — DataTable
// export { DataTableComponent } from './data';
// T7 — Sheets
// export { BottomSheetComponent, FilterChipComponent } from './sheets';
// T8 — Pickers
// export { MultiSelectPickerComponent, DevicePickerComponent, UserPickerComponent, DateRangePickerComponent } from './pickers';
