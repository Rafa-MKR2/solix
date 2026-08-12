// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showBackupModal, handleStartBackup } from '@/features/disks/backup';
import { mockInvoke } from '@/test/setup';
import { toastState } from '@/test/helpers';

function setupDom(): void {
  document.body.innerHTML = `
    <div id="backup-overlay" class="hidden"></div>
    <div id="backup-source"></div>
    <div id="backup-result" class="hidden"></div>
    <div id="backup-progress" class="hidden"></div>
    <div id="backup-progress-status"></div>
    <div id="backup-progress-fill"></div>
    <div id="backup-progress-text"></div>
    <button id="backup-start-btn"></button>
    <button id="backup-cancel-btn"></button>
    <input id="backup-destination" />
    <div id="backup-result-title"></div>
    <div id="backup-result-sub"></div>
    <div id="completion-toast">
      <div class="toast-icon">✅</div>
      <div class="toast-title">Concluído!</div>
      <div class="toast-sub" id="toast-message">Tudo pronto</div>
    </div>
  `;
}

describe('disks backup', () => {
  beforeEach(() => {
    setupDom();
    mockInvoke.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('showBackupModal', () => {
    it('should open the overlay and set the source', () => {
      showBackupModal('/mnt/data');
      expect(document.getElementById('backup-overlay')?.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('backup-source')?.textContent).toBe('/mnt/data');
      expect(document.getElementById('backup-progress')?.classList.contains('hidden')).toBe(true);
      expect((document.getElementById('backup-start-btn') as HTMLButtonElement).disabled).toBe(false);
    });

    it('should use a placeholder for /home', () => {
      showBackupModal('/home');
      const input = document.getElementById('backup-destination') as HTMLInputElement;
      expect(input.placeholder).toContain('/home/seu usuario/backups');
      expect(input.value).toBe('');
    });

    it('should use /root/backups for root mount', () => {
      showBackupModal('/');
      expect((document.getElementById('backup-destination') as HTMLInputElement).value).toBe('/root/backups');
    });

    it('should append backups to removable media mounts', () => {
      showBackupModal('/media/user/USB');
      expect((document.getElementById('backup-destination') as HTMLInputElement).value).toBe('/media/user/USB/backups');
    });

    it('should derive destination for other mounts', () => {
      showBackupModal('/var/data');
      expect((document.getElementById('backup-destination') as HTMLInputElement).value).toBe('/var/backups');
    });

    it('should do nothing when overlay is missing', () => {
      document.getElementById('backup-overlay')!.remove();
      expect(() => showBackupModal('/mnt/x')).not.toThrow();
    });
  });

  describe('handleStartBackup', () => {
    it('should show toast when source or destination is missing', async () => {
      (document.getElementById('backup-source') as HTMLElement).textContent = '';
      (document.getElementById('backup-destination') as HTMLInputElement).value = '';

      await handleStartBackup();

      expect(mockInvoke).not.toHaveBeenCalled();
      expect(toastState().show).toBe(true);
      expect(toastState().title).toBe('Falhou!');
      expect(toastState().message).toContain('Selecione uma origem');
    });

    it('should run the backup and show the success result', async () => {
      document.getElementById('backup-source')!.textContent = '/home';
      (document.getElementById('backup-destination') as HTMLInputElement).value = '/mnt/backup';
      mockInvoke.mockResolvedValue({
        success: true,
        file_size: '1.2 GB',
        duration_secs: 42,
        file_path: '/mnt/backup/solix-backup.tar.gz',
      });

      await handleStartBackup();

      expect(mockInvoke).toHaveBeenCalledWith('create_backup', {
        source: '/home',
        destination: '/mnt/backup',
        mountPoint: '/home',
      });
      expect((document.getElementById('backup-progress-fill') as HTMLElement).style.width).toBe('100%');
      expect(document.getElementById('backup-progress-text')?.textContent).toBe('100%');
      expect(document.getElementById('backup-result')?.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('backup-result-title')?.textContent).toBe('✅ Backup concluído!');
      expect(document.getElementById('backup-result-sub')?.textContent).toContain('1.2 GB');
      expect(toastState().title).toBe('Concluído!');
      expect(toastState().message).toContain('Backup criado');
      expect((document.getElementById('backup-start-btn') as HTMLButtonElement).disabled).toBe(false);
    });

    it('should disable the start button while running', async () => {
      document.getElementById('backup-source')!.textContent = '/home';
      (document.getElementById('backup-destination') as HTMLInputElement).value = '/mnt/x';
      let resolveFn!: (v: unknown) => void;
      mockInvoke.mockImplementation(() => new Promise(res => { resolveFn = res; }));

      const promise = handleStartBackup();
      expect((document.getElementById('backup-start-btn') as HTMLButtonElement).disabled).toBe(true);
      expect((document.getElementById('backup-cancel-btn') as HTMLButtonElement).textContent).toBe('⏳');

      resolveFn({ success: true, file_size: '1 MB', duration_secs: 1, file_path: '/x' });
      await promise;
      expect((document.getElementById('backup-start-btn') as HTMLButtonElement).disabled).toBe(false);
      expect((document.getElementById('backup-cancel-btn') as HTMLButtonElement).textContent).toBe('Cancelar');
    });

    it('should show failure result when backup fails', async () => {
      document.getElementById('backup-source')!.textContent = '/home';
      (document.getElementById('backup-destination') as HTMLInputElement).value = '/mnt/x';
      mockInvoke.mockResolvedValue({ success: false, error: 'disco cheio', file_size: '', duration_secs: 0, file_path: '' });

      await handleStartBackup();

      expect(document.getElementById('backup-result-title')?.textContent).toBe('❌ Falha no backup');
      expect(document.getElementById('backup-result-sub')?.textContent).toContain('disco cheio');
      expect(toastState().show).toBe(true);
      expect(toastState().title).toBe('Falhou!');
    });

    it('should handle invoke rejection', async () => {
      document.getElementById('backup-source')!.textContent = '/home';
      (document.getElementById('backup-destination') as HTMLInputElement).value = '/mnt/x';
      mockInvoke.mockRejectedValue(new Error('permissão negada'));

      await handleStartBackup();

      expect(document.getElementById('backup-progress-status')?.textContent).toContain('permissão negada');
      expect(document.getElementById('backup-result-title')?.textContent).toBe('❌ Falha no backup');
    });
  });
});
