import {
  AfterViewInit, ChangeDetectionStrategy, Component,
  computed, inject, signal, TemplateRef, ViewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  checkmarkOutline, closeOutline, banOutline, personOutline, addOutline,
} from 'ionicons/icons';
import {
  IonContent, IonCard, IonCardContent, IonButton, IonIcon,
  IonModal,
  AlertController,
  DataTableComponent, EmptyStateComponent,
  StatusBadgeComponent,
  UiSearchFieldComponent, UiSelectComponent,
  ViewWillEnter,
  IonRefresher,
  IonRefresherContent,
} from '@ng/shared/ui';
import type { ColumnDef, SelectOption } from '@ng/shared/ui';
import { AdminNewUserModalComponent } from '../admin-new-user/admin-new-user.modal';
import { AuthService } from '../../../../core/auth/auth.service';
import { hasRole } from '../../../../core/auth/roles';
import { AdminUsersService, AdminUser } from '../../services/admin-users.service';
import { TopbarService } from '../../../../shell/topbar.service';
import { TenantContextService } from '@ng/core/auth/tenant-context.service';
import { AdminTabsComponent } from '../../components/admin-tabs.component';

addIcons({ checkmarkOutline, closeOutline, banOutline, personOutline, addOutline });

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
    DataTableComponent, EmptyStateComponent,
    StatusBadgeComponent,
    UiSearchFieldComponent, UiSelectComponent,
    AdminNewUserModalComponent,
    AdminTabsComponent,
    IonRefresher, IonRefresherContent,
    TranslatePipe,
  ],
})
export class AdminUsersPage implements AfterViewInit, ViewWillEnter {
  protected readonly svc = inject(AdminUsersService);
  private readonly auth = inject(AuthService);
  private readonly alertCtrl = inject(AlertController);
  private readonly topbar = inject(TopbarService);
  private readonly tenantCtx = inject(TenantContextService);

  protected statusFilter = '';
  protected readonly searchQuery = signal('');
  protected readonly actionLoading = signal(false);
  protected readonly showNewUserModal = signal(false);
  protected readonly cols = signal<ColumnDef<AdminUser>[]>([]);

  @ViewChild('statusCell')  private statusCellTpl!: TemplateRef<{ $implicit: AdminUser }>;
  @ViewChild('actionsCell') private actionsCellTpl!: TemplateRef<{ $implicit: AdminUser }>;

  protected readonly isSuperAdmin = computed(() => hasRole(this.auth.role(), 'SUPERADMIN'));

  protected readonly statusOptions: SelectOption[] = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending',      value: 'PENDING' },
    { label: 'Active',       value: 'ACTIVE' },
    { label: 'Suspended',    value: 'SUSPENDED' },
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
    this.topbar.set('Users', { icon: 'add-outline', handler: () => this.openNewUserModal() });
    void this.svc.load();
  }

  protected onRefresh(ev: Event): void {
    void this.svc.load().finally(() => {
      ((ev as CustomEvent).target as HTMLIonRefresherElement | null)?.complete();
    });
  }

  ngAfterViewInit(): void {
    this.cols.set([
      { key: 'name',     label: 'Name',    sortable: true },
      { key: 'email',    label: 'Email',   sortable: true },
      { key: 'role',     label: 'Role' },
      { key: 'status',   label: 'Status',  cellTemplate: this.statusCellTpl },
      { key: 'createdAt', label: 'Joined', sortable: true },
      { key: 'actions',  label: '',        cellTemplate: this.actionsCellTpl },
    ]);
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

  async onApprove(user: AdminUser): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Approve User',
      message: `Approve ${user.email} and grant them access?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Approve', role: 'confirm', handler: () => void this.doApprove(user, 'approve') },
      ],
    });
    await alert.present();
  }

  async onReject(user: AdminUser): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Reject User',
      message: `Reject and deny access for ${user.email}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Reject', role: 'destructive', handler: () => void this.doApprove(user, 'reject') },
      ],
    });
    await alert.present();
  }

  async onSuspend(user: AdminUser): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Suspend User',
      message: `Suspend ${user.email}? They will lose access immediately.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Suspend', role: 'destructive', handler: () => void this.doUpdateStatus(user, 'SUSPENDED') },
      ],
    });
    await alert.present();
  }

  async onActivate(user: AdminUser): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Activate User',
      message: `Reactivate ${user.email}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Activate', role: 'confirm', handler: () => void this.doUpdateStatus(user, 'ACTIVE') },
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
