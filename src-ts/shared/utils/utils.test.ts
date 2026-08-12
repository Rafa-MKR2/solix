// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { escapeHtml } from '@/shared/utils/escape';
import { setText } from '@/shared/utils/dom';
import { getInvoke } from '@/shared/utils/tauri';
import { showToast } from '@/shared/utils/toast';

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    // Aspas não são escapadas pelo serializador em conteúdo de texto
    expect(escapeHtml('"quoted"')).toBe('"quoted"');
  });

  it('should return empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('setText', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="target"></div>';
  });

  it('should set text content of existing element', () => {
    setText('target', 'hello');
    expect(document.getElementById('target')?.textContent).toBe('hello');
  });

  it('should use dash placeholder for empty text', () => {
    setText('target', '');
    expect(document.getElementById('target')?.textContent).toBe('—');
  });

  it('should not throw when element does not exist', () => {
    expect(() => setText('missing-element', 'x')).not.toThrow();
  });
});

describe('getInvoke', () => {
  it('should return the invoke function from __TAURI_INTERNALS__', () => {
    const invoke = vi.fn();
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      writable: true,
      value: { invoke },
    });
    expect(getInvoke()).toBe(invoke);
  });

  it('should return null when __TAURI_INTERNALS__ is missing', () => {
    const original = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: undefined, writable: true });
    expect(getInvoke()).toBeNull();
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: original, writable: true });
  });
});

describe('showToast (utils/toast.ts)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="completion-toast">
        <span class="toast-icon"></span>
        <span class="toast-title"></span>
      </div>
      <div id="toast-message"></div>
    `;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not throw when toast element is missing', () => {
    document.body.innerHTML = '';
    expect(() => showToast('info', 'hello')).not.toThrow();
  });

  it('should show success toast with message', () => {
    vi.useFakeTimers();
    showToast('success', 'Tudo certo!');

    const toast = document.getElementById('completion-toast');
    expect(toast?.classList.contains('show')).toBe(true);
    expect(document.getElementById('toast-message')?.textContent).toBe('Tudo certo!');
    expect(toast?.querySelector('.toast-icon')?.textContent).toBe('✅');
    expect(toast?.querySelector('.toast-title')?.textContent).toBe('Concluído!');
    expect((toast as HTMLElement).style.borderColor).toBe('rgb(0, 212, 170)');
  });

  it('should show error toast with failure styles', () => {
    vi.useFakeTimers();
    showToast('error', 'Algo falhou');

    const toast = document.getElementById('completion-toast');
    expect(toast?.querySelector('.toast-icon')?.textContent).toBe('❌');
    expect(toast?.querySelector('.toast-title')?.textContent).toBe('Falhou!');
    expect((toast as HTMLElement).style.borderColor).toBe('rgb(232, 74, 74)');
    expect((toast as HTMLElement).style.background).toBe('rgb(34, 17, 17)');
  });

  it('should hide toast after 4 seconds', () => {
    vi.useFakeTimers();
    showToast('info', 'msg');

    const toast = document.getElementById('completion-toast');
    expect(toast?.classList.contains('show')).toBe(true);

    vi.advanceTimersByTime(4000);
    expect(toast?.classList.contains('show')).toBe(false);
  });
});
