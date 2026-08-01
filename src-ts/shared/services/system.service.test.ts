import { describe, it, expect, vi, beforeEach } from 'vitest';
import { systemService } from '@/shared/services/system.service';
import { mockInvoke } from '@/test/setup';

describe('System Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch home stats', async () => {
    const mockHomeStats = {
      packages_formatted: '1.250',
      updates_available: 12,
      updates_formatted: '12',
      load_average: '1.5',
      swap_percent: 20,
      swap_used: '512 MB',
      swap_total: '2 GB',
      services_active: '245',
    };

    mockInvoke.mockResolvedValue(mockHomeStats);

    const result = await systemService.getHomeStats();

    expect(mockInvoke).toHaveBeenCalledWith('get_home_stats');
    expect(result).toEqual(mockHomeStats);
  });

  it('should fetch system stats', async () => {
    const mockSystemStats = {
      cpu_percent: 25.3,
      memory_percent: 60.1,
      temperature: 45,
    };

    mockInvoke.mockResolvedValue(mockSystemStats);

    const result = await systemService.getStats();

    expect(mockInvoke).toHaveBeenCalledWith('get_system_stats');
    expect(result).toEqual(mockSystemStats);
  });

  it('should check for app updates', async () => {
    const mockUpdateInfo = {
      current_version: '2.2.0',
      latest_version: '2.3.0',
      update_available: true,
      release_url: 'https://github.com/Rafa-MKR2/solix/releases/tag/v2.3.0',
      release_notes: 'Bug fixes and improvements',
      download_url: 'https://github.com/Rafa-MKR2/solix/releases/download/v2.3.0/solix-x86_64-linux',
      checksum_url: 'https://github.com/Rafa-MKR2/solix/releases/download/v2.3.0/SHA256SUMS',
      download_size: 1024,
    };

    mockInvoke.mockResolvedValue(mockUpdateInfo);

    const result = await systemService.checkAppUpdate();

    expect(mockInvoke).toHaveBeenCalledWith('check_app_update');
    expect(result).toEqual(mockUpdateInfo);
  });

  it('should handle invoke errors', async () => {
    mockInvoke.mockRejectedValue(new Error('Command failed'));

    await expect(systemService.getHomeStats()).rejects.toThrow('Command failed');
  });
});
