import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadHomeStats, pollStats, stopPolling } from '@/features/home/stats';
import { systemService } from '@/shared/services/system.service';
import { mockInvoke } from '@/test/setup';

describe('Home Stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    document.body.innerHTML = `
      <div id="packages-count">0</div>
      <div id="updates-count">0</div>
      <div id="cpu-load">0%</div>
      <div id="swap-used">0 MB</div>
      <div id="services-count">0</div>
    `;
  });

  afterEach(() => {
    vi.useRealTimers();
    stopPolling();
  });

  it('should load home stats and update DOM', async () => {
    const mockStats = {
      packages: 1250,
      updates: 12,
      cpuLoad: 15.5,
      swapUsed: 512,
      activeServices: 245,
    };
    
    mockInvoke.mockResolvedValue(mockStats);
    
    await loadHomeStats();
    
    expect(document.getElementById('packages-count')?.textContent).toBe('1250');
    expect(document.getElementById('updates-count')?.textContent).toBe('12');
    expect(document.getElementById('cpu-load')?.textContent).toBe('15.5%');
    expect(document.getElementById('swap-used')?.textContent).toBe('512 MB');
    expect(document.getElementById('services-count')?.textContent).toBe('245');
  });

  it('should poll stats at interval', async () => {
    const mockStats = {
      cpuPercent: 25.3,
      memoryPercent: 60.1,
      temperature: 45,
    };
    
    mockInvoke.mockResolvedValue(mockStats);
    
    pollStats(100);
    
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    
    vi.advanceTimersByTime(100);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    
    vi.advanceTimersByTime(100);
    expect(mockInvoke).toHaveBeenCalledTimes(3);
  });

  it('should stop polling when stopPolling is called', async () => {
    const mockStats = {
      cpuPercent: 25.3,
      memoryPercent: 60.1,
      temperature: 45,
    };
    
    mockInvoke.mockResolvedValue(mockStats);
    
    pollStats(100);
    vi.advanceTimersByTime(100);
    const callsAfterFirstPoll = mockInvoke.mock.calls.length;
    
    stopPolling();
    vi.advanceTimersByTime(200);
    
    expect(mockInvoke).toHaveBeenCalledTimes(callsAfterFirstPoll);
  });

  it('should handle errors gracefully', async () => {
    mockInvoke.mockRejectedValue(new Error('Network error'));
    
    await expect(loadHomeStats()).rejects.toThrow('Network error');
  });
});