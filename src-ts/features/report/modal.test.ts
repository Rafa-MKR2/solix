// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showReportModal, hideReportModal } from '@/features/report/modal';

function setupDom(): void {
  document.body.innerHTML = `
    <div id="report-overlay" class="hidden"></div>
    <div id="report-status"></div>
    <div id="report-content"></div>
    <pre id="report-text"></pre>
    <div id="report-result"></div>
    <button id="report-github-btn"></button>
    <button id="report-copy-btn"></button>
  `;
}

describe('report modal', () => {
  beforeEach(() => {
    setupDom();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show overlay with loading state and disabled buttons', () => {
    vi.useFakeTimers();
    showReportModal('relatório');

    const overlay = document.getElementById('report-overlay');
    expect(overlay?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('report-status')?.classList.contains('loading')).toBe(true);
    expect((document.getElementById('report-github-btn') as HTMLButtonElement).disabled).toBe(true);
    expect((document.getElementById('report-copy-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should reveal content with text after loading', () => {
    vi.useFakeTimers();
    showReportModal('conteúdo do relatório');

    vi.advanceTimersByTime(300);

    expect(document.getElementById('report-status')?.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('report-content')?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('report-text')?.textContent).toBe('conteúdo do relatório');
    expect((document.getElementById('report-github-btn') as HTMLButtonElement).disabled).toBe(false);
    expect((document.getElementById('report-copy-btn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('should do nothing when overlay is missing', () => {
    document.body.innerHTML = '';
    expect(() => showReportModal('x')).not.toThrow();
  });

  it('should hide the modal', () => {
    document.getElementById('report-overlay')?.classList.remove('hidden');
    hideReportModal();
    expect(document.getElementById('report-overlay')?.classList.contains('hidden')).toBe(true);
  });
});
