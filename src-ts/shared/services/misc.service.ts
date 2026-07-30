// SPDX-License-Identifier: MIT

import { getInvoke } from '../utils/tauri.js';
import type { InstallResult } from '../types/index.js';

export const miscService = {
  async enableZram(): Promise<InstallResult> {
    const invoke = getInvoke();
    if (!invoke) throw new Error('Tauri not available');
    return invoke<InstallResult>('enable_zram');
  },

  async cleanupSystem(): Promise<InstallResult> {
    const invoke = getInvoke();
    if (!invoke) throw new Error('Tauri not available');
    return invoke<InstallResult>('cleanup_system');
  },

  async saveReportToDesktop(content: string): Promise<string> {
    const invoke = getInvoke();
    if (!invoke) return '';
    return invoke<string>('save_report_to_desktop', { content });
  },

  async createDesktopShortcut(name: string): Promise<string> {
    const invoke = getInvoke();
    if (!invoke) return '';
    return invoke<string>('create_desktop_shortcut', { name });
  },

  async openUrl(url: string): Promise<void> {
    const invoke = getInvoke();
    if (!invoke) return;
    await invoke('open_url', { url });
  },
};
