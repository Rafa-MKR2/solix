// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { miscService } from '@/shared/services/misc.service';
import { mockInvoke } from '@/test/setup';

describe('Misc Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });

  it('should enable zram', async () => {
    mockInvoke.mockResolvedValue({ tool_name: 'zram', success: true });
    const result = await miscService.enableZram();
    expect(mockInvoke).toHaveBeenCalledWith('enable_zram');
    expect(result.success).toBe(true);
  });

  it('should cleanup system', async () => {
    mockInvoke.mockResolvedValue({ tool_name: 'cleanup', success: true });
    const result = await miscService.cleanupSystem();
    expect(mockInvoke).toHaveBeenCalledWith('cleanup_system');
    expect(result.success).toBe(true);
  });

  it('should save report to desktop', async () => {
    mockInvoke.mockResolvedValue('/home/user/Área de trabalho/report.txt');
    const result = await miscService.saveReportToDesktop('conteúdo do relatório');
    expect(mockInvoke).toHaveBeenCalledWith('save_report_to_desktop', { content: 'conteúdo do relatório' });
    expect(result).toContain('report.txt');
  });

  it('should create desktop shortcut', async () => {
    mockInvoke.mockResolvedValue('/home/user/Área de trabalho/git.desktop');
    const result = await miscService.createDesktopShortcut('git');
    expect(mockInvoke).toHaveBeenCalledWith('create_desktop_shortcut', { name: 'git' });
    expect(result).toContain('git.desktop');
  });

  it('should open url', async () => {
    await miscService.openUrl('https://example.com');
    expect(mockInvoke).toHaveBeenCalledWith('open_url', { url: 'https://example.com' });
  });

  it('should return empty string for saveReport when Tauri is not available', async () => {
    const original = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: undefined, writable: true });

    const result = await miscService.saveReportToDesktop('x');
    expect(result).toBe('');

    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: original, writable: true });
  });

  it('should throw when Tauri is not available for enableZram', async () => {
    const original = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: undefined, writable: true });

    await expect(miscService.enableZram()).rejects.toThrow('Tauri not available');

    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: original, writable: true });
  });

  it('should propagate invoke errors', async () => {
    mockInvoke.mockRejectedValue(new Error('zram failed'));
    await expect(miscService.enableZram()).rejects.toThrow('zram failed');
  });
});
