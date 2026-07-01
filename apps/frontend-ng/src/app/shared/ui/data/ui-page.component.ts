import {
  Component,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { UiSkeletonComponent } from './skeleton.component';

/**
 * ui-page — standard page scaffold: title + subtitle + actions slot + loading state.
 *
 * Slots:
 *   [actions]  → right-aligned header actions
 *   [tabs]     → optional sub-nav row under the header
 *   (default)  → page body
 */
@Component({
  selector: 'ui-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, UiSkeletonComponent],
  templateUrl: 'ui-page.component.html',
  styleUrl: 'ui-page.component.scss',
})
export class UiPageComponent {
  readonly title    = input.required<string>();
  readonly subtitle = input<string>('');
  readonly loading  = input(false);
}
