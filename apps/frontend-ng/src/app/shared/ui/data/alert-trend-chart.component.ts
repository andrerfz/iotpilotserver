import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { IonSkeletonText } from '@ionic/angular/standalone';

export interface AlertTrendPoint {
  date?: string;
  count?: number;
}

/**
 * Shared "alert trend" bar chart (Monitoring page, device-detail alerts tab).
 * ECharts renders to canvas and can't resolve CSS custom properties — needs a
 * literal color, same as the dashboard/device-metrics line charts. Uses the
 * kit's primary accent (matches --primary) instead of Ionic's default palette.
 */
@Component({
  selector: 'ui-alert-trend-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxEchartsDirective, IonSkeletonText],
  template: `
    @if (loading()) {
      <ion-skeleton-text [animated]="true" style="height: 150px;"></ion-skeleton-text>
    } @else if (options(); as opts) {
      <div echarts [options]="opts" class="trend-chart"></div>
    } @else {
      <div class="trend-chart__empty">{{ emptyLabel() }}</div>
    }
  `,
  styleUrl: './alert-trend-chart.component.scss',
})
export class AlertTrendChartComponent {
  readonly data = input<AlertTrendPoint[]>([]);
  readonly loading = input(false);
  readonly emptyLabel = input('No data');

  protected readonly options = computed<EChartsOption | null>(() => {
    const pts = this.data();
    if (!pts.length) return null;
    return {
      grid: { top: 8, right: 8, bottom: 24, left: 32, containLabel: false },
      xAxis: {
        type: 'category',
        data: pts.map(p => p.date ?? ''),
        axisLabel: { fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.25)' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { fontSize: 10 },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.12)' } },
      },
      series: [{
        type: 'bar',
        data: pts.map(p => p.count ?? 0),
        barMaxWidth: 28,
        itemStyle: { color: '#3880ff', borderRadius: [4, 4, 0, 0] },
      }],
      tooltip: { trigger: 'axis' },
    };
  });
}
