// SPDX-License-Identifier: MIT

import type {
  DevelopmentToolStatus,
  AppUpdateInfo,
} from './types.js';
import { escapeHtml, showToast, setText } from './utils.js';
import { diskService, processService, packageService, systemService } from './shared/services/index.js';

export const CIRCUMFERENCE = 2 * Math.PI * 50;

export function setGauge(id: string, valueId: string, percent: number, label: string): void {
  const circle = document.getElementById(id) as SVGElement | null;
  const value = document.getElementById(valueId);
  if (!circle || !value) return;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  (circle as any).style.strokeDasharray = `${CIRCUMFERENCE}`;
  (circle as any).style.strokeDashoffset = `${offset}`;
  const hue = clamped > 80 ? 0 : clamped > 50 ? 30 : 160;
  (circle as any).style.stroke = `hsl(${hue}, 80%, 50%)`;
  value.textContent = label;
}

// ─── Disks ───

import type { DiskInfo } from './types.js';

function getBarColor(pct: number): string {
  if (pct < 50) return 'green';
  if (pct < 75) return 'yellow';
  if (pct < 90) return 'orange';
  return 'red';
}

export async function handleOpenFileManager(mountPoint: string): Promise<void> {
  try {
    await diskService.openFileManager(mountPoint);
  } catch (e) {
    console.error('open_file_manager failed:', e);
    showToast('error', 'Erro ao abrir gerenciador de arquivos.');
  }
}

export async function handleAnalyzeDisk(mountPoint: string): Promise<void> {
  const modal = document.getElementById('disk-analysis-overlay');
  const list = document.getElementById('disk-analysis-list');
  const title = document.getElementById('disk-analysis-title');
  if (!modal || !list) return;
  if (title) title.textContent = `🔍 Analisando ${mountPoint}...`;
  list.innerHTML = '<div class="disk-analysis-loading">⏳ Escaneando pastas...</div>';
  modal.classList.remove('hidden');
  try {
    const items = await diskService.analyzeUsage(mountPoint);
    if (title) title.textContent = `📂 ${mountPoint} — Pastas mais pesadas`;
    if (items.length === 0) {
      list.innerHTML = '<div class="hint">Nenhum resultado encontrado.</div>';
      return;
    }
    const maxSize = items.reduce((m, i) => {
      const v = parseFloat(i.size);
      return v > m ? v : m;
    }, 0);
    list.innerHTML = items.map(item => {
      const sizeVal = parseFloat(item.size) || 0;
      const pct = maxSize > 0 ? (sizeVal / maxSize) * 100 : 0;
      return `
        <div class="disk-analysis-item">
          <div class="disk-analysis-path">${item.path}</div>
          <div class="disk-analysis-size">${item.size}</div>
          <div class="disk-analysis-bar-bg">
            <div class="disk-analysis-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.error('analyze_disk_usage failed:', e);
    list.innerHTML = '<div class="hint" style="color:#e88">❌ Erro ao analisar disco.</div>';
  }
}

export async function handleShowPartitions(device: string): Promise<void> {
  const modal = document.getElementById('disk-analysis-overlay');
  const list = document.getElementById('disk-analysis-list');
  const title = document.getElementById('disk-analysis-title');
  if (!modal || !list) return;
  if (title) title.textContent = `📋 Partições de ${device}`;
  list.innerHTML = '<div class="disk-analysis-loading">⏳ Carregando...</div>';
  modal.classList.remove('hidden');
  try {
    const output = await diskService.getPartitionTable(device);
    list.innerHTML = `<pre class="disk-partitions-output">${escapeHtml(output)}</pre>`;
  } catch (e) {
    console.error('get_partition_table failed:', e);
    list.innerHTML = `<div class="hint" style="color:#e88">❌ ${e}</div>`;
  }
}

document.getElementById('disk-analysis-close')?.addEventListener('click', () => {
  document.getElementById('disk-analysis-overlay')?.classList.add('hidden');
});
document.getElementById('disk-analysis-overlay')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    (e.currentTarget as HTMLElement).classList.add('hidden');
  }
});

function parseSizeGB(sizeStr: string): number {
  // Converts "100 GB", "500 MB", "1.5 TB" to GB
  const s = sizeStr.trim();
  if (s.includes('TB') || s.includes('TiB')) {
    return parseFloat(s) * 1024;
  } else if (s.includes('GB') || s.includes('GiB')) {
    return parseFloat(s);
  } else if (s.includes('MB') || s.includes('MiB')) {
    return parseFloat(s) / 1024;
  } else if (s.includes('KB') || s.includes('KiB')) {
    return parseFloat(s) / (1024 * 1024);
  }
  return 0;
}

function formatSizeGB(gb: number): string {
  if (gb >= 1024) {
    return (gb / 1024).toFixed(1) + ' TB';
  }
  return gb.toFixed(0) + ' GB';
}

export function renderDisks(disks: DiskInfo[]): void {
  const container = document.getElementById('disks-list');
  if (!container) return;
  container.innerHTML = '';
  if (!disks || disks.length === 0) {
    container.innerHTML = '<div class="hint">Nenhum disco detectado.</div>';
    return;
  }

  // Compute aggregate stats
  let totalGB = 0, usedGB = 0;
  for (const d of disks) {
    totalGB += parseSizeGB(d.total);
    usedGB += parseSizeGB(d.used);
  }
  const pct = totalGB > 0 ? Math.round((usedGB / totalGB) * 100) : 0;

  document.getElementById('disk-count')!.textContent = disks.length.toString();
  document.getElementById('disk-total-space')!.textContent = formatSizeGB(totalGB);
  document.getElementById('disk-used-space')!.textContent = formatSizeGB(usedGB);
  document.getElementById('disk-pct-used')!.textContent = `${pct}%`;

  // Build compact Windows-style table
  const table = document.createElement('table');
  table.className = 'disk-table';

  // Header row
  table.innerHTML = `
    <thead>
      <tr>
        <th class="dth-icon"></th>
        <th class="dth-name">Dispositivo</th>
        <th class="dth-type">Tipo</th>
        <th class="dth-capacity">Capacidade</th>
        <th class="dth-bar">Uso</th>
        <th class="dth-io">I/O</th>
        <th class="dth-actions">Ações</th>
      </tr>
    </thead>
    <tbody>
  `;

  const tbody = table.querySelector('tbody')!;

  for (const d of disks) {
    const deviceName = d.filesystem.split('/').pop()!;
    const typeIcon = d.fstype === 'ntfs' ? '🪟' : d.fstype === 'vfat' ? '💾' : d.fstype === 'btrfs' ? '🌳' : '💽';
    const roundedPct = Math.round(d.percent_used);
    const barColor = getBarColor(d.percent_used);
    const hasIO = d.io_read && d.io_read !== '—';
    const ioDisplay = hasIO ? `${d.io_read} / ${d.io_write}` : '—';

    const row = document.createElement('tr');
    row.className = 'disk-row';
    row.innerHTML = `
      <td class="dtd-icon">${typeIcon}</td>
      <td class="dtd-name">
        <span class="dtd-device">${deviceName}</span>
        ${d.device_model ? `<span class="dtd-model">${d.device_model}</span>` : ''}
        <span class="dtd-mount">${d.mount_point}</span>
      </td>
      <td class="dtd-type"><span class="disk-fstype">${d.fstype}</span></td>
      <td class="dtd-capacity">
        <span class="dtd-total">${d.total}</span>
        <span class="dtd-used">${d.used} usado</span>
      </td>
      <td class="dtd-bar">
        <div class="dtd-bar-track">
          <div class="dtd-bar-fill ${barColor}" style="width:${Math.min(d.percent_used, 100)}%"></div>
        </div>
        <span class="dtd-bar-label ${barColor}">${roundedPct}%</span>
      </td>
      <td class="dtd-io">
        <span class="dtd-io-text">${ioDisplay}</span>
      </td>
      <td class="dtd-actions">
        <button class="dtd-btn dtd-btn-open" title="Abrir" data-mount="${d.mount_point}">📂</button>
        <button class="dtd-btn dtd-btn-analyze" title="Analisar pastas" data-mount="${d.mount_point}">🔍</button>
        <button class="dtd-btn dtd-btn-health" title="Saúde S.M.A.R.T." data-device="${deviceName}">🩺</button>
        <button class="dtd-btn dtd-btn-backup" title="Backup" data-source="${d.mount_point}">💾</button>
        <button class="dtd-btn dtd-btn-partitions" title="Partições" data-device="${d.filesystem}">📋</button>
      </td>
    `;
    tbody.appendChild(row);

    row.querySelector('.dtd-btn-open')!.addEventListener('click', () => handleOpenFileManager(d.mount_point));
    row.querySelector('.dtd-btn-analyze')!.addEventListener('click', () => handleAnalyzeDisk(d.mount_point));
    row.querySelector('.dtd-btn-health')!.addEventListener('click', () => handleShowSmartInfo(deviceName));
    row.querySelector('.dtd-btn-backup')!.addEventListener('click', () => showBackupModal(d.mount_point));
    row.querySelector('.dtd-btn-partitions')!.addEventListener('click', () => handleShowPartitions(d.filesystem));
  }

  container.appendChild(table);
}

// ─── Backup Modal ───

// ─── SMART Health ───

export async function handleShowSmartInfo(device: string): Promise<void> {
  const overlay = document.getElementById('smart-overlay');
  const loadingEl = document.getElementById('smart-loading');
  const healthSection = document.getElementById('smart-health-section');
  const attrsSection = document.getElementById('smart-attributes-section');
  const commandsSection = document.getElementById('smart-commands-section');
  const errorSection = document.getElementById('smart-error-section');
  const titleEl = document.getElementById('smart-title');

  if (!overlay) return;

  // Reset all sections
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

    // Show commands used (educational)
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

    // Not available?
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

    // Health summary
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

      // Set card border color based on health
      const card = document.getElementById('smart-health-card');
      if (card) {
        card.style.borderColor = isPassed ? '#00d4aa44' : '#e84a4a44';
      }
    }

    // Attributes table
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

export function showBackupModal(mountPoint: string): void {
  const overlay = document.getElementById('backup-overlay');
  const sourceEl = document.getElementById('backup-source');
  const resultEl = document.getElementById('backup-result');
  const progressEl = document.getElementById('backup-progress');

  if (!overlay) return;

  if (sourceEl) sourceEl.textContent = mountPoint;
  if (resultEl) resultEl.classList.add('hidden');
  if (progressEl) progressEl.classList.add('hidden');

  // Reset state
  const statusEl = document.getElementById('backup-progress-status');
  const fillEl = document.getElementById('backup-progress-fill');
  const textEl = document.getElementById('backup-progress-text');
  const startBtn = document.getElementById('backup-start-btn') as HTMLButtonElement | null;
  const cancelBtn = document.getElementById('backup-cancel-btn') as HTMLButtonElement | null;

  if (statusEl) statusEl.textContent = '⏳ Comprimindo...';
  if (fillEl) fillEl.style.width = '0%';
  if (textEl) textEl.textContent = '0%';
  if (startBtn) startBtn.disabled = false;
  if (cancelBtn) cancelBtn.textContent = 'Cancelar';

  // Pre-fill destination based on mount point
  const destInput = document.getElementById('backup-destination') as HTMLInputElement | null;
  if (destInput) {
    if (mountPoint === '/home') {
      destInput.placeholder = 'ex: /home/seu usuario/backups';
      destInput.value = '';
    } else if (mountPoint === '/') {
      destInput.value = '/root/backups';
    } else if (mountPoint.startsWith('/media') || mountPoint.startsWith('/mnt')) {
      destInput.value = mountPoint + '/backups';
    } else {
      destInput.value = mountPoint.replace(/\/[^/]+$/, '') + '/backups';
    }
  }

  overlay.classList.remove('hidden');
}

// ─── Tools ───

export const categoryLabels: Record<string, string> = {
  desenvolvimento: '🛠️ Desenvolvimento',
  internet: '🌐 Internet',
  container: '📦 Container',
  jogos: '🎮 Jogos',
  midia: '🎵 Mídia',
  escritorio: '📄 Escritório',
  comunicacao: '💬 Comunicação',
  utilitarios: '🔧 Utilitários',
  temas: '🎨 Temas',
};

const categoryOrder = ['desenvolvimento', 'internet', 'container', 'jogos', 'midia', 'escritorio', 'comunicacao', 'utilitarios', 'temas'];

export let selectedTools = new Set<string>();
export let removedTools = new Set<string>();
export function updateButtons(): void {
  const installBtn = document.getElementById('install-btn') as HTMLButtonElement | null;
  const removeBtn = document.getElementById('remove-btn') as HTMLButtonElement | null;
  const count = document.getElementById('selected-count');
  const total = selectedTools.size + removedTools.size;
  if (installBtn) {
    installBtn.disabled = selectedTools.size === 0;
    installBtn.textContent = selectedTools.size > 0 ? `⚡ Instalar (${selectedTools.size})` : '⚡ Instalar Selecionadas';
  }
  if (count) {
    count.textContent = total > 0 ? `${total} ferramenta(s) selecionada(s)` : 'Nenhuma ferramenta selecionada';
  }
}

export function toggleInstall(name: string, card: HTMLElement): void {
  if (selectedTools.has(name)) {
    selectedTools.delete(name);
    card.classList.remove('selected');
  } else {
    selectedTools.add(name);
    card.classList.add('selected');
  }
  updateButtons();
}

export function toggleRemove(name: string, card: HTMLElement): void {
  if (removedTools.has(name)) {
    removedTools.delete(name);
    card.classList.remove('selected');
  } else {
    removedTools.add(name);
    card.classList.add('selected');
  }
  const removeBtn = document.getElementById('remove-btn');
  if (removeBtn) removeBtn.style.display = removedTools.size > 0 ? '' : 'none';
  updateButtons();
}

function toggleCategorySelect(cat: string, items: DevelopmentToolStatus[]): void {
  const allSelected = items.every(t => selectedTools.has(t.name));
  for (const tool of items) {
    const card = document.querySelector<HTMLElement>(`.tool-card[data-name="${tool.name}"]`);
    if (allSelected) {
      selectedTools.delete(tool.name);
      if (card) card.classList.remove('selected');
    } else {
      if (!tool.available) {
        selectedTools.add(tool.name);
        if (card) card.classList.add('selected');
      }
    }
  }
  updateButtons();
}

export function renderTools(tools: DevelopmentToolStatus[]): void {
  const container = document.getElementById('tools-list');
  if (!container) return;
  container.innerHTML = '';

  const query = ((document.getElementById('search-input') as HTMLInputElement)?.value || '').toLowerCase().trim();
  const filtered = query
    ? tools.filter(t => t.name.toLowerCase().includes(query) || (t.description || '').toLowerCase().includes(query))
    : tools;

  if (filtered.length === 0 && query) {
    container.innerHTML = '<div class="empty-search">🔍 Nenhuma ferramenta encontrada para "<strong>' + query + '</strong>"</div>';
    return;
  }

  const grouped: Record<string, DevelopmentToolStatus[]> = {};
  for (const tool of filtered) {
    const cat = tool.category || 'outros';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(tool);
  }

  let cardIndex = 0;
  for (const cat of categoryOrder) {
    const items = grouped[cat];
    if (!items) continue;

    const header = document.createElement('h3');
    header.className = 'category-header';
    header.textContent = categoryLabels[cat] || cat;
    header.dataset.category = cat;
    const selectAll = document.createElement('span');
    selectAll.className = 'cat-select-all';
    selectAll.textContent = 'Selecionar todas';
    selectAll.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCategorySelect(cat, items);
    });
    header.appendChild(selectAll);
    container.appendChild(header);

    for (const tool of items) {
      const card = document.createElement('div');
      card.className = 'tool-card';
      card.style.animationDelay = `${cardIndex * 0.025}s`;
      cardIndex++;
      if (tool.available) card.classList.add('installed');
      card.dataset.name = tool.name;
      const iconHtml = tool.icon_base64
        ? `<img class="tool-card-icon" src="${tool.icon_base64}" alt="" onerror="this.style.display='none'" />`
        : '<div class="tool-card-icon-placeholder"></div>';
      card.innerHTML = `
        ${iconHtml}
        <div class="tool-check">${tool.available ? '✓' : ''}</div>
        <div class="tool-info">
          <div class="tool-name">${tool.name}</div>
          <div class="tool-desc">${tool.description || ''}</div>
        </div>
        <div class="tool-badge">${tool.available ? 'instalado' : 'ausente'}</div>
        <button class="tool-info-btn" data-tool="${tool.name}" title="Detalhes">ⓘ</button>
      `;
      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('tool-info-btn')) return;
        if (tool.available) {
          toggleRemove(tool.name, card);
        } else {
          toggleInstall(tool.name, card);
        }
      });
      container.appendChild(card);
    }
  }
}// ─── Process List ───

import type { ProcessInfo } from './types.js';

let processList: ProcessInfo[] = [];
let processSortField = 'cpu_percent';
let processSortAsc = false;

type SortField = 'pid' | 'cpu_percent' | 'mem_percent' | 'name' | 'state' | 'user';

export function loadProcesses(): Promise<void> {
  return fetchProcesses();
}

async function fetchProcesses(): Promise<void> {
  try {
    const list = await processService.getProcesses();
    processList = list;
    renderProcesses();
  } catch (e) {
    console.error('loadProcesses failed:', e);
  }
}

function renderProcesses(): void {
  const tbody = document.getElementById('process-tbody');
  const count = document.getElementById('process-count');
  if (!tbody) return;

  const query = ((document.getElementById('process-search') as HTMLInputElement)?.value || '').toLowerCase().trim();
  let filtered = processList;
  if (query) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || p.pid.toString().includes(query) || p.user.toLowerCase().includes(query));
  }

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    const field = processSortField as SortField;
    if (field === 'pid') cmp = a.pid - b.pid;
    else if (field === 'cpu_percent') cmp = a.cpu_percent - b.cpu_percent;
    else if (field === 'mem_percent') cmp = a.mem_percent - b.mem_percent;
    else if (field === 'name') cmp = a.name.localeCompare(b.name);
    else if (field === 'state') cmp = a.state.localeCompare(b.state);
    else if (field === 'user') cmp = a.user.localeCompare(b.user);
    return processSortAsc ? cmp : -cmp;
  });

  if (count) count.textContent = `${sorted.length} processos`;

  tbody.innerHTML = sorted.map(p => {
    const memDisplay = p.mem_percent > 0.1 ? `${p.mem_percent.toFixed(1)}%` : '<0.1%';
    return `<tr>
      <td>${p.pid}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${p.cpu_percent.toFixed(1)}%</td>
      <td>${memDisplay}</td>
      <td class="process-state ${p.state}">${p.state}</td>
      <td>${p.user}</td>
    </tr>`;
  }).join('');

  document.querySelectorAll<HTMLElement>('#process-table th').forEach(th => {
    const field = th.dataset.sort;
    th.classList.toggle('sorted', field === processSortField);
    th.classList.toggle('desc', field === processSortField && !processSortAsc);
  });
}

export function handleProcessSortClick(field: string): void {
  if (!field) return;
  if (processSortField === field) processSortAsc = !processSortAsc;
  else { processSortField = field; processSortAsc = true; }
  renderProcesses();
}

export function handleProcessSearch(): void {
  renderProcesses();
}

// ─── Lock Diagnosis ───

export async function showLockDiagnosis(): Promise<void> {
  switchToPage('sistema');
  const diagnosis = document.getElementById('lock-diagnosis');
  if (!diagnosis) return;
  diagnosis.classList.remove('hidden');
  const infoEl = document.getElementById('lock-info');
  const spinnerEl = document.getElementById('lock-spinner');
  if (spinnerEl) spinnerEl.classList.remove('hidden');
  if (infoEl) infoEl.textContent = '🔍 Detectando...';

  try {
    const lockInfo = await packageService.checkPmLock();
    if (spinnerEl) spinnerEl.classList.add('hidden');
    if (infoEl) {
      if (lockInfo.locked) {
        infoEl.textContent = lockInfo.message;
      } else {
        infoEl.innerHTML = '🔒 O lock foi liberado! <button class="lock-retry-btn" id="lock-freed-retry-btn">🔄 Tentar Novamente</button>';
        document.getElementById('lock-freed-retry-btn')?.addEventListener('click', () => { getRetryLastOperationFn()?.(); });
      }
    }
    const retryBtn = document.getElementById('lock-retry-btn');
    if (retryBtn) retryBtn.classList.remove('hidden');
  } catch (e) {
    console.error('check_pm_lock failed:', e);
    if (spinnerEl) spinnerEl.classList.add('hidden');
    if (infoEl) infoEl.textContent = '❌ Não foi possível detectar o bloqueio. Feche outros programas (Pamac, Discover, terminal) e tente novamente.';
  }
}

export function setupLockActions(): void {
  document.querySelectorAll<HTMLElement>('.lock-action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      switch (action) {
        case 'pamac':
          showToast('info', 'Fechando Pamac...');
          try { await processService.killProcess('pamac'); } catch (e) { console.error(e); }
          break;
        case 'discover':
          showToast('info', 'Fechando Discover...');
          try { await processService.killProcess('discover'); } catch (e) { console.error(e); }
          break;
        case 'terminals':
          showToast('info', 'Feche terminais rodando pacman/apt/dnf');
          break;
        case 'restart-pm':
          showToast('info', 'Para reiniciar o gerenciador, execute no terminal: sudo systemctl restart <pm>');
          break;
        case 'kill-lock': {
          if (!confirm('Remover o arquivo de trava manualmente pode corromper o banco de dados do gerenciador. Tem certeza?')) return;
          try {
            await processService.removeLockFiles();
            showToast('success', 'Trava removida. Tente novamente.');
          } catch (e) {
            showToast('error', 'Não foi possível remover a trava');
          }
          break;
        }
      }
    });
  });
}

let retryLastOperationRef: (() => void) | null = null;

export function setRetryLastOperationFn(fn: () => void): void {
  retryLastOperationRef = fn;
}

export function getRetryLastOperationFn(): (() => void) | null {
  return retryLastOperationRef;
}

// ─── Help Tooltips ───

const helpTexts: Record<string, string> = {
  'section-distribuicao': 'Aqui você vê qual versão do Linux está usando. É como saber o modelo e a versão do sistema operacional do seu computador.',
  'section-hardware': 'Informações sobre as peças físicas do seu computador: processador, memória, placa de vídeo e outros componentes. Tudo que está dentro do gabinete!',
  'section-visao-geral': 'Um resumo rápido do estado do seu sistema: quantos programas estão instalados, se há atualizações disponíveis e como estão os recursos do computador.',
  'section-desempenho': 'Mostra em tempo real o desempenho do seu computador: uso do processador, memória e temperatura. Os gráficos são atualizados automaticamente a cada 3 segundos.',
  'section-processos': 'Lista de todos os programas e serviços rodando no seu computador agora. Se algo estiver lento, você pode identificar qual programa está consumindo muitos recursos.',
  'section-discos': 'Seus discos e partições. Mostra quanto espaço está ocupado e livre, o tipo de cada disco (ext4, btrfs, NTFS), e permite abrir pastas ou analisar o uso.',
  'section-ferramentas': 'Lista de programas úteis que você pode instalar com um clique. Basta selecionar os que deseja e clicar em "Instalar Selecionadas".',
  'section-rede': 'Informações sobre sua conexão com a internet, Wi-Fi, Bluetooth e bateria do notebook. Tudo que conecta seu computador ao mundo.',
  'cpu': 'O processador, ou "cérebro" do computador. Ele executa todos os cálculos. Quanto maior a porcentagem, mais ele está trabalhando. Entre 0-30% é uso normal.',
  'ram': 'A memória RAM é a memória de trabalho do computador. Os programas ficam nela enquanto estão abertos. Se ficar muito cheia (acima de 90%), o sistema pode ficar lento.',
  'temp': 'A temperatura do processador. Entre 30°C e 70°C é normal. Acima de 80°C merece atenção — pode ser hora de limpar o cooler ou trocar a pasta térmica.',
  'nucleos': 'Os núcleos do processador. Imagine cada núcleo como um "trabalhador": quanto mais núcleos, mais tarefas o computador consegue realizar ao mesmo tempo.',
  'kernel': 'O núcleo do Linux, a parte mais fundamental do sistema operacional. É como o "motor" do seu computador — essencial para tudo funcionar.',
  'gpu': 'Placa de vídeo (GPU). Responsável por mostrar imagens na tela. Importante para jogos, vídeos, edição de imagem e para o sistema ficar bonito e fluido.',
  'uptime': 'Há quanto tempo o computador está ligado sem desligar ou reiniciar. Se estiver com muitos dias ligado, uma reinicializada pode ajudar o desempenho.',
  'pacotes': 'Quantidade total de programas instalados no seu sistema. Isso inclui navegador, editor de texto, jogos e também componentes internos que fazem tudo funcionar.',
  'atualizacoes': 'Novas versões dos seus programas disponíveis para instalar. Manter tudo atualizado é importante para a segurança e para ter as últimas melhorias e correções.',
  'carga': 'Média de processos esperando o processador. São 3 números: do último minuto, dos últimos 5 e dos últimos 15 minutos. Números baixos = sistema tranquilo e rápido.',
  'swap': 'Uma área do disco que o sistema usa como "memória extra" quando a RAM está cheia. É mais lenta que a RAM, mas evita que o computador trave quando falta memória.',
  'servicos': 'Programas essenciais rodando em segundo plano, como som, rede, impressão e atualizações. Eles fazem tudo funcionar sem você precisar se preocupar.',
  'zram': 'Técnica que compacta parte da memória RAM para evitar lentidão quando o computador está com pouca memória. Recomendado para máquinas com 4GB ou menos de RAM.',
  'limpeza': 'Remove arquivos temporários, cache de programas e pacotes antigos. Libera espaço no disco e ajuda o sistema a ficar mais leve. É seguro fazer de vez em quando!',
  'atualizar-sistema': 'Baixa e instala as últimas atualizações de segurança e melhorias para todos os seus programas. Recomendado fazer sempre que aparecerem atualizações disponíveis.',
  'reportar': 'Se algo não funcionar como esperado, este botão gera um relatório automático do seu sistema e abre uma página para você reportar o problema no GitHub.',
  'speedtest': 'Testa a velocidade da sua internet baixando um arquivo de teste. O resultado mostra quantos Megabits por segundo (Mbps) sua conexão consegue baixar.',
  'disco-abrir': 'Abre o gerenciador de arquivos do seu sistema na pasta deste disco, para você ver e organizar seus arquivos e pastas.',
  'disco-analisar': 'Escaneia as pastas mais pesadas deste disco, mostrando o que está ocupando mais espaço. Útil para encontrar arquivos grandes e liberar espaço.',
  'disco-particoes': 'Mostra a tabela de partições do disco, com informações detalhadas: nome, tamanho, tipo e onde está montada cada partição.',
  'section-pacotes': 'Instale pacotes .deb ou .rpm baixados da internet. O Solix mostra as informações do pacote, verifica se é compatível com seu sistema, e só instala após sua confirmação.',
  'section-analisador': 'Arraste um arquivo .sh para analisar. O Solix mostra cada comando, explica o que faz em português e classifica o nível de risco do script.',
};

let helpTooltipEl: HTMLElement | null = null;

function showHelpTooltip(text: string, targetEl: HTMLElement): void {
  hideHelpTooltip();
  const el = document.createElement('div');
  el.className = 'help-tooltip';
  el.textContent = text;
  document.body.appendChild(el);
  helpTooltipEl = el;

  requestAnimationFrame(() => {
    const rect = targetEl.getBoundingClientRect();
    const tipRect = el.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    let top = rect.bottom + 8;

    if (left < 10) left = 10;
    if (left + tipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tipRect.width - 10;
    }
    if (top + tipRect.height > window.innerHeight - 10) {
      top = rect.top - tipRect.height - 8;
      el.classList.add('bottom');
    }

    el.style.left = left + 'px';
    el.style.top = top + 'px';
  });
}

function hideHelpTooltip(): void {
  if (helpTooltipEl) {
    helpTooltipEl.remove();
    helpTooltipEl = null;
  }
}

let helpTipHideTimer: ReturnType<typeof setTimeout> | null = null;
let helpTipVisible = false;
let helpTipEl: HTMLElement | null = null;

function getHelpText(el: HTMLElement): string | null {
  const key = el.dataset.help;
  return key ? (helpTexts[key] || null) : null;
}

export function setupHelpTooltips(): void {
  document.addEventListener('mouseenter', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.help-tip');
    if (!el) return;
    const text = getHelpText(el);
    if (!text) return;
    if (helpTipHideTimer) { clearTimeout(helpTipHideTimer); helpTipHideTimer = null; }
    helpTipEl = el;
    showHelpTooltip(text, el);
    helpTipVisible = true;
  }, true);

  document.addEventListener('mouseleave', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.help-tip');
    if (!el) return;
    if (helpTipHideTimer) clearTimeout(helpTipHideTimer);
    helpTipHideTimer = setTimeout(() => {
      hideHelpTooltip();
      helpTipVisible = false;
      helpTipEl = null;
    }, 200);
  }, true);

  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.help-tip');
    if (el) {
      e.stopPropagation();
      const text = getHelpText(el);
      if (!text) return;
      if (helpTipVisible && helpTipEl === el) {
        hideHelpTooltip();
        helpTipVisible = false;
        helpTipEl = null;
      } else {
        if (helpTipHideTimer) { clearTimeout(helpTipHideTimer); helpTipHideTimer = null; }
        helpTipEl = el;
        showHelpTooltip(text, el);
        helpTipVisible = true;
      }
    } else {
      hideHelpTooltip();
      helpTipVisible = false;
      helpTipEl = null;
    }
  });

  document.addEventListener('scroll', () => {
    hideHelpTooltip();
    helpTipVisible = false;
    helpTipEl = null;
  }, true);
}

// ─── Report Modal ───

export function showReportModal(reportText: string): void {
  const overlay = document.getElementById('report-overlay');
  const status = document.getElementById('report-status');
  const content = document.getElementById('report-content');
  const textEl = document.getElementById('report-text');
  const result = document.getElementById('report-result');
  const githubBtn = document.getElementById('report-github-btn') as HTMLButtonElement | null;
  const copyBtn = document.getElementById('report-copy-btn') as HTMLButtonElement | null;

  if (!overlay) return;

  // Show status briefly
  if (status) {
    status.classList.remove('hidden');
    status.classList.add('loading');
  }
  if (content) content.classList.add('hidden');
  if (result) result.classList.add('hidden');
  if (githubBtn) githubBtn.disabled = true;
  if (copyBtn) copyBtn.disabled = true;
  if (textEl) textEl.textContent = '';

  overlay.classList.remove('hidden');

  // Brief animation to show status, then reveal the report
  setTimeout(() => {
    if (status) {
      status.classList.add('hidden');
      status.classList.remove('loading');
    }
    if (content) content.classList.remove('hidden');
    if (textEl) textEl.textContent = reportText;
    if (githubBtn) githubBtn.disabled = false;
    if (copyBtn) copyBtn.disabled = false;
  }, 250);
}

export function hideReportModal(): void {
  const overlay = document.getElementById('report-overlay');
  if (overlay) overlay.classList.add('hidden');
}

// ─── Navigation ───

export function setupNav(): void {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!hamburger || !sidebar) return;

  function openSidebar(): void {
    sidebar!.classList.remove('hidden');
    if (overlay) overlay.classList.remove('hidden');
  }
  function closeSidebar(): void {
    sidebar!.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
  }

  hamburger.addEventListener('click', openSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  document.querySelectorAll<HTMLElement>('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (!page) return;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const target = document.getElementById('page-' + page);
      if (target) target.classList.add('active');
      closeSidebar();
    });
  });
}

export function switchToPage(pageName: string): void {
  const navItem = document.querySelector<HTMLElement>(`.nav-item[data-page="${pageName}"]`);
  if (!navItem) return;
  navItem.click();
}

// ─── Script Analysis Renderer ───

import type { ScriptAnalysis } from './types.js';

export function renderScriptAnalysis(analysis: ScriptAnalysis): void {
  const summaryEl = document.getElementById('script-summary');
  const commandsEl = document.getElementById('script-commands');
  if (!summaryEl || !commandsEl) return;

  const riskLevel = analysis.risk_level;
  const riskIcon = riskLevel === 'danger' ? '☠️' : riskLevel === 'warning' ? '⚠️' : riskLevel === 'medium' ? '⚡' : '✅';
  const riskLabel = riskLevel === 'danger' ? 'Alto Risco' : riskLevel === 'warning' ? 'Cuidado' : riskLevel === 'medium' ? 'Médio' : 'Seguro';

  const scriptTypeEmoji = analysis.script_type === 'python' ? '🐍' : '📜';
  const scriptTypeLabel = analysis.script_type === 'python' ? 'Python' : 'Shell Script';

  // Build stats tags
  const statsTags = [
    `<span class="script-stat-tag neutral">${scriptTypeEmoji} ${scriptTypeLabel}</span>`,
    `<span class="script-stat-tag neutral">📄 ${analysis.command_count} comandos</span>`,
    `<span class="script-stat-tag neutral">📏 ${analysis.total_lines} linhas</span>`,
  ];
  if (analysis.has_sudo) {
    statsTags.push(`<span class="script-stat-tag medium">🔑 Requer sudo</span>`);
  }
  if (analysis.has_install) {
    statsTags.push(`<span class="script-stat-tag safe">📦 Instala pacotes</span>`);
  }
  if (analysis.has_download_execute) {
    statsTags.push(`<span class="script-stat-tag danger">🌐 Download + Execução</span>`);
  }
  if (analysis.has_dangerous) {
    statsTags.push(`<span class="script-stat-tag danger">☠️ Operações perigosas</span>`);
  }

  summaryEl.innerHTML = `
    <div class="script-summary">
      <div class="script-summary-header">
        <span class="script-summary-icon">${riskIcon}</span>
        <span class="script-summary-title">${riskLabel} — ${escapeHtml(analysis.summary)}</span>
      </div>
      <div class="script-summary-stats">
        ${statsTags.join('\n        ')}
      </div>
    </div>
  `;

  // Build commands list
  if (analysis.commands.length === 0) {
    commandsEl.innerHTML = '<div class="script-cmd-item" style="color:#888;padding:1rem">Nenhum comando identificado neste script.</div>';
    return;
  }

  commandsEl.innerHTML = analysis.commands.map(cmd => {
    const riskIcons: Record<string, string> = {
      safe: '✅', sudo: '🔑', install: '📦', download: '🌐', system: '⚙️', danger: '☠️'
    };
    const riskLabels: Record<string, string> = {
      safe: 'Seguro', sudo: 'Sudo', install: 'Instalar', download: 'Download', system: 'Sistema', danger: 'Perigo'
    };
    const icon = riskIcons[cmd.risk] || '❓';
    const label = riskLabels[cmd.risk] || cmd.risk;
    const content = escapeHtml(cmd.content);
    const description = escapeHtml(cmd.description);

    return `
      <div class="script-cmd-item">
        <span class="script-cmd-line">${cmd.line}</span>
        <div class="script-cmd-body">
          <div class="script-cmd-text">${content}</div>
          <div class="script-cmd-desc">${description}</div>
        </div>
        <span class="script-cmd-risk ${cmd.risk}">${icon} ${label}</span>
      </div>
    `;
  }).join('');
}

// ─── Update Banner → Modal ───

export function showUpdateBanner(info: AppUpdateInfo): void {
  const overlay = document.getElementById('update-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');

  const currentEl = document.getElementById('update-current-version');
  const latestEl = document.getElementById('update-latest-version');
  const changelogEl = document.getElementById('update-changelog');

  if (currentEl) currentEl.textContent = `v${info.current_version}`;
  if (latestEl) latestEl.textContent = `v${info.latest_version}`;
  if (changelogEl) changelogEl.textContent = info.release_notes || 'Nenhuma informação disponível.';

  document.getElementById('update-info-view')?.classList.remove('hidden');
  document.getElementById('update-progress-view')?.classList.add('hidden');
  document.getElementById('update-now-btn')?.classList.remove('hidden');
  document.getElementById('update-later-btn')?.classList.remove('hidden');
}

export function hideUpdateModal(): void {
  const overlay = document.getElementById('update-overlay');
  if (overlay) overlay.classList.add('hidden');
}

export function showUpdateProgress(stage: string, percent: number, message: string): void {
  const infoView = document.getElementById('update-info-view');
  const progressView = document.getElementById('update-progress-view');
  const statusEl = document.getElementById('update-progress-status');
  const fillEl = document.getElementById('update-progress-fill');
  const textEl = document.getElementById('update-progress-text');
  const nowBtn = document.getElementById('update-now-btn');
  const laterBtn = document.getElementById('update-later-btn');

  if (infoView) infoView.classList.add('hidden');
  if (progressView) progressView.classList.remove('hidden');
  if (nowBtn) nowBtn.classList.add('hidden');
  if (laterBtn) laterBtn.classList.add('hidden');

  if (statusEl) statusEl.textContent = message;
  if (fillEl) fillEl.style.width = percent + '%';
  if (textEl) textEl.textContent = percent + '%';
}

// ─── Info Modal ───



// ─── Home Stats ───



export async function loadHomeStats(): Promise<void> {
  try {
    const h = await systemService.getHomeStats();
    const packagesEl = document.getElementById('stat-packages');
    const updatesEl = document.getElementById('stat-updates');
    const updatesSub = document.getElementById('stat-updates-sub');
    const loadEl = document.getElementById('stat-load');
    const swapEl = document.getElementById('stat-swap');
    const swapSub = document.getElementById('stat-swap-sub');
    const servicesEl = document.getElementById('stat-services');

    if (packagesEl) packagesEl.textContent = h.packages_formatted;
    if (updatesEl) {
      if (h.updates_available > 0) {
        updatesEl.textContent = h.updates_formatted;
        updatesEl.style.color = '#e8c547';
        if (updatesSub) updatesSub.textContent = 'disponíveis';
      } else {
        updatesEl.textContent = '✓';
        updatesEl.style.color = '#4ae0a0';
        if (updatesSub) updatesSub.textContent = 'sistema atualizado';
      }
    }
    if (loadEl) loadEl.textContent = h.load_average;
    if (swapEl) {
      if (h.swap_percent > 0) {
        swapEl.textContent = `${h.swap_used} / ${h.swap_total}`;
        if (swapSub) swapSub.textContent = `${Math.round(h.swap_percent)}% usada`;
      } else {
        swapEl.textContent = '—';
        if (swapSub) swapSub.textContent = 'sem swap ativo';
      }
    }
    if (servicesEl) servicesEl.textContent = h.services_active;
  } catch (e) {
    console.error('loadHomeStats failed:', e);
  }
}

// ─── Poll Stats ───



export async function pollStats(): Promise<void> {
  try {
    const s = await systemService.getStats();
    setGauge('gauge-cpu', 'gauge-cpu-value', s.cpu_percent, `${Math.round(s.cpu_percent)}%`);
    setGauge('gauge-ram', 'gauge-ram-value', s.memory_percent, `${Math.round(s.memory_percent)}%`);
    setGauge('gauge-temp', 'gauge-temp-value', s.temperature, `${Math.round(s.temperature)}°`);
    setGauge('gauge-cpu-home', 'gauge-cpu-home-value', s.cpu_percent, `${Math.round(s.cpu_percent)}%`);
    setGauge('gauge-ram-home', 'gauge-ram-home-value', s.memory_percent, `${Math.round(s.memory_percent)}%`);
    setGauge('gauge-temp-home', 'gauge-temp-home-value', s.temperature, `${Math.round(s.temperature)}°`);
  } catch (e) {
    console.error('pollStats failed:', e);
  }
}
