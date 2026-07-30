// SPDX-License-Identifier: MIT

import { getInvoke } from '../utils/tauri.js';
import type { DiskUsageItem, SmartInfo } from '../types/index.js';

function cmd(): ReturnType<typeof getInvoke> {
  return getInvoke();
}

export const diskService = {
  async openFileManager(path: string): Promise<void> {
    const invoke = cmd();
    if (!invoke) return;
    await invoke('open_file_manager', { path });
  },

  async analyzeUsage(mountPoint: string): Promise<DiskUsageItem[]> {
    const invoke = cmd();
    if (!invoke) return [];
    return invoke<DiskUsageItem[]>('analyze_disk_usage', { mountPoint });
  },

  async getPartitionTable(device: string): Promise<string> {
    const invoke = cmd();
    if (!invoke) return '';
    return invoke<string>('get_partition_table', { device });
  },

  async getSmartInfo(device: string): Promise<SmartInfo> {
    const invoke = cmd();
    if (!invoke) throw new Error('Tauri not available');
    return invoke<SmartInfo>('get_disk_smart_info', { device });
  },
};
