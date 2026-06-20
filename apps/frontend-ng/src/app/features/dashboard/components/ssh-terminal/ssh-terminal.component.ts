import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  signal,
  viewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonInput } from '@ng/shared/ui';
import { DeviceDetailService } from '../../services/device-detail.service';

@Component({
  selector: 'app-ssh-terminal',
  templateUrl: 'ssh-terminal.component.html',
  styleUrls: ['ssh-terminal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IonButton, IonInput],
})
export class SshTerminalComponent {
  readonly deviceId = input.required<string>();

  private readonly svc = inject(DeviceDetailService);
  private readonly outputEl = viewChild<ElementRef<HTMLDivElement>>('outputEl');

  readonly output = signal<string[]>([]);
  readonly executing = signal(false);
  command = '';

  async onSubmit(): Promise<void> {
    const cmd = this.command.trim();
    if (!cmd || this.executing()) return;
    this.command = '';
    this.executing.set(true);
    this.output.update(lines => [...lines, `$ ${cmd}`]);
    try {
      const result = await this.svc.executeSSH(this.deviceId(), cmd);
      if (result.error === 'HOST_KEY_MISMATCH') {
        this.output.update(lines => [
          ...lines,
          '⚠ Host key mismatch — the device SSH key has changed (possible OS reinstall or MITM).',
          '  Update or clear the SSH credentials for this device in Settings → Credentials to re-establish trust.',
        ]);
      } else {
        const out = result.output?.trim() || '(no output)';
        this.output.update(lines => [...lines, out]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Command failed';
      this.output.update(lines => [...lines, `Error: ${msg}`]);
    } finally {
      this.executing.set(false);
      queueMicrotask(() => {
        const el = this.outputEl()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
  }

  onClear(): void {
    this.output.set([]);
  }
}
