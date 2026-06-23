import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { terminalOutline } from 'ionicons/icons';
import {
  BottomSheetComponent,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
  IonText,
  StatusBadgeComponent,
  UiSelectComponent,
} from '@ng/shared/ui';
import type { SelectOption } from '@ng/shared/ui';
import type { DeviceCommand } from '@ng/core/api/generated/models/device-command';
import { DeviceDetailService } from '../../services/device-detail.service';
import { ToastService } from '@ng/core/errors/toast.service';

addIcons({ terminalOutline });

const COMMAND_OPTIONS: SelectOption[] = [
  { value: 'REBOOT', label: 'device_commands.reboot_opt' },
  { value: 'SHUTDOWN', label: 'device_commands.shutdown_opt' },
  { value: 'UPDATE', label: 'device_commands.update_opt' },
  { value: 'RESTART', label: 'device_commands.restart_opt' },
  { value: 'CUSTOM', label: 'device_commands.custom_opt' },
];

@Component({
  selector: 'app-command-sheet',
  templateUrl: 'command-sheet.component.html',
  styleUrls: ['command-sheet.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslatePipe,
    BottomSheetComponent,
    IonInput,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
    IonText,
    StatusBadgeComponent,
    UiSelectComponent,
  ],
})
export class CommandSheetComponent {
  private readonly svc = inject(DeviceDetailService);
  private readonly toast = inject(ToastService);
  private readonly sheet = viewChild.required(BottomSheetComponent);

  readonly deviceId = input.required<string>();

  readonly mode = signal<'issue' | 'detail'>('issue');
  readonly commandType = signal<string>('REBOOT');
  readonly args = signal('');
  readonly loading = signal(false);
  readonly selectedCommand = signal<DeviceCommand | null>(null);

  readonly commandIssued = output<DeviceCommand>();

  readonly commandOptions = COMMAND_OPTIONS;
  readonly showArgs = computed(() => this.commandType() === 'CUSTOM');
  readonly sheetTitle = computed(() => this.mode() === 'issue' ? 'Issue Command' : 'Command Details');
  readonly sheetSaveLabel = computed(() => this.mode() === 'issue' ? 'Run' : 'Close');
  readonly sheetSaveDisabled = computed(() => this.mode() === 'issue' && this.loading());

  openForIssue(): void {
    this.commandType.set('REBOOT');
    this.args.set('');
    this.loading.set(false);
    this.mode.set('issue');
    this.sheet().open();
  }

  openForDetail(command: DeviceCommand): void {
    this.selectedCommand.set(command);
    this.mode.set('detail');
    this.sheet().open();
  }

  onSave(): void {
    if (this.mode() !== 'issue') return;
    const type = this.commandType() as DeviceCommand['command'];
    if (!type) return;
    const argsValue = this.args().trim() || undefined;
    void this.svc.sendCommand(this.deviceId(), type, argsValue)
      .then(result => {
        this.commandIssued.emit(result);
        void this.toast.success('Command issued successfully');
      })
      .catch(e => {
        void this.toast.error(e instanceof Error ? e.message : 'Failed to issue command');
      });
  }
}
