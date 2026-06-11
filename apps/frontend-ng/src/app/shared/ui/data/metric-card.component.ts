import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { NgIf } from '@angular/common';
import { SparklineComponent } from './sparkline.component';

export type DeltaDir = 'up' | 'down' | 'flat';

@Component({
  selector: 'ui-metric-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, SparklineComponent],
  template: `
    <div class="metric">
      <div class="metric__top">
        <span class="metric__icon" [style.background]="iconBg()" [style.color]="iconColor()">
          <ng-content select="[icon]"></ng-content>
        </span>
        <span class="metric__label">{{ label() }}</span>
      </div>
      <div class="metric__val">
        {{ value() }}<span *ngIf="unit()" class="metric__unit">{{ unit() }}</span>
      </div>
      <div *ngIf="delta() !== null && delta() !== undefined" class="metric__delta" [class]="'delta--' + deltaDir()">
        <svg *ngIf="deltaDir() !== 'flat'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          width="12" height="12">
          <polyline *ngIf="deltaDir() === 'up'" points="18 15 12 9 6 15"></polyline>
          <polyline *ngIf="deltaDir() === 'down'" points="6 9 12 15 18 9"></polyline>
        </svg>
        {{ delta() }}
      </div>
      <ui-sparkline *ngIf="spark().length" [data]="spark()" [color]="iconColor()"></ui-sparkline>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .metric {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r); padding: 18px 20px; display: flex; flex-direction: column; gap: 6px;
    }
    .metric__top { display: flex; align-items: center; gap: 10px; }
    .metric__icon {
      width: 30px; height: 30px; border-radius: var(--r-sm);
      display: grid; place-items: center; flex: none;
    }
    .metric__icon ::ng-deep svg,
    .metric__icon ::ng-deep ion-icon { width: 15px; height: 15px; }
    .metric__label { font-size: var(--fs-label); letter-spacing: var(--ls-label);
      text-transform: uppercase; font-family: var(--font-mono); color: var(--text-muted); }
    .metric__val { font-size: 26px; font-weight: 650; color: var(--text); line-height: 1.1; }
    .metric__unit { font-size: 14px; font-weight: 400; color: var(--text-muted); margin-left: 4px; }
    .metric__delta { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted); }
    .delta--up   { color: var(--success); }
    .delta--down { color: var(--danger); }
  `],
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
