// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2

let toolStatuses = [];
let selectedTools = new Set();
let removedTools = new Set();
let pendingAction = null;
let lastPendingAction = null;
let cachedPassword = '';
let systemDistro = '';
let processList = [];
let processSortField = 'cpu_percent';
let processSortAsc = false;

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
  } catch (e) {
    console.error('pollStats failed:', e);
  }
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
    console.error('loadSystemInfo failed:', err);
    showToast('error', 'Erro ao carregar informações do sistema.');
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

    // Extrai nome amigável do dispositivo (ex: /dev/sda1 → sda1)
    const deviceName = d.filesystem.split('/').pop();
    // Ícone conforme o tipo
    const typeIcon = d.fstype === 'ntfs' ? '🪟' : d.fstype === 'vfat' ? '💾' : d.fstype === 'btrfs' ? '🌳' : '💽';

    card.innerHTML = `
      <div class="disk-card-top">
        <div class="disk-card-info">
          <div class="disk-device-row">
            <span class="disk-device-icon">${typeIcon}</span>
            <span class="disk-device-name">${deviceName || d.filesystem}</span>
          </div>
          <div class="disk-meta">
            <span class="disk-fstype">${d.fstype}</span>
            <span class="disk-mount">${d.mount_point}</span>
          </div>
        </div>
        <div class="disk-capacity">
          <span class="disk-total">${d.total}</span>
          <span class="disk-percent">${Math.round(d.percent_used)}%</span>
        </div>
      </div>
      <div class="disk-bar-bg"><div class="disk-bar-fill ${getBarColor(d.percent_used)}" style="width:${Math.min(d.percent_used, 100)}%"></div></div>
      <div class="disk-details">
        <span class="disk-used">📝 ${d.used} usados</span>
        <span class="disk-free">📦 ${d.available} livres</span>
      </div>
      <div class="disk-actions">
        <button class="disk-btn disk-btn-open" data-mount="${d.mount_point}">📂 Abrir <span class="help-tip" data-help="disco-abrir">ⓘ</span></button>
        <button class="disk-btn disk-btn-analyze" data-mount="${d.mount_point}">🔍 Analisar <span class="help-tip" data-help="disco-analisar">ⓘ</span></button>
        <button class="disk-btn disk-btn-partitions" data-device="${d.filesystem}">📋 Partições <span class="help-tip" data-help="disco-particoes">ⓘ</span></button>
      </div>
    `;
    container.appendChild(card);

    // Eventos dos botoes
    card.querySelector('.disk-btn-open').addEventListener('click', () => {
      handleOpenFileManager(d.mount_point);
    });
    card.querySelector('.disk-btn-analyze').addEventListener('click', () => {
      handleAnalyzeDisk(d.mount_point);
    });
    card.querySelector('.disk-btn-partitions').addEventListener('click', () => {
      handleShowPartitions(d.filesystem);
    });

    // Ativar tooltips nos botoes de disco (criados dinamicamente)
    card.querySelectorAll('.help-tip').forEach(el => {
      const key = el.dataset.help;
      const text = helpTexts[key];
      if (!text) return;
      let hideTimer = null;
      let isVisible = false;
      el.addEventListener('mouseenter', () => {
        if (hideTimer) clearTimeout(hideTimer);
        showHelpTooltip(text, el);
        isVisible = true;
      });
      el.addEventListener('mouseleave', () => {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => { hideHelpTooltip(); isVisible = false; }, 200);
      });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isVisible) { hideHelpTooltip(); isVisible = false; }
        else { showHelpTooltip(text, el); isVisible = true; }
      });
    });
  }
}

// ─── Disk Actions ───

async function handleOpenFileManager(mountPoint) {
  const invoke = getInvoke();
  if (!invoke) return;
  try {
    await invoke('open_file_manager', { path: mountPoint });
  } catch (e) {
    console.error('open_file_manager failed:', e);
    showToast('error', 'Erro ao abrir gerenciador de arquivos.');
  }
}

async function handleAnalyzeDisk(mountPoint) {
  const invoke = getInvoke();
  if (!invoke) return;
  const modal = document.getElementById('disk-analysis-overlay');
  const list = document.getElementById('disk-analysis-list');
  const title = document.getElementById('disk-analysis-title');
  if (!modal || !list) return;
  if (title) title.textContent = `🔍 Analisando ${mountPoint}...`;
  list.innerHTML = '<div class="disk-analysis-loading">⏳ Escaneando pastas...</div>';
  modal.classList.remove('hidden');
  try {
    const items = await invoke('analyze_disk_usage', { mountPoint });
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

async function handleShowPartitions(device) {
  const invoke = getInvoke();
  if (!invoke) return;
  const modal = document.getElementById('disk-analysis-overlay');
  const list = document.getElementById('disk-analysis-list');
  const title = document.getElementById('disk-analysis-title');
  if (!modal || !list) return;
  if (title) title.textContent = `📋 Partições de ${device}`;
  list.innerHTML = '<div class="disk-analysis-loading">⏳ Carregando...</div>';
  modal.classList.remove('hidden');
  try {
    const output = await invoke('get_partition_table', { device });
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
    e.currentTarget.classList.add('hidden');
  }
});

// ─── ───

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
    if (result && result[0] && !result[0].success) {
      if (error) error.classList.remove('hidden');
      return;
    }
  } catch (e) {
    const msg = (e + '').toLowerCase();
    if (msg.includes('senha') || msg.includes('password') || msg.includes('incorrect') || msg.includes('tentativa')) {
      if (error) error.classList.remove('hidden');
      return;
    }
    console.error('confirmPassword error:', e);
    showToast('error', 'Erro ao verificar senha. Tente novamente.');
    return;
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
  switchToPage('sistema');
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
  const isInstallPkg = pendingAction.type === 'install-package';
  const isAppUpdate = pendingAction.type === 'app-update';
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
    } else if (isInstallPkg) {
      if (outputLog) outputLog.textContent = '🔐 Instalando pacote...\n';
      result = await invoke('install_package_data', {
        data: pendingPkgData,
        fileName: pendingPkgFileName,
        password: cachedPassword,
      });
    }
    if (outputLog) {
      if (Array.isArray(result)) {
        const hasLockError = result.some(r => !r.success && (
          r.error?.includes('db.lck') || r.error?.includes('não foi possível travar') ||
          r.error?.includes('não foi possível')
        ));
        outputLog.textContent = result.map(r => {
          const name = r.tool_name || 'desconhecido';
          if (r.cancelled) return `${name}: cancelado`;
          if (!r.success) {
            let err = r.error || '';
            if (hasLockError) {
              err = 'Outro gerenciador de pacotes está em execução (Pamac, Discover, terminal). Feche-o e tente novamente.';
            } else if (err.includes('não foi possível')) {
              err = 'Erro ao acessar o gerenciador de pacotes. Tente novamente.';
            }
            return `${name}: falhou — ${err}`;
          }
          return `${name}: ok`;
        }).join('\n');

        if (hasLockError) {
          showLockDiagnosis();
          return;
        }
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
      if (!isInstallPkg) {
        selectedTools.clear();
        removedTools.clear();
        await loadSystemInfo();
        const removeBtn = document.getElementById('remove-btn');
        if (removeBtn) removeBtn.style.display = 'none';
      }
    }
    // Oculta diagnóstico de lock se a operação deu certo
    document.getElementById('lock-diagnosis')?.classList.add('hidden');
  } catch (err) {
    const msg = (err + '').toLowerCase();
    let friendly = 'Erro na operação.';
    if (msg.includes('db.lck') || msg.includes('não foi possível travar')) {
      friendly = 'Outro gerenciador de pacotes está em execução. Feche o Pamac/Discover/terminal e tente novamente.';
      showLockDiagnosis();
    } else if (msg.includes('password') || msg.includes('senha')) {
      friendly = 'Senha incorreta. Tente novamente.';
    }
    if (outputLog) outputLog.textContent = friendly;
    showToast('error', friendly);
  } finally {
    isOperating = false;
    lastPendingAction = pendingAction;
    pendingAction = null;
    if (cancelBtn) cancelBtn.classList.add('hidden');
    // Reset do botao de instalacao de pacote
    if (isInstallPkg) {
      const pkgBtn = document.getElementById('pkg-install-btn');
      if (pkgBtn) {
        pkgBtn.disabled = false;
        pkgBtn.textContent = '⬇️ Instalar Pacote';
      }
      pendingPkgData = null;
      pendingPkgFileName = null;
    }
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
      } catch (e) {
        console.error('cached password verification failed:', e);
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

function switchToPage(pageName) {
  const navItem = document.querySelector(`.nav-item[data-page="${pageName}"]`);
  if (!navItem) return;
  navItem.click();
}

async function showLockDiagnosis() {
  switchToPage('sistema');
  const diagnosis = document.getElementById('lock-diagnosis');
  if (!diagnosis) return;
  diagnosis.classList.remove('hidden');
  const infoEl = document.getElementById('lock-info');
  const spinnerEl = document.getElementById('lock-spinner');
  if (spinnerEl) spinnerEl.classList.remove('hidden');
  if (infoEl) infoEl.textContent = '🔍 Detectando...';

  const invoke = getInvoke();
  if (!invoke) return;

  try {
    const lockInfo = await invoke('check_pm_lock');
    if (spinnerEl) spinnerEl.classList.add('hidden');
    if (infoEl) {
      if (lockInfo.locked) {
        infoEl.textContent = lockInfo.message;
      } else {
        infoEl.innerHTML = '🔒 O lock foi liberado! <button class="lock-retry-btn" id="lock-freed-retry-btn">🔄 Tentar Novamente</button>';
        document.getElementById('lock-freed-retry-btn')?.addEventListener('click', retryLastOperation);
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

function setupLockActions() {
  document.querySelectorAll('.lock-action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const invoke = getInvoke();
      switch (action) {
        case 'pamac':
          showToast('info', 'Feche o Pamac manualmente ou execute: pkill pamac');
          try { await invoke('run_simple_command', { command: 'pkill -f pamac 2>/dev/null; pkill -f pamac-manager 2>/dev/null; echo done' }); } catch (e) {}
          break;
        case 'discover':
          showToast('info', 'Feche o Discover manualmente ou execute: pkill discover');
          try { await invoke('run_simple_command', { command: 'pkill -f discover 2>/dev/null; echo done' }); } catch (e) {}
          break;
        case 'terminals':
          showToast('info', 'Feche terminais rodando pacman/apt/dnf');
          break;
        case 'restart-pm': {
          const pm = document.getElementById('distro-pm')?.textContent?.trim().toLowerCase() || 'pacman';
          try {
            const result = await invoke('run_simple_command', { command: `sudo systemctl restart ${pm} 2>/dev/null; echo done` });
            showToast('info', `Comando executado: sudo systemctl restart ${pm}`);
          } catch (e) {
            showToast('error', 'Não foi possível reiniciar o gerenciador');
          }
          break;
        }
        case 'kill-lock': {
          if (!confirm('Remover o arquivo de trava manualmente pode corromper o banco de dados do gerenciador. Tem certeza?')) return;
          try {
            await invoke('run_simple_command', { command: 'sudo rm -f /var/lib/pacman/db.lck /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock 2>/dev/null; echo done' });
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

function retryLastOperation() {
  const action = pendingAction || lastPendingAction;
  if (!action && !cachedPassword) return;
  document.getElementById('lock-diagnosis')?.classList.add('hidden');
  if (action) {
    // Reexecuta a última ação (guardada antes de ser limpa no finally)
    showPasswordModal(action);
  } else if (cachedPassword) {
    // Senha em cache mas ação perdida — informa o usuário
    showToast('error', 'Selecione a operação novamente.');
  }
}

async function loadConnectivity() {
  const invoke = getInvoke();
  if (!invoke) return;
  try {
    const c = await invoke('get_connectivity');
    const internet = document.getElementById('net-internet');
    const internetIcon = document.getElementById('net-internet-icon');
    const pingEl = document.getElementById('net-ping');
    const ethernet = document.getElementById('net-ethernet');
    const ethernetIcon = document.getElementById('net-ethernet-icon');
    const ipEl = document.getElementById('net-ip');
    const bluetooth = document.getElementById('net-bluetooth');
    const bluetoothIcon = document.getElementById('net-bluetooth-icon');
    const wifi = document.getElementById('net-wifi');
    const wifiIcon = document.getElementById('net-wifi-icon');
    const wifiSignal = document.getElementById('net-wifi-signal');
    if (internet) {
      internet.textContent = c.internet ? 'Conectado ✓' : 'Desconectado ✗';
      internet.style.color = c.internet ? '#4ae0a0' : '#e88';
    }
    if (internetIcon) internetIcon.textContent = c.internet ? '🌐' : '🚫';
    if (pingEl) {
      pingEl.textContent = c.ping_latency_ms > 0 ? `${c.ping_latency_ms.toFixed(1)} ms` : '';
      pingEl.style.color = c.ping_latency_ms > 0 && c.ping_latency_ms < 100 ? '#4ae0a0' : c.ping_latency_ms >= 100 ? '#e8a040' : '';
    }
    if (ethernet) {
      ethernet.textContent = c.ethernet ? 'Conectado ✓' : 'Desconectado ✗';
      ethernet.style.color = c.ethernet ? '#4ae0a0' : '#666';
    }
    if (ethernetIcon) ethernetIcon.textContent = c.ethernet ? '🔌' : '🔌';
    if (ipEl) ipEl.textContent = c.ip_address || '';
    if (bluetooth) {
      bluetooth.textContent = c.bluetooth ? 'Ativo ✓' : 'Inativo ✗';
      bluetooth.style.color = c.bluetooth ? '#4ae0a0' : '#666';
    }
    if (bluetoothIcon) bluetoothIcon.textContent = c.bluetooth ? '🔵' : '⚫';
    if (wifi) {
      if (c.wifi_ssid) {
        wifi.textContent = c.wifi_ssid;
        wifi.style.color = '#4ae0a0';
      } else if (c.wifi_present) {
        wifi.textContent = 'Desconectado';
        wifi.style.color = '#e8a040';
      } else {
        wifi.textContent = 'N/A';
        wifi.style.color = '#666';
      }
    }
    if (wifiIcon) wifiIcon.textContent = c.wifi_ssid ? '📶' : c.wifi_present ? '📡' : '📵';
    if (wifiSignal) {
      if (c.wifi_ssid && c.wifi_signal > 0) {
        wifiSignal.textContent = `${c.wifi_signal}%`;
        wifiSignal.style.color = c.wifi_signal > 60 ? '#4ae0a0' : c.wifi_signal > 30 ? '#e8a040' : '#e88';
      } else if (c.wifi_ssid) {
        wifiSignal.textContent = 'conectado';
        wifiSignal.style.color = '#4ae0a0';
      } else {
        wifiSignal.textContent = '';
      }
    }
    const bat = document.getElementById('net-battery');
    const batIcon = document.getElementById('net-battery-icon');
    if (bat) {
      const invite = await invoke('get_battery');
      if (invite.present && invite.percentage > 0) {
        const charging = invite.status === 'Charging';
        bat.textContent = charging ? `🔌 ${invite.percentage}% (${invite.time_remaining || 'N/A'})` : `${invite.percentage}% (${invite.time_remaining || 'N/A'})`;
        bat.style.color = '#4ae0a0';
        if (batIcon) batIcon.textContent = charging ? '🔌' : '🔋';
      } else {
        bat.textContent = 'Sem bateria';
        bat.style.color = '#666';
        if (batIcon) batIcon.textContent = '🔌';
      }
    }
  } catch (e) {
    console.error('loadConnectivity failed:', e);
  }
}

async function loadProcesses() {
  const invoke = getInvoke();
  if (!invoke) return;
  try {
    const list = await invoke('get_processes');
    processList = list;
    renderProcesses();
  } catch (e) {
    console.error('loadProcesses failed:', e);
  }
}

function renderProcesses() {
  const tbody = document.getElementById('process-tbody');
  const count = document.getElementById('process-count');
  if (!tbody) return;

  const query = (document.getElementById('process-search')?.value || '').toLowerCase().trim();
  let filtered = processList;
  if (query) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || p.pid.toString().includes(query) || p.user.toLowerCase().includes(query));
  }

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (processSortField === 'pid') cmp = a.pid - b.pid;
    else if (processSortField === 'cpu_percent') cmp = a.cpu_percent - b.cpu_percent;
    else if (processSortField === 'mem_percent') cmp = a.mem_percent - b.mem_percent;
    else if (processSortField === 'name') cmp = a.name.localeCompare(b.name);
    else if (processSortField === 'state') cmp = a.state.localeCompare(b.state);
    else if (processSortField === 'user') cmp = a.user.localeCompare(b.user);
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

  // Update sort indicators
  document.querySelectorAll('#process-table th').forEach(th => {
    const field = th.dataset.sort;
    th.classList.toggle('sorted', field === processSortField);
    th.classList.toggle('desc', field === processSortField && !processSortAsc);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}



async function loadHomeStats() {
  const invoke = getInvoke();
  if (!invoke) return;
  try {
    const h = await invoke('get_home_stats');
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

async function reportProblem() {
  const invoke = getInvoke();
  if (!invoke) return;
  const btn = document.getElementById('report-btn');
  if (btn) btn.textContent = '⏳ Coletando...';
  try {
    const info = await invoke('get_report_info');
    const outputLog = document.getElementById('output-log');
    const logText = outputLog?.textContent?.trim() || '(vazio)';
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const report = [
      '📋 Relatório do Solix — v' + info.app_version,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '🖥️ Sistema',
      '  Distribuição: ' + info.distro_name,
      '  Versão: ' + info.distro_version,
      '  Kernel: ' + info.kernel,
      '  Gerenciador: ' + info.package_manager,
      '',
      '📊 Desempenho',
      '  CPU: ' + Math.round(info.cpu_percent) + '%',
      '  RAM: ' + Math.round(info.memory_percent) + '%',
      '  Temperatura: ' + Math.round(info.temperature) + '°C',
      '',
      '📜 Última operação:',
      logText,
      '',
      '🕐 Gerado em: ' + now,
    ].join('\n');
    const body = encodeURIComponent('## Descrição do problema\n\n' +
      '(Descreva aqui o que aconteceu)\n\n' +
      '---\n' +
      '```\n' + report + '\n```');
    window.open('https://github.com/Rafa-MKR2/solix/issues/new?body=' + body, '_blank');
    if (btn) btn.textContent = '✅ Aberto!';
    setTimeout(() => {
      if (btn) btn.textContent = '🐛 Reportar Problema';
    }, 3000);
  } catch (e) {
    console.error('reportProblem failed:', e);
    showToast('error', 'Erro ao gerar relatório.');
    if (btn) btn.textContent = '🐛 Reportar Problema';
  }
}

// ─── Help Tooltips ───

const helpTexts = {
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
}

let helpTooltipEl = null;

function showHelpTooltip(text, targetEl) {
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

    // Keep within viewport
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

function hideHelpTooltip() {
  if (helpTooltipEl) {
    helpTooltipEl.remove();
    helpTooltipEl = null;
  }
}

function setupHelpTooltips() {
  document.querySelectorAll('.help-tip').forEach(el => {
    const key = el.dataset.help;
    const text = helpTexts[key];
    if (!text) return;

    let hideTimer = null;
    let isVisible = false;

    function show() {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      showHelpTooltip(text, el);
      isVisible = true;
    }

    function scheduleHide() {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        hideHelpTooltip();
        isVisible = false;
      }, 200);
    }

    el.addEventListener('mouseenter', show);
    el.addEventListener('mouseleave', scheduleHide);

    // The tooltip itself keeps alive when hovered
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isVisible) {
        hideHelpTooltip();
        isVisible = false;
      } else {
        show();
      }
    });
  });

  // Hide tooltip on scroll or click outside
  document.addEventListener('scroll', hideHelpTooltip, true);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.help-tip')) {
      hideHelpTooltip();
    }
  });
}

// ─── Package Installer ───

let pendingPkgData = null;
let pendingPkgFileName = null;

async function handlePkgFileSelect(file) {
  const infoCard = document.getElementById('pkg-info');
  const nameEl = document.getElementById('pkg-name');
  const versionEl = document.getElementById('pkg-version');
  const sizeEl = document.getElementById('pkg-size');
  const archEl = document.getElementById('pkg-arch');
  const depsEl = document.getElementById('pkg-deps');
  const descEl = document.getElementById('pkg-desc');
  const compatEl = document.getElementById('pkg-compat');
  const installBtn = document.getElementById('pkg-install-btn');
  const typeEl = document.getElementById('pkg-type');

  pendingPkgData = null;
  pendingPkgFileName = null;

  if (!file) {
    if (infoCard) infoCard.classList.add('hidden');
    return;
  }

  const invoke = getInvoke();
  if (!invoke) return;

  installBtn.disabled = true;
  installBtn.textContent = '⏳ Analisando...';
  if (infoCard) infoCard.classList.remove('hidden');
  if (nameEl) nameEl.textContent = file.name;
  if (versionEl) versionEl.textContent = 'Analisando...';
  if (sizeEl) sizeEl.textContent = '—';
  if (archEl) archEl.textContent = '—';
  if (depsEl) depsEl.textContent = '—';
  if (descEl) descEl.textContent = '—';
  if (compatEl) compatEl.className = 'pkg-compat';
  if (typeEl) typeEl.textContent = file.name.endsWith('.deb') ? '📦' : '📀';

  try {
    // Ler arquivo como base64 no frontend
    const base64 = await readFileAsBase64(file);
    const info = await invoke('inspect_package_data', {
      data: base64,
      fileName: file.name,
    });

    pendingPkgData = base64;
    pendingPkgFileName = file.name;

    if (nameEl) nameEl.textContent = info.package_name || file.name;
    if (versionEl) versionEl.textContent = info.version;
    if (sizeEl) sizeEl.textContent = info.file_size;
    if (archEl) archEl.textContent = info.architecture;
    if (descEl) descEl.textContent = info.description || 'Sem descrição';
    if (typeEl) typeEl.textContent = info.package_type === 'deb' ? '📦' : '📀';

    if (depsEl) {
      depsEl.textContent = info.dependencies && info.dependencies.length > 0
        ? info.dependencies.join(', ')
        : 'Nenhuma dependência listada';
    }

    if (compatEl) {
      compatEl.textContent = info.compat_message;
      compatEl.className = 'pkg-compat ' + (info.compatible ? 'compatible' : 'incompatible');
    }

    installBtn.disabled = !info.compatible;
    installBtn.textContent = info.compatible ? '⬇️ Instalar Pacote' : '🚫 Incompatível';
  } catch (e) {
    console.error('inspect_package_data failed:', e);
    if (versionEl) versionEl.textContent = '❌ Erro';
    if (compatEl) {
      compatEl.textContent = '❌ ' + (e + '');
      compatEl.className = 'pkg-compat incompatible';
    }
    installBtn.disabled = true;
    installBtn.textContent = '⬇️ Instalar Pacote';
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      // Remove o prefixo "data:application/...;base64,"
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject('Erro ao ler arquivo');
    reader.readAsDataURL(file);
  });
}

document.getElementById('pkg-file-input')?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  handlePkgFileSelect(file);
});

document.getElementById('pkg-clear-btn')?.addEventListener('click', () => {
  const input = document.getElementById('pkg-file-input');
  if (input) { input.value = ''; }
  pendingPkgData = null;
  pendingPkgFileName = null;
  const infoCard = document.getElementById('pkg-info');
  if (infoCard) infoCard.classList.add('hidden');
  const outputSection = document.getElementById('pkg-output-section');
  if (outputSection) outputSection.classList.add('hidden');
  const outputLog = document.getElementById('pkg-output-log');
  if (outputLog) outputLog.textContent = '';
});

document.getElementById('pkg-install-btn')?.addEventListener('click', () => {
  if (!pendingPkgData || !pendingPkgFileName) return;
  const installBtn = document.getElementById('pkg-install-btn');
  installBtn.disabled = true;
  installBtn.textContent = '⏳ Aguardando senha...';
  // Reusa o fluxo de senha existente
  showPasswordModal({ type: 'install-package' });
});

// ─── ───

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupHelpTooltips();
  setupLockActions();
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
  document.getElementById('report-btn')?.addEventListener('click', reportProblem);
  document.getElementById('dev-github-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  window.open('https://github.com/Rafa-MKR2/solix', '_blank');
});
const SPEEDO_LENGTH = 367.6;
let speedoAnimFrame = null;

function setSpeedometer(mbps) {
  const maxSpeed = 1000;
  const pct = Math.min(Math.max(mbps / maxSpeed, 0), 1);
  const angle = 135 + pct * 270;
  const needle = document.getElementById('speedo-needle');
  const fill = document.getElementById('speedo-fill');
  const value = document.getElementById('speedo-value');
  const unit = document.getElementById('speedo-unit');
  if (needle) needle.style.transform = `rotate(${angle}, 120, 147)`;
  if (fill) fill.style.strokeDashoffset = SPEEDO_LENGTH * (1 - pct);
  if (value) value.textContent = mbps >= 10 ? Math.round(mbps) : mbps.toFixed(1);
  if (unit) unit.textContent = mbps >= 1 ? 'Mbps' : 'Kbps';
}

function animateSpeedometerReach(targetMbps) {
  const needle = document.getElementById('speedo-needle');
  const fill = document.getElementById('speedo-fill');
  if (!needle || !fill) return;

  // Phase 1: accelerate from 0 to 80% of target in 2s
  // Phase 2: decelerate and settle at target with bounce
  const maxSpeed = 1000;
  if (speedoAnimFrame) cancelAnimationFrame(speedoAnimFrame);

  const startTime = performance.now();
  const climbDuration = 2200;
  const startAngle = 135;
  const sweep = 270;
  const targetPct = Math.min(Math.max(targetMbps / maxSpeed, 0), 1);
  const targetAngle = startAngle + targetPct * sweep;

  function step(now) {
    const elapsed = now - startTime;
    const p = Math.min(elapsed / climbDuration, 1);

    let angle;
    if (p < 0.7) {
      // Ease-in: accelerate toward slightly above target
      const t = p / 0.7;
      const overshoot = Math.min(targetPct + 0.08, 1);
      const eased = t * t * (3 - 2 * t);
      angle = startAngle + eased * (startAngle + overshoot * sweep - startAngle);
    } else {
      // Ease-out: bounce back and settle on target
      const t = (p - 0.7) / 0.3;
      const bounce1 = 1 + 0.04 * Math.sin(t * Math.PI * 3) * (1 - t);
      angle = startAngle + targetPct * bounce1 * sweep;
    }

    needle.style.transition = 'none';
    needle.style.transform = `rotate(${angle}, 120, 147)`;
    fill.style.transition = 'none';
    const pct = (angle - startAngle) / sweep;
    fill.style.strokeDashoffset = SPEEDO_LENGTH * (1 - pct);

    if (p < 1) {
      speedoAnimFrame = requestAnimationFrame(step);
    } else {
      needle.style.transition = '';
      fill.style.transition = '';
      // Final snap to exact value
      needle.style.transform = `rotate(${targetAngle}, 120, 147)`;
      fill.style.strokeDashoffset = SPEEDO_LENGTH * (1 - targetPct);
    }
  }

  speedoAnimFrame = requestAnimationFrame(step);
}

async function loadExternalInfo() {
  const invoke = getInvoke();
  if (!invoke) return;
  try {
    const info = await invoke('get_external_info');
    const ipEl = document.getElementById('info-external-ip');
    const ispEl = document.getElementById('info-isp');
    const locEl = document.getElementById('info-location');
    if (ipEl) ipEl.textContent = info.external_ip || '—';
    if (ispEl) {
      const org = info.isp || '';
      ispEl.textContent = org.replace(/^AS\d+\s*/, '') || '—';
    }
    if (locEl) {
      const parts = [info.city, info.region].filter(Boolean);
      locEl.textContent = parts.join(', ') || '—';
    }
  } catch (_) {}

  // Also update ping
  try {
    const c = await invoke('get_connectivity');
    const pingEl = document.getElementById('info-ping-display');
    if (pingEl) {
      pingEl.textContent = c.ping_latency_ms > 0 ? `${c.ping_latency_ms.toFixed(1)} ms` : '—';
      pingEl.style.color = c.ping_latency_ms > 0 && c.ping_latency_ms < 100 ? '#4ae0a0' : c.ping_latency_ms >= 100 ? '#e8a040' : '';
    }
  } catch (_) {}
}

document.getElementById('test-ping-btn')?.addEventListener('click', async () => {
  const invoke = getInvoke();
  if (!invoke) return;
  const btn = document.getElementById('test-ping-btn');
  if (btn) btn.textContent = '⏳';
  const speedResult = document.getElementById('speed-result');
  try {
    const c = await invoke('get_connectivity');
    if (speedResult) speedResult.textContent = c.ping_latency_ms > 0 ? `${c.ping_latency_ms.toFixed(1)} ms` : 'Sem resposta';
    if (speedResult) speedResult.className = 'pulse';
    setTimeout(() => { if (speedResult) speedResult.className = ''; }, 2000);
  } catch (_) {
    if (speedResult) speedResult.textContent = 'Falhou';
  }
  if (btn) btn.textContent = '📡';
});

document.getElementById('test-speed-btn')?.addEventListener('click', async () => {
  const invoke = getInvoke();
  if (!invoke) return;
  const btn = document.getElementById('test-speed-btn');
  const speedResult = document.getElementById('speed-result');
  if (btn) { btn.classList.add('measuring'); btn.textContent = '⏳ Medindo...'; }
  if (speedResult) speedResult.textContent = 'Testando...';
  setSpeedometer(0);
  setTimeout(() => {
    // Start climbing animation while test runs
    animateSpeedometerReach(700);
  }, 200);
  try {
    const result = await invoke('test_speed');
      if (speedResult) {
        speedResult.textContent = `Download: ${result.formatted}`;
        speedResult.className = 'pulse';
        setTimeout(() => { if (speedResult) speedResult.className = ''; }, 2000);
      }
      animateSpeedometerReach(result.mbps);
      // Update ping after speed test
      try {
        const c = await invoke('get_connectivity');
        const pingEl = document.getElementById('info-ping-display');
        if (pingEl) {
          pingEl.textContent = c.ping_latency_ms > 0 ? `${c.ping_latency_ms.toFixed(1)} ms` : '—';
          pingEl.style.color = c.ping_latency_ms > 0 && c.ping_latency_ms < 100 ? '#4ae0a0' : c.ping_latency_ms >= 100 ? '#e8a040' : '';
        }
      } catch (_) {}
  } catch (_) {
    if (speedResult) speedResult.textContent = 'Falhou';
  }
  if (btn) { btn.classList.remove('measuring'); btn.textContent = '🚀 Testar Velocidade'; }
});

  // Lock diagnosis buttons
  document.getElementById('lock-retry-btn')?.addEventListener('click', retryLastOperation);
  document.getElementById('lock-close-btn')?.addEventListener('click', () => {
    document.getElementById('lock-diagnosis')?.classList.add('hidden');
  });



  document.getElementById('cancel-btn')?.addEventListener('click', async () => {
    const invoke = getInvoke();
    if (invoke) {
      try { await invoke('cancel_operation'); } catch (e) { console.error('cancel failed:', e); }
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
    } catch (e) {
      console.error('get_package_info failed:', e);
      showToast('error', `Erro ao buscar informações de ${toolName}.`);
    }
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
  loadExternalInfo();
  loadProcesses();
  loadHomeStats();
  setInterval(pollStats, 3000);
  setInterval(loadConnectivity, 10000);
  setInterval(loadProcesses, 3000);
  setInterval(loadHomeStats, 30000);

  // Process sort
  document.querySelectorAll('#process-table th').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (!field) return;
      if (processSortField === field) processSortAsc = !processSortAsc;
      else { processSortField = field; processSortAsc = true; }
      renderProcesses();
    });
  });

  // Process search
  document.getElementById('process-search')?.addEventListener('input', renderProcesses);
});
