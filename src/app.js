import { getInvoke, showToast } from './utils.js';
import { setupNav, setupHelpTooltips, setupLockActions, renderTools, selectedTools, removedTools, showUpdateBanner, handleProcessSortClick, handleProcessSearch, setRetryLastOperationFn, loadHomeStats, pollStats, loadProcesses, } from './ui.js';
import { loadSystemInfo, confirmPassword, cancelPassword, showPasswordModal, reportProblem, initFooter, handleCheckUpdateClick, cancelOperation, retryLastOperation, setupProgressListener, setupUpdateListener, toolStatuses, handlePkgFileSelect, } from './operations.js';
import { loadConnectivity, loadExternalInfo, handleTestPingClick, handleTestSpeedClick, } from './network.js';
document.addEventListener('DOMContentLoaded', () => {
    setupNav();
    setupHelpTooltips();
    setupLockActions();
    setupProgressListener();
    setupUpdateListener();
    setRetryLastOperationFn(retryLastOperation);
    loadSystemInfo();
    document.getElementById('password-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter')
            confirmPassword();
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
            if (toolStatuses.length)
                renderTools(toolStatuses);
        });
    }
    document.getElementById('install-btn')?.addEventListener('click', () => {
        if (selectedTools.size === 0)
            return;
        showPasswordModal({ type: 'install', tools: Array.from(selectedTools) });
    });
    document.getElementById('remove-btn')?.addEventListener('click', () => {
        if (removedTools.size === 0)
            return;
        showPasswordModal({ type: 'remove', tools: Array.from(removedTools) });
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
        const btn = e.target.closest('.tool-info-btn');
        if (!btn)
            return;
        const toolName = btn.dataset.tool;
        const invoke = getInvoke();
        if (!invoke)
            return;
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
        }
        catch (e) {
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
    const outputSectionHeader = document.querySelector('#output-section .section-header');
    outputSectionHeader?.addEventListener('click', () => {
        const target = document.getElementById('output-log');
        const arrow = document.querySelector('#output-section .collapse-arrow');
        if (!target)
            return;
        const isOpen = !target.classList.contains('closed');
        target.classList.toggle('closed', isOpen);
        if (arrow)
            arrow.classList.toggle('collapsed', isOpen);
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
        if (!invoke)
            return;
        invoke('check_app_update').then(info => {
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
    document.querySelectorAll('#process-table th').forEach(th => {
        th.addEventListener('click', () => {
            handleProcessSortClick(th.dataset.sort || '');
        });
    });
    document.getElementById('process-search')?.addEventListener('input', handleProcessSearch);
    const pkgFileInput = document.getElementById('pkg-file-input');
    const pkgUploadArea = document.getElementById('pkg-upload-area');
    pkgFileInput?.addEventListener('change', () => {
        const file = pkgFileInput.files?.[0] || null;
        handlePkgFileSelect(file);
    });
    pkgUploadArea?.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
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
        const related = e.relatedTarget;
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
            }
            else {
                handlePkgFileSelect(file);
            }
        }
    });
    document.getElementById('pkg-install-btn')?.addEventListener('click', () => {
        showPasswordModal({ type: 'install-package' });
    });
    document.getElementById('pkg-clear-btn')?.addEventListener('click', () => {
        if (pkgFileInput)
            pkgFileInput.value = '';
        handlePkgFileSelect(null);
    });
});
