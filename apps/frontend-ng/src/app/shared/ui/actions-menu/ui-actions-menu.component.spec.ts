import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/angular';
import { UiActionsMenuComponent } from './ui-actions-menu.component';
import type { TopbarAction } from '../../../shell/topbar.service';

const primaryAction: TopbarAction = {
  icon: 'add-outline',
  label: 'common.add',
  handler: vi.fn(),
};

const overflowA: TopbarAction = { icon: 'download-outline', label: 'common.export', handler: vi.fn() };
const overflowB: TopbarAction = { icon: 'trash-outline',    label: 'common.delete', handler: vi.fn() };

async function renderMenu(primary: TopbarAction | null = null, overflow: TopbarAction[] = []) {
  return render(UiActionsMenuComponent, { inputs: { primary, overflow } });
}

describe('UiActionsMenuComponent', () => {
  describe('primary button', () => {
    it('renders primary button when primary action is set', async () => {
      const { container } = await renderMenu(primaryAction);
      expect(container.querySelector('.actions-menu__primary')).toBeTruthy();
    });

    it('does not render primary button when primary is null', async () => {
      const { container } = await renderMenu(null);
      expect(container.querySelector('.actions-menu__primary')).toBeNull();
    });

    it('calls primary handler when primary button is clicked', async () => {
      const handler = vi.fn();
      const { container } = await renderMenu({ icon: 'add-outline', handler });
      fireEvent.click(container.querySelector('.actions-menu__primary')!);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('overflow button', () => {
    it('does not render overflow button when overflow is empty', async () => {
      const { container } = await renderMenu(primaryAction, []);
      expect(container.querySelector('.actions-menu__more')).toBeNull();
    });

    it('renders overflow button when overflow has items', async () => {
      const { container } = await renderMenu(null, [overflowA]);
      expect(container.querySelector('.actions-menu__more')).toBeTruthy();
    });

    it('opens dropdown when overflow button is clicked', async () => {
      const { container } = await renderMenu(null, [overflowA, overflowB]);
      fireEvent.click(container.querySelector('.actions-menu__more')!);
      expect(container.querySelector('.actions-menu__dropdown')).toBeTruthy();
    });

    it('sets aria-expanded="true" when dropdown is open', async () => {
      const { container } = await renderMenu(null, [overflowA]);
      fireEvent.click(container.querySelector('.actions-menu__more')!);
      expect(container.querySelector('.actions-menu__more')?.getAttribute('aria-expanded')).toBe('true');
    });

    it('closes dropdown on Escape key', async () => {
      const { container } = await renderMenu(null, [overflowA]);
      fireEvent.click(container.querySelector('.actions-menu__more')!);
      expect(container.querySelector('.actions-menu__dropdown')).toBeTruthy();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(container.querySelector('.actions-menu__dropdown')).toBeNull();
    });
  });

  describe('overflow items', () => {
    it('renders all overflow items in the dropdown', async () => {
      const { container } = await renderMenu(null, [overflowA, overflowB]);
      fireEvent.click(container.querySelector('.actions-menu__more')!);
      const items = container.querySelectorAll('.actions-menu__item');
      expect(items).toHaveLength(2);
    });

    it('calls the item handler and closes dropdown when item is clicked', async () => {
      const handler = vi.fn();
      const { container } = await renderMenu(null, [{ icon: 'download-outline', label: 'Export', handler }]);
      fireEvent.click(container.querySelector('.actions-menu__more')!);
      fireEvent.click(container.querySelector('.actions-menu__item')!);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(container.querySelector('.actions-menu__dropdown')).toBeNull();
    });
  });

  describe('combined primary + overflow', () => {
    it('renders both primary and overflow buttons together', async () => {
      const { container } = await renderMenu(primaryAction, [overflowA]);
      expect(container.querySelector('.actions-menu__primary')).toBeTruthy();
      expect(container.querySelector('.actions-menu__more')).toBeTruthy();
    });
  });
});
