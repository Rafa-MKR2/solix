// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2

import type { AppUpdateInfo, PackageDetail } from './types.js';
import { getInvoke, showToast } from './utils.js';
import {
  setupNav,
  setupHelpTooltips,
  setupLockActions,
  renderTools,
  selectedTools,
  removedTools,
  switchToPage,
  showUpdateBanner,
  handleProcessSortClick,
  handleProcessSearch,
  setRetryLastOperationFn,
  loadHomeStats,
  pollStats,
  loadProcesses,
  hideReportModal,
} from './ui.js';
import {
  loadSystemInfo,
  confirmPassword,
  cancelPassword,
  showPasswordModal,
  reportProblem,
  initFooter,
  handleCheckUpdateClick,
  handleAppUpdate,
  cancelOperation,
  retryLastOperation,
  setupProgressListener,
  setupUpdateListener,
  toolStatuses,
  handlePkgFileSelect,
  loadInstalledPackages,
  handleRemovePackages,
  handleSearchRepoPackages,
  handleInstallRepoPackages,
  loadPackageHistory,
  handleStartBackup,
  handleCopyReport,
  handleOpenIssue,
  handleSaveReport,
  handleEmailReport,
  handleScriptDrop,
  handleAnalyzeText,
  clearScriptAnalysis,
} from './operations.js';
import {
  loadConnectivity,
  loadExternalInfo,
  handleTestPingClick,
  handleTestSpeedClick,
} from './network.js';

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupHelpTooltips();
  setupLockActions();
  setupProgressListener();
  setupUpdateListener();
  setRetryLastOperationFn(retryLastOperation);
  loadSystemInfo();

  document.getElementById('password-input')!.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmPassword();
  });
  document.getElementById('password-confirm')!.addEventListener('click', confirmPassword);
  document.getElementById('password-cancel')!.addEventListener('click', cancelPassword);

  document.getElementById('confirm-btn-yes')?.addEventListener('click', () => {
    document.getElementById('confirm-overlay')!.classList.add('hidden');
    showPasswordModal({ type: 'update' });
  });
  document.getElementById('confirm-btn-no')?.addEventListener('click', () => {
    document.getElementById('confirm-overlay')!.classList.add('hidden');
  });

  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (toolStatuses.length) renderTools(toolStatuses);
    });
  }

  document.getElementById('install-btn')?.addEventListener('click', () => {
    if (selectedTools.size === 0) return;
    showPasswordModal({ type: 'install', tools: Array.from(selectedTools) });
  });
  document.getElementById('remove-btn')?.addEventListener('click', () => {
    if (removedTools.size === 0) return;
    showPasswordModal({ type: 'remove', tools: Array.from(removedTools) });
  });
  document.getElementById('update-btn')?.addEventListener('click', () => {
    document.getElementById('confirm-overlay')!.classList.remove('hidden');
  });
  document.getElementById('zram-btn')?.addEventListener('click', () => {
    showPasswordModal({ type: 'zram' });
  });
  document.getElementById('cleanup-btn')?.addEventListener('click', () => {
    showPasswordModal({ type: 'cleanup' });
  });
  document.getElementById('tools-to-packages-btn')?.addEventListener('click', () => {
    switchToPage('pacotes');
    // Activate search tab
    const searchTab = document.querySelector<HTMLElement>('[data-pkg-tab="search"]');
    if (searchTab) searchTab.click();
    // Focus search input after UI renders
    setTimeout(() => {
      (document.getElementById('pkg-search-input') as HTMLInputElement)?.focus();
    }, 150);
  });

  document.getElementById('report-btn')?.addEventListener('click', reportProblem);
  document.getElementById('report-overlay-close')?.addEventListener('click', hideReportModal);
  document.getElementById('report-close-btn')?.addEventListener('click', hideReportModal);
  document.getElementById('report-copy-btn')?.addEventListener('click', handleCopyReport);
  document.getElementById('report-save-btn')?.addEventListener('click', handleSaveReport);
  document.getElementById('report-email-btn')?.addEventListener('click', handleEmailReport);
  document.getElementById('report-github-btn')?.addEventListener('click', handleOpenIssue);
  document.getElementById('report-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideReportModal();
  });
  document.getElementById('dev-github-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const invoke = getInvoke();
    if (invoke) {
      try {
        await invoke('open_url', { url: 'https://github.com/Rafa-MKR2/solix' });
      } catch (err) {
        window.open('https://github.com/Rafa-MKR2/solix', '_blank');
      }
    }
  });

  document.getElementById('test-ping-btn')?.addEventListener('click', handleTestPingClick);
  document.getElementById('test-speed-btn')?.addEventListener('click', handleTestSpeedClick);

  document.getElementById('update-now-btn')?.addEventListener('click', () => {
    showPasswordModal({ type: 'app-update' });
  });
  document.getElementById('update-later-btn')?.addEventListener('click', () => {
    document.getElementById('update-overlay')?.classList.add('hidden');
  });
  document.getElementById('update-overlay-close')?.addEventListener('click', () => {
    document.getElementById('update-overlay')?.classList.add('hidden');
  });

  document.getElementById('lock-retry-btn')?.addEventListener('click', retryLastOperation);
  document.getElementById('lock-close-btn')?.addEventListener('click', () => {
    document.getElementById('lock-diagnosis')?.classList.add('hidden');
  });

  document.getElementById('cancel-btn')?.addEventListener('click', cancelOperation);

  document.getElementById('tools-list')?.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.tool-info-btn');
    if (!btn) return;
    const toolName = btn.dataset.tool!;
    const invoke = getInvoke();
    if (!invoke) return;
    try {
      const info = await invoke<PackageDetail>('get_package_info', { toolName });
      document.getElementById('info-name')!.textContent = toolName;
      document.getElementById('info-package')!.textContent = info.package_name || toolName;
      document.getElementById('info-desc')!.textContent = info.description || 'N/A';
      document.getElementById('info-version')!.textContent = info.version || 'N/A';
      document.getElementById('info-size')!.textContent = info.size || 'N/A';
      document.getElementById('info-status')!.textContent = info.installed ? 'Instalado ✓' : 'Ausente ✗';
      const icon = document.getElementById('info-icon') as HTMLImageElement | null;
      if (icon && info.icon_base64) {
        icon.src = info.icon_base64;
        icon.style.display = 'inline-block';
      }
      document.getElementById('info-overlay')!.classList.remove('hidden');
    } catch (e) {
      console.error('get_package_info failed:', e);
      showToast('error', `Erro ao buscar informações de ${toolName}.`);
    }
  });
  document.getElementById('info-close')?.addEventListener('click', () => {
    document.getElementById('info-overlay')!.classList.add('hidden');
  });
  document.getElementById('info-close-btn')?.addEventListener('click', () => {
    document.getElementById('info-overlay')!.classList.add('hidden');
  });

  const outputSectionHeader = document.querySelector<HTMLElement>('#output-section .section-header');
  outputSectionHeader?.addEventListener('click', () => {
    const target = document.getElementById('output-log');
    const arrow = document.querySelector<HTMLElement>('#output-section .collapse-arrow');
    if (!target) return;
    const isOpen = !target.classList.contains('closed');
    target.classList.toggle('closed', isOpen);
    if (arrow) arrow.classList.toggle('collapsed', isOpen);
  });

  loadConnectivity();
  loadExternalInfo();
  loadProcesses();
  loadHomeStats();
  initFooter();

  document.getElementById('footer-check-link')?.addEventListener('click', handleCheckUpdateClick);

  document.getElementById('footer-update-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    const invoke = getInvoke();
    if (!invoke) return;
    invoke<AppUpdateInfo>('check_app_update').then(info => {
      if (info.update_available) {
        showUpdateBanner(info);
      }
    }).catch(() => {
      showToast('error', 'Erro ao verificar atualizações.');
    });
  });

  setInterval(pollStats, 3000);
  setInterval(loadConnectivity, 10000);
  setInterval(loadProcesses, 3000);
  setInterval(loadHomeStats, 30000);

  document.querySelectorAll<HTMLElement>('#process-table th').forEach(th => {
    th.addEventListener('click', () => {
      handleProcessSortClick(th.dataset.sort || '');
    });
  });

  document.getElementById('process-search')?.addEventListener('input', handleProcessSearch);

  // ─── Package Tabs ───

  document.querySelectorAll('.pkg-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.pkg-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.pkg-tab-content').forEach(c => c.classList.remove('active'));
      const target = document.getElementById('pkg-tab-' + (tab as HTMLElement).dataset.pkgTab);
      if (target) target.classList.add('active');

      const tabName = (tab as HTMLElement).dataset.pkgTab;
      if (tabName === 'installed') loadInstalledPackages();
      else if (tabName === 'history') loadPackageHistory();
    });
  });

  document.getElementById('pkg-installed-search')?.addEventListener('input', () => {
    loadInstalledPackages();
  });
  document.getElementById('pkg-refresh-btn')?.addEventListener('click', loadInstalledPackages);
  document.getElementById('pkg-remove-btn')?.addEventListener('click', handleRemovePackages);

  let searchTimeout: ReturnType<typeof setTimeout>;
  document.getElementById('pkg-search-input')?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = (document.getElementById('pkg-search-input') as HTMLInputElement)?.value || '';
    searchTimeout = setTimeout(() => handleSearchRepoPackages(q), 400);
  });
  document.getElementById('pkg-install-repo-btn')?.addEventListener('click', handleInstallRepoPackages);

  // ─── Package Upload (kept from before) ───

  const pkgFileInput = document.getElementById('pkg-file-input') as HTMLInputElement | null;
  const pkgUploadArea = document.getElementById('pkg-upload-area');

  pkgFileInput?.addEventListener('change', () => {
    const file = pkgFileInput.files?.[0] || null;
    handlePkgFileSelect(file);
  });

  pkgUploadArea?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).tagName !== 'INPUT') {
      pkgFileInput?.click();
    }
  });

  pkgUploadArea?.addEventListener('dragover', (e) => {
    e.preventDefault();
    pkgUploadArea.classList.add('drag-over');
  });
  pkgUploadArea?.addEventListener('dragenter', (e) => {
    e.preventDefault();
    pkgUploadArea.classList.add('drag-over');
  });
  pkgUploadArea?.addEventListener('dragleave', (e) => {
    const related = e.relatedTarget as Node | null;
    if (!related || !pkgUploadArea.contains(related)) {
      pkgUploadArea.classList.remove('drag-over');
    }
  });
  pkgUploadArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    pkgUploadArea.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (pkgFileInput) {
        const dt = new DataTransfer();
        dt.items.add(file);
        pkgFileInput.files = dt.files;
        pkgFileInput.dispatchEvent(new Event('change'));
      } else {
        handlePkgFileSelect(file);
      }
    }
  });

  document.getElementById('pkg-install-btn')?.addEventListener('click', () => {
    showPasswordModal({ type: 'install-package' });
  });
  // ─── Backup ───

  document.getElementById('backup-start-btn')?.addEventListener('click', handleStartBackup);
  document.getElementById('backup-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('backup-overlay')?.classList.add('hidden');
  });
  document.getElementById('backup-close-btn')?.addEventListener('click', () => {
    document.getElementById('backup-overlay')?.classList.add('hidden');
  });

  document.getElementById('pkg-clear-btn')?.addEventListener('click', () => {
    if (pkgFileInput) pkgFileInput.value = '';
    handlePkgFileSelect(null);
  });

  // ─── Script Analyzer ───

  const scriptFileInput = document.getElementById('script-file-input') as HTMLInputElement | null;
  const scriptUploadArea = document.getElementById('script-upload-area');

  scriptFileInput?.addEventListener('change', () => {
    const file = scriptFileInput.files?.[0] || null;
    handleScriptDrop(file);
  });

  scriptUploadArea?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).tagName !== 'INPUT') {
      scriptFileInput?.click();
    }
  });

  scriptUploadArea?.addEventListener('dragover', (e) => {
    e.preventDefault();
    scriptUploadArea.classList.add('drag-over');
  });
  scriptUploadArea?.addEventListener('dragenter', (e) => {
    e.preventDefault();
    scriptUploadArea.classList.add('drag-over');
  });
  scriptUploadArea?.addEventListener('dragleave', (e) => {
    const related = e.relatedTarget as Node | null;
    if (!related || !scriptUploadArea.contains(related)) {
      scriptUploadArea.classList.remove('drag-over');
    }
  });
  scriptUploadArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    scriptUploadArea.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (scriptFileInput) {
        const dt = new DataTransfer();
        dt.items.add(file);
        scriptFileInput.files = dt.files;
        scriptFileInput.dispatchEvent(new Event('change'));
      } else {
        handleScriptDrop(file);
      }
    }
  });

  document.getElementById('script-clear-file-btn')?.addEventListener('click', () => {
    if (scriptFileInput) scriptFileInput.value = '';
    clearScriptAnalysis();
  });

  // ─── Script Tabs (File / Paste) ───

  document.querySelectorAll('[data-script-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-script-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabName = (tab as HTMLElement).dataset.scriptTab;
      document.querySelectorAll('.script-tab-content').forEach(c => c.classList.remove('active'));
      const target = document.getElementById('script-tab-' + tabName);
      if (target) target.classList.add('active');
      clearScriptAnalysis();
    });
  });

  // ─── Script Textarea ───

  const scriptTextarea = document.getElementById('script-textarea') as HTMLTextAreaElement | null;
  const scriptAnalyzeBtn = document.getElementById('script-analyze-btn') as HTMLButtonElement | null;
  const scriptClearTextBtn = document.getElementById('script-clear-text-btn');

  scriptTextarea?.addEventListener('input', () => {
    const hasText = (scriptTextarea.value.trim().length > 0);
    if (scriptAnalyzeBtn) scriptAnalyzeBtn.disabled = !hasText;
    if (scriptClearTextBtn) scriptClearTextBtn.style.display = hasText ? '' : 'none';
  });

  scriptAnalyzeBtn?.addEventListener('click', () => {
    if (scriptTextarea?.value.trim()) {
      handleAnalyzeText(scriptTextarea.value);
    }
  });

  scriptTextarea?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (scriptTextarea.value.trim()) {
        handleAnalyzeText(scriptTextarea.value);
      }
    }
  });

  scriptClearTextBtn?.addEventListener('click', () => {
    clearScriptAnalysis();
  });

  // Load installed packages on initial page load
  loadInstalledPackages();
});
