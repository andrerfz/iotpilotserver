import {
  ChangeDetectionStrategy, Component,
  computed, inject, signal, viewChild,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  checkmarkOutline, closeOutline, banOutline, personOutline, addOutline, globeOutline,
} from 'ionicons/icons';
import {
  IonContent, IonCard, IonCardContent, IonButton, IonIcon,
  IonModal,
  AlertController,
  EmptyStateComponent,
  StatusBadgeComponent,
  UiSearchFieldComponent, UiSelectComponent,
  SwipeListComponent, UiListRowComponent, BottomSheetComponent,
  ViewWillEnter,
  IonRefresher,
  IonRefresherContent,
} from '@ng/shared/ui';
import type { SelectOption, SwipeAction } from '@ng/shared/ui';
import { ViewportService } from '@ng/core/layout/viewport.service';
import { AdminNewUserModalComponent } from '../admin-new-user/admin-new-user.modal';
import { AuthService } from '../../../../core/auth/auth.service';
import { hasRole } from '../../../../core/auth/roles';
import { AdminUsersService, AdminUser } from '../../services/admin-users.service';
import { TopbarService } from '../../../../shell/topbar.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';

addIcons({ checkmarkOutline, closeOutline, banOutline, personOutline, addOutline, globeOutline });

@Component({
  selector: 'app-admin-users',
  templateUrl: 'admin-users.page.html',
  styleUrls: ['admin-users.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonContent, IonCard, IonCardContent, IonButton, IonIcon,
    IonModal,
    EmptyStateComponent,
    StatusBadgeComponent,
    UiSearchFieldComponent, UiSelectComponent,
    SwipeListComponent, UiListRowComponent, BottomSheetComponent,
    AdminNewUserModalComponent,
    IonRefresher, IonRefresherContent,
    TranslatePipe,
  ],
})
export class AdminUsersPage implements ViewWillEnter {
  protected readonly svc = inject(AdminUsersService);
  private readonly auth = inject(AuthService);
  private readonly alertCtrl = inject(AlertController);
  private readonly topbar = inject(TopbarService);
  private readonly tenantCtx = inject(TenantContextService);
  private readonly t = inject(TranslateService);
  protected readonly vp = inject(ViewportService);

  protected statusFilter = '';
  protected readonly searchQuery = signal('');
  protected readonly actionLoading = signal(false);
  protected readonly showNewUserModal = signal(false);

  private readonly userSheet = viewChild<BottomSheetComponent>('userSheet');

  protected readonly isSuperAdmin = computed(() => hasRole(this.auth.role(), 'SUPERADMIN'));

  /** True when SUPERADMIN has no active tenant — shows cross-tenant platform view. */
  readonly platformMode = computed(
    () => hasRole(this.auth.role(), 'SUPERADMIN') && !this.tenantCtx.isActive(),
  );

  /** Selected user for the read-only detail sheet (mobile tap). */
  protected readonly selectedUser = signal<AdminUser | null>(null);

  // Mobile swipe actions (desktop uses the table's actions cell). Role/self-gated.
  protected readonly rowActions: SwipeAction<AdminUser>[] = [
    { key: 'approve',  label: 'admin.users.actions.approve',  icon: 'checkmark-outline', color: 'success', show: (u) => u.status === 'PENDING' && this.isSuperAdmin() },
    { key: 'reject',   label: 'admin.users.actions.reject',   icon: 'close-outline',     color: 'danger',  show: (u) => u.status === 'PENDING' && this.isSuperAdmin() },
    { key: 'suspend',  label: 'admin.users.actions.suspend',  icon: 'ban-outline',       color: 'warning', show: (u) => u.status === 'ACTIVE' && this.isSuperAdmin() && !this.isSelf(u) },
    { key: 'activate', label: 'admin.users.actions.activate', icon: 'checkmark-outline', color: 'success', show: (u) => u.status === 'SUSPENDED' && this.isSuperAdmin() },
  ];

  protected onSwipeAction(ev: { key: string; item: AdminUser }): void {
    switch (ev.key) {
      case 'approve':  void this.onApprove(ev.item); break;
      case 'reject':   void this.onReject(ev.item); break;
      case 'suspend':  void this.onSuspend(ev.item); break;
      case 'activate': void this.onActivate(ev.item); break;
    }
  }

  protected openDetail(user: AdminUser): void {
    this.selectedUser.set(user);
    this.userSheet()?.open();
  }

  protected readonly statusOptions: SelectOption[] = [
    { label: 'fields.all_statuses', value: '' },
    { label: 'status.pending',      value: 'PENDING' },
    { label: 'fields.active',       value: 'ACTIVE' },
    { label: 'fields.suspended',    value: 'SUSPENDED' },
  ];

  protected readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.svc.users();
    return this.svc.users().filter(u =>
      (u.name ?? u.username ?? '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q),
    );
  });

  constructor() {
    toObservable(this.tenantCtx.customer)
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => void this.svc.load());
  }

  ionViewWillEnter(): void {
    this.topbar.set('nav.users', { icon: 'add-outline', handler: () => this.openNewUserModal() });
    void this.svc.load(this.statusFilter || undefined);
  }

  protected onRefresh(ev: Event): void {
    void this.svc.load().finally(() => {
      ((ev as CustomEvent).target as HTMLIonRefresherElement | null)?.complete();
    });
  }

  protected onStatusChange(val: string): void {
    void this.svc.load(val || undefined);
  }

  protected openNewUserModal(): void {
    this.showNewUserModal.set(true);
  }

  protected onModalDismissed(created: boolean): void {
    this.showNewUserModal.set(false);
    if (created) void this.svc.load(this.statusFilter || undefined);
  }

  protected displayName(user: AdminUser): string {
    return user.name ?? user.username ?? user.email;
  }

  /** True when the row is the signed-in user (used to hide self-suspend). */
  protected isSelf(user: AdminUser): boolean {
    return this.auth.currentUser()?.id === user.id;
  }

  async onApprove(user: AdminUser): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.t.instant('admin.dialogs.user_approve'),
      message: this.t.instant('admin.dialogs.user_approve_msg', { email: user.email }),
      buttons: [
        { text: this.t.instant('common.cancel'), role: 'cancel' },
        { text: this.t.instant('admin.dialogs.approve'), role: 'confirm', handler: () => void this.doApprove(user, 'approve') },
      ],
    });
    await alert.present();
  }

  async onReject(user: AdminUser): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.t.instant('admin.dialogs.user_reject'),
      message: this.t.instant('admin.dialogs.user_reject_msg', { email: user.email }),
      buttons: [
        { text: this.t.instant('common.cancel'), role: 'cancel' },
        { text: this.t.instant('admin.dialogs.reject'), role: 'destructive', handler: () => void this.doApprove(user, 'reject') },
      ],
    });
    await alert.present();
  }

  async onSuspend(user: AdminUser): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.t.instant('admin.dialogs.user_suspend'),
      message: this.t.instant('admin.dialogs.user_suspend_msg', { email: user.email }),
      buttons: [
        { text: this.t.instant('common.cancel'), role: 'cancel' },
        { text: this.t.instant('admin.dialogs.suspend'), role: 'destructive', handler: () => void this.doUpdateStatus(user, 'SUSPENDED') },
      ],
    });
    await alert.present();
  }

  async onActivate(user: AdminUser): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.t.instant('admin.dialogs.user_activate'),
      message: this.t.instant('admin.dialogs.user_activate_msg', { email: user.email }),
      buttons: [
        { text: this.t.instant('common.cancel'), role: 'cancel' },
        { text: this.t.instant('common.activate'), role: 'confirm', handler: () => void this.doUpdateStatus(user, 'ACTIVE') },
      ],
    });
    await alert.present();
  }

  private async doApprove(user: AdminUser, action: 'approve' | 'reject'): Promise<void> {
    this.actionLoading.set(true);
    try {
      await this.svc.approve(user.id, action);
    } finally {
      this.actionLoading.set(false);
    }
  }

  private async doUpdateStatus(user: AdminUser, status: 'ACTIVE' | 'SUSPENDED'): Promise<void> {
    this.actionLoading.set(true);
    try {
      await this.svc.updateStatus(user.id, status);
    } finally {
      this.actionLoading.set(false);
    }
  }
}
