import {
  AfterViewInit, ChangeDetectionStrategy, Component,
  computed, DestroyRef, inject, signal, TemplateRef, ViewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
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

  protected statusFilter = '';
  protected readonly searchQuery = signal('');
  protected readonly actionLoading = signal(false);
  protected readonly cols = signal<ColumnDef<AdminCustomer>[]>([]);

  @ViewChild('statusCell')  private statusCellTpl!: TemplateRef<{ $implicit: AdminCustomer }>;
  @ViewChild('actionsCell') private actionsCellTpl!: TemplateRef<{ $implicit: AdminCustomer }>;

  protected readonly statusOptions: SelectOption[] = [
    { label: 'All Statuses', value: '' },
    { label: 'Active',       value: 'ACTIVE' },
    { label: 'Inactive',     value: 'INACTIVE' },
    { label: 'Suspended',    value: 'SUSPENDED' },
  ];

  protected readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.svc.customers();
    return this.svc.customers().filter(c =>
      c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  });

  ionViewWillEnter(): void {
    this.topbar.set('Customers', { icon: 'add-outline', handler: () => void this.onAdd() });
    this.destroy.onDestroy(() => this.topbar.clear());
    void this.svc.load('', this.statusFilter || undefined);
  }

  ngAfterViewInit(): void {
    this.cols.set([
      { key: 'name',      label: 'Name',    sortable: true },
      { key: 'slug',      label: 'Slug',    sortable: true },
      { key: 'createdAt', label: 'Created', sortable: true },
      { key: 'status',    label: 'Status',  cellTemplate: this.statusCellTpl },
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
      header: 'New Customer',
      inputs: [
        { name: 'name',         type: 'text',  placeholder: 'Name *' },
        { name: 'contactEmail', type: 'email', placeholder: 'Contact email' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
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
      header: 'Edit Customer',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'Name', value: customer.name },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
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
      header: 'Deactivate Customer',
      message: `Deactivate "${customer.name}"? This will suspend access for all users in this tenant.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Deactivate',
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
