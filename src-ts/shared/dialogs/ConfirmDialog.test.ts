// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfirmDialog, confirm, alert } from '@/shared/dialogs/ConfirmDialog';

function findDialog(): HTMLElement | null {
  return document.querySelector('.dialog-overlay .dialog');
}

describe('ConfirmDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should show dialog with message and default labels', () => {
    const onConfirm = vi.fn();
    const dialog = new ConfirmDialog({ title: 'Confirmar', message: 'Deseja continuar?', onConfirm });
    dialog.show();

    const el = findDialog();
    expect(el?.querySelector('.dialog-body')?.textContent).toContain('Deseja continuar?');
    expect(el?.querySelector('[data-action="confirm"]')?.textContent).toBe('Confirmar');
    expect(el?.querySelector('[data-action="cancel"]')?.textContent).toBe('Cancelar');
  });

  it('should escape HTML in message', () => {
    const dialog = new ConfirmDialog({ title: 'T', message: '<script>alert(1)</script>', onConfirm: vi.fn() });
    dialog.show();

    const body = findDialog()?.querySelector('.dialog-body');
    expect(body?.innerHTML).not.toContain('<script>');
  });

  it('should invoke onConfirm and close when confirm is clicked', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    const dialog = new ConfirmDialog({ title: 'T', message: 'm', onConfirm });
    dialog.show();

    (findDialog()?.querySelector('[data-action="confirm"]') as HTMLElement)?.click();
    expect(onConfirm).toHaveBeenCalled();
    expect(dialog['dialog']).toBeNull(); // fechado após click

    vi.advanceTimersByTime(250);
    expect(findDialog()).toBeNull();
  });

  it('should invoke onCancel when cancel is clicked', () => {
    vi.useFakeTimers();
    const onCancel = vi.fn();
    const dialog = new ConfirmDialog({ title: 'T', message: 'm', onConfirm: vi.fn(), onCancel });
    dialog.show();

    (findDialog()?.querySelector('[data-action="cancel"]') as HTMLElement)?.click();

    vi.advanceTimersByTime(250);
    expect(onCancel).toHaveBeenCalled();
    expect(findDialog()).toBeNull();
  });

  it('should add danger variant class to dialog', () => {
    const dialog = new ConfirmDialog({ title: 'T', message: 'm', variant: 'danger', onConfirm: vi.fn() });
    dialog.show();

    const el = findDialog();
    expect(el?.className).toContain('dialog-danger');
    expect(el?.querySelector('[data-action="confirm"]')?.className).toContain('btn-danger');
  });

  it('should add warning variant class to dialog', () => {
    const dialog = new ConfirmDialog({ title: 'T', message: 'm', variant: 'warning', onConfirm: vi.fn() });
    dialog.show();

    const el = findDialog();
    expect(el?.className).toContain('dialog-warning');
    expect(el?.querySelector('[data-action="confirm"]')?.className).toContain('btn-warning');
  });

  it('close should remove the dialog', () => {
    vi.useFakeTimers();
    const dialog = new ConfirmDialog({ title: 'T', message: 'm', onConfirm: vi.fn() });
    dialog.show();

    dialog.close();
    vi.advanceTimersByTime(250);
    expect(findDialog()).toBeNull();
  });

  it('confirm helper should show and return a dialog', () => {
    const onConfirm = vi.fn();
    const dialog = confirm('Mensagem', onConfirm);
    expect(dialog).toBeInstanceOf(ConfirmDialog);
    expect(findDialog()?.querySelector('.dialog-title')?.textContent).toBe('Confirmação');
  });

  it('alert helper should show only the OK button', () => {
    const onClose = vi.fn();
    alert('Atenção', onClose);

    const el = findDialog();
    expect(el?.querySelector('[data-action="confirm"]')?.textContent).toBe('OK');
    const cancelBtn = el?.querySelector('[data-action="cancel"]') as HTMLElement | null;
    expect(cancelBtn?.style.display).toBe('none');
  });
});
