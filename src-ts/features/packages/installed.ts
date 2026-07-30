// SPDX-License-Identifier: MIT

import type { InstalledPackage } from '../../shared/types/index.js';
import { showToast } from '../../shared/utils/index.js';
import { packageService } from '../../shared/services/index.js';
import { passwordVerified } from '../../shared/auth.js';
import { showPasswordModal, setPendingAction } from '../../operations.js';

let selectedInstalledPkgs = new Set<string>();

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

export async function loadInstalledPackages(): Promise<void> {
  const listEl = document.getElementById('pkg-installed-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="pkg-loading">⏳ Carregando pacotes...</div>';

  try {
    const pkgs = await packageService.listInstalled();
    renderInstalledPackages(pkgs);
    document.getElementById('pkg-total-count')!.textContent = pkgs.length.toString();

    let totalBytes = 0;
    for (const p of pkgs) {
      const sizeStr = p.size;
      if (sizeStr.includes('MiB') || sizeStr.includes('MB')) {
        totalBytes += parseFloat(sizeStr) * 1048576;
      } else if (sizeStr.includes('KiB') || sizeStr.includes('kB')) {
        totalBytes += parseFloat(sizeStr) * 1024;
      } else if (sizeStr.includes('GB') || sizeStr.includes('GiB')) {
        totalBytes += parseFloat(sizeStr) * 1073741824;
      }
    }
    document.getElementById('pkg-total-size')!.textContent = formatBytes(totalBytes);
  } catch (e) {
    console.error('loadInstalledPackages failed:', e);
    listEl.innerHTML = '<div class="pkg-empty">❌ Erro ao carregar pacotes.</div>';
  }
}

function renderInstalledPackages(pkgs: InstalledPackage[]): void {
  const listEl = document.getElementById('pkg-installed-list');
  if (!listEl) return;

  const query = ((document.getElementById('pkg-installed-search') as HTMLInputElement)?.value || '').toLowerCase().trim();
  const filtered = query
    ? pkgs.filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query))
    : pkgs;

  document.getElementById('pkg-installed-count')!.textContent = `${filtered.length} pacotes`;

  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="pkg-empty">🔍 Nenhum pacote encontrado.</div>';
    return;
  }

  filtered.sort((a, b) => {
    const aSel = selectedInstalledPkgs.has(a.name) ? 0 : 1;
    const bSel = selectedInstalledPkgs.has(b.name) ? 0 : 1;
    if (aSel !== bSel) return aSel - bSel;
    return a.name.localeCompare(b.name);
  });

  listEl.innerHTML = `<table class="pkg-table">
    <thead><tr>
      <th class="pkg-th-check"></th>
      <th class="pkg-th-name">Pacote</th>
      <th class="pkg-th-version">Versão</th>
      <th class="pkg-th-size">Tamanho</th>
      <th class="pkg-th-desc">Descrição</th>
    </tr></thead>
    <tbody>${filtered.map(p => `
      <tr class="pkg-row ${selectedInstalledPkgs.has(p.name) ? 'selected' : ''}" data-pkg="${p.name}">
        <td><input type="checkbox" class="pkg-check" ${selectedInstalledPkgs.has(p.name) ? 'checked' : ''} /></td>
        <td class="pkg-cell-name">${p.name}</td>
        <td class="pkg-cell-version">${p.version}</td>
        <td class="pkg-cell-size">${p.size || '—'}</td>
        <td class="pkg-cell-desc">${p.description || '—'}</td>
      </tr>
    `).join('')}</tbody></table>`;

  listEl.querySelectorAll('.pkg-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      const cb = row.querySelector('.pkg-check') as HTMLInputElement;
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event('change'));
    });
    const cb = row.querySelector('.pkg-check') as HTMLInputElement;
    cb.addEventListener('change', () => {
      const name = (row as HTMLElement).dataset.pkg!;
      if (cb.checked) {
        selectedInstalledPkgs.add(name);
        row.classList.add('selected');
      } else {
        selectedInstalledPkgs.delete(name);
        row.classList.remove('selected');
      }
      updateRemoveButton();
    });
  });

  updateRemoveButton();
}

function updateRemoveButton(): void {
  const btn = document.getElementById('pkg-remove-btn') as HTMLButtonElement | null;
  if (!btn) return;
  const count = selectedInstalledPkgs.size;
  if (count > 0) {
    btn.style.display = '';
    btn.textContent = `🗑️ Remover (${count})`;
    btn.disabled = false;
  } else {
    btn.style.display = 'none';
  }
}

export async function handleRemovePackages(): Promise<void> {
  if (selectedInstalledPkgs.size === 0) return;
  const names = Array.from(selectedInstalledPkgs);

  const doRemove = async (): Promise<void> => {
    try {
      const results = await packageService.removeSystem(names);
      const listEl = document.getElementById('pkg-installed-list');
      if (listEl) {
        listEl.innerHTML = `<div class="pkg-history-log">${results.map(r => `<div>${r}</div>`).join('')}</div>`;
      }
      showToast('success', `${names.length} pacote(s) removido(s)!`);
      selectedInstalledPkgs.clear();
      setTimeout(() => loadInstalledPackages(), 2000);
    } catch (e) {
      showToast('error', (e + '') || 'Erro ao remover pacotes.');
    }
  };

  if (passwordVerified) {
    await doRemove();
  } else {
    setPendingAction({ type: 'remove', tools: names });
    showPasswordModal({ type: 'remove', tools: names });
  }
}
