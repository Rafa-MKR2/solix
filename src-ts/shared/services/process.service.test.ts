// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processService } from '@/shared/services/process.service';
import { mockInvoke } from '@/test/setup';

describe('Process Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });

  it('should get processes', async () => {
    mockInvoke.mockResolvedValue([{ pid: 123, name: 'firefox' }]);
    const result = await processService.getProcesses();
    expect(mockInvoke).toHaveBeenCalledWith('get_processes');
    expect(result[0].name).toBe('firefox');
  });

  it('should kill a process by name', async () => {
    mockInvoke.mockResolvedValue('ok');
    const result = await processService.killProcess('pamac');
    expect(mockInvoke).toHaveBeenCalledWith('kill_process', { name: 'pamac' });
    expect(result).toBe('ok');
  });

  it('should remove lock files', async () => {
    mockInvoke.mockResolvedValue('removido');
    const result = await processService.removeLockFiles();
    expect(mockInvoke).toHaveBeenCalledWith('remove_lock_files');
    expect(result).toBe('removido');
  });

  it('should return empty array when Tauri is not available', async () => {
    const original = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: undefined, writable: true });

    const result = await processService.getProcesses();
    expect(result).toEqual([]);

    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: original, writable: true });
  });

  it('should return empty string for killProcess when Tauri is not available', async () => {
    const original = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: undefined, writable: true });

    const result = await processService.killProcess('x');
    expect(result).toBe('');

    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: original, writable: true });
  });

  it('should propagate invoke errors', async () => {
    mockInvoke.mockRejectedValue(new Error('process failed'));
    await expect(processService.getProcesses()).rejects.toThrow('process failed');
  });
});
