// SPDX-License-Identifier: MIT

import { getInvoke } from '../utils/tauri.js';
import type {
  SystemInfo, SystemStats, HomeStats, ReportInfo,
  AppUpdateInfo, UpdateProgress,
} from '../types/index.js';

function cmd(): ReturnType<typeof getInvoke> {
  return getInvoke();
}

export const systemService = {
  async getInfo(): Promise<SystemInfo> {
    const invoke = cmd();
    if (!invoke) throw new Error('Tauri not available');
    return invoke<SystemInfo>('get_system_info');
  },

  async getStats(): Promise<SystemStats> {
    const invoke = cmd();
    if (!invoke) return { cpu_percent: 0, memory_percent: 0, temperature: 0 };
    return invoke<SystemStats>('get_system_stats');
  },

  async getHomeStats(): Promise<HomeStats> {
    const invoke = cmd();
    if (!invoke) return { packages_formatted: '—', updates_available: 0, updates_formatted: '—', load_average: '—', swap_percent: 0, swap_used: '—', swap_total: '—', services_active: '—' };
    return invoke<HomeStats>('get_home_stats');
  },

  async getReportInfo(): Promise<ReportInfo> {
    const invoke = cmd();
    if (!invoke) throw new Error('Tauri not available');
    return invoke<ReportInfo>('get_report_info');
  },

  async getAppVersion(): Promise<string> {
    const invoke = cmd();
    if (!invoke) return '—';
    return invoke<string>('get_app_version');
  },

  async checkAppUpdate(): Promise<AppUpdateInfo> {
    const invoke = cmd();
    if (!invoke) throw new Error('Tauri not available');
    return invoke<AppUpdateInfo>('check_app_update');
  },

  async installUpdate(): Promise<void> {
    const invoke = cmd();
    if (!invoke) throw new Error('Tauri not available');
    await invoke('install_update');
  },
};
