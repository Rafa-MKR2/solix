import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadHomeStats, pollStats } from '@/features/home/stats';
import { mockInvoke } from '@/test/setup';

describe('Home Stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <span id="stat-packages"></span>
      <span id="stat-updates"></span>
      <span id="stat-updates-sub"></span>
      <span id="stat-load"></span>
      <span id="stat-swap"></span>
      <span id="stat-swap-sub"></span>
      <span id="stat-services"></span>
    `;
  });

  it('should load home stats and update DOM', async () => {
    const mockStats = {
      packages_formatted: '1.250',
      updates_available: 12,
      updates_formatted: '12',
      load_average: '1.5',
      swap_percent: 20,
      swap_used: '512 MB',
      swap_total: '2 GB',
      services_active: '245',
    };

    mockInvoke.mockResolvedValue(mockStats);

    await loadHomeStats();

    expect(document.getElementById('stat-packages')?.textContent).toBe('1.250');
    expect(document.getElementById('stat-updates')?.textContent).toBe('12');
    expect(document.getElementById('stat-updates-sub')?.textContent).toBe('disponíveis');
    expect(document.getElementById('stat-load')?.textContent).toBe('1.5');
    expect(document.getElementById('stat-swap')?.textContent).toBe('512 MB / 2 GB');
    expect(document.getElementById('stat-services')?.textContent).toBe('245');
  });

  it('should mark system as up to date when no updates available', async () => {
    const mockStats = {
      packages_formatted: '1.250',
      updates_available: 0,
      updates_formatted: '0',
      load_average: '1.5',
      swap_percent: 0,
      swap_used: '',
      swap_total: '',
      services_active: '245',
    };

    mockInvoke.mockResolvedValue(mockStats);

    await loadHomeStats();

    expect(document.getElementById('stat-updates')?.textContent).toBe('\u2713');
    expect(document.getElementById('stat-updates-sub')?.textContent).toBe('sistema atualizado');
    expect(document.getElementById('stat-swap')?.textContent).toBe('\u2014');
  });

  it('should poll stats at interval', async () => {
    const mockStats = {
      cpu_percent: 25.3,
      memory_percent: 60.1,
      temperature: 45,
    };

    mockInvoke.mockResolvedValue(mockStats);

    await pollStats();

    expect(mockInvoke).toHaveBeenCalledWith('get_system_stats');
  });

  it('should handle errors gracefully without rejecting', async () => {
    mockInvoke.mockRejectedValue(new Error('Network error'));

    await expect(loadHomeStats()).resolves.toBeUndefined();
  });
});
