import {
  AfterViewInit, ChangeDetectionStrategy, Component,
  computed, DestroyRef, inject, signal, TemplateRef, ViewChild,
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
  StatusBadgeComponent,
  UiSearchFieldComponent, UiSelectComponent,
  ViewWillEnter,
  IonRefresher, IonRefresherContent,
} from '@ng/shared/ui';
import type { ColumnDef, SelectOption } from '@ng/shared/ui';
import { AdminCustomersService, AdminCustomer } from '../../services/admin-customers.service';
import { TopbarService } from '../../../../shell/topbar.service';
import { AdminTabsComponent } from '../../components/admin-tabs.component';

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
    StatusBadgeComponent,
    UiSearchFieldComponent, UiSelectComponent,
    AdminTabsComponent,
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

  protected statusFilter = '';
  protected readonly searchQuery = signal('');
  protected readonly actionLoading = signal(false);
  protected readonly cols = signal<ColumnDef<AdminCustomer>[]>([]);

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

  protected async onAdd(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.t.instant('admin.dialogs.customer_new'),
      inputs: [
        { name: 'name',         type: 'text',  placeholder: 'Name *' },
        { name: 'contactEmail', type: 'email', placeholder: 'Contact email' },
      ],
      buttons: [
        { text: this.t.instant('common.cancel'), role: 'cancel' },
        {
          text: this.t.instant('common.create'),
          handler: async (data: { name: string; contactEmail: string }) => {
            if (!data.name?.trim()) return false;
            this.actionLoading.set(true);
            try {
              await this.svc.create(data.name.trim(), undefined, data.contactEmail || undefined);
            } finally {
              this.actionLoading.set(false);
            }
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  protected async onEdit(customer: AdminCustomer): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.t.instant('admin.dialogs.customer_edit'),
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Name', value: customer.name },
      ],
      buttons: [
        { text: this.t.instant('common.cancel'), role: 'cancel' },
        {
          text: this.t.instant('common.save'),
          handler: async (data: { name: string }) => {
            if (!data.name?.trim()) return false;
            this.actionLoading.set(true);
            try {
              await this.svc.update(customer.id, data.name.trim());
            } finally {
              this.actionLoading.set(false);
            }
            return true;
          },
        },
      ],
    });
    await alert.present();
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
