// SPDX-License-Identifier: MIT

import { packageService } from '../../shared/services/index.js';

export async function loadPackageHistory(): Promise<void> {
  const listEl = document.getElementById('pkg-history-list');
  if (!listEl) return;

  try {
    const entries = await packageService.getHistory();
    if (entries.length === 0) {
      listEl.innerHTML = '<div class="pkg-empty">Nenhum histórico encontrado.</div>';
      return;
    }
    listEl.innerHTML = `<div class="pkg-history-log">${entries.map(e => {
      const icon = e.action === 'install' ? '⬆️' : e.action === 'remove' ? '🗑️' : '🔄';
      const date = e.timestamp.slice(0, 19).replace('T', ' ');
      const pkgInfo = e.package_name ? `${e.package_name} ${e.version}` : '';
      return `<div class="pkg-history-item">
        <span class="pkg-history-icon">${icon}</span>
        <span class="pkg-history-action">${e.action}</span>
        <span class="pkg-history-pkg">${pkgInfo}</span>
        <span class="pkg-history-date">${date}</span>
      </div>`;
    }).join('')}</div>`;
  } catch (e) {
    console.error('loadPackageHistory failed:', e);
    listEl.innerHTML = '<div class="pkg-empty">❌ Erro ao carregar histórico.</div>';
  }
}
