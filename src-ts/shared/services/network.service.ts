// SPDX-License-Identifier: MIT

import { getInvoke } from '../utils/tauri.js';
import type {
  ConnectivityInfo, ExternalNetworkInfo, SpeedTestResult, BatteryInfo,
} from '../types/index.js';

function cmd(): ReturnType<typeof getInvoke> {
  return getInvoke();
}

export const networkService = {
  async getConnectivity(): Promise<ConnectivityInfo> {
    const invoke = cmd();
    if (!invoke) return { internet: false, ping_latency_ms: 0, ethernet: false, ip_address: '', bluetooth: false, wifi_present: false, wifi_ssid: null, wifi_signal: 0 };
    return invoke<ConnectivityInfo>('get_connectivity');
  },

  async getExternalInfo(): Promise<ExternalNetworkInfo> {
    const invoke = cmd();
    if (!invoke) return { external_ip: '—', isp: '—', city: '—', region: '—' };
    return invoke<ExternalNetworkInfo>('get_external_info');
  },

  async testSpeed(): Promise<SpeedTestResult> {
    const invoke = cmd();
    if (!invoke) return { mbps: 0, formatted: '0 Mbps' };
    return invoke<SpeedTestResult>('test_speed');
  },

  async getBattery(): Promise<BatteryInfo> {
    const invoke = cmd();
    if (!invoke) return { present: false, percentage: 0, status: '', time_remaining: null };
    return invoke<BatteryInfo>('get_battery');
  },
};
