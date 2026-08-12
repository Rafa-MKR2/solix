// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReportDialog } from '@/shared/dialogs/ReportDialog';

const REPORT = {
  systemInfo: 'Sistema: Linux\nCPU: Intel\nRAM: 8GB',
  timestamp: '2026-08-12',
};

function findDialog(): HTMLElement | null {
  return document.querySelector('.dialog-overlay .dialog');
}

function contentEl(): HTMLElement | null {
  return findDialog()?.querySelector('#dialog-report-content') ?? null;
}

describe('ReportDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should show loading view with report data', () => {
    const dialog = new ReportDialog({ reportData: REPORT, onCopy: vi.fn(), onSave: vi.fn(), onEmail: vi.fn(), onGitHub: vi.fn() });
    dialog.show();

    const el = findDialog();
    expect(el?.querySelector('.report-status-text')?.textContent).toContain('Coletando');
    expect(contentEl()?.classList.contains('hidden')).toBe(true);
    expect(el?.querySelector('#dialog-report-text')?.textContent).toContain('Intel');
  });

  it('should switch to content view after loading', () => {
    vi.useFakeTimers();
    const dialog = new ReportDialog({ reportData: REPORT, onCopy: vi.fn(), onSave: vi.fn(), onEmail: vi.fn(), onGitHub: vi.fn() });
    dialog.show();

    vi.advanceTimersByTime(1600);

    expect(findDialog()?.querySelector('.report-status')?.classList.contains('hidden')).toBe(true);
    expect(contentEl()?.classList.contains('hidden')).toBe(false);
  });

  it('should call action callbacks when buttons are clicked', () => {
    vi.useFakeTimers();
    const onCopy = vi.fn();
    const onSave = vi.fn();
    const onEmail = vi.fn();
    const onGitHub = vi.fn();
    const dialog = new ReportDialog({ reportData: REPORT, onCopy, onSave, onEmail, onGitHub });
    dialog.show();

    const footer = findDialog()?.querySelector('#dialog-report-buttons');
    (footer?.querySelector('[data-action="save"]') as HTMLElement)?.click();
    (footer?.querySelector('[data-action="email"]') as HTMLElement)?.click();
    (footer?.querySelector('[data-action="copy"]') as HTMLElement)?.click();
    (footer?.querySelector('[data-action="github"]') as HTMLElement)?.click();

    expect(onSave).toHaveBeenCalled();
    expect(onEmail).toHaveBeenCalled();
    expect(onCopy).toHaveBeenCalled();
    expect(onGitHub).toHaveBeenCalled();
  });

  it('close button should close the dialog', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const dialog = new ReportDialog({ reportData: REPORT, onCopy: vi.fn(), onSave: vi.fn(), onEmail: vi.fn(), onGitHub: vi.fn(), onClose });
    dialog.show();

    (findDialog()?.querySelector('[data-action="close"]') as HTMLElement)?.click();
    vi.advanceTimersByTime(250);

    expect(onClose).toHaveBeenCalled();
    expect(findDialog()).toBeNull();
  });

  it('showResult should reveal result with icon and message', () => {
    vi.useFakeTimers();
    const dialog = new ReportDialog({ reportData: REPORT, onCopy: vi.fn(), onSave: vi.fn(), onEmail: vi.fn(), onGitHub: vi.fn() });
    dialog.show();
    vi.advanceTimersByTime(1600);

    dialog.showResult(false, 'Falha ao salvar');

    const el = findDialog();
    expect(el?.querySelector('#dialog-report-result')?.classList.contains('hidden')).toBe(false);
    expect(el?.querySelector('#dialog-report-result-icon')?.textContent).toBe('❌');
    expect(el?.querySelector('#dialog-report-result-text')?.textContent).toBe('Falha ao salvar');
  });

  it('close should remove the dialog', () => {
    vi.useFakeTimers();
    const dialog = new ReportDialog({ reportData: REPORT, onCopy: vi.fn(), onSave: vi.fn(), onEmail: vi.fn(), onGitHub: vi.fn() });
    dialog.show();

    dialog.close();
    vi.advanceTimersByTime(250);
    expect(findDialog()).toBeNull();
  });
});
