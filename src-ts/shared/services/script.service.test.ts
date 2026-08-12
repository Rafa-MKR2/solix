// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scriptService } from '@/shared/services/script.service';
import { mockInvoke } from '@/test/setup';

describe('Script Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });

  it('should analyze script content', async () => {
    mockInvoke.mockResolvedValue({ risk_level: 'safe', command_count: 2 });
    const result = await scriptService.analyzeScript('echo hello');
    expect(mockInvoke).toHaveBeenCalledWith('analyze_script', { content: 'echo hello' });
    expect(result.risk_level).toBe('safe');
  });

  it('should analyze script file by path', async () => {
    mockInvoke.mockResolvedValue({ risk_level: 'danger', command_count: 5 });
    const result = await scriptService.analyzeScriptFile('/tmp/script.sh');
    expect(mockInvoke).toHaveBeenCalledWith('analyze_script_file', { path: '/tmp/script.sh' });
    expect(result.risk_level).toBe('danger');
  });

  it('should throw when Tauri is not available', async () => {
    const original = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: undefined, writable: true });

    await expect(scriptService.analyzeScript('x')).rejects.toThrow('Tauri not available');

    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: original, writable: true });
  });

  it('should propagate invoke errors', async () => {
    mockInvoke.mockRejectedValue(new Error('script failed'));
    await expect(scriptService.analyzeScript('x')).rejects.toThrow('script failed');
  });
});
