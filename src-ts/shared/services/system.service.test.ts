import { describe, it, expect, vi, beforeEach } from 'vitest';
import { systemService } from '@/shared/services/system.service';
import { mockInvoke } from '@/test/setup';

describe('System Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch home stats', async () => {
    const mockHomeStats = {
      packages: 1250,
      updates: 12,
      cpuLoad: 15.5,
      swapUsed: 512,
      activeServices: 245,
    };
    
    mockInvoke.mockResolvedValue(mockHomeStats);
    
    const result = await systemService.getHomeStats();
    
    expect(mockInvoke).toHaveBeenCalledWith('get_home_stats', undefined);
    expect(result).toEqual(mockHomeStats);
  });

  it('should fetch system stats', async () => {
    const mockSystemStats = {
      cpuPercent: 25.3,
      memoryPercent: 60.1,
      temperature: 45,
    };
    
    mockInvoke.mockResolvedValue(mockSystemStats);
    
    const result = await systemService.getStats();
    
    expect(mockInvoke).toHaveBeenCalledWith('get_system_stats', undefined);
    expect(result).toEqual(mockSystemStats);
  });

  it('should check for app updates', async () => {
    const mockUpdateInfo = {
      currentVersion: '2.2.0',
      latestVersion: '2.3.0',
      downloadUrl: 'https://github.com/.../solix-x86_64-linux',
      checksum: 'sha256:abc123',
      changelog: 'Bug fixes and improvements',
    };
    
    mockInvoke.mockResolvedValue(mockUpdateInfo);
    
    const result = await systemService.checkAppUpdate();
    
    expect(mockInvoke).toHaveBeenCalledWith('check_app_update', undefined);
    expect(result).toEqual(mockUpdateInfo);
  });

  it('should handle invoke errors', async () => {
    mockInvoke.mockRejectedValue(new Error('Command failed'));
    
    await expect(systemService.getHomeStats()).rejects.toThrow('Command failed');
  });
});