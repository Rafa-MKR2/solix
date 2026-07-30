// SPDX-License-Identifier: MIT

import { getInvoke } from '../utils/tauri.js';

export const miscService = {
  async enableZram(): Promise<void> {
    const invoke = getInvoke();
    if (!invoke) return;
    await invoke('enable_zram');
  },

  async cleanupSystem(): Promise<void> {
    const invoke = getInvoke();
    if (!invoke) return;
    await invoke('cleanup_system');
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
