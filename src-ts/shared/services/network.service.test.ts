// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { networkService } from '@/shared/services/network.service';
import { mockInvoke } from '@/test/setup';

describe('Network Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });

  it('should fetch connectivity info', async () => {
    const connectivity = {
      internet: true,
      ping_latency_ms: 15.5,
      ethernet: true,
      ip_address: '192.168.1.10',
      bluetooth: false,
      wifi_present: true,
      wifi_ssid: 'MinhaRede',
      wifi_signal: 75,
    };
    mockInvoke.mockResolvedValue(connectivity);

    const result = await networkService.getConnectivity();

    expect(mockInvoke).toHaveBeenCalledWith('get_connectivity');
    expect(result).toEqual(connectivity);
  });

  it('should fetch external network info', async () => {
    mockInvoke.mockResolvedValue({ external_ip: '8.8.8.8', isp: 'ISP', city: 'SP', region: 'SP' });

    const result = await networkService.getExternalInfo();

    expect(mockInvoke).toHaveBeenCalledWith('get_external_info');
    expect(result.external_ip).toBe('8.8.8.8');
  });

  it('should test speed', async () => {
    mockInvoke.mockResolvedValue({ mbps: 120.4, formatted: '120 Mbps' });

    const result = await networkService.testSpeed();

    expect(mockInvoke).toHaveBeenCalledWith('test_speed');
    expect(result.mbps).toBe(120.4);
  });

  it('should fetch battery info', async () => {
    mockInvoke.mockResolvedValue({ present: true, percentage: 80, status: 'Charging', time_remaining: '1h 30m' });

    const result = await networkService.getBattery();

    expect(mockInvoke).toHaveBeenCalledWith('get_battery');
    expect(result.percentage).toBe(80);
  });

  it('should return fallback connectivity when Tauri is not available', async () => {
    const original = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: undefined, writable: true });

    const result = await networkService.getConnectivity();

    expect(result).toEqual({
      internet: false,
      ping_latency_ms: 0,
      ethernet: false,
      ip_address: '',
      bluetooth: false,
      wifi_present: false,
      wifi_ssid: null,
      wifi_signal: 0,
    });
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: original, writable: true });
  });

  it('should return fallback external info when Tauri is not available', async () => {
    const original = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: undefined, writable: true });

    const result = await networkService.getExternalInfo();

    expect(result).toEqual({ external_ip: '—', isp: '—', city: '—', region: '—' });
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: original, writable: true });
  });

  it('should propagate invoke errors', async () => {
    mockInvoke.mockRejectedValue(new Error('network failed'));
    await expect(networkService.testSpeed()).rejects.toThrow('network failed');
  });
});
