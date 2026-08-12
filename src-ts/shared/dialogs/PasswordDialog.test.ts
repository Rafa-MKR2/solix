// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PasswordDialog, showPasswordModal } from '@/shared/dialogs/PasswordDialog';

function findDialog(): HTMLElement | null {
  return document.querySelector('.dialog-overlay .dialog');
}

function inputEl(): HTMLInputElement | null {
  return findDialog()?.querySelector('#dialog-password-input') ?? null;
}

function confirmBtn(): HTMLButtonElement | null {
  return findDialog()?.querySelector('[data-action="confirm"]') ?? null;
}

function errorEl(): HTMLElement | null {
  return findDialog()?.querySelector('#dialog-password-error') ?? null;
}

describe('PasswordDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should show password input and disabled confirm for install type', () => {
    const dialog = new PasswordDialog({ type: 'install', onConfirm: vi.fn() });
    dialog.show();

    expect(inputEl()).not.toBeNull();
    expect(confirmBtn()?.disabled).toBe(true);
    expect(findDialog()?.querySelector('.dialog-title')?.textContent).toContain('Instalação');
  });

  it('should list tools in the message when provided', () => {
    const dialog = new PasswordDialog({ type: 'remove', tools: ['git', 'node'], onConfirm: vi.fn() });
    dialog.show();

    expect(findDialog()?.querySelector('.dialog-body')?.textContent).toContain('git, node');
  });

  it('should enable confirm when password is typed', () => {
    const dialog = new PasswordDialog({ type: 'install', onConfirm: vi.fn() });
    dialog.show();

    const input = inputEl() as HTMLInputElement;
    input.value = 'minha-senha';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(confirmBtn()?.disabled).toBe(false);
  });

  it('should call onConfirm with password and close', async () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const dialog = new PasswordDialog({ type: 'install', onConfirm });
    dialog.show();

    const input = inputEl() as HTMLInputElement;
    input.value = 'secret';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    confirmBtn()?.click();

    await vi.runAllTimersAsync();

    expect(onConfirm).toHaveBeenCalledWith('secret');
    expect(findDialog()).toBeNull();
  });

  it('should show error and re-enable confirm when onConfirm rejects', async () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn().mockRejectedValue(new Error('wrong password'));
    const dialog = new PasswordDialog({ type: 'install', onConfirm });
    dialog.show();

    const input = inputEl() as HTMLInputElement;
    input.value = 'errada';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    confirmBtn()?.click();

    await vi.runAllTimersAsync();

    expect(errorEl()?.classList.contains('hidden')).toBe(false);
    expect(errorEl()?.textContent).toBe('Senha incorreta. Tente novamente.');
    expect(confirmBtn()?.disabled).toBe(false);
  });

  it('should show inline error for empty password', async () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const dialog = new PasswordDialog({ type: 'install', onConfirm });
    dialog.show();

    confirmBtn()?.click();
    await vi.runAllTimersAsync();

    expect(errorEl()?.classList.contains('hidden')).toBe(false);
    expect(errorEl()?.textContent).toBe('Digite sua senha');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('app-update type should not render password input and confirm with empty password', async () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const dialog = new PasswordDialog({ type: 'app-update', onConfirm });
    dialog.show();

    expect(inputEl()).toBeNull();
    expect(findDialog()?.querySelector('.dialog-title')?.textContent).toContain('Atualizar Sistema');

    confirmBtn()?.click();
    await vi.runAllTimersAsync();

    expect(onConfirm).toHaveBeenCalledWith('');
    expect(findDialog()).toBeNull();
  });

  it('cancel button should close the dialog', () => {
    vi.useFakeTimers();
    const onCancel = vi.fn();
    const dialog = new PasswordDialog({ type: 'install', onConfirm: vi.fn(), onCancel });
    dialog.show();

    (findDialog()?.querySelector('[data-action="cancel"]') as HTMLElement)?.click();
    vi.advanceTimersByTime(250);

    expect(onCancel).toHaveBeenCalled();
    expect(findDialog()).toBeNull();
  });

  it('showPasswordModal helper should create and show a dialog', () => {
    showPasswordModal({ type: 'cleanup', onConfirm: vi.fn() });
    expect(findDialog()?.querySelector('.dialog-title')?.textContent).toContain('Limpeza');
  });
});
