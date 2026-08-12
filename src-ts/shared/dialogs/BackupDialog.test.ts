// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackupDialog } from '@/shared/dialogs/BackupDialog';

function findDialog(): HTMLElement | null {
  return document.querySelector('.dialog-overlay .dialog');
}

function destinationInput(): HTMLInputElement | null {
  return findDialog()?.querySelector('#dialog-backup-destination') ?? null;
}

describe('BackupDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should show config view with source and default destination', () => {
    const dialog = new BackupDialog({
      sourcePath: '/home/user/docs',
      defaultDestination: '/mnt/backup',
      onStart: vi.fn(),
    });
    dialog.show();

    const el = findDialog();
    expect(el?.querySelector('.backup-value')?.textContent).toBe('/home/user/docs');
    expect(destinationInput()?.value).toBe('/mnt/backup');
    expect(el?.querySelector('.dialog-title')?.textContent).toContain('Backup');
  });

  it('should start backup with destination and show progress', async () => {
    vi.useFakeTimers();
    // Promise pendente: mantém a view de progresso visível enquanto o backup "roda"
    let resolveStart!: (value?: unknown) => void;
    const onStart = vi.fn().mockImplementation(() => new Promise(res => { resolveStart = res; }));
    const dialog = new BackupDialog({
      sourcePath: '/a',
      defaultDestination: '/mnt/backup',
      onStart,
    });
    dialog.show();

    (findDialog()?.querySelector('[data-action="start"]') as HTMLElement)?.click();
    await vi.runAllTimersAsync();

    expect(onStart).toHaveBeenCalledWith('/mnt/backup');
    const el = findDialog();
    expect(el?.querySelector('#dialog-backup-progress')?.classList.contains('hidden')).toBe(false);
    expect((el?.querySelector('.backup-field') as HTMLElement)?.style.display).toBe('none');

    resolveStart(undefined);
    await vi.runAllTimersAsync();
  });

  it('should use typed destination instead of default', async () => {
    vi.useFakeTimers();
    const onStart = vi.fn().mockResolvedValue(undefined);
    const dialog = new BackupDialog({
      sourcePath: '/a',
      defaultDestination: '/mnt/default',
      onStart,
    });
    dialog.show();

    const input = destinationInput() as HTMLInputElement;
    input.value = '/mnt/custom';
    (findDialog()?.querySelector('[data-action="start"]') as HTMLElement)?.click();
    await vi.runAllTimersAsync();

    expect(onStart).toHaveBeenCalledWith('/mnt/custom');
  });

  it('should show success result when backup completes', async () => {
    vi.useFakeTimers();
    const onStart = vi.fn().mockResolvedValue(undefined);
    const dialog = new BackupDialog({ sourcePath: '/a', defaultDestination: '/mnt/b', onStart });
    dialog.show();

    (findDialog()?.querySelector('[data-action="start"]') as HTMLElement)?.click();
    await vi.runAllTimersAsync();

    const el = findDialog();
    expect(el?.querySelector('#dialog-backup-result')?.classList.contains('hidden')).toBe(false);
    expect(el?.querySelector('#dialog-backup-result-sub')?.textContent).toBe('Backup concluído com sucesso!');
  });

  it('should show error state when backup fails', async () => {
    vi.useFakeTimers();
    const onStart = vi.fn().mockRejectedValue(new Error('disco cheio'));
    const dialog = new BackupDialog({ sourcePath: '/a', defaultDestination: '/mnt/b', onStart });
    dialog.show();

    (findDialog()?.querySelector('[data-action="start"]') as HTMLElement)?.click();
    await vi.runAllTimersAsync();

    const el = findDialog();
    expect(el?.querySelector('#dialog-backup-progress-status')?.innerHTML).toContain('disco cheio');
    expect(el?.querySelector('[data-action="retry"]')).not.toBeNull();
  });

  it('retry should return to config view', async () => {
    vi.useFakeTimers();
    const onStart = vi.fn().mockRejectedValue(new Error('falhou'));
    const dialog = new BackupDialog({ sourcePath: '/a', defaultDestination: '/mnt/b', onStart });
    dialog.show();

    (findDialog()?.querySelector('[data-action="start"]') as HTMLElement)?.click();
    await vi.runAllTimersAsync();

    (findDialog()?.querySelector('[data-action="retry"]') as HTMLElement)?.click();
    expect(findDialog()?.querySelector('#dialog-backup-destination')).not.toBeNull();
  });

  it('updateProgress should update fill, text and status', async () => {
    vi.useFakeTimers();
    const onStart = vi.fn().mockResolvedValue(undefined);
    const dialog = new BackupDialog({ sourcePath: '/a', defaultDestination: '/mnt/b', onStart });
    dialog.show();

    (findDialog()?.querySelector('[data-action="start"]') as HTMLElement)?.click();
    await vi.runAllTimersAsync();

    dialog.updateProgress(75, 'Comprimindo... 75%');

    const fill = findDialog()?.querySelector('#dialog-backup-progress-fill') as HTMLElement | null;
    expect(fill?.style.width).toBe('75%');
    expect(findDialog()?.querySelector('#dialog-backup-progress-text')?.textContent).toBe('75%');
    expect(findDialog()?.querySelector('#dialog-backup-progress-status')?.textContent).toBe('Comprimindo... 75%');
  });

  it('should do nothing when destination is empty', async () => {
    vi.useFakeTimers();
    const onStart = vi.fn().mockResolvedValue(undefined);
    const dialog = new BackupDialog({ sourcePath: '/a', defaultDestination: '', onStart });
    dialog.show();

    const input = destinationInput() as HTMLInputElement;
    input.value = '   ';
    (findDialog()?.querySelector('[data-action="start"]') as HTMLElement)?.click();
    await vi.runAllTimersAsync();

    expect(onStart).not.toHaveBeenCalled();
  });

  it('close should remove the dialog', () => {
    vi.useFakeTimers();
    const dialog = new BackupDialog({ sourcePath: '/a', defaultDestination: '/mnt/b', onStart: vi.fn() });
    dialog.show();

    dialog.close();
    vi.advanceTimersByTime(250);
    expect(findDialog()).toBeNull();
  });
});
