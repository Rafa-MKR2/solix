// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadPackageHistory } from '@/features/packages/history';
import { mockInvoke } from '@/test/setup';

function setupDom(): void {
  document.body.innerHTML = '<div id="pkg-history-list"></div>';
}

describe('packages history', () => {
  beforeEach(() => {
    setupDom();
    mockInvoke.mockReset();
  });

  it('should render history entries with icons and formatted dates', async () => {
    mockInvoke.mockResolvedValue([
      { action: 'install', timestamp: '2026-08-01T10:30:00Z', package_name: 'firefox', version: '128.0' },
      { action: 'remove', timestamp: '2026-07-20T08:00:00Z', package_name: 'vim', version: '' },
      { action: 'update', timestamp: '2026-07-01T00:00:00Z', package_name: '', version: '' },
    ]);

    await loadPackageHistory();

    expect(mockInvoke).toHaveBeenCalledWith('get_package_history');
    const items = document.querySelectorAll('.pkg-history-item');
    expect(items.length).toBe(3);
    expect(items[0].querySelector('.pkg-history-icon')?.textContent).toBe('⬆️');
    expect(items[0].querySelector('.pkg-history-pkg')?.textContent).toBe('firefox 128.0');
    expect(items[0].querySelector('.pkg-history-date')?.textContent).toBe('2026-08-01 10:30:00');
    expect(items[1].querySelector('.pkg-history-icon')?.textContent).toBe('🗑️');
    expect(items[2].querySelector('.pkg-history-icon')?.textContent).toBe('🔄');
  });

  it('should show empty state when there is no history', async () => {
    mockInvoke.mockResolvedValue([]);

    await loadPackageHistory();

    expect(document.getElementById('pkg-history-list')?.innerHTML).toContain('Nenhum histórico encontrado');
  });

  it('should show error state on failure', async () => {
    mockInvoke.mockRejectedValue(new Error('erro'));

    await loadPackageHistory();

    expect(document.getElementById('pkg-history-list')?.innerHTML).toContain('❌ Erro ao carregar histórico');
  });

  it('should do nothing when list element is missing', async () => {
    document.getElementById('pkg-history-list')!.remove();

    await expect(loadPackageHistory()).resolves.not.toThrow();
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
