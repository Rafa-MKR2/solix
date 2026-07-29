// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2

export interface LinuxDistribution {
  name: string;
  version: string;
  family: string;
  package_manager: string;
}

export interface ExecutableStatus {
  name: string;
  available: boolean;
}

export interface DevelopmentToolStatus {
  name: string;
  description: string;
  category: string;
  available: boolean;
  icon_base64: string | null;
}

export interface DiskInfo {
  filesystem: string;
  fstype: string;
  mount_point: string;
  total: string;
  used: string;
  available: string;
  percent_used: number;
}

export interface SystemHardware {
  cpu: string;
  cores: string;
  memory_total: string;
  memory_used: string;
  gpu: string;
  kernel: string;
  uptime: string;
  disks: DiskInfo[];
}

export interface UserInfo {
  full_name: string;
  username: string;
  shell: string;
  is_admin: boolean;
  avatar_base64: string | null;
}

export interface SystemInfo {
  distribution: LinuxDistribution | null;
  package_managers: ExecutableStatus[];
  tools: DevelopmentToolStatus[];
  hardware: SystemHardware;
  user: UserInfo;
}

export interface SystemStats {
  cpu_percent: number;
  memory_percent: number;
  temperature: number;
}

export interface ConnectivityInfo {
  internet: boolean;
  ping_latency_ms: number;
  ethernet: boolean;
  ip_address: string;
  bluetooth: boolean;
  wifi_present: boolean;
  wifi_ssid: string | null;
  wifi_signal: number;
}

export interface BatteryInfo {
  present: boolean;
  percentage: number;
  status: string;
  time_remaining: string | null;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  mem_percent: number;
  state: string;
  user: string;
}

export interface HomeStats {
  packages_formatted: string;
  updates_available: number;
  updates_formatted: string;
  load_average: string;
  swap_percent: number;
  swap_used: string;
  swap_total: string;
  services_active: string;
}

export interface InstallResult {
  tool_name: string;
  command: string;
  success: boolean;
  cancelled: boolean;
  output: string | null;
  error: string | null;
}

export interface ReportInfo {
  app_version: string;
  distro_name: string;
  distro_version: string;
  kernel: string;
  package_manager: string;
  cpu_percent: number;
  memory_percent: number;
  temperature: number;
}

export interface AppUpdateInfo {
  current_version: string;
  latest_version: string;
  update_available: boolean;
  release_url: string;
  release_notes: string;
}

export interface PmLockInfo {
  locked: boolean;
  message: string;
}

export interface DiskUsageItem {
  path: string;
  size: string;
}

export interface PackageDetail {
  package_name: string;
  description: string;
  version: string;
  size: string;
  installed: boolean;
  icon_base64: string | null;
}

export interface LocalPackageInfo {
  package_name: string;
  version: string;
  description: string;
  file_size: string;
  architecture: string;
  dependencies: string[];
  compatible: boolean;
  compat_message: string;
  package_type: string;
}

export interface ExternalNetworkInfo {
  external_ip: string;
  isp: string;
  city: string;
  region: string;
}

export interface SpeedTestResult {
  mbps: number;
  formatted: string;
}

export type PendingActionType = 'install' | 'remove' | 'update' | 'zram' | 'cleanup' | 'install-package' | 'app-update';

export interface PendingAction {
  type: PendingActionType;
  tools?: string[];
}

export type InvokeFn = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

export interface TauriInternals {
  invoke: InvokeFn;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: TauriInternals;
  }
}
