// SPDX-License-Identifier: MIT

import { escapeHtml } from '../../shared/utils/index.js';
import { diskService } from '../../shared/services/index.js';

export async function handleShowSmartInfo(device: string): Promise<void> {
  const overlay = document.getElementById('smart-overlay');
  const loadingEl = document.getElementById('smart-loading');
  const healthSection = document.getElementById('smart-health-section');
  const attrsSection = document.getElementById('smart-attributes-section');
  const commandsSection = document.getElementById('smart-commands-section');
  const errorSection = document.getElementById('smart-error-section');
  const titleEl = document.getElementById('smart-title');

  if (!overlay) return;

  if (loadingEl) loadingEl.style.display = '';
  if (healthSection) healthSection.style.display = 'none';
  if (attrsSection) attrsSection.style.display = 'none';
  if (commandsSection) commandsSection.style.display = 'none';
  if (errorSection) errorSection.style.display = 'none';
  if (titleEl) titleEl.textContent = `🩺 Saúde: /dev/${device}`;

  overlay.classList.remove('hidden');

  try {
    const info = await diskService.getSmartInfo(device);
    if (loadingEl) loadingEl.style.display = 'none';

    if (commandsSection && info.commands_used?.length > 0) {
      commandsSection.style.display = '';
      const listEl = document.getElementById('smart-commands-list');
      if (listEl) {
        listEl.innerHTML = info.commands_used.map(c => `
          <div class="smart-cmd-item">
            <div class="smart-cmd-code"><code>${escapeHtml(c.command)}</code></div>
            <div class="smart-cmd-desc">${escapeHtml(c.description)}</div>
          </div>
        `).join('');
      }
    }

    if (!info.smart_available) {
      if (errorSection) {
        errorSection.style.display = '';
        const msgEl = document.getElementById('smart-error-msg');
        if (msgEl) {
          let msg = info.error_message || 'S.M.A.R.T. não disponível para este dispositivo.';
          if (info.health === 'NOT_AVAILABLE') {
            msg = '⚠️ ' + msg + '<br><br><button class="btn-smart-install" id="smart-install-btn">📦 Instalar smartmontools</button>';
          }
          msgEl.innerHTML = msg;
        }
      }
      return;
    }

    if (healthSection) {
      healthSection.style.display = '';
      const iconEl = document.getElementById('smart-health-icon');
      const statusEl = document.getElementById('smart-health-status');
      const modelEl = document.getElementById('smart-health-model');
      const tempEl = document.getElementById('smart-temp');
      const hoursEl = document.getElementById('smart-hours');

      const isPassed = info.health === 'PASSED';
      if (iconEl) iconEl.textContent = isPassed ? '✅' : '❌';
      if (statusEl) {
        statusEl.textContent = isPassed ? '✅ APROVADO' : '❌ REPROVADO';
        statusEl.style.color = isPassed ? '#4ae0a0' : '#e88';
      }
      if (modelEl) modelEl.textContent = info.device_model || '—';
      if (tempEl) tempEl.textContent = info.temperature || '—';
      if (hoursEl) hoursEl.textContent = info.power_on_hours || '—';

      const card = document.getElementById('smart-health-card');
      if (card) card.style.borderColor = isPassed ? '#00d4aa44' : '#e84a4a44';
    }

    if (attrsSection && info.attributes?.length > 0) {
      attrsSection.style.display = '';
      const tbody = document.getElementById('smart-attributes-body');
      if (tbody) {
        tbody.innerHTML = info.attributes.map(a => `
          <tr class="smart-attr-row smart-attr-${a.status}">
            <td class="smart-td-id">${a.id}</td>
            <td class="smart-td-name" title="${escapeHtml(a.name)}">${escapeHtml(a.name.replace(/_/g, ' '))}</td>
            <td class="smart-td-val">${a.value}</td>
            <td class="smart-td-worst">${a.worst}</td>
            <td class="smart-td-thresh">${a.threshold > 0 ? a.threshold : '—'}</td>
            <td class="smart-td-raw" title="Valor bruto">${escapeHtml(a.raw)}</td>
            <td class="smart-td-status">
              <span class="smart-dot smart-dot-${a.status}" title="${a.status === 'good' ? 'Bom' : a.status === 'warn' ? 'Atenção' : 'Crítico!'}"></span>
            </td>
          </tr>`).join('');
      }
    }
  } catch (e) {
    console.error('get_disk_smart_info failed:', e);
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorSection) {
      errorSection.style.display = '';
      const msgEl = document.getElementById('smart-error-msg');
      if (msgEl) msgEl.innerHTML = `❌ Erro ao consultar S.M.A.R.T.: ${escapeHtml(e + '')}<br><br>Verifique se o pacote smartmontools está instalado.`;
    }
  }
}
