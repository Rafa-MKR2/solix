// SPDX-License-Identifier: MIT

import { getInvoke } from '../utils/tauri.js';
import type {
  InstallResult, InstalledPackage, RepoPackage,
  PackageHistoryEntry, PmLockInfo, PackageDetail, LocalPackageInfo,
} from '../types/index.js';

function cmd(): ReturnType<typeof getInvoke> {
  return getInvoke();
}

export const packageService = {
  async setPassword(password: string): Promise<void> {
    const invoke = cmd();
    if (!invoke) throw new Error('Tauri not available');
    await invoke('set_password', { password });
  },

  async installTools(toolNames: string[]): Promise<InstallResult[]> {
    const invoke = cmd();
    if (!invoke) return [];
    return invoke<InstallResult[]>('install_tools', { toolNames });
  },

  async removeTools(toolNames: string[]): Promise<InstallResult[]> {
    const invoke = cmd();
    if (!invoke) return [];
    return invoke<InstallResult[]>('remove_tools', { toolNames });
  },

  async updateSystem(): Promise<InstallResult> {
    const invoke = cmd();
    if (!invoke) throw new Error('Tauri not available');
    return invoke<InstallResult>('update_system');
  },

  async cancelOperation(): Promise<void> {
    const invoke = cmd();
    if (!invoke) return;
    await invoke('cancel_operation');
  },

  async checkPmLock(): Promise<PmLockInfo> {
    const invoke = cmd();
    if (!invoke) return { locked: false, message: '' };
    return invoke<PmLockInfo>('check_pm_lock');
  },

  async listInstalled(): Promise<InstalledPackage[]> {
    const invoke = cmd();
    if (!invoke) return [];
    return invoke<InstalledPackage[]>('list_installed_packages');
  },

  async searchRepo(query: string): Promise<RepoPackage[]> {
    const invoke = cmd();
    if (!invoke) return [];
    return invoke<RepoPackage[]>('search_repo_packages', { query });
  },

  async getHistory(): Promise<PackageHistoryEntry[]> {
    const invoke = cmd();
    if (!invoke) return [];
    return invoke<PackageHistoryEntry[]>('get_package_history');
  },

  async removeSystem(packageNames: string[]): Promise<string[]> {
    const invoke = cmd();
    if (!invoke) return [];
    return invoke<string[]>('remove_system_packages', { packageNames });
  },

  async installRepo(packageNames: string[]): Promise<string[]> {
    const invoke = cmd();
    if (!invoke) return [];
    return invoke<string[]>('install_repo_packages', { packageNames });
  },

  async getPackageInfo(toolName: string): Promise<PackageDetail> {
    const invoke = cmd();
    if (!invoke) throw new Error('Tauri not available');
    return invoke<PackageDetail>('get_package_info', { toolName });
  },

  async inspectPackageData(data: string, fileName: string): Promise<LocalPackageInfo> {
    const invoke = cmd();
    if (!invoke) throw new Error('Tauri not available');
    return invoke<LocalPackageInfo>('inspect_package_data', { data, fileName });
  },

  async installPackageData(data: string, fileName: string): Promise<InstallResult> {
    const invoke = cmd();
    if (!invoke) throw new Error('Tauri not available');
    return invoke<InstallResult>('install_package_data', { data, fileName });
  },
};
