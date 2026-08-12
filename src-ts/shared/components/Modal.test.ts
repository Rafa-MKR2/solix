// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Modal } from '@/shared/components/Modal';

function findOverlay(): HTMLElement | null {
  return document.querySelector('.modal-overlay');
}

describe('Modal Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should append modal to the body with title and content', () => {
    new Modal({ title: 'Título', content: '<p>corpo</p>' });

    const overlay = findOverlay();
    expect(overlay).not.toBeNull();
    expect(overlay?.querySelector('.modal-title')?.textContent).toBe('Título');
    expect(overlay?.querySelector('.modal-body')?.innerHTML).toBe('<p>corpo</p>');
  });

  it('should append HTMLElement content', () => {
    const el = document.createElement('div');
    el.textContent = 'nó';
    new Modal({ title: 'T', content: el });

    const body = findOverlay()?.querySelector('.modal-body');
    expect(body?.textContent).toBe('nó');
  });

  it('should apply size class', () => {
    new Modal({ title: 'T', content: 'x', size: 'lg' });
    const modal = findOverlay()?.querySelector('.modal');
    expect(modal?.className).toContain('modal-lg');
  });

  it('should render footer string and HTMLElement', () => {
    const el = document.createElement('div');
    el.textContent = 'rodapé';
    new Modal({ title: 'T', content: 'x', footer: el });
    expect(findOverlay()?.querySelector('.modal-footer')?.textContent).toBe('rodapé');
  });

  it('should remove overlay after close with delay', () => {
    vi.useFakeTimers();
    const modal = new Modal({ title: 'T', content: 'x' });

    expect(findOverlay()).not.toBeNull();
    modal.close();
    expect(findOverlay()).not.toBeNull(); // ainda não removido

    vi.advanceTimersByTime(250);
    expect(findOverlay()).toBeNull();
  });

  it('should call onClose after close', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const modal = new Modal({ title: 'T', content: 'x', onClose });

    modal.close();
    vi.advanceTimersByTime(250);

    expect(onClose).toHaveBeenCalled();
  });

  it('should close via close button', () => {
    vi.useFakeTimers();
    new Modal({ title: 'T', content: 'x' });

    (findOverlay()?.querySelector('.modal-close') as HTMLElement)?.click();
    vi.advanceTimersByTime(250);

    expect(findOverlay()).toBeNull();
  });

  it('should close on Escape key', () => {
    vi.useFakeTimers();
    new Modal({ title: 'T', content: 'x' });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    vi.advanceTimersByTime(250);

    expect(findOverlay()).toBeNull();
  });

  it('should close on overlay click', () => {
    vi.useFakeTimers();
    new Modal({ title: 'T', content: 'x' });

    findOverlay()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(250);

    expect(findOverlay()).toBeNull();
  });

  it('should not close on overlay click when not closable', () => {
    vi.useFakeTimers();
    new Modal({ title: 'T', content: 'x', closable: false });

    findOverlay()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    vi.advanceTimersByTime(250);

    expect(findOverlay()).not.toBeNull();
  });

  it('confirm should invoke onConfirm and close', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    Modal.confirm('Tem certeza?', onConfirm);

    const overlay = findOverlay();
    expect(overlay?.querySelector('.modal-body')?.textContent).toContain('Tem certeza?');

    (overlay?.querySelector('[data-action="confirm"]') as HTMLElement)?.click();
    expect(onConfirm).toHaveBeenCalled();

    vi.advanceTimersByTime(250);
    expect(findOverlay()).toBeNull();
  });

  it('confirm should invoke onCancel when cancel is clicked', () => {
    vi.useFakeTimers();
    const onCancel = vi.fn();
    Modal.confirm('x', vi.fn(), onCancel);

    (findOverlay()?.querySelector('[data-action="cancel"]') as HTMLElement)?.click();
    vi.advanceTimersByTime(250);

    expect(onCancel).toHaveBeenCalled();
    expect(findOverlay()).toBeNull();
  });
});
