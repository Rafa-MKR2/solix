import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConnectivity, loadExternalInfo } from '@/features/network/main';
import { networkService } from '@/shared/services/network.service';
import { mockInvoke } from '@/test/setup';

describe('Network Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="internet-status">Desconhecido</div>
      <div id="ping-value">--</div>
      <div id="ethernet-status">Desconectado</div>
      <div id="ethernet-ip">--</div>
      <div id="wifi-status">Desconectado</div>
      <div id="wifi-ssid">--</div>
      <div id="wifi-signal">--</div>
      <div id="bluetooth-status">Inativo</div>
      <div id="battery-percent">--</div>
      <div id="battery-time">--</div>
      <div id="public-ip">--</div>
      <div id="isp">--</div>
      <div id="location">--</div>
    `;
  });

  it('should load connectivity info and update DOM', async () => {
    const mockConnectivity = {
      internet: true,
      ping: 15,
      ethernet: { connected: true, ip: '192.168.1.100' },
      wifi: { connected: false, ssid: '', signal: 0 },
      bluetooth: { active: true },
      battery: { percent: 85, timeRemaining: '3h 45m' },
    };
    
    mockInvoke.mockResolvedValue(mockConnectivity);
    
    await loadConnectivity();
    
    expect(document.getElementById('internet-status')?.textContent).toBe('Conectado');
    expect(document.getElementById('ping-value')?.textContent).toBe('15 ms');
    expect(document.getElementById('ethernet-status')?.textContent).toBe('Conectado');
    expect(document.getElementById('ethernet-ip')?.textContent).toBe('192.168.1.100');
    expect(document.getElementById('bluetooth-status')?.textContent).toBe('Ativo');
    expect(document.getElementById('battery-percent')?.textContent).toBe('85%');
  });

  it('should load external info and update DOM', async () => {
    const mockExternalInfo = {
      publicIp: '200.100.50.25',
      isp: 'Provedor Exemplo',
      city: 'São Paulo',
      country: 'Brasil',
    };
    
    mockInvoke.mockResolvedValue(mockExternalInfo);
    
    await loadExternalInfo();
    
    expect(document.getElementById('public-ip')?.textContent).toBe('200.100.50.25');
    expect(document.getElementById('isp')?.textContent).toBe('Provedor Exemplo');
    expect(document.getElementById('location')?.textContent).toBe('São Paulo, Brasil');
  });

  it('should handle missing elements gracefully', async () => {
    document.body.innerHTML = '';
    const mockConnectivity = { internet: true, ping: 10 };
    mockInvoke.mockResolvedValue(mockConnectivity);
    
    await expect(loadConnectivity()).resolves.not.toThrow();
  });
});

describe('Network Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should test ping', async () => {
    const mockResult = { success: true, latency: 12 };
    mockInvoke.mockResolvedValue(mockResult);
    
    const result = await networkService.testPing('google.com');
    
    expect(mockInvoke).toHaveBeenCalledWith('test_ping', { host: 'google.com' });
    expect(result).toEqual(mockResult);
  });

  it('should test speed', async () => {
    const mockResult = { download: 50.5, upload: 20.3 };
    mockInvoke.mockResolvedValue(mockResult);
    
    const result = await networkService.testSpeed();
    
    expect(mockInvoke).toHaveBeenCalledWith('test_speed', undefined);
    expect(result).toEqual(mockResult);
  });
});