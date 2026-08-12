// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UpdateDialog } from '@/shared/dialogs/UpdateDialog';

const INFO = {
  current_version: '2.2.2',
  latest_version: '2.3.0',
  changelog: 'Novidades da versão\n- item 1\n- item 2',
  update_available: true,
};

function findDialog(): HTMLElement | null {
  return document.querySelector('.dialog-overlay .dialog');
}

describe('UpdateDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should show info view with versions and changelog', () => {
    const dialog = new UpdateDialog({ info: INFO, onUpdate: vi.fn(), onLater: vi.fn() });
    dialog.show();

    const el = findDialog();
    expect(el?.querySelector('.update-version-row')?.textContent).toContain('2.2.2');
    expect(el?.querySelector('.update-latest')?.textContent).toBe('2.3.0');
    expect(el?.querySelector('.update-changelog')?.textContent).toContain('item 1');
  });

  it('should escape changelog HTML', () => {
    const dialog = new UpdateDialog({
      info: { ...INFO, changelog: '<script>bad()</script>' },
      onUpdate: vi.fn(),
      onLater: vi.fn(),
    });
    dialog.show();

    expect(findDialog()?.querySelector('.update-changelog')?.innerHTML).not.toContain('<script>');
  });

  it('should start update and call onUpdate when update button is clicked', async () => {
    vi.useFakeTimers();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const dialog = new UpdateDialog({ info: INFO, onUpdate, onLater: vi.fn() });
    dialog.show();

    (findDialog()?.querySelector('[data-action="update"]') as HTMLElement)?.click();
    await vi.runAllTimersAsync();

    expect(onUpdate).toHaveBeenCalled();
    // Troca para a view de progresso
    expect(findDialog()?.querySelector('#dialog-update-progress-status')?.textContent).toBe('Baixando...');
  });

  it('should call onLater and close when later button is clicked', () => {
    vi.useFakeTimers();
    const onLater = vi.fn();
    const dialog = new UpdateDialog({ info: INFO, onUpdate: vi.fn(), onLater });
    dialog.show();

    (findDialog()?.querySelector('[data-action="later"]') as HTMLElement)?.click();
    vi.advanceTimersByTime(250);

    expect(onLater).toHaveBeenCalled();
    expect(findDialog()).toBeNull();
  });

  it('updateProgress should update fill, text and status', async () => {
    vi.useFakeTimers();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const dialog = new UpdateDialog({ info: INFO, onUpdate, onLater: vi.fn() });
    dialog.show();

    (findDialog()?.querySelector('[data-action="update"]') as HTMLElement)?.click();
    await vi.runAllTimersAsync();

    dialog.updateProgress(50, 'Baixando... 50%');

    const fill = findDialog()?.querySelector('#dialog-update-progress-fill') as HTMLElement | null;
    expect(fill?.style.width).toBe('50%');
    expect(findDialog()?.querySelector('#dialog-update-progress-text')?.textContent).toBe('50%');
    expect(findDialog()?.querySelector('#dialog-update-progress-status')?.textContent).toBe('Baixando... 50%');
  });

  it('close should remove the dialog', () => {
    vi.useFakeTimers();
    const dialog = new UpdateDialog({ info: INFO, onUpdate: vi.fn(), onLater: vi.fn() });
    dialog.show();

    dialog.close();
    vi.advanceTimersByTime(250);
    expect(findDialog()).toBeNull();
  });
});
