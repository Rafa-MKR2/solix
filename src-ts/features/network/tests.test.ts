// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleTestPingClick, handleTestSpeedClick } from '@/features/network/tests';
import { mockInvoke } from '@/test/setup';

function setupDom(): void {
  document.body.innerHTML = `
    <button id="test-ping-btn"></button>
    <button id="test-speed-btn"></button>
    <span id="speed-result"></span>
    <span id="info-ping-display"></span>
  `;
}

describe('network tests', () => {
  beforeEach(() => {
    setupDom();
    mockInvoke.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show ping latency on test ping', async () => {
    vi.useFakeTimers();
    mockInvoke.mockResolvedValue({ ping_latency_ms: 25.4 });

    handleTestPingClick();
    await vi.runAllTimersAsync();

    expect(document.getElementById('speed-result')?.textContent).toBe('25.4 ms');
  });

  it('should show no response when ping is zero', async () => {
    vi.useFakeTimers();
    mockInvoke.mockResolvedValue({ ping_latency_ms: 0 });

    handleTestPingClick();
    await vi.runAllTimersAsync();

    expect(document.getElementById('speed-result')?.textContent).toBe('Sem resposta');
  });

  it('should show failure when ping throws', async () => {
    vi.useFakeTimers();
    mockInvoke.mockRejectedValue(new Error('timeout'));

    handleTestPingClick();
    await vi.runAllTimersAsync();

    expect(document.getElementById('speed-result')?.textContent).toBe('Falhou');
  });

  it('should show speed result and update ping display', async () => {
    vi.useFakeTimers();
    mockInvoke
      .mockResolvedValueOnce({ mbps: 100, formatted: '100 Mbps' }) // testSpeed
      .mockResolvedValueOnce({ ping_latency_ms: 50 }); // getConnectivity

    handleTestSpeedClick();
    await vi.runAllTimersAsync();

    expect(document.getElementById('speed-result')?.textContent).toBe('Download: 100 Mbps');
    expect(document.getElementById('info-ping-display')?.textContent).toBe('50.0 ms');
  });

  it('should show failure on speed test error', async () => {
    vi.useFakeTimers();
    mockInvoke.mockRejectedValue(new Error('sem internet'));

    handleTestSpeedClick();
    await vi.runAllTimersAsync();

    expect(document.getElementById('speed-result')?.textContent).toBe('Falhou');
  });

  it('should restore button state after test speed', async () => {
    vi.useFakeTimers();
    mockInvoke.mockResolvedValue({ mbps: 10, formatted: '10 Mbps' });

    handleTestSpeedClick();
    await vi.runAllTimersAsync();

    const btn = document.getElementById('test-speed-btn') as HTMLButtonElement;
    expect(btn.classList.contains('measuring')).toBe(false);
    expect(btn.textContent).toContain('Testar Velocidade');
  });
});
