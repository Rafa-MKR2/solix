// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { diskService } from '@/shared/services/disk.service';
import { mockInvoke } from '@/test/setup';

describe('Disk Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });

  it('should open file manager with path', async () => {
    await diskService.openFileManager('/home/user');
    expect(mockInvoke).toHaveBeenCalledWith('open_file_manager', { path: '/home/user' });
  });

  it('should analyze disk usage', async () => {
    mockInvoke.mockResolvedValue([{ path: '/home', size: 1024 }]);
    const result = await diskService.analyzeUsage('/home');
    expect(mockInvoke).toHaveBeenCalledWith('analyze_disk_usage', { mountPoint: '/home' });
    expect(result[0].path).toBe('/home');
  });

  it('should get partition table', async () => {
    mockInvoke.mockResolvedValue('sda1  ext4  100G');
    const result = await diskService.getPartitionTable('sda');
    expect(mockInvoke).toHaveBeenCalledWith('get_partition_table', { device: 'sda' });
    expect(result).toContain('sda1');
  });

  it('should get smart info', async () => {
    mockInvoke.mockResolvedValue({ status: 'PASSED' });
    const result = await diskService.getSmartInfo('/dev/sda');
    expect(mockInvoke).toHaveBeenCalledWith('get_disk_smart_info', { device: '/dev/sda' });
    expect(result.status).toBe('PASSED');
  });

  it('should no-op openFileManager when Tauri is not available', async () => {
    const original = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: undefined, writable: true });

    await expect(diskService.openFileManager('/x')).resolves.toBeUndefined();
    expect(mockInvoke).not.toHaveBeenCalled();

    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: original, writable: true });
  });

  it('should return empty array for analyzeUsage when Tauri is not available', async () => {
    const original = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: undefined, writable: true });

    const result = await diskService.analyzeUsage('/x');
    expect(result).toEqual([]);

    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: original, writable: true });
  });

  it('should throw when Tauri is not available for getSmartInfo', async () => {
    const original = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: undefined, writable: true });

    await expect(diskService.getSmartInfo('/dev/sda')).rejects.toThrow('Tauri not available');

    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: original, writable: true });
  });
});
