import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  ViewChild,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { TopbarService } from '@ng/shell/topbar.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  flashOutline,
  powerOutline,
  refreshOutline,
  reloadOutline,
  cloudDownloadOutline,
} from 'ionicons/icons';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonSkeletonText,
  IonText,
  DataTableComponent,
  EmptyStateComponent,
  StatusBadgeComponent,
} from '@ng/shared/ui';
import type { ColumnDef } from '@ng/shared/ui';
import type { DeviceCommand } from '@ng/core/api/generated/models/device-command';
import { DeviceDetailService } from '../../services/device-detail.service';
import { ToastService } from '@ng/core/errors/toast.service';
import { CommandSheetComponent } from '../../components/command-sheet/command-sheet.component';

addIcons({ alertCircleOutline, flashOutline, powerOutline, refreshOutline, reloadOutline, cloudDownloadOutline });

interface QuickAction {
  id: NonNullable<DeviceCommand['command']>;
  label: string;
  description: string;
  icon: string;
  color: string;
  requiresConfirmation: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'REBOOT', label: 'device_commands.reboot', description: 'device_commands.reboot_desc', icon: 'reload-outline', color: 'warning', requiresConfirmation: true },
  { id: 'SHUTDOWN', label: 'device_commands.shutdown', description: 'device_commands.shutdown_desc', icon: 'power-outline', color: 'danger', requiresConfirmation: true },
  { id: 'UPDATE', label: 'device_commands.update_system', description: 'device_commands.update_desc', icon: 'cloud-download-outline', color: 'primary', requiresConfirmation: true },
  { id: 'RESTART', label: 'device_commands.restart_services', description: 'device_commands.restart_desc', icon: 'refresh-outline', color: 'secondary', requiresConfirmation: false },
];

@Component({
  selector: 'app-device-commands',
  templateUrl: 'device-commands.page.html',
  styleUrls: ['device-commands.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonSkeletonText,
    IonText,
    DataTableComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    CommandSheetComponent,
  ],
})
export class DeviceCommandsPage implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly topbar = inject(TopbarService);
  private readonly svc = inject(DeviceDetailService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly t = inject(TranslateService);

  private readonly deviceId = signal('');
  readonly device = this.svc.device;
  readonly commands = this.svc.deviceCommands;
  readonly executing = signal(false);

  readonly pendingAction = signal<QuickAction | null>(null);
  readonly quickActions = QUICK_ACTIONS;

  @ViewChild('commandCell') private commandCellTpl!: TemplateRef<{ $implicit: DeviceCommand }>;
  @ViewChild('statusCell') private statusCellTpl!: TemplateRef<{ $implicit: DeviceCommand }>;
  readonly columns = signal<ColumnDef<DeviceCommand>[]>([]);

  private readonly commandSheet = viewChild.required(CommandSheetComponent);

  constructor() {
    const id = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.deviceId.set(id);
  }

  ngOnInit(): void {
    this.topbar.set('topbar.commands');
    void this.svc.deviceCommands.load({ id: this.deviceId(), limit: 50 });
    interval(5000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.svc.deviceCommands.reload());
  }

  ngAfterViewInit(): void {
    this.columns.set([
      { key: 'command', label: 'fields.command', sortable: true, cellTemplate: this.commandCellTpl },
      { key: 'status', label: 'fields.status', sortable: true, cellTemplate: this.statusCellTpl },
      { key: 'createdAt', label: 'fields.when' },
    ]);
  }

  onIssueCommand(): void {
    this.commandSheet().openForIssue();
  }

  onRowClick(cmd: DeviceCommand): void {
    this.commandSheet().openForDetail(cmd);
  }

  onQuickAction(action: QuickAction): void {
    if (action.requiresConfirmation) {
      this.pendingAction.set(action);
    } else {
      void this.dispatch(action.id);
    }
  }

  async dispatch(id: NonNullable<DeviceCommand['command']>): Promise<void> {
    this.pendingAction.set(null);
    this.executing.set(true);
    try {
      await this.svc.sendCommand(this.deviceId(), id);
      void this.toast.success(`Command "${id}" issued`);
    } catch (e) {
      void this.toast.error(e instanceof Error ? e.message : this.t.instant('device_commands.msg_issue_failed'));
    } finally {
      this.executing.set(false);
    }
  }

  onCancelAction(): void {
    this.pendingAction.set(null);
  }

  onRetry(): void {
    void this.svc.deviceCommands.load({ id: this.deviceId(), limit: 50 });
  }
}
