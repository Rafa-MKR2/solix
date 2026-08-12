// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderDisks } from '@/features/disks/main';
import { mockInvoke } from '@/test/setup';
import { toastState } from '@/test/helpers';
import type { DiskInfo } from '@/shared/types';

function setupDom(): void {
  document.body.innerHTML = `
    <div id="disks-list"></div>
    <div id="disk-count"></div>
    <div id="disk-total-space"></div>
    <div id="disk-used-space"></div>
    <div id="disk-pct-used"></div>
    <div id="disk-analysis-overlay" class="hidden"></div>
    <div id="disk-analysis-list"></div>
    <div id="disk-analysis-title"></div>
    <div id="disk-analysis-close"></div>
    <div id="backup-overlay" class="hidden"></div>
    <div id="backup-source"></div>
    <div id="smart-overlay" class="hidden"></div>
    <div id="smart-loading"></div>
    <div id="smart-title"></div>
    <div id="completion-toast">
      <div class="toast-icon">✅</div>
      <div class="toast-title">Concluído!</div>
      <div class="toast-sub" id="toast-message">Tudo pronto</div>
    </div>
  `;
}

function disk(overrides: Partial<Record<string, unknown>> = {}): DiskInfo {
  return {
    filesystem: '/dev/sda1',
    device_model: 'SSD 512GB',
    mount_point: '/',
    fstype: 'ext4',
    percent_used: 50,
    io_read: '10 MB/s',
    io_write: '5 MB/s',
    total: '512.0 GB',
    used: '128.0 GB',
    ...overrides,
  } as DiskInfo;
}

async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('disks main', () => {
  beforeEach(() => {
    setupDom();
    mockInvoke.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render disk table with totals and percentage', () => {
    renderDisks([disk()]);

    expect(document.getElementById('disk-count')?.textContent).toBe('1');
    expect(document.getElementById('disk-total-space')?.textContent).toBe('512 GB');
    expect(document.getElementById('disk-used-space')?.textContent).toBe('128 GB');
    expect(document.getElementById('disk-pct-used')?.textContent).toBe('25%');

    const rows = document.querySelectorAll('.disk-row');
    expect(rows.length).toBe(1);
    expect(rows[0].querySelector('.dtd-device')?.textContent).toBe('sda1');
    expect(rows[0].querySelector('.dtd-mount')?.textContent).toBe('/');
    expect(rows[0].querySelector('.disk-fstype')?.textContent).toBe('ext4');
  });

  it('should convert TB totals to GB and format back to TB', () => {
    renderDisks([disk({ total: '1.0 TB', used: '256.0 GB' })]);

    expect(document.getElementById('disk-total-space')?.textContent).toBe('1.0 TB');
    expect(document.getElementById('disk-used-space')?.textContent).toBe('256 GB');
    expect(document.getElementById('disk-pct-used')?.textContent).toBe('25%');
  });

  it('should apply the right bar color per usage threshold', () => {
    renderDisks([
      disk({ mount_point: '/a', percent_used: 20 }),
      disk({ mount_point: '/b', percent_used: 60 }),
      disk({ mount_point: '/c', percent_used: 80 }),
      disk({ mount_point: '/d', percent_used: 95 }),
    ]);

    const fills = Array.from(document.querySelectorAll('.dtd-bar-fill'));
    expect(fills[0].className).toContain('green');
    expect(fills[1].className).toContain('yellow');
    expect(fills[2].className).toContain('orange');
    expect(fills[3].className).toContain('red');
  });

  it('should show hint when there are no disks', () => {
    renderDisks([]);
    expect(document.getElementById('disks-list')?.innerHTML).toContain('Nenhum disco detectado');
  });

  it('should do nothing when the container is missing', () => {
    document.getElementById('disks-list')!.remove();      expect(() => renderDisks([disk()])).not.toThrow();
  });

  it('should render IO dash when io values are missing', () => {
    renderDisks([disk({ io_read: '—' })]);
    expect(document.querySelector('.dtd-io-text')?.textContent).toBe('—');
  });

  it('should open the file manager when clicking the open button', async () => {
    renderDisks([disk({ mount_point: '/mnt/data' })]);
    mockInvoke.mockResolvedValue(undefined);

    (document.querySelector('.dtd-btn-open') as HTMLElement).click();
    await flush();

    expect(mockInvoke).toHaveBeenCalledWith('open_file_manager', { path: '/mnt/data' });
  });

  it('should show toast error when opening file manager fails', async () => {
    renderDisks([disk()]);
    mockInvoke.mockRejectedValue(new Error('boom'));

    (document.querySelector('.dtd-btn-open') as HTMLElement).click();
    await flush();

    expect(toastState().message).toContain('Erro ao abrir gerenciador');
  });

  it('should analyze disk usage and render the heaviest folders', async () => {
    renderDisks([disk()]);
    mockInvoke.mockResolvedValue([
      { path: '/var/log', size: '2.0 GB' },
      { path: '/home', size: '1.0 GB' },
    ]);

    (document.querySelector('.dtd-btn-analyze') as HTMLElement).click();
    await flush();

    expect(mockInvoke).toHaveBeenCalledWith('analyze_disk_usage', { mountPoint: '/' });
    const overlay = document.getElementById('disk-analysis-overlay');
    expect(overlay?.classList.contains('hidden')).toBe(false);
    const items = document.querySelectorAll('.disk-analysis-item');
    expect(items.length).toBe(2);
    expect(items[0].querySelector('.disk-analysis-path')?.textContent).toBe('/var/log');
    expect(items[0].querySelector('.disk-analysis-bar-fill')?.getAttribute('style')).toContain('width:100%');
  });

  it('should show hint when disk analysis returns no items', async () => {
    renderDisks([disk()]);
    mockInvoke.mockResolvedValue([]);

    (document.querySelector('.dtd-btn-analyze') as HTMLElement).click();
    await flush();

    expect(document.getElementById('disk-analysis-list')?.innerHTML).toContain('Nenhum resultado encontrado');
  });

  it('should show error when disk analysis fails', async () => {
    renderDisks([disk()]);
    mockInvoke.mockRejectedValue(new Error('permissão negada'));

    (document.querySelector('.dtd-btn-analyze') as HTMLElement).click();
    await flush();

    expect(document.getElementById('disk-analysis-list')?.innerHTML).toContain('❌ Erro ao analisar disco');
  });

  it('should show partition table when clicking partitions button', async () => {
    renderDisks([disk()]);
    mockInvoke.mockResolvedValue('Device     Start   End   Sectors\n/dev/sda1   ...');

    (document.querySelector('.dtd-btn-partitions') as HTMLElement).click();
    await flush();

    expect(mockInvoke).toHaveBeenCalledWith('get_partition_table', { device: '/dev/sda1' });
    expect(document.getElementById('disk-analysis-list')?.innerHTML).toContain('Device');
    expect(document.getElementById('disk-analysis-title')?.textContent).toContain('Partições');
  });

  it('should show partition error safely', async () => {
    renderDisks([disk()]);
    mockInvoke.mockRejectedValue('sem permissão');

    (document.querySelector('.dtd-btn-partitions') as HTMLElement).click();
    await flush();

    expect(document.getElementById('disk-analysis-list')?.innerHTML).toContain('❌');
  });

  it('should open backup modal when clicking backup button', () => {
    renderDisks([disk({ mount_point: '/media/data' })]);

    (document.querySelector('.dtd-btn-backup') as HTMLElement).click();

    expect(document.getElementById('backup-overlay')?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('backup-source')?.textContent).toBe('/media/data');
  });

  it('should open SMART overlay when clicking health button', async () => {
    renderDisks([disk()]);
    mockInvoke.mockResolvedValue({
      smart_available: true,
      health: 'PASSED',
      device_model: 'SSD',
      temperature: '45°C',
      power_on_hours: '100h',
      commands_used: [],
      attributes: [],
    });

    (document.querySelector('.dtd-btn-health') as HTMLElement).click();
    await flush();

    expect(mockInvoke).toHaveBeenCalledWith('get_disk_smart_info', { device: 'sda1' });
  });

  it('module-level close button should hide the analysis overlay', async () => {
    vi.resetModules();
    document.body.innerHTML = `
      <div id="disk-analysis-overlay"></div>
      <div id="disk-analysis-close"></div>
    `;
    await import('@/features/disks/main');

    (document.getElementById('disk-analysis-close') as HTMLElement).click();
    expect(document.getElementById('disk-analysis-overlay')?.classList.contains('hidden')).toBe(true);
  });
});
