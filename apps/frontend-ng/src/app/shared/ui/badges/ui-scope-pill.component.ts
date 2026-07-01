import {
  Component,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export type Scope = 'personal' | 'tenant' | 'platform' | 'device';

/**
 * ui-scope-pill — tiny marker for the data scope of a view or setting.
 * Makes platform/tenant/device layering visible at a glance in page headers.
 *
 * @example  <ui-scope-pill scope="tenant"></ui-scope-pill>
 */
@Component({
  selector: 'ui-scope-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <span class="pill" [class]="'pill--' + scope()">
      <span class="pill__dot"></span>{{ ('scope.' + scope()) | translate }}
    </span>
  `,
  styles: [`
    .pill {
      display: inline-flex; align-items: center; gap: 6px;
      height: 20px; padding: 0 8px 0 7px; border-radius: 5px;
      font-family: var(--font-mono); font-size: 10.5px; font-weight: 500;
      letter-spacing: 0.02em; white-space: nowrap;
    }
    .pill__dot { width: 7px; height: 7px; border-radius: 99px; flex: none; }
    .pill--personal  { background: var(--info-weak);    color: var(--info);    }
    .pill--personal  .pill__dot { background: var(--info);    }
    .pill--tenant    { background: var(--warning-weak); color: var(--warning); }
    .pill--tenant    .pill__dot { background: var(--warning); }
    .pill--platform  { background: color-mix(in srgb, #8b5cf6 16%, transparent); color: #8b5cf6; }
    .pill--platform  .pill__dot { background: #8b5cf6; }
    .pill--device    { background: var(--success-weak); color: var(--success); }
    .pill--device    .pill__dot { background: var(--success); }
  `],
})
export class UiScopePillComponent {
  readonly scope = input.required<Scope>();
}
