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
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, trashOutline, mailOutline } from 'ionicons/icons';
import { TopbarService } from '@ng/shell/topbar.service';
import { AuthService } from '@ng/core/auth/auth.service';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
  DataTableComponent,
  StatusBadgeComponent,
  RoleBadgeComponent,
  UiInputComponent,
  UiSelectComponent,
} from '@ng/shared/ui';
import type { ColumnDef, SelectOption } from '@ng/shared/ui';
import { Api } from '@ng/core/api/generated/api';
import { listUsers } from '@ng/core/api/generated/fn/users/list-users';
import { inviteUser } from '@ng/core/api/generated/fn/users/invite-user';
import { updateUser } from '@ng/core/api/generated/fn/users/update-user';
import { deleteUser } from '@ng/core/api/generated/fn/users/delete-user';
import { resendInvite } from '@ng/core/api/generated/fn/users/resend-invite';
import type { UserResponse } from '@ng/core/api/generated/models/user-response';

addIcons({ addOutline, closeOutline, trashOutline, mailOutline });

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'ADMIN', label: 'settings.members.role_admin' },
  { value: 'USER', label: 'settings.members.role_user' },
  { value: 'READONLY', label: 'settings.members.role_readonly' },
];

@Component({
  selector: 'app-settings-members',
  templateUrl: 'settings-members.page.html',
  styleUrl: 'settings-members.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    IonContent,
    IonButton,
    IonButtons,
    IonHeader,
    IonIcon,
    IonModal,
    IonSpinner,
    IonTitle,
    IonToolbar,
    DataTableComponent,
    StatusBadgeComponent,
    RoleBadgeComponent,
    UiInputComponent,
    UiSelectComponent,
  ],
})
export class SettingsMembersPage implements OnInit, AfterViewInit {
  private readonly api = inject(Api);
  private readonly topbar = inject(TopbarService);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly t = inject(TranslateService);
  private readonly auth = inject(AuthService);
  private readonly alertCtrl = inject(AlertController);

  readonly isLoading = signal(true);
  readonly listError = signal('');
  readonly members = signal<UserResponse[]>([]);

  readonly showInviteModal = signal(false);
  readonly inviteForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['USER'],
  });
  readonly isInviting = signal(false);
  readonly inviteError = signal('');

  readonly roleUpdatingId = signal<string | null>(null);
  readonly removingId = signal<string | null>(null);
  readonly resendingId = signal<string | null>(null);
  readonly rowError = signal('');
  readonly rowSuccess = signal('');

  readonly roleOptions = ROLE_OPTIONS;
  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  /** One FormControl per row, created lazily — ui-select is a ControlValueAccessor
   * (bottom-sheet picker), it has no standalone [value]/(change) API. */
  private readonly roleControls = new Map<string, FormControl<string>>();

  readonly cols = signal<ColumnDef<UserResponse>[]>([]);

  @ViewChild('roleCell')   private roleCellTpl!: TemplateRef<{ $implicit: UserResponse }>;
  @ViewChild('statusCell') private statusCellTpl!: TemplateRef<{ $implicit: UserResponse }>;
  @ViewChild('actionsCell') private actionsCellTpl!: TemplateRef<{ $implicit: UserResponse }>;

  ngOnInit(): void {
    this.topbar.set('settings.tabs.members', { icon: 'add-outline', handler: () => this.openInviteModal() });
    this.destroy.onDestroy(() => this.topbar.clear());
    void this.loadMembers();
  }

  ngAfterViewInit(): void {
    this.cols.set([
      { key: 'username', label: 'fields.name', sortable: true },
      { key: 'email', label: 'fields.email', hideOnMobile: true },
      { key: 'role', label: 'fields.role', cellTemplate: this.roleCellTpl },
      { key: 'status', label: 'fields.status', cellTemplate: this.statusCellTpl },
      { key: 'actions', label: '', cellTemplate: this.actionsCellTpl },
    ]);
  }

  async loadMembers(): Promise<void> {
    this.isLoading.set(true);
    this.listError.set('');
    try {
      const res = await this.api.invoke(listUsers, { limit: 100 });
      const data = (res as unknown as { data?: UserResponse[] }).data ?? [];
      this.members.set(data);
    } catch (err) {
      this.listError.set(err instanceof Error ? err.message : this.t.instant('settings.members.msg_load_failed'));
    } finally {
      this.isLoading.set(false);
    }
  }

  canManage(row: UserResponse): boolean {
    return row.role !== 'SUPERADMIN' && row.id !== this.currentUserId();
  }

  roleControlFor(row: UserResponse): FormControl<string> {
    let ctrl = this.roleControls.get(row.id);
    if (!ctrl) {
      ctrl = new FormControl(row.role, { nonNullable: true });
      ctrl.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe((value) => {
        void this.onRoleChange(row, value);
      });
      this.roleControls.set(row.id, ctrl);
    }
    return ctrl;
  }

  openInviteModal(): void {
    this.inviteForm.reset({ email: '', role: 'USER' });
    this.inviteError.set('');
    this.showInviteModal.set(true);
  }

  onInviteModalDismiss(): void {
    this.showInviteModal.set(false);
  }

  async onInvite(): Promise<void> {
    if (this.inviteForm.invalid) return;
    this.isInviting.set(true);
    this.inviteError.set('');
    try {
      const vals = this.inviteForm.getRawValue();
      await this.api.invoke(inviteUser, {
        body: { email: vals.email, role: vals.role as 'ADMIN' | 'USER' | 'READONLY' },
      });
      this.showInviteModal.set(false);
      await this.loadMembers();
    } catch (err) {
      this.inviteError.set(err instanceof Error ? err.message : this.t.instant('settings.members.msg_invite_failed'));
    } finally {
      this.isInviting.set(false);
    }
  }

  private async onRoleChange(row: UserResponse, value: string): Promise<void> {
    if (!value || value === row.role) return;
    this.roleUpdatingId.set(row.id);
    this.rowError.set('');
    try {
      await this.api.invoke(updateUser, {
        id: row.id,
        body: { role: value as 'ADMIN' | 'USER' | 'READONLY' },
      });
      await this.loadMembers();
    } catch (err) {
      this.rowError.set(err instanceof Error ? err.message : this.t.instant('settings.members.msg_role_failed'));
    } finally {
      this.roleUpdatingId.set(null);
    }
  }

  async onRemove(row: UserResponse): Promise<void> {
    const isPending = row.status === 'PENDING';
    const alert = await this.alertCtrl.create({
      header: this.t.instant(isPending ? 'settings.members.cancel_invite_title' : 'settings.members.remove_title'),
      message: this.t.instant(isPending ? 'settings.members.cancel_invite_msg' : 'settings.members.remove_msg', { name: row.username }),
      buttons: [
        { text: this.t.instant('common.cancel'), role: 'cancel' },
        {
          text: this.t.instant(isPending ? 'settings.members.cancel_invite_confirm' : 'settings.members.remove_confirm'),
          role: 'destructive',
          handler: () => void this.doRemove(row.id),
        },
      ],
    });
    await alert.present();
  }

  async onResend(row: UserResponse): Promise<void> {
    this.resendingId.set(row.id);
    this.rowError.set('');
    this.rowSuccess.set('');
    try {
      await this.api.invoke(resendInvite, { id: row.id });
      this.rowSuccess.set(this.t.instant('settings.members.msg_resend_success', { email: row.email }));
    } catch (err) {
      this.rowError.set(err instanceof Error ? err.message : this.t.instant('settings.members.msg_resend_failed'));
    } finally {
      this.resendingId.set(null);
    }
  }

  private async doRemove(id: string): Promise<void> {
    this.removingId.set(id);
    this.rowError.set('');
    try {
      await this.api.invoke(deleteUser, { id });
      await this.loadMembers();
    } catch (err) {
      this.rowError.set(err instanceof Error ? err.message : this.t.instant('settings.members.msg_remove_failed'));
    } finally {
      this.removingId.set(null);
    }
  }
}
