import {
  ChangeDetectionStrategy, Component, inject, OnInit, output, signal,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonFooter, IonSpinner,
  UiInputComponent, UiSelectComponent,
} from '@ng/shared/ui';
import type { SelectOption } from '@ng/shared/ui';
import { Api } from '@ng/core/api/generated/api';
import { listAdminCustomers } from '@ng/core/api/generated/fn/admin/list-admin-customers';
import { createUser } from '@ng/core/api/generated/fn/users/create-user';

addIcons({ closeOutline });

interface Customer { id: string; name: string; }

@Component({
  selector: 'app-admin-new-user-modal',
  templateUrl: 'admin-new-user.modal.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonContent, IonFooter, IonSpinner,
    UiInputComponent, UiSelectComponent,
    TranslatePipe,
  ],
})
export class AdminNewUserModalComponent implements OnInit {
  readonly dismissed = output<boolean>();

  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder);
  private readonly t = inject(TranslateService);

  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly customerOptions = signal<SelectOption[]>([]);

  protected readonly roleOptions: SelectOption[] = [
    { label: 'User',     value: 'USER' },
    { label: 'Admin',    value: 'ADMIN' },
    { label: 'Readonly', value: 'READONLY' },
  ];

  protected readonly form = this.fb.group({
    email:      ['', [Validators.required, Validators.email]],
    username:   ['', Validators.required],
    password:   ['', [Validators.required, Validators.minLength(8)]],
    role:       ['USER' as 'USER' | 'ADMIN' | 'READONLY', Validators.required],
    customerId: ['', Validators.required],
  });

  ngOnInit(): void {
    void this.loadCustomers();
  }

  private async loadCustomers(): Promise<void> {
    try {
      const res = await this.api.invoke(listAdminCustomers, { limit: 100 });
      const body = res as unknown as { data?: Customer[] };
      this.customerOptions.set(
        (body.data ?? []).map(c => ({ label: c.name, value: c.id })),
      );
    } catch {
      // non-critical; user can't pick customer but error is shown in form
    }
  }

  protected fieldError(field: string): string {
    const ctrl = this.form.get(field);
    if (!ctrl?.invalid || !ctrl.touched) return '';
    if (ctrl.hasError('required')) return this.t.instant('validation.required');
    if (ctrl.hasError('email')) return this.t.instant('validation.email');
    if (ctrl.hasError('minlength')) return this.t.instant('validation.min8');
    return 'Invalid';
  }

  protected async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.error.set('');
    const v = this.form.value;
    try {
      await this.api.invoke(createUser, {
        body: {
          email:      v.email!,
          username:   v.username!,
          password:   v.password!,
          role:       v.role!,
          customerId: v.customerId!,
        },
      });
      this.dismissed.emit(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      this.saving.set(false);
    }
  }

  protected onCancel(): void {
    this.dismissed.emit(false);
  }
}
