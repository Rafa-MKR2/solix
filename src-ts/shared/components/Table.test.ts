// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTable } from '@/shared/components/Table';

interface Row {
  name: string;
  pid: number;
  status: string;
}

const DATA: Row[] = [
  { name: 'firefox', pid: 100, status: 'running' },
  { name: 'code', pid: 200, status: 'running' },
  { name: 'vim', pid: 50, status: 'stopped' },
];

function rowsOf(table: HTMLElement): string[] {
  return Array.from(table.querySelectorAll('tbody tr')).map(tr => tr.textContent ?? '');
}

describe('Table Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const columns = [
    { key: 'name' as const, header: 'Nome', sortable: true, filterable: true },
    { key: 'pid' as const, header: 'PID', sortable: true },
    { key: 'status' as const, header: 'Estado', sortable: false },
  ];

  it('should render rows and headers', () => {
    const table = createTable({ columns, data: DATA });

    expect(table.querySelectorAll('thead th').length).toBe(3);
    expect(table.querySelectorAll('tbody tr').length).toBe(3);
    expect(rowsOf(table).some(r => r.includes('firefox'))).toBe(true);
  });

  it('should render dash for null values', () => {
    const table = createTable({
      columns: [{ key: 'name', header: 'N' }],
      data: [{ name: null as unknown as string }],
    });
    expect(table.querySelector('tbody td')?.textContent).toBe('—');
  });

  it('should show empty state when no data', () => {
    const table = createTable({ columns, data: [] });

    expect(table.querySelector('.table-empty')?.classList.contains('hidden')).toBe(false);
    expect(table.querySelector('table')?.classList.contains('hidden')).toBe(true);
  });

  it('should show custom empty message', () => {
    const table = createTable({ columns, data: [], emptyMessage: 'Nada aqui' });
    expect(table.querySelector('.table-empty')?.textContent).toBe('Nada aqui');
  });

  it('should sort by column on header click', () => {
    const table = createTable({ columns, data: DATA });

    const pidTh = table.querySelectorAll('thead th')[1] as HTMLElement;
    pidTh.click();

    const pids = Array.from(table.querySelectorAll('tbody tr td:nth-child(2)'))
      .map(td => Number(td.textContent));
    expect(pids).toEqual([50, 100, 200]); // asc

    pidTh.click();
    const pidsDesc = Array.from(table.querySelectorAll('tbody tr td:nth-child(2)'))
      .map(td => Number(td.textContent));
    expect(pidsDesc).toEqual([200, 100, 50]); // desc
  });

  it('should toggle sort indicator classes', () => {
    const table = createTable({ columns, data: DATA });

    const nameTh = table.querySelectorAll('thead th')[0] as HTMLElement;
    nameTh.click();
    expect(nameTh.className).toContain('sorted');
    expect(nameTh.className).toContain('asc');

    nameTh.click();
    expect(nameTh.className).toContain('desc');
  });

  it('should filter rows by search query', () => {
    const table = createTable({ columns, data: DATA, searchable: true, searchKeys: ['name'] });

    const input = table.querySelector('.table-search-input') as HTMLInputElement;
    input.value = 'fire';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const visible = Array.from(table.querySelectorAll('tbody tr'));
    expect(visible.length).toBe(1);
    expect(visible[0].textContent).toContain('firefox');
  });

  it('should filter by any column when searchKeys is empty', () => {
    const table = createTable({ columns, data: DATA, searchable: true });

    const input = table.querySelector('.table-search-input') as HTMLInputElement;
    input.value = 'stopped';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(table.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('should show empty state when search has no matches', () => {
    const table = createTable({ columns, data: DATA, searchable: true });

    const input = table.querySelector('.table-search-input') as HTMLInputElement;
    input.value = 'zzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(table.querySelector('.table-empty')?.classList.contains('hidden')).toBe(false);
  });

  it('should use custom render for cells', () => {
    const table = createTable({
      columns: [
        { key: 'name', header: 'N', render: (value) => `<b>${String(value)}</b>` },
      ],
      data: DATA,
    });

    expect(table.querySelector('tbody td b')?.textContent).toBe('firefox');
  });

  it('should append HTMLElement from custom render', () => {
    const table = createTable({
      columns: [
        { key: 'name', header: 'N', render: () => {
          const span = document.createElement('span');
          span.textContent = 'el';
          return span;
        } },
      ],
      data: DATA,
    });

    expect(table.querySelector('tbody td span')?.textContent).toBe('el');
  });

  it('should call rowClick when a row is clicked', () => {
    const rowClick = vi.fn();
    const table = createTable({ columns, data: DATA, rowClick });

    const firstRow = table.querySelector('tbody tr') as HTMLElement;
    firstRow.click();

    expect(rowClick).toHaveBeenCalledWith(DATA[0]);
  });

  it('setData should re-render with new data', () => {
    const table = createTable({ columns, data: DATA });
    (table as unknown as { setData: (d: Row[]) => void }).setData([{ name: 'new', pid: 1, status: 'running' }]);

    expect(table.querySelectorAll('tbody tr').length).toBe(1);
    expect(rowsOf(table).some(r => r.includes('new'))).toBe(true);
  });

  it('getData should return filtered data', () => {
    const table = createTable({ columns, data: DATA, searchable: true });
    const getData = (table as unknown as { getData: () => Row[] }).getData;

    expect(getData().length).toBe(3);

    const input = table.querySelector('.table-search-input') as HTMLInputElement;
    input.value = 'code';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(getData().length).toBe(1);
  });

  it('destroy should remove the table from the DOM', () => {
    const table = createTable({ columns, data: DATA });
    document.body.appendChild(table);

    (table as unknown as { destroy: () => void }).destroy();
    expect(document.querySelector('.table-container')).toBeNull();
  });

  it('should not create search input when not searchable', () => {
    const table = createTable({ columns, data: DATA, searchable: false });
    expect(table.querySelector('.table-search-input')).toBeNull();
  });

  it('should apply striped and hoverable classes', () => {
    const table = createTable({ columns, data: DATA, striped: true, hoverable: true });
    expect(table.querySelector('table')?.className).toContain('striped');
    expect(table.querySelector('table')?.className).toContain('hoverable');
  });
});
