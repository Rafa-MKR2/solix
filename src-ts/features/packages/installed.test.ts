// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadInstalledPackages, handleRemovePackages } from '@/features/packages/installed';
import { setPasswordVerified } from '@/shared/auth';
import { showPasswordModal, setPendingAction } from '@/operations';
import { mockInvoke } from '@/test/setup';
import { toastState } from '@/test/helpers';

vi.mock('@/operations', () => ({
  showPasswordModal: vi.fn(),
  setPendingAction: vi.fn(),
}));

function setupDom(): void {
  document.body.innerHTML = `
    <div id="pkg-installed-list"></div>
    <div id="pkg-total-count"></div>
    <div id="pkg-total-size"></div>
    <div id="pkg-installed-count"></div>
    <input id="pkg-installed-search" />
    <button id="pkg-remove-btn" style="display:none"></button>
    <div id="completion-toast">
      <div class="toast-icon">✅</div>
      <div class="toast-title">Concluído!</div>
      <div class="toast-sub" id="toast-message">Tudo pronto</div>
    </div>
  `;
}

function pkg(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    name: 'firefox',
    version: '128.0',
    size: '120 MiB',
    description: 'Navegador web',
    ...overrides,
  };
}

describe('packages installed', () => {
  beforeEach(() => {
    setupDom();
    mockInvoke.mockReset();
    setPasswordVerified(false);
    document.getElementById('pkg-installed-search')!.value = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should do nothing when no packages are selected', async () => {
    await handleRemovePackages();
    expect(showPasswordModal).not.toHaveBeenCalled();
  });

  it('should render installed packages with totals', async () => {
    mockInvoke.mockResolvedValue([pkg(), pkg({ name: 'vim', size: '2.0 GB', description: 'Editor' })]);

    await loadInstalledPackages();

    expect(mockInvoke).toHaveBeenCalledWith('list_installed_packages');
    expect(document.getElementById('pkg-total-count')?.textContent).toBe('2');
    expect(document.getElementById('pkg-installed-count')?.textContent).toBe('2 pacotes');
    expect(document.getElementById('pkg-total-size')?.textContent).toBe('2.1 GB');
    expect(document.querySelectorAll('.pkg-row').length).toBe(2);
  });

  it('should filter packages by search query', async () => {
    mockInvoke.mockResolvedValue([pkg(), pkg({ name: 'vim' })]);
    document.getElementById('pkg-installed-search')!.value = 'vim';

    await loadInstalledPackages();

    const rows = document.querySelectorAll('.pkg-row');
    expect(rows.length).toBe(1);
    expect(rows[0].querySelector('.pkg-cell-name')?.textContent).toBe('vim');
  });

  it('should show empty state when no packages match', async () => {
    mockInvoke.mockResolvedValue([pkg()]);
    document.getElementById('pkg-installed-search')!.value = 'zzz';

    await loadInstalledPackages();

    expect(document.getElementById('pkg-installed-list')?.innerHTML).toContain('Nenhum pacote encontrado');
  });

  it('should show error state when loading fails', async () => {
    mockInvoke.mockRejectedValue(new Error('erro'));

    await loadInstalledPackages();

    expect(document.getElementById('pkg-installed-list')?.innerHTML).toContain('❌ Erro ao carregar pacotes');
  });

  it('should do nothing when list element is missing', async () => {
    document.getElementById('pkg-installed-list')!.remove();
    await expect(loadInstalledPackages()).resolves.not.toThrow();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('should select a package and update the remove button', async () => {
    mockInvoke.mockResolvedValue([pkg()]);
    await loadInstalledPackages();

    const btn = document.getElementById('pkg-remove-btn') as HTMLButtonElement;
    expect(btn.style.display).toBe('none');

    (document.querySelector('.pkg-row') as HTMLElement).click();

    expect(btn.style.display).not.toBe('none');
    expect(btn.textContent).toBe('🗑️ Remover (1)');
    expect(btn.disabled).toBe(false);

    // deselect removes button again
    (document.querySelector('.pkg-row') as HTMLElement).click();
    expect(btn.style.display).toBe('none');
  });

  it('should remove selected packages when password is verified', async () => {
    setPasswordVerified(true);
    mockInvoke.mockResolvedValueOnce([pkg()]).mockResolvedValueOnce(['firefox removido']);
    await loadInstalledPackages();
    (document.querySelector('.pkg-row') as HTMLElement).click();

    vi.useFakeTimers();
    await handleRemovePackages();

    expect(mockInvoke).toHaveBeenCalledWith('remove_system_packages', { packageNames: ['firefox'] });
    expect(document.getElementById('pkg-installed-list')?.innerHTML).toContain('firefox removido');
    expect(toastState().message).toContain('1 pacote(s) removido(s)');
  });

  it('should ask for password when not verified', async () => {
    mockInvoke.mockResolvedValueOnce([pkg()]);
    await loadInstalledPackages();
    (document.querySelector('.pkg-row') as HTMLElement).click();

    await handleRemovePackages();

    expect(showPasswordModal).toHaveBeenCalledWith({ type: 'remove', tools: ['firefox'] });
    expect(setPendingAction).toHaveBeenCalledWith({ type: 'remove', tools: ['firefox'] });
    expect(mockInvoke).not.toHaveBeenCalledWith('remove_system_packages', expect.anything());
  });
});
