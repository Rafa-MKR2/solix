// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type ToastApi = typeof import('@/shared/components/Toast');

function toastElements(): NodeListOf<Element> {
  return document.querySelectorAll('#toast-container .toast');
}

describe('Toast Component', () => {
  let toast: ToastApi;

  beforeEach(async () => {
    document.body.innerHTML = '';
    vi.resetModules();
    toast = await import('@/shared/components/Toast');
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should create a toast container and a toast with title/message', () => {
    toast.showToast({ type: 'success', title: 'Sucesso', message: 'Tudo ok' });

    const container = document.getElementById('toast-container');
    expect(container).not.toBeNull();
    expect(container?.querySelector('.toast-title')?.textContent).toBe('Sucesso');
    expect(container?.querySelector('.toast-message')?.textContent).toBe('Tudo ok');
    expect(container?.querySelector('.toast-icon')?.textContent).toBe('✅');
  });

  it('should use default title when not provided', () => {
    toast.showToast({ type: 'error' });
    expect(document.querySelector('#toast-container .toast-title')?.textContent).toBe('Erro');
  });

  it('should set role and aria-live attributes', () => {
    toast.showToast({ type: 'error' });
    const toastEl = document.querySelector('#toast-container .toast') as HTMLElement;
    expect(toastEl.getAttribute('role')).toBe('alert');
    expect(toastEl.getAttribute('aria-live')).toBe('assertive');
  });

  it('should add action button and invoke it', () => {
    const onClick = vi.fn();
    const id = toast.showToast({ type: 'info', title: 'T', action: { label: 'Ver', onClick } });

    const actionBtn = document.querySelector('#toast-container .toast-action') as HTMLElement;
    expect(actionBtn.textContent).toBe('Ver');
    actionBtn.click();
    expect(onClick).toHaveBeenCalled();

    vi.useFakeTimers();
    toast.removeToast(id);
    vi.advanceTimersByTime(350);
    expect(document.querySelector('#toast-container .toast')).toBeNull();
  });

  it('should auto-dismiss after duration', () => {
    vi.useFakeTimers();
    toast.showToast({ type: 'info', title: 'T', duration: 100 });

    expect(toastElements().length).toBe(1);
    vi.advanceTimersByTime(450);
    expect(toastElements().length).toBe(0);
  });

  it('should not auto-dismiss persistent toasts', () => {
    vi.useFakeTimers();
    toast.showToast({ type: 'loading', title: 'Carregando', persistent: true });

    vi.advanceTimersByTime(10000);
    expect(toastElements().length).toBe(1);
  });

  it('should not render close button for persistent toasts', () => {
    toast.showToast({ type: 'loading', title: 'Carregando', persistent: true });
    expect(document.querySelector('#toast-container .toast-close')).toBeNull();
  });

  it('should remove toast manually', () => {
    vi.useFakeTimers();
    const id = toast.showToast({ type: 'info', title: 'T' });

    toast.removeToast(id);
    vi.advanceTimersByTime(350);
    expect(toastElements().length).toBe(0);
  });

  it('removeToast should be a no-op for unknown id', () => {
    expect(() => toast.removeToast(9999)).not.toThrow();
  });

  it('updateToast should update type, title and message', () => {
    vi.useFakeTimers();
    const id = toast.showToast({ type: 'info', title: 'Antes', message: 'msg1' });

    toast.updateToast(id, { type: 'success', title: 'Depois', message: 'msg2' });

    const toastEl = document.querySelector('#toast-container .toast') as HTMLElement;
    expect(toastEl.className).toContain('toast-success');
    expect(toastEl.querySelector('.toast-icon')?.textContent).toBe('✅');
    expect(toastEl.querySelector('.toast-title')?.textContent).toBe('Depois');
    expect(toastEl.querySelector('.toast-message')?.textContent).toBe('msg2');
  });

  it('updateToast should add message element when absent', () => {
    vi.useFakeTimers();
    const id = toast.showToast({ type: 'info', title: 'T' });

    toast.updateToast(id, { message: 'nova msg' });
    expect(document.querySelector('#toast-container .toast-message')?.textContent).toBe('nova msg');
  });

  it('updateToast should be a no-op for unknown id', () => {
    expect(() => toast.updateToast(9999, { title: 'x' })).not.toThrow();
  });

  it('helpers should create toasts with the right type', () => {
    toast.showSuccess('S', 'm');
    toast.showError('E', 'm');
    toast.showWarning('W', 'm');
    toast.showInfo('I', 'm');
    toast.showLoading('L', 'm');

    const classes = Array.from(toastElements()).map(t => t.className);
    expect(classes.some(c => c.includes('toast-success'))).toBe(true);
    expect(classes.some(c => c.includes('toast-error'))).toBe(true);
    expect(classes.some(c => c.includes('toast-warning'))).toBe(true);
    expect(classes.some(c => c.includes('toast-info'))).toBe(true);
    expect(classes.some(c => c.includes('toast-loading'))).toBe(true);
  });

  it('dismissAllToasts should remove all toasts', () => {
    vi.useFakeTimers();
    toast.showToast({ type: 'info', title: 'a' });
    toast.showToast({ type: 'info', title: 'b' });

    toast.dismissAllToasts();
    vi.advanceTimersByTime(350);
    expect(toastElements().length).toBe(0);
  });
});
