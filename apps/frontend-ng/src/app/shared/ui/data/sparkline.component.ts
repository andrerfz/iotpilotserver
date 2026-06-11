import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

/**
 * Raw SVG sparkline — no chart library. Mirrors the prototype's Sparkline
 * component exactly. Full time-series charts use ngx-echarts (fe-dashboard).
 */
@Component({
  selector: 'ui-sparkline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="spark" [attr.viewBox]="viewBox()" preserveAspectRatio="none"
      [attr.width]="w()" [attr.height]="h()">
      <defs>
        <linearGradient [attr.id]="gradId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" [attr.stop-color]="color()" stop-opacity="0.22" />
          <stop offset="100%" [attr.stop-color]="color()" stop-opacity="0" />
        </linearGradient>
      </defs>
      <polygon [attr.points]="area()" [attr.fill]="'url(#' + gradId + ')'" />
      <polyline [attr.points]="line()" fill="none" [attr.stroke]="color()" stroke-width="1.6" />
    </svg>
  `,
  styles: [`:host { display: block; } .spark { display: block; overflow: visible; }`],
})
export class SparklineComponent {
  readonly data = input.required<number[]>();
  readonly color = input('var(--primary)');
  readonly w = input(240);
  readonly h = input(38);

  // Stable gradient ID derived from component. In a real app with multiple
  // sparklines, this would need a unique suffix — for now it's sufficient.
  protected readonly gradId = 'sg-uid';

  protected readonly viewBox = computed(() => `0 0 ${this.w()} ${this.h()}`);

  protected readonly line = computed(() => {
    const d = this.data();
    if (!d.length) return '';
    const W = this.w(), H = this.h();
    const max = Math.max(...d), min = Math.min(...d);
    const rng = max - min || 1;
    return d
      .map((v, i) => {
        const x = (i / (d.length - 1)) * W;
        const y = H - ((v - min) / rng) * (H - 6) - 3;
        return `${x},${y}`;
      })
      .join(' ');
  });

  protected readonly area = computed(() => {
    const pts = this.line();
    if (!pts) return '';
    const W = this.w(), H = this.h();
    return `0,${H} ${pts} ${W},${H}`;
  });
}
