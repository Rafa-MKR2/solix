// SPDX-License-Identifier: MIT

import type {
  DevelopmentToolStatus,
  InstallResult,
  PendingAction,
} from './types.js';
import { getInvoke, showToast, setText } from './utils.js';
import { systemService, packageService, miscService, scriptService, backupService } from './shared/services/index.js';
import { showConfetti } from './animations.js';
import { renderScriptAnalysis } from './ui.js';
import {
  renderTools,
  renderDisks,
  selectedTools,
  removedTools,
  updateButtons,
  showLockDiagnosis,
  switchToPage,
  showUpdateBanner,
  showUpdateProgress,
  hideUpdateModal,
} from './ui.js';

export let toolStatuses: DevelopmentToolStatus[] = [];
export let systemDistro = '';
let passwordVerified = false;
let pendingAction: PendingAction | null = null;
let lastPendingAction: PendingAction | null = null;
let isOperating = false;
let pendingPkgData: string | null = null;
let pendingPkgFileName: string | null = null;

export function setupProgressListener(): void {
  const invoke = getInvoke();
  if (!invoke) return;
  const tauri = (window as any).__TAURI_INTERNALS__;
  if (!tauri?.transformCallback) return;
  const handler = tauri.transformCallback((event: any) => {
    const { current, total, tool_name, status } = event.payload || event;
    const area = document.getElementById('progress-area');
    const fill = document.getElementById('progress-bar-fill') as HTMLElement | null;
    const text = document.getElementById('progress-text');
    if (!area || !fill || !text) return;
    if (status === 'done') {
      area.classList.add('hidden');
      return;
    }
    area.classList.remove('hidden');
    const pct = Math.round((current / total) * 100);
    fill.style.width = pct + '%';
    text.textContent = tool_name ? `${tool_name} (${current}/${total})` : `${pct}%`;
  });
  invoke('plugin:event|listen', {
    event: 'operation-progress',
    target: { kind: 'Any' },
    handler,
  }).catch(() => {});

  const outHandler = tauri.transformCallback((event: any) => {
    const { line } = event.payload || event;
    const log = document.getElementById('output-log');
    if (!log || !line) return;
    log.textContent += line + '\n';
    log.scrollTop = log.scrollHeight;
  });
  invoke('plugin:event|listen', {
    event: 'operation-output',
    target: { kind: 'Any' },
    handler: outHandler,
  }).catch(() => {});
}

export async function loadSystemInfo(): Promise<void> {
  try {
    const info = await systemService.getInfo();
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
      document.getElementById('user-card')!.classList.remove('hidden');
      setText('user-name', u.full_name);
      setText('user-username', '@' + u.username);
      setText('user-shell', u.shell);
      if (u.is_admin) {
        document.getElementById('user-admin-badge')!.style.display = 'inline';
      }
      if (u.avatar_base64) {
        const container = document.getElementById('user-avatar')!;
        container.innerHTML = `<img src="${u.avatar_base64}" alt="${u.username}" />`;
      } else {
        const initial = (u.full_name || u.username).charAt(0).toUpperCase();
        document.getElementById('avatar-placeholder')!.textContent = initial;
      }
    }
    toolStatuses = info.tools || [];
    renderTools(toolStatuses);
    updateRecommendedCount();
  } catch (err) {
    console.error('loadSystemInfo failed:', err);
    showToast('error', 'Erro ao carregar informações do sistema.');
  }
}

// ─── Password Flow ───

export async function confirmPassword(): Promise<void> {
  const input = document.getElementById('password-input') as HTMLInputElement | null;
  const error = document.getElementById('password-error');
  const password = input?.value || '';
  if (!password) return;
  try {
    await packageService.setPassword(password);
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
  passwordVerified = true;
  document.getElementById('password-overlay')!.classList.add('hidden');
  if (error) error.classList.add('hidden');
  if (input) input.value = '';
  executePending();
}

export function cancelPassword(): void {
  document.getElementById('password-overlay')!.classList.add('hidden');
  document.getElementById('password-error')!.classList.add('hidden');
  pendingAction = null;
  const input = document.getElementById('password-input') as HTMLInputElement | null;
  if (input) input.value = '';
}

export async function showPasswordModal(action: PendingAction): Promise<void> {
  pendingAction = action;
  if (passwordVerified) {
    executePending();
    return;
  }
  document.getElementById('password-overlay')!.classList.remove('hidden');
  const input = document.getElementById('password-input') as HTMLInputElement | null;
  if (input) {
    input.value = '';
    input.focus();
  }
}

async function executePending(): Promise<void> {
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
  if (isAppUpdate) {
    isOperating = false;
    pendingAction = null;
    handleAppUpdate();
    return;
  }
  if (outputLog) {
    if (isInstall) outputLog.textContent = '⏳ Instalando...\n';
    else if (isRemove) outputLog.textContent = '⏳ Removendo...\n';
    else if (isUpdate) outputLog.textContent = '⏳ Atualizando sistema...\n';
    else if (isZram) outputLog.textContent = '⏳ Ativando ZRAM...\n';
    else if (isCleanup) outputLog.textContent = '⏳ Limpando sistema...\n';
    else if (isInstallPkg) outputLog.textContent = '🔐 Instalando pacote...\n';
  }
  try {
    let result: InstallResult[] | InstallResult | undefined;
    if (isUpdate) {
      result = await packageService.updateSystem();
    } else if (isZram) {
      result = await miscService.enableZram();
    } else if (isCleanup) {
      result = await miscService.cleanupSystem();
    } else if (isInstall) {
      result = await packageService.installTools(pendingAction.tools!);
    } else if (isRemove) {
      result = await packageService.removeTools(pendingAction.tools!);
    } else if (isInstallPkg) {
      result = await packageService.installPackageData(pendingPkgData!, pendingPkgFileName!);
    }
    if (outputLog) {
      if (Array.isArray(result)) {
        const hasLockError = result.some(r => !r.success && (
          r.error?.includes('db.lck') ||
          r.error?.includes('não foi possível travar') ||
          r.error?.includes('could not lock') ||
          r.error?.includes('Could not get lock') ||
          r.error?.includes('unable to lock')
        ));
        outputLog.textContent = result.map(r => {
          const name = r.tool_name || 'desconhecido';
          if (r.cancelled) return `${name}: cancelado`;
          if (!r.success) {
            let err = r.error || '';
            if (hasLockError) {
              err = 'Outro gerenciador de pacotes está em execução (Pamac, Discover, terminal). Feche-o e tente novamente.';
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
        const r = result as InstallResult;
        outputLog.textContent = r.output || JSON.stringify(r, null, 2);
      }
    }
    if (result) {
      const failed = Array.isArray(result) ? result.filter(r => !r.success) : [];
      if (failed.length === 0) {
        showToast('success', isUpdate ? 'Sistema atualizado!' : isZram ? 'ZRAM ativado!' : isCleanup ? 'Limpeza concluída!' : 'Operação concluída!');
        // 🎉 Confetti on successful install!
        if (isInstall) {
          showConfetti(3000);
        }
        // Ask about desktop shortcuts after successful install
        if (isInstall && Array.isArray(result)) {
          const installedTools = result.filter(r => r.success && r.tool_name);
          if (installedTools.length > 0) {
            // Small delay so the success toast appears first
            setTimeout(() => askDesktopShortcuts(installedTools.map(r => r.tool_name)), 500);
          }
        }
      } else {
        showToast('error', `Falha em ${failed.length} item(ns)`);
      }
    }
    if (!isUpdate && !isZram && !isCleanup) {
      if (!isInstallPkg) {
        selectedTools.clear();
        removedTools.clear();
        await loadSystemInfo();
        const removeBtn = document.getElementById('remove-btn') as HTMLButtonElement | null;
        if (removeBtn) removeBtn.style.display = 'none';
      }
    }
    document.getElementById('lock-diagnosis')?.classList.add('hidden');
  } catch (err) {
    const msg = (err + '').toLowerCase();
    let friendly = 'Erro na operação.';
    if (msg.includes('db.lck') || msg.includes('não foi possível travar') || msg.includes('could not lock') || msg.includes('unable to lock')) {
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
    if (isInstallPkg) {
      const pkgBtn = document.getElementById('pkg-install-btn') as HTMLButtonElement | null;
      if (pkgBtn) {
        pkgBtn.disabled = false;
        pkgBtn.textContent = '⬇️ Instalar Pacote';
      }
      pendingPkgData = null;
      pendingPkgFileName = null;
    }
  }
}

export function retryLastOperation(): void {
  const action = pendingAction || lastPendingAction;
  if (!action && !passwordVerified) return;
  document.getElementById('lock-diagnosis')?.classList.add('hidden');
  if (action) {
    showPasswordModal(action);
  } else {
    showToast('error', 'Selecione a operação novamente.');
  }
}

// ─── Package Installer ───

import type { LocalPackageInfo } from './types.js';

export async function handlePkgFileSelect(file: File | null): Promise<void> {
  const infoCard = document.getElementById('pkg-info');
  const nameEl = document.getElementById('pkg-name');
  const versionEl = document.getElementById('pkg-version');
  const sizeEl = document.getElementById('pkg-size');
  const archEl = document.getElementById('pkg-arch');
  const depsEl = document.getElementById('pkg-deps');
  const descEl = document.getElementById('pkg-desc');
  const compatEl = document.getElementById('pkg-compat');
  const installBtn = document.getElementById('pkg-install-btn') as HTMLButtonElement | null;
  const typeEl = document.getElementById('pkg-type');

  pendingPkgData = null;
  pendingPkgFileName = null;

  if (!file) {
    if (infoCard) infoCard.classList.add('hidden');
    return;
  }

  if (installBtn) { installBtn.disabled = true; installBtn.textContent = '⏳ Analisando...'; }
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
    const base64 = await readFileAsBase64(file);
    const info = await packageService.inspectPackageData(base64, file.name);

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

    if (installBtn) {
      installBtn.disabled = !info.compatible;
      installBtn.textContent = info.compatible ? '⬇️ Instalar Pacote' : '🚫 Incompatível';
    }
  } catch (e) {
    console.error('inspect_package_data failed:', e);
    if (versionEl) versionEl.textContent = '❌ Erro';
    if (compatEl) {
      compatEl.textContent = '❌ ' + (e + '');
      compatEl.className = 'pkg-compat incompatible';
    }
    if (installBtn) { installBtn.disabled = true; installBtn.textContent = '⬇️ Instalar Pacote'; }
  }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject('Erro ao ler arquivo');
    reader.readAsDataURL(file);
  });
}

// ─── App Update ───

export function setupUpdateListener(): void {
  const invoke = getInvoke();
  if (!invoke) return;
  const tauri = (window as any).__TAURI_INTERNALS__;
  if (!tauri?.transformCallback) return;

  const handler = tauri.transformCallback((event: any) => {
    const { stage, percent, message } = event.payload || event;
    showUpdateProgress(stage, percent, message);
    if (stage === 'restart') {
      setTimeout(() => hideUpdateModal(), 1000);
    }
  });
  invoke('plugin:event|listen', {
    event: 'update-progress',
    target: { kind: 'Any' },
    handler,
  }).catch(() => {});
}

export async function handleAppUpdate(): Promise<void> {
  showUpdateProgress('download', 0, 'Preparando...');

  const doUpdate = async (): Promise<void> => {
    try {
      await systemService.installUpdate();
    } catch (e) {
      const msg = (e + '').toLowerCase();
      if (msg.includes('password') || msg.includes('senha') || msg.includes('incorrect')) {
        passwordVerified = false;
        showPasswordModal({ type: 'app-update' });
        return;
      }
      showToast('error', (e + '') || 'Erro ao atualizar.');
      showUpdateProgress('error', 0, (e + '') || 'Erro ao atualizar.');
      setTimeout(() => hideUpdateModal(), 3000);
    }
  };

  if (passwordVerified) {
    await doUpdate();
  } else {
    showPasswordModal({ type: 'app-update' });
  }
}

export async function initFooter(): Promise<void> {
  try {
    const version = await systemService.getAppVersion();
    const footerEl = document.getElementById('footer-version');
    if (footerEl) footerEl.textContent = `Solix v${version}`;
  } catch (e) {
    console.error('initFooter failed:', e);
  }
  setTimeout(checkForAppUpdate, 2000);
}

async function checkForAppUpdate(): Promise<void> {
  const checkLink = document.getElementById('footer-check-link');
  if (checkLink) checkLink.classList.add('checking');
  try {
    const info = await systemService.checkAppUpdate();
    if (checkLink) { checkLink.textContent = '🔍 Verificar atualizações'; checkLink.classList.remove('checking'); }

    if (info.update_available) {
      const footerVersion = document.getElementById('footer-version');
      if (footerVersion) footerVersion.textContent = `Solix v${info.current_version}`;

      const updateBtn = document.getElementById('footer-update-btn');
      const updateText = document.getElementById('footer-update-text');
      if (updateBtn) updateBtn.classList.remove('hidden');
      if (updateText) {
        updateText.classList.remove('hidden');
        updateText.textContent = `v${info.latest_version} disponível!`;
      }
      showUpdateBanner(info);
    }
  } catch (e) {
    console.error('checkForAppUpdate failed:', e);
    if (checkLink) { checkLink.textContent = '🔍 Verificar atualizações'; checkLink.classList.remove('checking'); }
  }
}

export async function handleCheckUpdateClick(): Promise<void> {
  const el = document.getElementById('footer-check-link');
  if (el) el.textContent = '⏳ Verificando...';
  await checkForAppUpdate();
  const checkLink = document.getElementById('footer-check-link');
  if (checkLink && !checkLink.classList.contains('checking')) {
    checkLink.textContent = '🔍 Verificar atualizações';
  }
}

// ─── Report ───

import { showReportModal, hideReportModal } from './ui.js';

let lastReportText = '';
let lastIssueUrl = '';

export async function reportProblem(): Promise<void> {
  const btn = document.getElementById('report-btn') as HTMLButtonElement | null;
  if (btn) btn.textContent = '⏳ Coletando...';
  try {
    const info = await systemService.getReportInfo();
    const outputLog = document.getElementById('output-log');
    const logText = outputLog?.textContent?.trim() || '(vazio)';
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Build a more detailed and friendly report
    const report = [
      '📋 Relatório do Solix — v' + info.app_version,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '🖥️  SISTEMA',
      '  Distribuição : ' + info.distro_name + ' ' + info.distro_version,
      '  Kernel       : ' + info.kernel,
      '  Pacotes      : ' + info.package_manager,
      '',
      '📊  DESEMPENHO (no momento do relatório)',
      '  CPU    : ' + Math.round(info.cpu_percent) + '%',
      '  RAM    : ' + Math.round(info.memory_percent) + '%',
      '  Temp.  : ' + Math.round(info.temperature) + '°C',
      '',
      '📜  ÚLTIMA OPERAÇÃO',
      '  ' + logText.replace(/\n/g, '\n  '),
      '',
      '🕐  Gerado em: ' + now,
    ].join('\n');

    lastReportText = report;
    lastIssueUrl = 'https://github.com/Rafa-MKR2/solix/issues/new?body=' +
      encodeURIComponent('## Descrição do problema\n\n' +
        '(Descreva aqui o que aconteceu)\n\n' +
        '---\n' +
        '```\n' + report + '\n```');

    // Show modal with the report preview
    showReportModal(report);

    if (btn) btn.textContent = '🐛 Reportar Problema';
  } catch (e) {
    console.error('reportProblem failed:', e);
    showToast('error', 'Erro ao gerar relatório.');
    if (btn) btn.textContent = '🐛 Reportar Problema';
  }
}

export function handleCopyReport(): void {
  if (!lastReportText) return;
  navigator.clipboard.writeText(lastReportText).then(() => {
    const resultEl = document.getElementById('report-result');
    const resultText = document.getElementById('report-result-text');
    const resultIcon = document.getElementById('report-result-icon');
    if (resultIcon) resultIcon.textContent = '✅';
    if (resultEl) resultEl.classList.remove('hidden');
    if (resultText) resultText.textContent = '📋 Relatório copiado! Cole onde quiser.';
    setTimeout(() => {
      if (resultEl) resultEl.classList.add('hidden');
    }, 3000);
    showToast('success', 'Relatório copiado para a área de transferência!');
  }).catch(() => {
    // Fallback: select text manually
    const textEl = document.getElementById('report-text');
    if (textEl) {
      const range = document.createRange();
      range.selectNodeContents(textEl);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      showToast('info', 'Selecione o texto e copie (Ctrl+C)');
    }
  });
}

export async function handleOpenIssue(): Promise<void> {
  if (!lastIssueUrl) return;
  try {
    await miscService.openUrl(lastIssueUrl);
    hideReportModal();
    showToast('success', '✅ GitHub aberto no navegador! Descreva o problema e envie.');
  } catch (e) {
    console.error('open_url failed:', e);
    showToast('error', 'Erro ao abrir o GitHub. Copie o relatório e abra manualmente.');
  }
}

export async function handleSaveReport(): Promise<void> {
  if (!lastReportText) return;
  try {
    const filePath = await miscService.saveReportToDesktop(lastReportText);
    showToast('success', `💾 Relatório salvo! ${filePath}`);
    // Mostra no modal também
    const resultEl = document.getElementById('report-result');
    const resultText = document.getElementById('report-result-text');
    if (resultEl) resultEl.classList.remove('hidden');
    if (resultText) resultText.textContent = `💾 Salvo em: ${filePath.split('/').pop()}`;
    setTimeout(() => {
      if (resultEl) resultEl.classList.add('hidden');
    }, 4000);
  } catch (e) {
    console.error('save_report_to_desktop failed:', e);
    showToast('error', 'Erro ao salvar relatório: ' + (e + ''));
  }
}

export async function handleEmailReport(): Promise<void> {
  if (!lastReportText) return;
  const subject = encodeURIComponent('Relatório Solix - Problema');
  const body = encodeURIComponent(
    'Relatório do sistema gerado pelo Solix\n\n' +
    '---\n\n' +
    lastReportText +
    '\n\n---\n\n' +
    'Descreva seu problema acima.\n' +
    'Obrigado por ajudar a melhorar o Solix!'
  );
  const mailto = `mailto:rafaeldocarmo.dev@gmail.com?subject=${subject}&body=${body}`;
  try {
    await miscService.openUrl(mailto);
    hideReportModal();
    showToast('success', '📧 Cliente de email aberto! Envie o relatório para o desenvolvedor.');
  } catch (e) {
    console.error('open_url mailto failed:', e);
    showToast('error', 'Erro ao abrir cliente de email. Copie o relatório e envie manualmente para rafaeldocarmo.dev@gmail.com');
  }
}

// ─── System Package Management ───

import type { InstalledPackage, RepoPackage, PackageHistoryEntry } from './types.js';

let selectedInstalledPkgs = new Set<string>();
let selectedRepoPkgs = new Set<string>();

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

    // Calculate total size
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

  // Sort: selected first, then by name
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

  // Add click handlers
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
      // Show results
      const listEl = document.getElementById('pkg-installed-list');
      if (listEl) {
        listEl.innerHTML = `<div class="pkg-history-log">${results.map(r => `<div>${r}</div>`).join('')}</div>`;
      }
      showToast('success', `${names.length} pacote(s) removido(s)!`);
      selectedInstalledPkgs.clear();
      // Reload after 2 seconds
      setTimeout(() => loadInstalledPackages(), 2000);
    } catch (e) {
      showToast('error', (e + '') || 'Erro ao remover pacotes.');
    }
  };

  if (passwordVerified) {
    await doRemove();
  } else {
    pendingAction = { type: 'remove', tools: names };
    showPasswordModal({ type: 'remove', tools: names });
  }
}

export async function handleSearchRepoPackages(query: string): Promise<void> {
  const listEl = document.getElementById('pkg-search-list');
  if (!listEl) return;

  if (!query.trim()) {
    listEl.innerHTML = '<div class="pkg-empty">Digite um nome para buscar nos repositórios</div>';
    document.getElementById('pkg-search-actions')!.style.display = 'none';
    return;
  }

  listEl.innerHTML = '<div class="pkg-loading">⏳ Buscando...</div>';
  selectedRepoPkgs.clear();

  try {
    const pkgs = await packageService.searchRepo(query.trim());
    renderRepoPackages(pkgs);
  } catch (e) {
    console.error('search_repo_packages failed:', e);
    listEl.innerHTML = '<div class="pkg-empty">❌ Erro ao buscar pacotes.</div>';
  }
}

function renderRepoPackages(pkgs: RepoPackage[]): void {
  const listEl = document.getElementById('pkg-search-list');
  if (!listEl) return;

  if (pkgs.length === 0) {
    listEl.innerHTML = '<div class="pkg-empty">Nenhum pacote encontrado nos repositórios.</div>';
    document.getElementById('pkg-search-actions')!.style.display = 'none';
    return;
  }

  document.getElementById('pkg-search-actions')!.style.display = '';

  listEl.innerHTML = `<table class="pkg-table">
    <thead><tr>
      <th class="pkg-th-check"></th>
      <th class="pkg-th-name">Pacote</th>
      <th class="pkg-th-version">Versão</th>
      <th class="pkg-th-repo">Repositório</th>
      <th class="pkg-th-desc">Descrição</th>
    </tr></thead>
    <tbody>${pkgs.map(p => `
      <tr class="pkg-row ${selectedRepoPkgs.has(p.name) ? 'selected' : ''}" data-repo-pkg="${p.name}">
        <td><input type="checkbox" class="pkg-check" /></td>
        <td class="pkg-cell-name">${p.name}</td>
        <td class="pkg-cell-version">${p.version}</td>
        <td class="pkg-cell-repo">${p.repo}</td>
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
      const name = (row as HTMLElement).dataset.repoPkg!;
      if (cb.checked) {
        selectedRepoPkgs.add(name);
        row.classList.add('selected');
      } else {
        selectedRepoPkgs.delete(name);
        row.classList.remove('selected');
      }
      const btn = document.getElementById('pkg-install-repo-btn') as HTMLButtonElement | null;
      if (btn) {
        btn.disabled = selectedRepoPkgs.size === 0;
        btn.textContent = selectedRepoPkgs.size > 0 ? `⬇️ Instalar (${selectedRepoPkgs.size})` : '⬇️ Instalar Selecionados';
      }
    });
  });
}

export async function handleInstallRepoPackages(): Promise<void> {
  if (selectedRepoPkgs.size === 0) return;
  const names = Array.from(selectedRepoPkgs);

  const doInstall = async (): Promise<void> => {
    try {
      const results = await packageService.installRepo(names);
      const listEl = document.getElementById('pkg-search-list');
      if (listEl) {
        listEl.innerHTML = `<div class="pkg-history-log">${results.map(r => `<div>${r}</div>`).join('')}</div>`;
      }
      showToast('success', `${names.length} pacote(s) instalado(s)!`);
      selectedRepoPkgs.clear();
    } catch (e) {
      showToast('error', (e + '') || 'Erro ao instalar pacotes.');
    }
  };

  if (passwordVerified) {
    await doInstall();
  } else {
    showPasswordModal({ type: 'install', tools: names });
  }
}

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

// ─── Recommended Tools Count (bridge between pages) ───

export function updateRecommendedCount(): void {
  const installed = toolStatuses.filter(t => t.available).length;
  const total = toolStatuses.length;
  const el = document.getElementById('pkg-recommended-count');
  if (el) el.textContent = `${installed}/${total}`;
}

// ─── Script Analyzer ───

export async function handleScriptDrop(file: File | null): Promise<void> {
  const resultEl = document.getElementById('script-result');
  if (!resultEl) return;

  if (!file) {
    resultEl.classList.add('hidden');
    return;
  }

  // Show file name
  const fileInfo = document.getElementById('script-file-info');
  const fileLabel = document.getElementById('script-file-label');
  if (fileInfo) fileInfo.classList.remove('hidden');
  if (fileLabel) fileLabel.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

  // Show loading
  const summaryEl = document.getElementById('script-summary');
  const commandsEl = document.getElementById('script-commands');
  if (summaryEl) summaryEl.innerHTML = '<div class="script-loading">⏳ Analisando script...</div>';
  if (commandsEl) commandsEl.innerHTML = '';
  resultEl.classList.remove('hidden');

  try {
    const text = await readFileAsText(file);
    const analysis = await scriptService.analyzeScript(text);
    renderScriptAnalysis(analysis);
  } catch (e) {
    console.error('analyze_script failed:', e);
    if (summaryEl) summaryEl.innerHTML = `<div class="script-loading" style="color:#e88">❌ Erro ao analisar script: ${e}</div>`;
  }
}

export async function handleAnalyzeText(text: string): Promise<void> {
  const resultEl = document.getElementById('script-result');
  if (!resultEl) return;

  if (!text.trim()) {
    showToast('error', 'Cole um script para analisar.');
    return;
  }

  const summaryEl = document.getElementById('script-summary');
  const commandsEl = document.getElementById('script-commands');
  if (summaryEl) summaryEl.innerHTML = '<div class="script-loading">⏳ Analisando código...</div>';
  if (commandsEl) commandsEl.innerHTML = '';
  resultEl.classList.remove('hidden');

  try {
    const analysis = await scriptService.analyzeScript(text);
    renderScriptAnalysis(analysis);
  } catch (e) {
    console.error('analyze_script failed:', e);
    if (summaryEl) summaryEl.innerHTML = `<div class="script-loading" style="color:#e88">❌ Erro ao analisar: ${e}</div>`;
  }
}

export function clearScriptAnalysis(): void {
  const resultEl = document.getElementById('script-result');
  const fileInfo = document.getElementById('script-file-info');
  const fileInput = document.getElementById('script-file-input') as HTMLInputElement | null;
  const textarea = document.getElementById('script-textarea') as HTMLTextAreaElement | null;

  if (resultEl) resultEl.classList.add('hidden');
  if (fileInfo) fileInfo.classList.add('hidden');
  if (fileInput) fileInput.value = '';
  if (textarea) textarea.value = '';

  const summaryEl = document.getElementById('script-summary');
  const commandsEl = document.getElementById('script-commands');
  if (summaryEl) summaryEl.innerHTML = '';
  if (commandsEl) commandsEl.innerHTML = '';

  const analyzeBtn = document.getElementById('script-analyze-btn') as HTMLButtonElement | null;
  if (analyzeBtn) analyzeBtn.disabled = true;

  const clearTextBtn = document.getElementById('script-clear-text-btn');
  if (clearTextBtn) clearTextBtn.style.display = 'none';
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject('Erro ao ler arquivo');
    reader.readAsText(file);
  });
}

// ─── Backup ───

import type { BackupResult } from './types.js';

export async function handleStartBackup(): Promise<void> {
  const source = document.getElementById('backup-source')?.textContent || '';
  const destInput = document.getElementById('backup-destination') as HTMLInputElement | null;
  const destination = destInput?.value?.trim() || '';

  if (!source || !destination) {
    showToast('error', 'Selecione uma origem e destino para o backup.');
    return;
  }

  // Show progress
  const progressEl = document.getElementById('backup-progress');
  const resultEl = document.getElementById('backup-result');
  const statusEl = document.getElementById('backup-progress-status');
  const fillEl = document.getElementById('backup-progress-fill');
  const textEl = document.getElementById('backup-progress-text');
  const startBtn = document.getElementById('backup-start-btn') as HTMLButtonElement | null;
  const cancelBtn = document.getElementById('backup-cancel-btn') as HTMLButtonElement | null;

  if (progressEl) progressEl.classList.remove('hidden');
  if (resultEl) resultEl.classList.add('hidden');
  if (statusEl) statusEl.textContent = '⏳ Comprimindo...';
  if (fillEl) fillEl.style.width = '0%';
  if (textEl) textEl.textContent = '0%';
  if (startBtn) startBtn.disabled = true;
  if (cancelBtn) cancelBtn.textContent = '⏳';

  const mountPoint = source; // e.g., /home, /

  try {
    const result = await backupService.createBackup(source, destination, mountPoint);

    if (result.success) {
      if (statusEl) statusEl.textContent = '✅ Backup concluído!';
      if (fillEl) fillEl.style.width = '100%';
      if (textEl) textEl.textContent = '100%';

      if (resultEl) {
        resultEl.classList.remove('hidden');
        document.getElementById('backup-result-title')!.textContent = '✅ Backup concluído!';
        document.getElementById('backup-result-sub')!.textContent =
          `${result.file_size} • ${result.duration_secs}s • ${result.file_path}`;
      }

      showToast('success', `Backup criado: ${result.file_size}`);
    } else {
      throw new Error(result.error || 'Erro desconhecido');
    }
  } catch (e) {
    const msg = (e + '') || 'Erro ao criar backup';
    if (statusEl) statusEl.textContent = '❌ ' + msg;
    if (fillEl) fillEl.style.width = '0%';
    if (resultEl) {
      resultEl.classList.remove('hidden');
      document.getElementById('backup-result-title')!.textContent = '❌ Falha no backup';
      document.getElementById('backup-result-sub')!.textContent = msg;
    }
    showToast('error', msg);
  } finally {
    if (startBtn) startBtn.disabled = false;
    if (cancelBtn) cancelBtn.textContent = 'Cancelar';
  }
}

// ─── Desktop Shortcuts ───

async function askDesktopShortcuts(toolNames: string[]): Promise<void> {
  if (toolNames.length === 0) return;

  const outputLog = document.getElementById('output-log');
  const outputSection = document.getElementById('output-section');
  if (!outputSection) return;

  if (outputLog) {
    outputLog.textContent += `\n🪄 Create desktop shortcuts?\n`;
  }

  // Remove existing prompt
  const existing = document.getElementById('shortcut-prompt');
  if (existing) existing.remove();

  // Create inline prompt BELOW the output log (on Sistema page)
  const prompt = document.createElement('div');
  prompt.id = 'shortcut-prompt';
  prompt.style.cssText = 'display:flex;align-items:center;gap:0.6rem;margin-top:0.5rem;padding:0.6rem 0.8rem;background:#1a1a32;border:1px solid #3a3a5a;border-radius:8px;font-size:0.85rem;';

  const count = toolNames.length;
  const label = document.createElement('span');
  label.textContent = `🪄 Create desktop shortcuts for ${count} app(s): ${toolNames.join(', ')}?`;
  label.style.cssText = 'color:#ccc;flex:1;';

  const yesBtn = document.createElement('button');
  yesBtn.textContent = '✅ Yes';
  yesBtn.style.cssText = 'padding:0.3rem 0.8rem;background:#0f2a1a;border:1px solid #2a5a3a;border-radius:6px;color:#4ae0a0;cursor:pointer;font-size:0.8rem;';
  yesBtn.addEventListener('click', async () => {
    prompt.innerHTML = '<span style="color:#4ae0a0">⏳ Creating shortcuts...</span>';
    let created = 0;
    for (const name of toolNames) {
      try {
        const path = await miscService.createDesktopShortcut(name);
        if (outputLog) outputLog.textContent += `  ✅ ${path}\n`;
        created++;
      } catch (e) {
        if (outputLog) outputLog.textContent += `  ❌ ${name}: ${e}\n`;
      }
    }
    prompt.innerHTML = `<span style="color:#4ae0a0">✅ ${created}/${count} shortcut(s) created!</span>`;
    setTimeout(() => prompt.remove(), 4000);
  });

  const noBtn = document.createElement('button');
  noBtn.textContent = '❌ No';
  noBtn.style.cssText = 'padding:0.3rem 0.8rem;background:#2a1a1a;border:1px solid #5a2a2a;border-radius:6px;color:#e88;cursor:pointer;font-size:0.8rem;';
  noBtn.addEventListener('click', () => {
    if (outputLog) outputLog.textContent += `  Skipped shortcut creation\n`;
    prompt.remove();
  });

  prompt.appendChild(label);
  prompt.appendChild(yesBtn);
  prompt.appendChild(noBtn);
  outputSection.appendChild(prompt);
}

// ─── Cancel ───

export async function cancelOperation(): Promise<void> {
  try { await packageService.cancelOperation(); } catch (e) { console.error('cancel failed:', e); }
}
