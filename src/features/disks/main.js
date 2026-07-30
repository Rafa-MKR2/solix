import { escapeHtml, showToast } from '../../shared/utils/index.js';
import { diskService } from '../../shared/services/index.js';
import { handleShowSmartInfo } from './smart.js';
import { showBackupModal } from './backup.js';
function getBarColor(pct) {
    if (pct < 50)
        return 'green';
    if (pct < 75)
        return 'yellow';
    if (pct < 90)
        return 'orange';
    return 'red';
}
export async function handleOpenFileManager(mountPoint) {
    try {
        await diskService.openFileManager(mountPoint);
    }
    catch (e) {
        console.error('open_file_manager failed:', e);
        showToast('error', 'Erro ao abrir gerenciador de arquivos.');
    }
}
export async function handleAnalyzeDisk(mountPoint) {
    const modal = document.getElementById('disk-analysis-overlay');
    const list = document.getElementById('disk-analysis-list');
    const title = document.getElementById('disk-analysis-title');
    if (!modal || !list)
        return;
    if (title)
        title.textContent = `🔍 Analisando ${mountPoint}...`;
    list.innerHTML = '<div class="disk-analysis-loading">⏳ Escaneando pastas...</div>';
    modal.classList.remove('hidden');
    try {
        const items = await diskService.analyzeUsage(mountPoint);
        if (title)
            title.textContent = `📂 ${mountPoint} — Pastas mais pesadas`;
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
    }
    catch (e) {
        console.error('analyze_disk_usage failed:', e);
        list.innerHTML = '<div class="hint" style="color:#e88">❌ Erro ao analisar disco.</div>';
    }
}
export async function handleShowPartitions(device) {
    const modal = document.getElementById('disk-analysis-overlay');
    const list = document.getElementById('disk-analysis-list');
    const title = document.getElementById('disk-analysis-title');
    if (!modal || !list)
        return;
    if (title)
        title.textContent = `📋 Partições de ${device}`;
    list.innerHTML = '<div class="disk-analysis-loading">⏳ Carregando...</div>';
    modal.classList.remove('hidden');
    try {
        const output = await diskService.getPartitionTable(device);
        list.innerHTML = `<pre class="disk-partitions-output">${escapeHtml(output)}</pre>`;
    }
    catch (e) {
        console.error('get_partition_table failed:', e);
        list.innerHTML = `<div class="hint" style="color:#e88">❌ ${e}</div>`;
    }
}
function parseSizeGB(sizeStr) {
    const s = sizeStr.trim();
    if (s.includes('TB') || s.includes('TiB'))
        return parseFloat(s) * 1024;
    if (s.includes('GB') || s.includes('GiB'))
        return parseFloat(s);
    if (s.includes('MB') || s.includes('MiB'))
        return parseFloat(s) / 1024;
    if (s.includes('KB') || s.includes('KiB'))
        return parseFloat(s) / (1024 * 1024);
    return 0;
}
function formatSizeGB(gb) {
    if (gb >= 1024)
        return (gb / 1024).toFixed(1) + ' TB';
    return gb.toFixed(0) + ' GB';
}
export function renderDisks(disks) {
    const container = document.getElementById('disks-list');
    if (!container)
        return;
    container.innerHTML = '';
    if (!disks || disks.length === 0) {
        container.innerHTML = '<div class="hint">Nenhum disco detectado.</div>';
        return;
    }
    let totalGB = 0, usedGB = 0;
    for (const d of disks) {
        totalGB += parseSizeGB(d.total);
        usedGB += parseSizeGB(d.used);
    }
    const pct = totalGB > 0 ? Math.round((usedGB / totalGB) * 100) : 0;
    document.getElementById('disk-count').textContent = disks.length.toString();
    document.getElementById('disk-total-space').textContent = formatSizeGB(totalGB);
    document.getElementById('disk-used-space').textContent = formatSizeGB(usedGB);
    document.getElementById('disk-pct-used').textContent = `${pct}%`;
    const table = document.createElement('table');
    table.className = 'disk-table';
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
    const tbody = table.querySelector('tbody');
    for (const d of disks) {
        const deviceName = d.filesystem.split('/').pop();
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
        row.querySelector('.dtd-btn-open').addEventListener('click', () => handleOpenFileManager(d.mount_point));
        row.querySelector('.dtd-btn-analyze').addEventListener('click', () => handleAnalyzeDisk(d.mount_point));
        row.querySelector('.dtd-btn-health').addEventListener('click', () => handleShowSmartInfo(deviceName));
        row.querySelector('.dtd-btn-backup').addEventListener('click', () => showBackupModal(d.mount_point));
        row.querySelector('.dtd-btn-partitions').addEventListener('click', () => handleShowPartitions(d.filesystem));
    }
    container.appendChild(table);
}
document.getElementById('disk-analysis-close')?.addEventListener('click', () => {
    document.getElementById('disk-analysis-overlay')?.classList.add('hidden');
});
document.getElementById('disk-analysis-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        e.currentTarget.classList.add('hidden');
    }
});
