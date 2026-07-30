// SPDX-License-Identifier: MIT

import { getInvoke } from '../utils/tauri.js';
import type { BackupResult } from '../types/index.js';

export const backupService = {
  async createBackup(source: string, destination: string, mountPoint: string): Promise<BackupResult> {
    const invoke = getInvoke();
    if (!invoke) throw new Error('Tauri not available');
    return invoke<BackupResult>('create_backup', { source, destination, mountPoint });
  },
};
