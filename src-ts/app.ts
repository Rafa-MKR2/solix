// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rafa-MKR2

import { systemService, packageService, miscService } from './shared/services/index.js';
import { loadHomeStats, pollStats } from './features/home/index.js';
import {
  setupNav,
  setupHelpTooltips,
  setupLockActions,
  switchToPage,
  handleProcessSortClick,
  handleProcessSearch,
  setRetryLastOperationFn,
  loadProcesses,
} from './ui.js';
import { loadSystemInfo, setupProgressListener, cancelOperation, retryLastOperation, toolStatuses, confirmPassword, cancelPassword } from './operations.js';
import { handleShowSmartInfo, handleStartBackup } from './features/disks/index.js';
import { renderTools, selectedTools, removedTools } from './features/tools/index.js';
import {
  handlePkgFileSelect,
  loadInstalledPackages,
  handleRemovePackages,
  handleSearchRepoPackages,
  handleInstallRepoPackages,
  loadPackageHistory,
} from './features/packages/index.js';
import {
  loadConnectivity,
  loadExternalInfo,
  handleTestPingClick,
  handleTestSpeedClick,
} from './features/network/index.js';
import {
  setupUpdateListener,
  handleAppUpdate,
  initFooter,
  handleCheckUpdateClick,
  showUpdateBanner,
} from './features/update/index.js';
import {
  reportProblem,
  handleCopyReport,
  handleOpenIssue,
  handleSaveReport,
  handleEmailReport,
  hideReportModal,
} from './features/report/index.js';
import {
  handleScriptDrop,
  handleAnalyzeText,
  clearScriptAnalysis,
} from './features/script/index.js';
import { initDeveloperPage } from './features/developer/index.js';

document.addEventListener('DOMContentLoaded', () => {
  // Core setup
  setupNav();
  setupHelpTooltips();
  setupLockActions();
  setupProgressListener();
  setupUpdateListener();

  // Retry handler for lock diagnosis
  setRetryLastOperationFn(retryLastOperation);

  // Initial data load
  loadSystemInfo();
  loadConnectivity();
  loadExternalInfo();
  loadProcesses();
  loadHomeStats();
  initFooter();

  // Search filter for tools
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (selectedTools.size > 0 || removedTools.size > 0) {
        import('./features/tools/render.js').then(m => m.renderTools(toolStatuses));
      }
    });
  }

  // Tool actions - delegate to features/tools
  document.getElementById('install-btn')?.addEventListener('click', () => {
    if (selectedTools.size > 0) {
      import('./features/tools/index.js').then(m => m.showInstallPasswordModal(Array.from(selectedTools)));
    }
  });
  document.getElementById('remove-btn')?.addEventListener('click', () => {
    if (removedTools.size > 0) {
      import('./features/tools/index.js').then(m => m.showRemovePasswordModal(Array.from(removedTools)));
    }
  });

  // System operations - delegate to features
  document.getElementById('update-btn')?.addEventListener('click', () => {
    import('./features/update/index.js').then(m => m.showUpdateConfirmDialog());
  });
  document.getElementById('zram-btn')?.addEventListener('click', () => {
    import('./features/tools/index.js').then(m => m.showZramPasswordModal());
  });
  document.getElementById('cleanup-btn')?.addEventListener('click', () => {
    import('./features/tools/index.js').then(m => m.showCleanupPasswordModal());
  });

  // Navigation bridge
  document.getElementById('tools-to-packages-btn')?.addEventListener('click', () => {
    switchToPage('pacotes');
    const searchTab = document.querySelector<HTMLElement>('[data-pkg-tab="search"]');
    if (searchTab) searchTab.click();
    setTimeout(() => {
      (document.getElementById('pkg-search-input') as HTMLInputElement)?.focus();
    }, 150);
  });

  // Report - delegate to features/report
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

  // Developer page
  document.getElementById('dev-github-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await miscService.openUrl('https://github.com/Rafa-MKR2/solix');
    } catch {
      window.open('https://github.com/Rafa-MKR2/solix', '_blank');
    }
  });
  initDeveloperPage();

  // Network tests
  document.getElementById('test-ping-btn')?.addEventListener('click', handleTestPingClick);
  document.getElementById('test-speed-btn')?.addEventListener('click', handleTestSpeedClick);

  // Update actions
  document.getElementById('update-now-btn')?.addEventListener('click', () => {
    import('./features/update/index.js').then(m => m.showUpdatePasswordModal());
  });
  document.getElementById('update-later-btn')?.addEventListener('click', () => {
    document.getElementById('update-overlay')?.classList.add('hidden');
  });
  document.getElementById('update-overlay-close')?.addEventListener('click', () => {
    document.getElementById('update-overlay')?.classList.add('hidden');
  });

  // Lock diagnosis
  document.getElementById('lock-retry-btn')?.addEventListener('click', retryLastOperation);
  document.getElementById('lock-close-btn')?.addEventListener('click', () => {
    document.getElementById('lock-diagnosis')?.classList.add('hidden');
  });

  // Cancel operation
  document.getElementById('cancel-btn')?.addEventListener('click', cancelOperation);

  // Password modal (legacy)
  document.getElementById('password-confirm')?.addEventListener('click', confirmPassword);
  document.getElementById('password-cancel')?.addEventListener('click', cancelPassword);
  document.getElementById('password-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmPassword();
  });

  // Tool info modal
  document.getElementById('tools-list')?.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.tool-info-btn');
    if (!btn) return;
    const toolName = btn.dataset.tool!;
    try {
      const info = await packageService.getPackageInfo(toolName);
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
      import('./utils.js').then(m => m.showToast('error', `Erro ao buscar informações de ${toolName}.`));
    }
  });
  document.getElementById('info-close')?.addEventListener('click', () => {
    document.getElementById('info-overlay')!.classList.add('hidden');
  });
  document.getElementById('info-close-btn')?.addEventListener('click', () => {
    document.getElementById('info-overlay')!.classList.add('hidden');
  });

  // Output section collapse
  const outputSectionHeader = document.querySelector<HTMLElement>('#output-section .section-header');
  outputSectionHeader?.addEventListener('click', () => {
    const target = document.getElementById('output-log');
    const arrow = document.querySelector<HTMLElement>('#output-section .collapse-arrow');
    if (!target) return;
    const isOpen = !target.classList.contains('closed');
    target.classList.toggle('closed', isOpen);
    if (arrow) arrow.classList.toggle('collapsed', isOpen);
  });

  // Footer update check
  document.getElementById('footer-check-link')?.addEventListener('click', handleCheckUpdateClick);
  document.getElementById('footer-update-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    systemService.checkAppUpdate().then(info => {
      if (info.update_available) {
        showUpdateBanner(info);
      }
    }).catch(() => {
      import('./utils.js').then(m => m.showToast('error', 'Erro ao verificar atualizações.'));
    });
  });

  // Intervals
  setInterval(pollStats, 3000);
  setInterval(loadConnectivity, 10000);
  setInterval(loadProcesses, 3000);
  setInterval(loadHomeStats, 30000);

  // Process table
  document.querySelectorAll<HTMLElement>('#process-table th').forEach(th => {
    th.addEventListener('click', () => {
      handleProcessSortClick(th.dataset.sort || '');
    });
  });
  document.getElementById('process-search')?.addEventListener('input', handleProcessSearch);

  // Package tabs
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

  // Package upload
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
    e.dataTransfer!.dropEffect = 'copy';
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
    e.stopPropagation();
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
    import('./features/packages/index.js').then(m => m.showInstallPackagePasswordModal());
  });

  // Backup
  document.getElementById('backup-start-btn')?.addEventListener('click', handleStartBackup);
  document.getElementById('backup-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('backup-overlay')?.classList.add('hidden');
  });
  document.getElementById('backup-close-btn')?.addEventListener('click', () => {
    document.getElementById('backup-overlay')?.classList.add('hidden');
  });

  // SMART
  document.getElementById('smart-close-btn')?.addEventListener('click', () => {
    document.getElementById('smart-overlay')?.classList.add('hidden');
  });
  document.getElementById('smart-close-btn-2')?.addEventListener('click', () => {
    document.getElementById('smart-overlay')?.classList.add('hidden');
  });
  document.getElementById('smart-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      (e.currentTarget as HTMLElement).classList.add('hidden');
    }
  });
  document.getElementById('smart-overlay')?.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest('#smart-install-btn');
    if (!btn) return;
    try {
      await miscService.openUrl('https://www.smartmontools.org/');
    } catch (err) {
      console.error('open smartmontools url failed:', err);
    }
  });

  document.getElementById('pkg-clear-btn')?.addEventListener('click', () => {
    if (pkgFileInput) pkgFileInput.value = '';
    handlePkgFileSelect(null);
  });

  // Script Analyzer
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
    e.dataTransfer!.dropEffect = 'copy';
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
    e.stopPropagation();
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

  // Script Tabs
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

  // Script Textarea
  const scriptTextarea = document.getElementById('script-textarea') as HTMLTextAreaElement | null;
  const scriptAnalyzeBtn = document.getElementById('script-analyze-btn') as HTMLButtonElement | null;
  const scriptClearTextBtn = document.getElementById('script-clear-text-btn');

  scriptTextarea?.addEventListener('input', () => {
    const hasText = (scriptTextarea!.value.trim().length > 0);
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
      if (scriptTextarea!.value.trim()) {
        handleAnalyzeText(scriptTextarea.value);
      }
    }
  });

  scriptClearTextBtn?.addEventListener('click', () => {
    clearScriptAnalysis();
  });

  // Initial load
  loadInstalledPackages();
});