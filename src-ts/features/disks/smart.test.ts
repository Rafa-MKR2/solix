// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleShowSmartInfo } from '@/features/disks/smart';
import { mockInvoke } from '@/test/setup';

function setupDom(): void {
  document.body.innerHTML = `
    <div id="smart-overlay" class="hidden"></div>
    <div id="smart-loading" style="display:block"></div>
    <div id="smart-health-section" style="display:none"></div>
    <div id="smart-attributes-section" style="display:none"></div>
    <div id="smart-commands-section" style="display:none"></div>
    <div id="smart-error-section" style="display:none"></div>
    <div id="smart-title"></div>
    <div id="smart-commands-list"></div>
    <div id="smart-error-msg"></div>
    <div id="smart-health-icon"></div>
    <div id="smart-health-status"></div>
    <div id="smart-health-model"></div>
    <div id="smart-temp"></div>
    <div id="smart-hours"></div>
    <div id="smart-health-card"></div>
    <table><tbody id="smart-attributes-body"></tbody></table>
  `;
}

const PASSED_INFO = {
  smart_available: true,
  health: 'PASSED',
  device_model: 'Samsung SSD 970',
  temperature: '42°C',
  power_on_hours: '1234h',
  commands_used: [{ command: 'smartctl -H', description: 'Testa a saúde do disco' }],
  attributes: [
    { id: 5, name: 'Reallocated_Sector_Ct', value: 100, worst: 100, threshold: 36, raw: '0', status: 'good' },
    { id: 194, name: 'Temperature_Celsius', value: 58, worst: 55, threshold: 0, raw: '42', status: 'warn' },
  ],
};

describe('disks smart', () => {
  beforeEach(() => {
    setupDom();
    mockInvoke.mockReset();
  });

  it('should reset sections and show title before loading', async () => {
    mockInvoke.mockResolvedValue(PASSED_INFO);

    await handleShowSmartInfo('sda');

    expect(document.getElementById('smart-title')?.textContent).toBe('🩺 Saúde: /dev/sda');
    expect(document.getElementById('smart-overlay')?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('smart-loading')?.style.display).toBe('none');
  });

  it('should render health info, commands and attributes for a passing disk', async () => {
    mockInvoke.mockResolvedValue(PASSED_INFO);

    await handleShowSmartInfo('sda');

    expect(document.getElementById('smart-health-section')?.style.display).not.toBe('none');
    expect(document.getElementById('smart-health-icon')?.textContent).toBe('✅');
    expect(document.getElementById('smart-health-status')?.textContent).toBe('✅ APROVADO');
    expect(document.getElementById('smart-health-model')?.textContent).toBe('Samsung SSD 970');
    expect(document.getElementById('smart-temp')?.textContent).toBe('42°C');

    expect(document.getElementById('smart-commands-section')?.style.display).not.toBe('none');
    expect(document.getElementById('smart-commands-list')?.innerHTML).toContain('smartctl -H');

    const rows = document.querySelectorAll('.smart-attr-row');
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('.smart-td-name')?.textContent).toBe('Reallocated Sector Ct');
    expect(rows[0].className).toContain('smart-attr-good');
    expect(rows[1].className).toContain('smart-attr-warn');
  });

  it('should show failed health status when health is not PASSED', async () => {
    mockInvoke.mockResolvedValue({ ...PASSED_INFO, health: 'FAILED', attributes: [] });

    await handleShowSmartInfo('sda');

    expect(document.getElementById('smart-health-icon')?.textContent).toBe('❌');
    expect(document.getElementById('smart-health-status')?.textContent).toBe('❌ REPROVADO');
    // jsdom normaliza '#e84a4a44' para 'rgba(232, 74, 74, 0.267)' (vermelho = falha)
    expect(document.getElementById('smart-health-card')?.style.borderColor).toContain('rgba(232, 74, 74');
  });

  it('should suggest installing smartmontools when health is NOT_AVAILABLE', async () => {
    mockInvoke.mockResolvedValue({
      smart_available: false,
      health: 'NOT_AVAILABLE',
      error_message: 'S.M.A.R.T. não suportado',
      commands_used: [],
      attributes: [],
    });

    await handleShowSmartInfo('sda');

    expect(document.getElementById('smart-error-section')?.style.display).not.toBe('none');
    expect(document.getElementById('smart-error-msg')?.innerHTML).toContain('Instalar smartmontools');
    expect(document.getElementById('smart-install-btn')).not.toBeNull();
  });

  it('should show generic message when smart is unavailable without health info', async () => {
    mockInvoke.mockResolvedValue({
      smart_available: false,
      health: 'UNKNOWN',
      commands_used: [],
      attributes: [],
    });

    await handleShowSmartInfo('sda');

    expect(document.getElementById('smart-error-section')?.style.display).not.toBe('none');
    expect(document.getElementById('smart-error-msg')?.textContent).toContain('S.M.A.R.T. não disponível');
  });

  it('should show error section when the invoke fails', async () => {
    mockInvoke.mockRejectedValue(new Error('smartmontools ausente'));

    await handleShowSmartInfo('sda');

    expect(document.getElementById('smart-loading')?.style.display).toBe('none');
    expect(document.getElementById('smart-error-section')?.style.display).not.toBe('none');
    expect(document.getElementById('smart-error-msg')?.innerHTML).toContain('smartmontools ausente');
  });

  it('should do nothing when the overlay is missing', async () => {
    document.getElementById('smart-overlay')!.remove();
    mockInvoke.mockResolvedValue(PASSED_INFO);

    await expect(handleShowSmartInfo('sda')).resolves.not.toThrow();
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
