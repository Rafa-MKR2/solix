// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { packageService } from '@/shared/services/package.service';
import { mockInvoke } from '@/test/setup';

describe('Package Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue(undefined);
  });

  it('should set password', async () => {
    await packageService.setPassword('secret');
    expect(mockInvoke).toHaveBeenCalledWith('set_password', { password: 'secret' });
  });

  it('should install tools', async () => {
    mockInvoke.mockResolvedValue([{ tool_name: 'git', success: true }]);
    const result = await packageService.installTools(['git', 'node']);
    expect(mockInvoke).toHaveBeenCalledWith('install_tools', { toolNames: ['git', 'node'] });
    expect(result).toEqual([{ tool_name: 'git', success: true }]);
  });

  it('should remove tools', async () => {
    mockInvoke.mockResolvedValue([{ tool_name: 'vim', success: true }]);
    const result = await packageService.removeTools(['vim']);
    expect(mockInvoke).toHaveBeenCalledWith('remove_tools', { toolNames: ['vim'] });
    expect(result).toHaveLength(1);
  });

  it('should update system', async () => {
    mockInvoke.mockResolvedValue({ tool_name: 'system', success: true });
    const result = await packageService.updateSystem();
    expect(mockInvoke).toHaveBeenCalledWith('update_system');
    expect(result.success).toBe(true);
  });

  it('should cancel operation', async () => {
    await packageService.cancelOperation();
    expect(mockInvoke).toHaveBeenCalledWith('cancel_operation');
  });

  it('should check pm lock', async () => {
    mockInvoke.mockResolvedValue({ locked: true, message: 'pacman está em uso' });
    const result = await packageService.checkPmLock();
    expect(mockInvoke).toHaveBeenCalledWith('check_pm_lock');
    expect(result.locked).toBe(true);
  });

  it('should list installed packages', async () => {
    mockInvoke.mockResolvedValue([{ name: 'git', version: '2.43' }]);
    const result = await packageService.listInstalled();
    expect(mockInvoke).toHaveBeenCalledWith('list_installed_packages');
    expect(result[0].name).toBe('git');
  });

  it('should search repo packages', async () => {
    mockInvoke.mockResolvedValue([{ name: 'htop' }]);
    const result = await packageService.searchRepo('htop');
    expect(mockInvoke).toHaveBeenCalledWith('search_repo_packages', { query: 'htop' });
    expect(result[0].name).toBe('htop');
  });

  it('should get package history', async () => {
    mockInvoke.mockResolvedValue([{ action: 'install' }]);
    const result = await packageService.getHistory();
    expect(mockInvoke).toHaveBeenCalledWith('get_package_history');
    expect(result).toHaveLength(1);
  });

  it('should remove system packages', async () => {
    mockInvoke.mockResolvedValue(['ok']);
    const result = await packageService.removeSystem(['firefox']);
    expect(mockInvoke).toHaveBeenCalledWith('remove_system_packages', { packageNames: ['firefox'] });
    expect(result).toEqual(['ok']);
  });

  it('should install repo packages', async () => {
    mockInvoke.mockResolvedValue(['ok']);
    const result = await packageService.installRepo(['vlc']);
    expect(mockInvoke).toHaveBeenCalledWith('install_repo_packages', { packageNames: ['vlc'] });
    expect(result).toEqual(['ok']);
  });

  it('should get package info', async () => {
    mockInvoke.mockResolvedValue({ name: 'node', version: '20' });
    const result = await packageService.getPackageInfo('node');
    expect(mockInvoke).toHaveBeenCalledWith('get_package_info', { toolName: 'node' });
    expect(result.name).toBe('node');
  });

  it('should inspect package data (base64)', async () => {
    mockInvoke.mockResolvedValue({ package_name: 'app', version: '1.0' });
    const result = await packageService.inspectPackageData('base64data', 'app.deb');
    expect(mockInvoke).toHaveBeenCalledWith('inspect_package_data', { data: 'base64data', fileName: 'app.deb' });
    expect(result.version).toBe('1.0');
  });

  it('should inspect local package by path', async () => {
    mockInvoke.mockResolvedValue({ package_name: 'app', version: '1.0' });
    const result = await packageService.inspectLocalPackage('/tmp/app.deb');
    expect(mockInvoke).toHaveBeenCalledWith('inspect_local_package', { path: '/tmp/app.deb' });
    expect(result.package_name).toBe('app');
  });

  it('should install package from data', async () => {
    mockInvoke.mockResolvedValue({ tool_name: 'app', success: true });
    const result = await packageService.installPackageData('base64data', 'app.deb');
    expect(mockInvoke).toHaveBeenCalledWith('install_package_data', { data: 'base64data', fileName: 'app.deb' });
    expect(result.success).toBe(true);
  });

  it('should install local package by path', async () => {
    mockInvoke.mockResolvedValue({ tool_name: 'app', success: true });
    const result = await packageService.installLocalPackage('/tmp/app.rpm');
    expect(mockInvoke).toHaveBeenCalledWith('install_local_package', { path: '/tmp/app.rpm' });
    expect(result.success).toBe(true);
  });

  it('should throw when Tauri is not available for setPassword', async () => {
    const original = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: undefined, writable: true });
    await expect(packageService.setPassword('x')).rejects.toThrow('Tauri not available');
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: original, writable: true });
  });

  it('should return defaults when Tauri is not available for installTools', async () => {
    const original = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: undefined, writable: true });
    const result = await packageService.installTools(['git']);
    expect(result).toEqual([]);
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: original, writable: true });
  });
});
