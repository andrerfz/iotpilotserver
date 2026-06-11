import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { SparklineComponent } from './sparkline.component';
import { MetricCardComponent } from './metric-card.component';
import { EmptyStateComponent } from './empty-state.component';

// ─── SparklineComponent ───────────────────────────────────────────────────────

describe('SparklineComponent', () => {
  it('renders an SVG with polyline when data is provided', async () => {
    const { container } = await render(SparklineComponent, {
      inputs: { data: [10, 20, 15, 25, 30] },
    });
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelector('polyline')).toBeTruthy();
  });

  it('renders an empty polygon+polyline when data is empty', async () => {
    const { container } = await render(SparklineComponent, {
      inputs: { data: [] },
    });
    // polygon and polyline are still in DOM, just with empty points
    expect(container.querySelector('polygon')).toBeTruthy();
  });

  it('respects w and h inputs on the svg element', async () => {
    const { container } = await render(SparklineComponent, {
      inputs: { data: [1, 2, 3], w: 100, h: 20 },
    });
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('100');
    expect(svg?.getAttribute('height')).toBe('20');
  });

  it('applies custom color to polyline stroke', async () => {
    const { container } = await render(SparklineComponent, {
      inputs: { data: [5, 10], color: 'var(--success)' },
    });
    const polyline = container.querySelector('polyline');
    expect(polyline?.getAttribute('stroke')).toBe('var(--success)');
  });
});

// ─── MetricCardComponent ─────────────────────────────────────────────────────

describe('MetricCardComponent', () => {
  it('renders label and value', async () => {
    const { container } = await render(MetricCardComponent, {
      inputs: { label: 'CPU', value: '72', unit: '%' },
    });
    expect(container.querySelector('.metric__label')?.textContent?.trim()).toBe('CPU');
    expect(container.querySelector('.metric__val')?.textContent).toContain('72');
    expect(container.querySelector('.metric__unit')?.textContent?.trim()).toBe('%');
  });

  it('renders without unit when unit is empty', async () => {
    const { container } = await render(MetricCardComponent, {
      inputs: { label: 'Devices', value: 42 },
    });
    expect(container.querySelector('.metric__unit')).toBeFalsy();
  });

  it('renders delta with direction class', async () => {
    const { container } = await render(MetricCardComponent, {
      inputs: { label: 'CPU', value: '72', delta: '+5%', deltaDir: 'up' as const },
    });
    expect(container.querySelector('.metric__delta.delta--up')).toBeTruthy();
    expect(container.querySelector('.metric__delta')?.textContent).toContain('+5%');
  });

  it('does not render delta row when delta is null', async () => {
    const { container } = await render(MetricCardComponent, {
      inputs: { label: 'CPU', value: '72', delta: null },
    });
    expect(container.querySelector('.metric__delta')).toBeFalsy();
  });

  it('renders sparkline when spark data is provided', async () => {
    const { container } = await render(MetricCardComponent, {
      inputs: { label: 'CPU', value: '72', spark: [10, 20, 30] },
    });
    expect(container.querySelector('ui-sparkline')).toBeTruthy();
  });

  it('does not render sparkline when spark array is empty', async () => {
    const { container } = await render(MetricCardComponent, {
      inputs: { label: 'CPU', value: '72', spark: [] },
    });
    expect(container.querySelector('ui-sparkline')).toBeFalsy();
  });
});

// ─── EmptyStateComponent ─────────────────────────────────────────────────────

describe('EmptyStateComponent', () => {
  it('renders title', async () => {
    const { container } = await render(EmptyStateComponent, {
      inputs: { title: 'No devices found' },
    });
    expect(container.querySelector('.empty__title')?.textContent?.trim()).toBe('No devices found');
  });

  it('renders description when provided', async () => {
    const { container } = await render(EmptyStateComponent, {
      inputs: { title: 'No results', description: 'Try adjusting your filters' },
    });
    expect(container.querySelector('.empty__desc')?.textContent).toContain('Try adjusting your filters');
  });

  it('does not render description when empty', async () => {
    const { container } = await render(EmptyStateComponent, {
      inputs: { title: 'Empty', description: '' },
    });
    expect(container.querySelector('.empty__desc')).toBeFalsy();
  });

  it('renders icon slot when hasIcon=true', async () => {
    const { container } = await render(EmptyStateComponent, {
      inputs: { title: 'Empty', hasIcon: true },
    });
    expect(container.querySelector('.empty__icon')).toBeTruthy();
  });

  it('does not render icon slot when hasIcon=false', async () => {
    const { container } = await render(EmptyStateComponent, {
      inputs: { title: 'Empty', hasIcon: false },
    });
    expect(container.querySelector('.empty__icon')).toBeFalsy();
  });

  it('renders action slot when hasAction=true', async () => {
    const { container } = await render(EmptyStateComponent, {
      inputs: { title: 'Empty', hasAction: true },
    });
    expect(container.querySelector('.empty__action')).toBeTruthy();
  });
});
