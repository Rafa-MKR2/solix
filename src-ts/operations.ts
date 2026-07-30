// SPDX-License-Identifier: MIT

import type {
  DevelopmentToolStatus,
  InstallResult,
  PendingAction,
} from './types.js';
import { passwordVerified, setPasswordVerified } from './shared/auth.js';
import { getInvoke, showToast, setText } from './utils.js';
import { systemService, packageService, miscService } from './shared/services/index.js';
import { showConfetti } from './animations.js';

import { renderDisks } from './features/disks/index.js';
import { renderTools, selectedTools, removedTools, updateButtons, askDesktopShortcuts } from './features/tools/index.js';
import {
  showLockDiagnosis,
  switchToPage,
} from './ui.js';
import { pendingPkg } from './features/packages/upload.js';

export let toolStatuses: DevelopmentToolStatus[] = [];
export let systemDistro = '';
export let pendingAction: PendingAction | null = null;
let lastPendingAction: PendingAction | null = null;
let isOperating = false;

function setPendingAction(action: PendingAction | null): void {
  pendingAction = action;
}

export { setPendingAction };


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
  setPasswordVerified(true);
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
  if (!pendingAction || isOperating) return;
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
    const { handleAppUpdate: updateHandler } = await import('./features/update/index.js');
    await updateHandler();
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
      result = await packageService.installPackageData(pendingPkg.data!, pendingPkg.fileName!);
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
      pendingPkg.data = null;
      pendingPkg.fileName = null;
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

// ─── Recommended Tools Count (bridge between pages) ───

export function updateRecommendedCount(): void {
  const installed = toolStatuses.filter(t => t.available).length;
  const total = toolStatuses.length;
  const el = document.getElementById('pkg-recommended-count');
  if (el) el.textContent = `${installed}/${total}`;
}

// ─── Cancel ───

export async function cancelOperation(): Promise<void> {
  try { await packageService.cancelOperation(); } catch (e) { console.error('cancel failed:', e); }
}
