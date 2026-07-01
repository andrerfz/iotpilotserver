import {
  Component,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * ui-setting-row — one labelled control row inside a ui-section.
 * Label + optional description on the left; the control projected on the right.
 *
 * @example
 *   <ui-setting-row label="settings.notif.email"
 *                   description="settings.notif.email_desc">
 *     <ion-toggle [formControl]="form.controls.email"></ion-toggle>
 *   </ui-setting-row>
 */
@Component({
  selector: 'ui-setting-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <div class="row__text">
      <span class="row__label">{{ label() | translate }}</span>
      @if (description()) {
        <span class="row__desc">{{ description() | translate }}</span>
      }
    </div>
    <div class="row__control">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host {
      display: flex; align-items: center; gap: 16px;
      padding: 14px 0;
      border-bottom: 1px solid var(--ui-border);
    }
    :host(:last-of-type) { border-bottom: none; }
    .row__text { min-width: 0; display: flex; flex-direction: column; gap: 3px; flex: 1; }
    .row__label { font-size: 14px; font-weight: 500; color: var(--text); }
    .row__desc { font-size: 12.5px; color: var(--text-muted); text-wrap: pretty; }
    .row__control { margin-left: auto; flex: none; }
  `],
})
export class UiSettingRowComponent {
  readonly label       = input.required<string>();
  readonly description = input<string>('');
}
