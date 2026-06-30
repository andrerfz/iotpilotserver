import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/angular';
import { UiListRowComponent } from './list-row.component';

async function renderRow(inputs: Partial<Parameters<typeof render>[1] & { inputs: Record<string, unknown> }>['inputs'] = {}) {
  return render(UiListRowComponent, { inputs: { title: 'test-device', ...inputs } });
}

describe('UiListRowComponent', () => {
  describe('title', () => {
    it('renders the title', async () => {
      const { container } = await renderRow({ title: 'my-device' });
      expect(container.querySelector('.list-row__title')?.textContent?.trim()).toBe('my-device');
    });
  });

  describe('subtitle', () => {
    it('renders subtitle when provided', async () => {
      const { container } = await renderRow({ subtitle: '192.168.1.1' });
      expect(container.querySelector('.list-row__subtitle')?.textContent?.trim()).toBe('192.168.1.1');
    });

    it('does not render subtitle element when empty', async () => {
      const { container } = await renderRow();
      expect(container.querySelector('.list-row__subtitle')).toBeNull();
    });
  });

  describe('meta pairs', () => {
    it('renders meta pairs when provided', async () => {
      const { container } = await renderRow({ meta: ['Status', 'Online', 'IP', '10.0.0.1'] });
      const items = container.querySelectorAll('.list-row__meta-item');
      expect(items).toHaveLength(2);
      expect(items[0].querySelector('.list-row__meta-key')?.textContent?.trim()).toBe('Status:');
      expect(items[0].querySelector('.list-row__meta-val')?.textContent?.trim()).toBe('Online');
      expect(items[1].querySelector('.list-row__meta-key')?.textContent?.trim()).toBe('IP:');
      expect(items[1].querySelector('.list-row__meta-val')?.textContent?.trim()).toBe('10.0.0.1');
    });

    it('does not render meta element when meta is empty', async () => {
      const { container } = await renderRow();
      expect(container.querySelector('.list-row__meta')).toBeNull();
    });

    it('handles odd-length meta array (ignores trailing unpaired key)', async () => {
      const { container } = await renderRow({ meta: ['Status', 'Online', 'IP'] });
      expect(container.querySelectorAll('.list-row__meta-item')).toHaveLength(1);
    });
  });

  describe('cols', () => {
    it('renders cols when provided', async () => {
      const cols = [{ label: 'Status', value: 'Online' }, { label: 'IP', value: '10.0.0.1' }];
      const { container } = await renderRow({ cols });
      expect(container.querySelector('.list-row__cols')).toBeTruthy();
      const colEls = container.querySelectorAll('.list-row__col');
      expect(colEls).toHaveLength(2);
      expect(colEls[0].querySelector('.list-row__col-label')?.textContent?.trim()).toBe('Status');
      expect(colEls[0].querySelector('.list-row__col-value')?.textContent?.trim()).toBe('Online');
    });

    it('does not render cols element when cols is empty', async () => {
      const { container } = await renderRow();
      expect(container.querySelector('.list-row__cols')).toBeNull();
    });
  });
});
