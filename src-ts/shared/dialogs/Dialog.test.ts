// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Dialog } from '@/shared/dialogs/Dialog';

function findOverlay(): HTMLElement | null {
  return document.querySelector('.dialog-overlay');
}

describe('Dialog Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should append dialog to the body with title, role and content', () => {
    new Dialog({ title: 'Título', content: '<p>corpo</p>' });

    const overlay = findOverlay();
    expect(overlay).not.toBeNull();
    const dialog = overlay?.querySelector('.dialog') as HTMLElement;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.querySelector('.dialog-title')?.textContent).toBe('Título');
    expect(dialog.querySelector('.dialog-body')?.innerHTML).toBe('<p>corpo</p>');
  });

  it('should append HTMLElement content and footer', () => {
    const el = document.createElement('div');
    el.textContent = 'nó';
    new Dialog({ title: 'T', content: el, footer: '<button>ok</button>' });

    const overlay = findOverlay();
    expect(overlay?.querySelector('.dialog-body')?.textContent).toBe('nó');
    expect(overlay?.querySelector('.dialog-footer')?.innerHTML).toContain('ok');
  });

  it('should apply size class', () => {
    new Dialog({ title: 'T', content: 'x', size: 'xl' });
    const dialog = findOverlay()?.querySelector('.dialog');
    expect(dialog?.className).toContain('dialog-xl');
  });

  it('should not render close button when showCloseButton is false', () => {
    new Dialog({ title: 'T', content: 'x', showCloseButton: false });
    expect(findOverlay()?.querySelector('.dialog-close')).toBeNull();
  });

  it('should remove overlay after close with delay and call onClose', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const dialog = new Dialog({ title: 'T', content: 'x', onClose });

    dialog.close();
    expect(findOverlay()).not.toBeNull();

    vi.advanceTimersByTime(250);
    expect(findOverlay()).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });

  it('should close via close button', () => {
    vi.useFakeTimers();
    new Dialog({ title: 'T', content: 'x' });

    (findOverlay()?.querySelector('.dialog-close') as HTMLElement)?.click();
    vi.advanceTimersByTime(250);
    expect(findOverlay()).toBeNull();
  });

  it('should close on Escape key and overlay click', () => {
    vi.useFakeTimers();
    new Dialog({ title: 'T', content: 'x' });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    findOverlay()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(250);
    expect(findOverlay()).toBeNull();
  });

  it('should not bind close events when closable is false', () => {
    vi.useFakeTimers();
    new Dialog({ title: 'T', content: 'x', closable: false });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    vi.advanceTimersByTime(250);
    expect(findOverlay()).not.toBeNull();
  });

  it('confirm should invoke onConfirm and close', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    Dialog.confirm('Tem certeza?', onConfirm);

    const overlay = findOverlay();
    expect(overlay?.querySelector('.dialog-body')?.textContent).toContain('Tem certeza?');

    (overlay?.querySelector('[data-action="confirm"]') as HTMLElement)?.click();
    expect(onConfirm).toHaveBeenCalled();

    vi.advanceTimersByTime(250);
    expect(findOverlay()).toBeNull();
  });

  it('confirm should invoke onCancel when cancel is clicked', () => {
    vi.useFakeTimers();
    const onCancel = vi.fn();
    Dialog.confirm('x', vi.fn(), onCancel);

    (findOverlay()?.querySelector('[data-action="cancel"]') as HTMLElement)?.click();
    vi.advanceTimersByTime(250);

    expect(onCancel).toHaveBeenCalled();
    expect(findOverlay()).toBeNull();
  });

  it('alert should render OK button and close', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    Dialog.alert('Aviso importante', onClose);

    expect(findOverlay()?.querySelector('.dialog-title')?.textContent).toBe('Aviso');
    (findOverlay()?.querySelector('[data-action="ok"]') as HTMLElement)?.click();

    vi.advanceTimersByTime(250);
    expect(onClose).toHaveBeenCalled();
    expect(findOverlay()).toBeNull();
  });
});
