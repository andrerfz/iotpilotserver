import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { SparklineComponent } from './sparkline.component';

export type DeltaDir = 'up' | 'down' | 'flat';

@Component({
  selector: 'ui-metric-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SparklineComponent],
  template: `
    <div class="metric">
      <div class="metric__top">
        <span class="metric__icon" [style.background]="iconBg()" [style.color]="iconColor()">
          <ng-content select="[icon]"></ng-content>
        </span>
        <span class="metric__label">{{ label() }}</span>
      </div>
      <div class="metric__val">
        {{ value() }}@if (unit()) {<span class="metric__unit">{{ unit() }}</span>}
      </div>
      @if (delta() !== null && delta() !== undefined) {
        <div class="metric__delta" [class]="'delta--' + deltaDir()">
          @if (deltaDir() !== 'flat') {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              width="12" height="12">
              @if (deltaDir() === 'up') {
                <polyline points="18 15 12 9 6 15"></polyline>
              }
              @if (deltaDir() === 'down') {
                <polyline points="6 9 12 15 18 9"></polyline>
              }
            </svg>
          }
          {{ delta() }}
        </div>
      }
      @if (spark().length) {
        <ui-sparkline class="metric__spark" [data]="spark()" [color]="iconColor()"></ui-sparkline>
      }
    </div>
  `,
  styleUrl: './metric-card.component.scss',
})
export class MetricCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly unit = input('');
  readonly iconColor = input('var(--primary)');
  readonly iconBg = input('color-mix(in srgb, var(--primary) 15%, transparent)');
  readonly delta = input<string | number | null>(null);
  readonly deltaDir = input<DeltaDir>('flat');
  readonly spark = input<number[]>([]);
}
