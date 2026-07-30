// SPDX-License-Identifier: MIT

import { getInvoke } from '../utils/tauri.js';
import type { ProcessInfo } from '../types/index.js';

export const processService = {
  async getProcesses(): Promise<ProcessInfo[]> {
    const invoke = getInvoke();
    if (!invoke) return [];
    return invoke<ProcessInfo[]>('get_processes');
  },

  async killProcess(name: string): Promise<string> {
    const invoke = getInvoke();
    if (!invoke) return '';
    return invoke<string>('kill_process', { name });
  },

  async removeLockFiles(): Promise<string> {
    const invoke = getInvoke();
    if (!invoke) return '';
    return invoke<string>('remove_lock_files');
  },
};
