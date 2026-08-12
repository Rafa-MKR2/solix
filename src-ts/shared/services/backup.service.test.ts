// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { backupService } from '@/shared/services/backup.service';
import { mockInvoke } from '@/test/setup';

describe('Backup Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });

  it('should create backup with source, destination and mount point', async () => {
    mockInvoke.mockResolvedValue({ success: true, path: '/mnt/backup.tar.gz' });
    const result = await backupService.createBackup('/home/user', '/mnt/backup', '/');
    expect(mockInvoke).toHaveBeenCalledWith('create_backup', {
      source: '/home/user',
      destination: '/mnt/backup',
      mountPoint: '/',
    });
    expect(result.success).toBe(true);
  });

  it('should throw when Tauri is not available', async () => {
    const original = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: undefined, writable: true });

    await expect(backupService.createBackup('/a', '/b', '/')).rejects.toThrow('Tauri not available');

    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: original, writable: true });
  });

  it('should propagate invoke errors', async () => {
    mockInvoke.mockRejectedValue(new Error('backup failed'));
    await expect(backupService.createBackup('/a', '/b', '/')).rejects.toThrow('backup failed');
  });
});
