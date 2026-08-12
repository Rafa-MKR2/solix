// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSearchRepoPackages, handleInstallRepoPackages } from '@/features/packages/repository';
import { setPasswordVerified } from '@/shared/auth';
import { showPasswordModal } from '@/operations';
import { mockInvoke } from '@/test/setup';
import { toastState } from '@/test/helpers';

vi.mock('@/operations', () => ({
  showPasswordModal: vi.fn(),
  setPendingAction: vi.fn(),
}));

function setupDom(): void {
  document.body.innerHTML = `
    <div id="pkg-search-list"></div>
    <div id="pkg-search-actions" style="display:none"></div>
    <button id="pkg-install-repo-btn" disabled></button>
    <div id="completion-toast">
      <div class="toast-icon">✅</div>
      <div class="toast-title">Concluído!</div>
      <div class="toast-sub" id="toast-message">Tudo pronto</div>
    </div>
  `;
}

const REPO_PKG = { name: 'htop', version: '3.3.0', repo: 'extra', description: 'Monitor de processos' };

describe('packages repository', () => {
  beforeEach(() => {
    setupDom();
    mockInvoke.mockReset();
    setPasswordVerified(false);
  });

  it('should do nothing when nothing is selected', async () => {
    await handleInstallRepoPackages();
    expect(showPasswordModal).not.toHaveBeenCalled();
  });

  it('should prompt for a query when empty', async () => {
    await handleSearchRepoPackages('   ');

    expect(document.getElementById('pkg-search-list')?.innerHTML).toContain('Digite um nome');
    expect((document.getElementById('pkg-search-actions') as HTMLElement).style.display).toBe('none');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('should search and render repository packages', async () => {
    mockInvoke.mockResolvedValue([REPO_PKG]);

    await handleSearchRepoPackages('htop');

    expect(mockInvoke).toHaveBeenCalledWith('search_repo_packages', { query: 'htop' });
    expect((document.getElementById('pkg-search-actions') as HTMLElement).style.display).not.toBe('none');
    expect(document.querySelector('.pkg-cell-name')?.textContent).toBe('htop');
    expect(document.querySelector('.pkg-cell-repo')?.textContent).toBe('extra');
  });

  it('should show empty message when no results', async () => {
    mockInvoke.mockResolvedValue([]);

    await handleSearchRepoPackages('zzz');

    expect(document.getElementById('pkg-search-list')?.innerHTML).toContain('Nenhum pacote encontrado');
    expect((document.getElementById('pkg-search-actions') as HTMLElement).style.display).toBe('none');
  });

  it('should show error state on failure', async () => {
    mockInvoke.mockRejectedValue(new Error('offline'));

    await handleSearchRepoPackages('htop');

    expect(document.getElementById('pkg-search-list')?.innerHTML).toContain('❌ Erro ao buscar pacotes');
  });

  it('should enable install button as packages are selected', async () => {
    mockInvoke.mockResolvedValue([REPO_PKG, { ...REPO_PKG, name: 'neofetch' }]);
    await handleSearchRepoPackages('h');

    const btn = document.getElementById('pkg-install-repo-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    (document.querySelectorAll('.pkg-row')[0] as HTMLElement).click();

    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('⬇️ Instalar (1)');
  });

  it('should install selected packages when password is verified', async () => {
    setPasswordVerified(true);
    mockInvoke.mockResolvedValueOnce([REPO_PKG]).mockResolvedValueOnce(['htop instalado']);
    await handleSearchRepoPackages('htop');
    (document.querySelector('.pkg-row') as HTMLElement).click();

    await handleInstallRepoPackages();

    expect(mockInvoke).toHaveBeenCalledWith('install_repo_packages', { packageNames: ['htop'] });
    expect(document.getElementById('pkg-search-list')?.innerHTML).toContain('htop instalado');
    expect(toastState().message).toContain('1 pacote(s) instalado(s)');
  });

  it('should ask for password when not verified', async () => {
    mockInvoke.mockResolvedValueOnce([REPO_PKG]);
    await handleSearchRepoPackages('htop');
    (document.querySelector('.pkg-row') as HTMLElement).click();

    await handleInstallRepoPackages();

    expect(showPasswordModal).toHaveBeenCalledWith({ type: 'install', tools: ['htop'] });
  });
});
