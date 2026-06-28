import {
  AfterViewInit, ChangeDetectionStrategy, Component,
  computed, DestroyRef, inject, signal, TemplateRef, ViewChild, viewChild,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  addOutline, pencilOutline, banOutline, businessOutline,
} from 'ionicons/icons';
import {
  IonContent, IonCard, IonCardContent, IonButton, IonIcon,
  AlertController,
  DataTableComponent, EmptyStateComponent,
  StatusBadgeComponent, StatusDotComponent,
  UiSearchFieldComponent, UiSelectComponent, UiInputComponent,
  BottomSheetComponent,
  ViewWillEnter,
  IonRefresher, IonRefresherContent,
} from '@ng/shared/ui';
import type { ColumnDef, SelectOption } from '@ng/shared/ui';
import { ViewportService } from '@ng/core/layout/viewport.service';
import { AdminCustomersService, AdminCustomer } from '../../services/admin-customers.service';
import { TopbarService } from '../../../../shell/topbar.service';

addIcons({ addOutline, pencilOutline, banOutline, businessOutline });

@Component({
  selector: 'app-admin-customers',
  templateUrl: 'admin-customers.page.html',
  styleUrls: ['admin-customers.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonContent, IonCard, IonCardContent, IonButton, IonIcon,
    DataTableComponent, EmptyStateComponent,
    StatusBadgeComponent, StatusDotComponent,
    UiSearchFieldComponent, UiSelectComponent, UiInputComponent,
    BottomSheetComponent,
    IonRefresher, IonRefresherContent,
    TranslatePipe,
  ],
})
export class AdminCustomersPage implements AfterViewInit, ViewWillEnter {
  protected readonly svc = inject(AdminCustomersService);
  private readonly alertCtrl = inject(AlertController);
  private readonly topbar = inject(TopbarService);
  private readonly destroy = inject(DestroyRef);
  private readonly t = inject(TranslateService);
  protected readonly vp = inject(ViewportService);

  private readonly editSheet = viewChild<BottomSheetComponent>('editSheet');
  protected statusFilter = '';
  protected readonly searchQuery = signal('');
  protected readonly actionLoading = signal(false);
  protected readonly cols = signal<ColumnDef<AdminCustomer>[]>([]);

  // Edit/add bottom-sheet state (replaces the AlertController prompt).
  protected readonly editingId = signal<string | null>(null);
  protected readonly formName = signal('');
  protected readonly formEmail = signal('');

  @ViewChild('statusCell')  private statusCellTpl!: TemplateRef<{ $implicit: AdminCustomer }>;
  @ViewChild('actionsCell') private actionsCellTpl!: TemplateRef<{ $implicit: AdminCustomer }>;

  protected readonly statusOptions: SelectOption[] = [
    { label: 'fields.all_statuses', value: '' },
    { label: 'fields.active',       value: 'ACTIVE' },
    { label: 'fields.inactive',     value: 'INACTIVE' },
    { label: 'fields.suspended',    value: 'SUSPENDED' },
  ];

  protected readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.svc.customers();
    return this.svc.customers().filter(c =>
      c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  });

  ionViewWillEnter(): void {
    this.topbar.set('nav.customers', { icon: 'add-outline', handler: () => void this.onAdd() });
    this.destroy.onDestroy(() => this.topbar.clear());
    void this.svc.load('', this.statusFilter || undefined);
  }

  ngAfterViewInit(): void {
    this.cols.set([
      { key: 'name',      label: 'fields.name',    sortable: true },
      { key: 'slug',      label: 'fields.slug',    sortable: true },
      { key: 'createdAt', label: 'fields.created', sortable: true },
      { key: 'status',    label: 'fields.status',  cellTemplate: this.statusCellTpl },
      { key: '__actions', label: '',        cellTemplate: this.actionsCellTpl },
    ]);
  }

  protected onStatusChange(status: string): void {
    void this.svc.load(this.searchQuery() || undefined, status || undefined);
  }

  protected async onRefresh(event: { target: { complete(): void } }): Promise<void> {
    await this.svc.load(this.searchQuery() || undefined, this.statusFilter || undefined);
    event.target.complete();
  }

  protected onAdd(): void {
    this.editingId.set(null);
    this.formName.set('');
    this.formEmail.set('');
    this.editSheet()?.open();
  }

  protected onEdit(customer: AdminCustomer): void {
    this.editingId.set(customer.id);
    this.formName.set(customer.name);
    this.formEmail.set('');
    this.editSheet()?.open();
  }

  protected async onSaveSheet(): Promise<void> {
    const name = this.formName().trim();
    if (!name) return;
    const email = this.formEmail().trim() || undefined;
    this.actionLoading.set(true);
    try {
      const id = this.editingId();
      if (id) {
        await this.svc.update(id, name, undefined, email);
      } else {
        await this.svc.create(name, undefined, email);
      }
      this.editSheet()?.close();
    } finally {
      this.actionLoading.set(false);
    }
  }

  protected async onDeactivate(customer: AdminCustomer): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: this.t.instant('admin.dialogs.customer_deactivate'),
      message: this.t.instant('admin.dialogs.customer_deactivate_msg', { name: customer.name }),
      buttons: [
        { text: this.t.instant('common.cancel'), role: 'cancel' },
        {
          text: this.t.instant('admin.dialogs.deactivate'),
          role: 'destructive',
          handler: async () => {
            this.actionLoading.set(true);
            try {
              await this.svc.deactivate(customer.id);
            } finally {
              this.actionLoading.set(false);
            }
          },
        },
      ],
    });
    await confirm.present();
  }
}
