import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import { IonContent } from '@ng/shared/ui';

/**
 * Generic routed page used by the shell's nav targets until each feature module
 * lands. Title/sub come from the route's `data`.
 */
@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonContent],
  template: `
    <ion-content class="ion-padding">
      <div class="page">
        <div class="pagehead">
          <div>
            <div class="pagehead__title">{{ title() }}</div>
            <div class="pagehead__sub">{{ sub() }}</div>
          </div>
        </div>
        <div class="placeholder-note">Feature module — lands in a later milestone.</div>
      </div>
    </ion-content>
  `,
  styleUrl: './placeholder.page.scss',
})
export class PlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly title = toSignal(
    this.route.data.pipe(map(d => (d['title'] as string) ?? 'Page')), { initialValue: 'Page' },
  );
  protected readonly sub = toSignal(
    this.route.data.pipe(map(d => (d['sub'] as string) ?? '')), { initialValue: '' },
  );
}
