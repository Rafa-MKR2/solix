import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConnectivity, loadExternalInfo } from '@/features/network/main';
import { networkService } from '@/shared/services/network.service';
import { mockInvoke } from '@/test/setup';

describe('Network Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="net-internet"></div>
      <div id="net-internet-icon"></div>
      <div id="net-ping"></div>
      <div id="net-ethernet"></div>
      <div id="net-ethernet-icon"></div>
      <div id="net-ip"></div>
      <div id="net-bluetooth"></div>
      <div id="net-bluetooth-icon"></div>
      <div id="net-wifi"></div>
      <div id="net-wifi-icon"></div>
      <div id="net-wifi-signal"></div>
      <div id="net-battery"></div>
      <div id="net-battery-icon"></div>
      <div id="info-external-ip"></div>
      <div id="info-isp"></div>
      <div id="info-location"></div>
      <div id="info-ping-display"></div>
    `;
  });

  it('should load connectivity info and update DOM', async () => {
    const mockConnectivity = {
      internet: true,
      ping_latency_ms: 15,
      ethernet: true,
      ip_address: '192.168.1.100',
      bluetooth: true,
      wifi_present: false,
      wifi_ssid: null,
      wifi_signal: 0,
    };
    const mockBattery = {
      present: true,
      percentage: 85,
      status: 'Discharging',
      time_remaining: '3h 45m',
    };

    mockInvoke.mockResolvedValueOnce(mockConnectivity);
    mockInvoke.mockResolvedValueOnce(mockBattery);

    await loadConnectivity();

    expect(document.getElementById('net-internet')?.textContent).toBe('Conectado \u2713');
    expect(document.getElementById('net-ping')?.textContent).toBe('15.0 ms');
    expect(document.getElementById('net-ethernet')?.textContent).toBe('Conectado \u2713');
    expect(document.getElementById('net-ip')?.textContent).toBe('192.168.1.100');
    expect(document.getElementById('net-bluetooth')?.textContent).toBe('Ativo \u2713');
    expect(document.getElementById('net-battery')?.textContent).toBe('85% (3h 45m)');
  });

  it('should load external info and update DOM', async () => {
    const mockExternalInfo = {
      external_ip: '200.100.50.25',
      isp: 'Provedor Exemplo',
      city: 'São Paulo',
      region: 'SP',
    };
    const mockConnectivity = {
      internet: true,
      ping_latency_ms: 0,
      ethernet: false,
      ip_address: '',
      bluetooth: false,
      wifi_present: false,
      wifi_ssid: null,
      wifi_signal: 0,
    };

    mockInvoke.mockResolvedValueOnce(mockExternalInfo);
    mockInvoke.mockResolvedValueOnce(mockConnectivity);

    await loadExternalInfo();

    expect(document.getElementById('info-external-ip')?.textContent).toBe('200.100.50.25');
    expect(document.getElementById('info-isp')?.textContent).toBe('Provedor Exemplo');
    expect(document.getElementById('info-location')?.textContent).toBe('São Paulo, SP');
  });

  it('should handle missing elements gracefully', async () => {
    document.body.innerHTML = '';
    const mockConnectivity = { internet: true, ping_latency_ms: 10 };

    mockInvoke.mockResolvedValue(mockConnectivity);

    await expect(loadConnectivity()).resolves.not.toThrow();
  });
});

describe('Network Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should test speed', async () => {
    const mockResult = { mbps: 50.5, formatted: '50.5 Mbps' };
    mockInvoke.mockResolvedValue(mockResult);

    const result = await networkService.testSpeed();

    expect(mockInvoke).toHaveBeenCalledWith('test_speed');
    expect(result).toEqual(mockResult);
  });

  it('should fetch connectivity info', async () => {
    const mockResult = {
      internet: true,
      ping_latency_ms: 12,
      ethernet: false,
      ip_address: '',
      bluetooth: false,
      wifi_present: false,
      wifi_ssid: null,
      wifi_signal: 0,
    };
    mockInvoke.mockResolvedValue(mockResult);

    const result = await networkService.getConnectivity();

    expect(mockInvoke).toHaveBeenCalledWith('get_connectivity');
    expect(result).toEqual(mockResult);
  });
});
