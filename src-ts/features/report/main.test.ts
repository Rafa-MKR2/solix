// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  reportProblem,
  handleCopyReport,
  handleOpenIssue,
  handleSaveReport,
  handleEmailReport,
} from '@/features/report/main';
import { mockInvoke } from '@/test/setup';
import { toastState } from '@/test/helpers';

function setupDom(): void {
  document.body.innerHTML = `
    <button id="report-btn"></button>
    <div id="output-log">última operação ok</div>
    <div id="report-overlay" class="hidden"></div>
    <div id="report-status"></div>
    <div id="report-content"></div>
    <div id="report-text"></div>
    <div id="report-result" class="hidden"></div>
    <div id="report-result-text"></div>
    <div id="report-result-icon"></div>
    <button id="report-github-btn"></button>
    <button id="report-copy-btn"></button>
    <div id="completion-toast">
      <div class="toast-icon">✅</div>
      <div class="toast-title">Concluído!</div>
      <div class="toast-sub" id="toast-message">Tudo pronto</div>
    </div>
  `;
}

function lastOpenUrl(): string | undefined {
  const call = mockInvoke.mock.calls.find(c => c[0] === 'open_url');
  return call?.[1]?.url as string | undefined;
}

const REPORT_INFO = {
  app_version: '2.2.2',
  distro_name: 'Arch Linux',
  distro_version: 'rolling',
  kernel: '6.9.1',
  package_manager: 'pacman',
  cpu_percent: 12.4,
  memory_percent: 55.6,
  temperature: 45.2,
};

describe('report main', () => {
  beforeEach(() => {
    setupDom();
    mockInvoke.mockReset();
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('should do nothing when there is no report generated yet', async () => {
    await handleCopyReport();
    await handleOpenIssue();
    await handleSaveReport();
    await handleEmailReport();

    expect(mockInvoke).not.toHaveBeenCalledWith('open_url', expect.anything());
    expect(mockInvoke).not.toHaveBeenCalledWith('save_report_to_desktop', expect.anything());
  });

  it('should collect system info and show the report modal', async () => {
    vi.useFakeTimers();
    mockInvoke.mockResolvedValue(REPORT_INFO);

    await reportProblem();
    vi.advanceTimersByTime(300);

    expect(mockInvoke).toHaveBeenCalledWith('get_report_info');
    const text = document.getElementById('report-text')?.textContent || '';
    expect(text).toContain('Relatório do Solix — v2.2.2');
    expect(text).toContain('Arch Linux rolling');
    expect(text).toContain('6.9.1');
    expect(text).toContain('12%');
    expect(text).toContain('última operação ok');
    expect(document.getElementById('report-overlay')?.classList.contains('hidden')).toBe(false);
    expect((document.getElementById('report-github-btn') as HTMLButtonElement).disabled).toBe(false);
    expect((document.getElementById('report-btn') as HTMLButtonElement).textContent).toBe('🐛 Reportar Problema');
  });

  it('should restore the button and show toast when report fails', async () => {
    mockInvoke.mockRejectedValue(new Error('falha'));

    await reportProblem();

    expect((document.getElementById('report-btn') as HTMLButtonElement).textContent).toBe('🐛 Reportar Problema');
    expect(toastState().show).toBe(true);
    expect(toastState().title).toBe('Falhou!');
    expect(toastState().message).toContain('Erro ao gerar relatório');
  });

  it('should copy the report to the clipboard and show the result', async () => {
    mockInvoke.mockResolvedValue(REPORT_INFO);
    await reportProblem();

    handleCopyReport();
    await vi.waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('Relatório do Solix'));
    expect(document.getElementById('report-result')?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('report-result-text')?.textContent).toContain('copiado');
    expect(toastState().message).toContain('Relatório copiado');
  });

  it('should fall back to selection when clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    mockInvoke.mockResolvedValue(REPORT_INFO);
    await reportProblem();

    handleCopyReport();
    await vi.waitFor(() => expect(toastState().message).toContain('Selecione o texto'));
  });

  it('should open the GitHub issue with the encoded report', async () => {
    mockInvoke.mockResolvedValue(REPORT_INFO);
    await reportProblem();

    await handleOpenIssue();

    const url = lastOpenUrl();
    expect(url).toContain('github.com/Rafa-MKR2/solix/issues/new');
    expect(url).toContain(encodeURIComponent('Relatório do Solix'));
    expect(document.getElementById('report-overlay')?.classList.contains('hidden')).toBe(true);
    expect(toastState().message).toContain('GitHub aberto');
  });

  it('should show toast when opening the issue fails', async () => {
    mockInvoke.mockResolvedValueOnce(REPORT_INFO).mockRejectedValueOnce(new Error('sem navegador'));
    await reportProblem();

    await handleOpenIssue();

    expect(toastState().title).toBe('Falhou!');
    expect(toastState().message).toContain('Erro ao abrir o GitHub');
  });

  it('should save the report to the desktop', async () => {
    mockInvoke.mockResolvedValueOnce(REPORT_INFO).mockResolvedValueOnce('/home/user/Desktop/relatorio.txt');
    await reportProblem();

    await handleSaveReport();

    expect(mockInvoke).toHaveBeenCalledWith('save_report_to_desktop', { content: expect.stringContaining('Relatório do Solix') });
    expect(document.getElementById('report-result-text')?.textContent).toContain('relatorio.txt');
    expect(toastState().message).toContain('Relatório salvo');
  });

  it('should open the mail client with the default email', async () => {
    mockInvoke.mockResolvedValueOnce(REPORT_INFO);
    await reportProblem();

    await handleEmailReport();

    const url = lastOpenUrl();
    expect(url).toContain('mailto:rafaeldocarmo.dev@gmail.com');
    expect(url).toContain(encodeURIComponent('Relatório Solix - Problema'));
    expect(toastState().message).toContain('Cliente de email aberto');
  });

  it('should show toast when saving the report fails', async () => {
    mockInvoke.mockResolvedValueOnce(REPORT_INFO).mockRejectedValueOnce(new Error('sem permissão'));
    await reportProblem();

    await handleSaveReport();

    expect(toastState().title).toBe('Falhou!');
    expect(toastState().message).toContain('sem permissão');
  });

  it('should show toast when opening the mail client fails', async () => {
    mockInvoke.mockResolvedValueOnce(REPORT_INFO).mockRejectedValueOnce(new Error('sem cliente'));
    await reportProblem();

    await handleEmailReport();

    expect(toastState().title).toBe('Falhou!');
    expect(toastState().message).toContain('Erro ao abrir cliente de email');
  });
});
