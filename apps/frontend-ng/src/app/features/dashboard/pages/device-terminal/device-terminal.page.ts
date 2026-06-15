import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TopbarService } from '@ng/shell/topbar.service';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  EmptyStateComponent,
} from '@ng/shared/ui';
import { SshTerminalComponent } from '../../components/ssh-terminal/ssh-terminal.component';
import { DeviceDetailService } from '../../services/device-detail.service';

@Component({
  selector: 'app-device-terminal',
  templateUrl: 'device-terminal.page.html',
  styleUrls: ['device-terminal.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonButton,
    EmptyStateComponent,
    SshTerminalComponent,
  ],
})
export class DeviceTerminalPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly topbar = inject(TopbarService);
  private readonly svc = inject(DeviceDetailService);

  readonly device = this.svc.device;
  readonly deviceId = signal('');
  readonly connected = signal(false);

  readonly isOnline = computed(() => this.device.data()?.rawStatus === 'ONLINE');

  constructor() {
    const id = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.deviceId.set(id);
  }

  ngOnInit(): void {
    this.topbar.set('Terminal');
    if (!this.device.data()) {
      void this.device.load({ id: this.deviceId() });
    }
  }

  connect(): void {
    this.connected.set(true);
  }
}
