// SPDX-License-Identifier: MIT

import { getInvoke, showToast } from '../../utils.js';
import { systemService } from '../../shared/services/index.js';
import { passwordVerified, setPasswordVerified } from '../../shared/auth.js';
import { showPasswordModal } from '../../operations.js';
import type { AppUpdateInfo, UpdateProgress } from '../../shared/types/index.js';
import {
  showUpdateBanner,
  showUpdateProgress,
  hideUpdateModal,
} from './banner.js';

// ─── App Update ───

// Latest update info discovered — shown only after the user confirms the password
// (the popup no longer opens automatically on startup).
let pendingUpdateInfo: AppUpdateInfo | null = null;

export function setupUpdateListener(): void {
  const invoke = getInvoke();
  if (!invoke) return;
  const tauri = window.__TAURI_INTERNALS__;
  if (!tauri?.transformCallback) return;

  const handler = tauri.transformCallback<UpdateProgress>((event) => {
    const { stage, percent, message } = event.payload ?? ({} as UpdateProgress);
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
        setPasswordVerified(false);
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
      pendingUpdateInfo = info;
      const footerVersion = document.getElementById('footer-version');
      if (footerVersion) footerVersion.textContent = `Solix v${info.current_version}`;

      const updateBtn = document.getElementById('footer-update-btn');
      const updateText = document.getElementById('footer-update-text');
      if (updateBtn) updateBtn.classList.remove('hidden');
      if (updateText) {
        updateText.classList.remove('hidden');
        updateText.textContent = `v${info.latest_version} disponível!`;
      }
      // Popup não abre mais automaticamente — fica aguardando a senha
      // (showPendingUpdate() é chamado após confirmPassword).
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

export function showUpdateConfirmDialog(): void {
  const confirmOverlay = document.getElementById('confirm-overlay');
  if (confirmOverlay) confirmOverlay.classList.remove('hidden');
}

export function showUpdatePasswordModal(): void {
  import('../../operations.js').then(m => m.showPasswordModal({ type: 'app-update' }));
}

/**
 * Footer "Atualizar" → pede a senha PRIMEIRO. Só depois de confirmada
 * a senha o popup antigo de update é exibido (showPendingUpdate).
 */
export function startUpdateWithPassword(): void {
  import('../../operations.js').then(m => m.showPasswordModal({ type: 'app-update-prompt' }));
}

/** Shows the stored update popup — called after the password is confirmed. */
export function showPendingUpdate(): void {
  if (pendingUpdateInfo) showUpdateBanner(pendingUpdateInfo);
}
