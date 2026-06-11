import { render, fireEvent } from '@testing-library/angular';
import { describe, it, expect, vi } from 'vitest';
import { DataTableComponent, ColumnDef } from './data-table.component';

interface Row extends Record<string, unknown> {
  id: number;
  name: string;
  cpu: number;
}

const COLS: ColumnDef<Row>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'cpu', label: 'CPU', sortable: true },
];

const rows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `dev-${(n - i).toString().padStart(2, '0')}`, cpu: (i * 7) % 100 }));

function names(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('tbody td'))
    .map(td => td.textContent?.trim() ?? '')
    .filter(t => t.startsWith('dev-'));
}

describe('DataTableComponent', () => {
  it('renders rows and default cell values', async () => {
    const { container } = await render(DataTableComponent, {
      inputs: { columns: COLS, rows: rows(3) },
    });
    expect(container.querySelectorAll('tbody tr').length).toBe(3);
    expect(container.textContent).toContain('dev-03');
  });

  it('shows EmptyState when rows is empty', async () => {
    const { container } = await render(DataTableComponent, {
      inputs: { columns: COLS, rows: [] as Row[] },
    });
    expect(container.querySelector('ui-empty-state')).toBeTruthy();
  });

  // ─── Sort ───────────────────────────────────────────────────────────────────

  it('sorts ascending then descending on repeated header clicks', async () => {
    const { container, fixture } = await render(DataTableComponent, {
      inputs: { columns: COLS, rows: rows(3), pageSize: 10 },
    });
    const nameHeader = container.querySelectorAll('thead th')[0] as HTMLElement;

    fireEvent.click(nameHeader);
    fixture.detectChanges();
    expect(names(container)).toEqual(['dev-01', 'dev-02', 'dev-03']);

    fireEvent.click(nameHeader);
    fixture.detectChanges();
    expect(names(container)).toEqual(['dev-03', 'dev-02', 'dev-01']);
  });

  // ─── Pagination ───────────────────────────────────────────────────────────────

  it('paginates with pageSize and renders pager when overflowing', async () => {
    const { container } = await render(DataTableComponent, {
      inputs: { columns: COLS, rows: rows(15), pageSize: 6 },
    });
    expect(container.querySelectorAll('tbody tr').length).toBe(6);
    expect(container.querySelector('.pager')).toBeTruthy();
  });

  it('does not render a pager when rows fit on one page', async () => {
    const { container } = await render(DataTableComponent, {
      inputs: { columns: COLS, rows: rows(4), pageSize: 6 },
    });
    expect(container.querySelector('.pager')).toBeFalsy();
  });

  it('clamps page navigation within bounds', async () => {
    const { container, fixture } = await render(DataTableComponent, {
      inputs: { columns: COLS, rows: rows(15), pageSize: 6 },
    });
    const prev = container.querySelector('.pager button:first-child') as HTMLButtonElement;
    const next = container.querySelector('.pager button:last-child') as HTMLButtonElement;
    expect(prev.disabled).toBe(true);

    fireEvent.click(next); fixture.detectChanges();
    fireEvent.click(next); fixture.detectChanges();
    fireEvent.click(next); fixture.detectChanges(); // beyond last — clamped
    expect(next.disabled).toBe(true);
    expect(container.querySelectorAll('tbody tr').length).toBe(3); // 15 - 12
  });

  // ─── Selection ─────────────────────────────────────────────────────────────

  it('select-all toggles only rows on the current page (toggleAll semantics)', async () => {
    const onSel = vi.fn();
    const { container, fixture } = await render(DataTableComponent, {
      inputs: { columns: COLS, rows: rows(15), pageSize: 6, selectable: true },
      on: { selectionChange: onSel },
    });
    fireEvent.click(container.querySelector('thead .checkbox') as HTMLElement);
    fixture.detectChanges();
    const lastCall = onSel.mock.calls.at(-1)?.[0] as Row[];
    expect(lastCall.length).toBe(6); // only the 6 on the page
  });

  it('deselects current page when all already selected', async () => {
    const onSel = vi.fn();
    const { container, fixture } = await render(DataTableComponent, {
      inputs: { columns: COLS, rows: rows(4), pageSize: 6, selectable: true },
      on: { selectionChange: onSel },
    });
    const headerCheck = container.querySelector('thead .checkbox') as HTMLElement;
    fireEvent.click(headerCheck); fixture.detectChanges(); // select all 4
    expect((onSel.mock.calls.at(-1)?.[0] as Row[]).length).toBe(4);
    fireEvent.click(headerCheck); fixture.detectChanges(); // deselect all
    expect((onSel.mock.calls.at(-1)?.[0] as Row[]).length).toBe(0);
  });

  it('toggles a single row and emits selectionChange', async () => {
    const onSel = vi.fn();
    const { container, fixture } = await render(DataTableComponent, {
      inputs: { columns: COLS, rows: rows(3), pageSize: 6, selectable: true },
      on: { selectionChange: onSel },
    });
    fireEvent.click(container.querySelector('tbody .checkbox') as HTMLElement);
    fixture.detectChanges();
    expect((onSel.mock.calls.at(-1)?.[0] as Row[]).length).toBe(1);
  });

  it('shows the bulk-action bar only when something is selected', async () => {
    const { container, fixture } = await render(DataTableComponent, {
      inputs: { columns: COLS, rows: rows(3), pageSize: 6, selectable: true },
    });
    expect(container.querySelector('.selbar')).toBeFalsy();
    fireEvent.click(container.querySelector('tbody .checkbox') as HTMLElement);
    fixture.detectChanges();
    expect(container.querySelector('.selbar')).toBeTruthy();
  });

  // ─── Row click ───────────────────────────────────────────────────────────────

  it('does not emit rowClick when rowClickable is false', async () => {
    const onRowClick = vi.fn();
    const { container, fixture } = await render(DataTableComponent, {
      inputs: { columns: COLS, rows: rows(2), pageSize: 6, rowClickable: false },
      on: { rowClick: onRowClick },
    });
    fireEvent.click(container.querySelector('tbody tr') as HTMLElement);
    fixture.detectChanges();
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('emits rowClick when rowClickable is true', async () => {
    const onRowClick = vi.fn();
    const { container, fixture } = await render(DataTableComponent, {
      inputs: { columns: COLS, rows: rows(2), pageSize: 6, rowClickable: true },
      on: { rowClick: onRowClick },
    });
    fireEvent.click(container.querySelector('tbody tr') as HTMLElement);
    fixture.detectChanges();
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });
});
