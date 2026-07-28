// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2

let toolStatuses = [];
let selectedTools = new Set();
let removedTools = new Set();
let pendingAction = null;
let cachedPassword = '';
let systemDistro = '';

function getInvoke() {
  return window.__TAURI_INTERNALS__?.invoke || null;
}

const CIRCUMFERENCE = 2 * Math.PI * 50;

function setGauge(id, valueId, percent, label) {
  const circle = document.getElementById(id);
  const value = document.getElementById(valueId);
  if (!circle || !value) return;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  circle.style.strokeDasharray = `${CIRCUMFERENCE}`;
  circle.style.strokeDashoffset = `${offset}`;
  const hue = clamped > 80 ? 0 : clamped > 50 ? 30 : 160;
  circle.style.stroke = `hsl(${hue}, 80%, 50%)`;
  value.textContent = label;
}

// Sidebar navigation
function setupNav() {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!hamburger || !sidebar) return;

  function openSidebar() {
    sidebar.classList.remove('hidden');
    if (overlay) overlay.classList.remove('hidden');
  }
  function closeSidebar() {
    sidebar.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
  }

  hamburger.addEventListener('click', openSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  document.querySelectorAll('.nav-item').forEach(item => {
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

async function pollStats() {
  const invoke = getInvoke();
  if (!invoke) return;
  try {
    const s = await invoke('get_system_stats');
    setGauge('gauge-cpu', 'gauge-cpu-value', s.cpu_percent, `${Math.round(s.cpu_percent)}%`);
    setGauge('gauge-ram', 'gauge-ram-value', s.memory_percent, `${Math.round(s.memory_percent)}%`);
    setGauge('gauge-temp', 'gauge-temp-value', s.temperature, `${Math.round(s.temperature)}°`);
    setGauge('gauge-cpu-home', 'gauge-cpu-home-value', s.cpu_percent, `${Math.round(s.cpu_percent)}%`);
    setGauge('gauge-ram-home', 'gauge-ram-home-value', s.memory_percent, `${Math.round(s.memory_percent)}%`);
    setGauge('gauge-temp-home', 'gauge-temp-home-value', s.temperature, `${Math.round(s.temperature)}°`);
  } catch (_) {}
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || '—';
}

async function loadSystemInfo() {
  const invoke = getInvoke();
  if (!invoke) return;
  try {
    const info = await invoke('get_system_info');
    if (info.distribution) {
      setText('distro-name', info.distribution.name);
      setText('distro-version', info.distribution.version);
      setText('distro-family', info.distribution.family);
      setText('distro-pm', info.distribution.package_manager);
      systemDistro = info.distribution.package_manager;
      const pmBadge = document.getElementById('pm-badge');
      if (pmBadge) pmBadge.textContent = `📦 ${info.distribution.package_manager}`;
    }
    if (info.hardware) {
      setText('hw-cpu', info.hardware.cpu);
      setText('hw-cores', info.hardware.cores);
      setText('hw-mem', info.hardware.memory_total);
      setText('hw-mem-used', info.hardware.memory_used);
      setText('hw-gpu', info.hardware.gpu);
      setText('hw-kernel', info.hardware.kernel);
      setText('hw-uptime', info.hardware.uptime);
      renderDisks(info.hardware.disks);
    }
    if (info.user) {
      const u = info.user;
      document.getElementById('user-card').classList.remove('hidden');
      setText('user-name', u.full_name);
      setText('user-username', '@' + u.username);
      setText('user-shell', u.shell);
      if (u.is_admin) {
        document.getElementById('user-admin-badge').style.display = 'inline';
      }
      if (u.avatar_base64) {
        const container = document.getElementById('user-avatar');
        container.innerHTML = `<img src="${u.avatar_base64}" alt="${u.username}" />`;
      } else {
        const initial = (u.full_name || u.username).charAt(0).toUpperCase();
        document.getElementById('avatar-placeholder').textContent = initial;
      }
    }
    toolStatuses = info.tools || [];
    renderTools(toolStatuses);
  } catch (err) {
    console.error(err);
  }
}

function renderDisks(disks) {
  const container = document.getElementById('disks-list');
  if (!container) return;
  container.innerHTML = '';
  if (!disks || disks.length === 0) {
    container.innerHTML = '<div class="hint">Nenhum disco detectado.</div>';
    return;
  }
  for (const d of disks) {
    const card = document.createElement('div');
    card.className = 'disk-card';
    card.innerHTML = `
      <div class="disk-header">
        <span class="disk-name">${d.name}</span>
        <span class="disk-size">${d.total} · ${d.mount_point}</span>
      </div>
      <div class="disk-bar-bg"><div class="disk-bar-fill ${getBarColor(d.percent_used)}" style="width:${Math.min(d.percent_used, 100)}%"></div></div>
      <div class="disk-details"><span>${d.available} livres</span><span>${Math.round(d.percent_used)}% usado</span></div>
    `;
    container.appendChild(card);
  }
}

function getBarColor(pct) {
  if (pct < 50) return 'green';
  if (pct < 75) return 'yellow';
  if (pct < 90) return 'orange';
  return 'red';
}

const categoryLabels = {
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

function renderTools(tools) {
  const container = document.getElementById('tools-list');
  if (!container) return;
  container.innerHTML = '';

  const query = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  const filtered = query
    ? tools.filter(t => t.name.toLowerCase().includes(query) || (t.description || '').toLowerCase().includes(query))
    : tools;

  if (filtered.length === 0 && query) {
    container.innerHTML = '<div class="empty-search">🔍 Nenhuma ferramenta encontrada para "<strong>' + query + '</strong>"</div>';
    return;
  }

  const grouped = {};
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
        if (e.target.classList.contains('tool-info-btn')) return;
        if (tool.available) {
          toggleRemove(tool.name, card);
        } else {
          toggleInstall(tool.name, card);
        }
      });
      container.appendChild(card);
    }
  }
}

function toggleCategorySelect(cat, items) {
  const allSelected = items.every(t => selectedTools.has(t.name));
  for (const tool of items) {
    const card = document.querySelector(`.tool-card[data-name="${tool.name}"]`);
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

function toggleInstall(name, card) {
  if (selectedTools.has(name)) {
    selectedTools.delete(name);
    card.classList.remove('selected');
  } else {
    selectedTools.add(name);
    card.classList.add('selected');
  }
  updateButtons();
}

function toggleRemove(name, card) {
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

function updateButtons() {
  const installBtn = document.getElementById('install-btn');
  const removeBtn = document.getElementById('remove-btn');
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

let isOperating = false;

async function confirmPassword() {
  const input = document.getElementById('password-input');
  const error = document.getElementById('password-error');
  const password = input?.value || '';
  if (!password) return;
  const invoke = getInvoke();
  if (!invoke) return;
  try {
    const result = await invoke('install_tools', { toolNames: ['__verify__'], password });
    if (result && result[0] && result[0].failed) {
      if (error) error.classList.remove('hidden');
      return;
    }
  } catch (e) {
    const msg = (e + '').toLowerCase();
    if (msg.includes('senha') || msg.includes('password') || msg.includes('incorrect') || msg.includes('tentativa')) {
      if (error) error.classList.remove('hidden');
      return;
    }
  }
  cachedPassword = password;
  document.getElementById('password-overlay').classList.add('hidden');
  if (error) error.classList.add('hidden');
  if (input) input.value = '';
  executePending();
}

async function executePending() {
  const invoke = getInvoke();
  if (!invoke || !pendingAction || isOperating) return;
  isOperating = true;
  const outputLog = document.getElementById('output-log');
  const outputSection = document.getElementById('output-section');
  const cancelBtn = document.getElementById('cancel-btn');
  if (outputLog) outputLog.textContent = '';
  if (outputSection) outputSection.classList.remove('hidden');
  if (outputSection) outputSection.classList.remove('closed');
  if (cancelBtn) cancelBtn.classList.remove('hidden');
  const isUpdate = pendingAction.type === 'update';
  const isZram = pendingAction.type === 'zram';
  const isCleanup = pendingAction.type === 'cleanup';
  const isInstall = pendingAction.type === 'install';
  const isRemove = pendingAction.type === 'remove';
  try {
    let result;
    if (isUpdate) {
      result = await invoke('update_system', { password: cachedPassword });
    } else if (isZram) {
      result = await invoke('enable_zram', { password: cachedPassword });
    } else if (isCleanup) {
      result = await invoke('cleanup_system', { password: cachedPassword });
    } else if (isInstall) {
      result = await invoke('install_tools', { toolNames: pendingAction.tools, password: cachedPassword });
    } else if (isRemove) {
      result = await invoke('remove_tools', { toolNames: pendingAction.tools, password: cachedPassword });
    }
    if (outputLog) {
      if (Array.isArray(result)) {
        outputLog.textContent = result.map(r => {
          const name = r.tool_name || r.name || 'desconhecido';
          if (!r.success) {
            let err = r.error || '';
            if (err.includes('db.lck') || err.includes('não foi possível travar')) {
              err = 'Outro gerenciador de pacotes está em execução (Pamac, Discover, terminal). Feche-o e tente novamente.';
            } else if (err.includes('não foi possível')) {
              err = 'Erro ao acessar o gerenciador de pacotes. Tente novamente.';
            }
            return `${name}: falhou — ${err}`;
          }
          return `${name}: ok`;
        }).join('\n');
      } else if (result) {
        outputLog.textContent = result.output || result.message || JSON.stringify(result, null, 2);
      }
    }
    if (result) {
      const failed = Array.isArray(result) ? result.filter(r => !r.success) : [];
      if (failed.length === 0) {
        showToast('success', isUpdate ? 'Sistema atualizado!' : isZram ? 'ZRAM ativado!' : isCleanup ? 'Limpeza concluída!' : 'Operação concluída!');
      } else {
        showToast('error', `Falha em ${failed.length} item(ns)`);
      }
    }
    if (!isUpdate && !isZram && !isCleanup) {
      selectedTools.clear();
      removedTools.clear();
      await loadSystemInfo();
      const removeBtn = document.getElementById('remove-btn');
      if (removeBtn) removeBtn.style.display = 'none';
    }
  } catch (err) {
    const msg = (err + '').toLowerCase();
    let friendly = 'Erro na operação.';
    if (msg.includes('db.lck') || msg.includes('não foi possível travar')) {
      friendly = 'Outro gerenciador de pacotes está em execução. Feche o Pamac/Discover/terminal e tente novamente.';
    } else if (msg.includes('password') || msg.includes('senha')) {
      friendly = 'Senha incorreta. Tente novamente.';
    }
    if (outputLog) outputLog.textContent = friendly;
    showToast('error', friendly);
  } finally {
    isOperating = false;
    pendingAction = null;
    if (cancelBtn) cancelBtn.classList.add('hidden');
  }
}

function cancelPassword() {
  document.getElementById('password-overlay').classList.add('hidden');
  document.getElementById('password-error').classList.add('hidden');
  pendingAction = null;
  const input = document.getElementById('password-input');
  if (input) input.value = '';
}

async function showPasswordModal(action) {
  pendingAction = action;
  if (cachedPassword) {
    const invoke = getInvoke();
    if (invoke) {
      try {
        await invoke('install_tools', { toolNames: ['__verify__'], password: cachedPassword });
        executePending();
        return;
      } catch (_) {
        cachedPassword = '';
      }
    }
  }
  document.getElementById('password-overlay').classList.remove('hidden');
  const input = document.getElementById('password-input');
  if (input) {
    input.value = '';
    input.focus();
  }
}

function showToast(type, message) {
  const toast = document.getElementById('completion-toast');
  const msg = document.getElementById('toast-message');
  if (!toast) return;
  const icon = toast.querySelector('.toast-icon');
  const title = toast.querySelector('.toast-title');
  if (icon) icon.textContent = type === 'error' ? '❌' : '✅';
  if (title) title.textContent = type === 'error' ? 'Falhou!' : 'Concluído!';
  if (msg) msg.textContent = message;
  if (type === 'error') {
    toast.style.borderColor = '#e84a4a';
    toast.style.background = '#221111';
  } else {
    toast.style.borderColor = '#00d4aa';
    toast.style.background = '#112220';
  }
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

async function loadConnectivity() {
  const invoke = getInvoke();
  if (!invoke) return;
  try {
    const c = await invoke('get_connectivity');
    const internet = document.getElementById('net-internet');
    const internetIcon = document.getElementById('net-internet-icon');
    const bluetooth = document.getElementById('net-bluetooth');
    const bluetoothIcon = document.getElementById('net-bluetooth-icon');
    const wifi = document.getElementById('net-wifi');
    const wifiIcon = document.getElementById('net-wifi-icon');
    if (internet) {
      internet.textContent = c.internet ? 'Conectado ✓' : 'Desconectado ✗';
      internet.style.color = c.internet ? '#4ae0a0' : '#e88';
    }
    if (internetIcon) internetIcon.textContent = c.internet ? '🌐' : '🚫';
    if (bluetooth) {
      bluetooth.textContent = c.bluetooth || 'N/A';
    }
    if (bluetoothIcon) bluetoothIcon.textContent = c.bluetooth === 'Ativo' ? '🔵' : '⚫';
    if (wifi) {
      const bars = ['⬜', '🟢', '🟢🟢', '🟢🟢🟢'];
      wifi.textContent = c.wifi_ssid ? `${c.wifi_ssid} ${bars[c.wifi_signal > 75 ? 3 : c.wifi_signal > 50 ? 2 : c.wifi_signal > 25 ? 1 : 0] || ''}` : 'N/A';
    }
    if (wifiIcon) wifiIcon.textContent = c.wifi_ssid ? '📶' : '📵';
    const bat = document.getElementById('net-battery');
    const batIcon = document.getElementById('net-battery-icon');
    if (bat && c.battery) {
      bat.textContent = c.battery.charging ? `🔌 ${c.battery.percent}%` : `${c.battery.percent}% (${c.battery.time || 'N/A'})`;
    } else if (bat) {
      const invite = await invoke('get_battery');
      if (bat) bat.textContent = invite.percent > 0 ? (invite.charging ? `🔌 ${invite.percent}% (${invite.time || 'N/A'})` : `${invite.percent}% (${invite.time || 'N/A'})`) : 'Sem bateria';
      if (batIcon) batIcon.textContent = invite.percent > 0 ? (invite.charging ? '🔌' : '🔋') : '🔌';
    }
  } catch (_) {}
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  loadSystemInfo();

  document.getElementById('password-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmPassword();
  });
  document.getElementById('password-confirm').addEventListener('click', confirmPassword);
  document.getElementById('password-cancel').addEventListener('click', cancelPassword);

  document.getElementById('confirm-btn-yes')?.addEventListener('click', () => {
    document.getElementById('confirm-overlay').classList.add('hidden');
    showPasswordModal({ type: 'update' });
  });
  document.getElementById('confirm-btn-no')?.addEventListener('click', () => {
    document.getElementById('confirm-overlay').classList.add('hidden');
  });

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (toolStatuses.length) renderTools(toolStatuses);
    });
  }

  document.getElementById('install-btn')?.addEventListener('click', () => {
    if (selectedTools.size === 0) return;
    const tools = Array.from(selectedTools);
    showPasswordModal({ type: 'install', tools });
  });
  document.getElementById('remove-btn')?.addEventListener('click', () => {
    if (removedTools.size === 0) return;
    const tools = Array.from(removedTools);
    showPasswordModal({ type: 'remove', tools });
  });
  document.getElementById('update-btn')?.addEventListener('click', () => {
    document.getElementById('confirm-overlay').classList.remove('hidden');
  });
  document.getElementById('zram-btn')?.addEventListener('click', () => {
    showPasswordModal({ type: 'zram' });
  });
  document.getElementById('cleanup-btn')?.addEventListener('click', () => {
    showPasswordModal({ type: 'cleanup' });
  });
  document.getElementById('cancel-btn')?.addEventListener('click', async () => {
    const invoke = getInvoke();
    if (invoke) {
      try { await invoke('cancel_operation'); } catch (_) {}
    }
  });

  // Info modal
  document.getElementById('tools-list')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.tool-info-btn');
    if (!btn) return;
    const toolName = btn.dataset.tool;
    const invoke = getInvoke();
    if (!invoke) return;
    try {
      const info = await invoke('get_package_info', { toolName });
      document.getElementById('info-name').textContent = toolName;
      document.getElementById('info-package').textContent = info.package_name || toolName;
      document.getElementById('info-desc').textContent = info.description || 'N/A';
      document.getElementById('info-version').textContent = info.version || 'N/A';
      document.getElementById('info-size').textContent = info.size || 'N/A';
      document.getElementById('info-status').textContent = info.installed ? 'Instalado ✓' : 'Ausente ✗';
      const icon = document.getElementById('info-icon');
      if (icon && info.icon_base64) {
        icon.src = info.icon_base64;
        icon.style.display = 'inline-block';
      }
      document.getElementById('info-overlay').classList.remove('hidden');
    } catch (_) {}
  });
  document.getElementById('info-close')?.addEventListener('click', () => {
    document.getElementById('info-overlay').classList.add('hidden');
  });
  document.getElementById('info-close-btn')?.addEventListener('click', () => {
    document.getElementById('info-overlay').classList.add('hidden');
  });

  // Output section collapse
  document.querySelector('#output-section .section-header')?.addEventListener('click', () => {
    const target = document.getElementById('output-log');
    const arrow = document.querySelector('#output-section .collapse-arrow');
    if (!target) return;
    const isOpen = !target.classList.contains('closed');
    target.classList.toggle('closed', isOpen);
    if (arrow) arrow.classList.toggle('collapsed', isOpen);
  });

  loadConnectivity();
  setInterval(pollStats, 3000);
  setInterval(loadConnectivity, 10000);
});
