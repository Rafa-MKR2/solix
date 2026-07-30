import { showToast } from '../../shared/utils/index.js';
import { backupService } from '../../shared/services/index.js';
export function showBackupModal(mountPoint) {
    const overlay = document.getElementById('backup-overlay');
    const sourceEl = document.getElementById('backup-source');
    const resultEl = document.getElementById('backup-result');
    const progressEl = document.getElementById('backup-progress');
    if (!overlay)
        return;
    if (sourceEl)
        sourceEl.textContent = mountPoint;
    if (resultEl)
        resultEl.classList.add('hidden');
    if (progressEl)
        progressEl.classList.add('hidden');
    const statusEl = document.getElementById('backup-progress-status');
    const fillEl = document.getElementById('backup-progress-fill');
    const textEl = document.getElementById('backup-progress-text');
    const startBtn = document.getElementById('backup-start-btn');
    const cancelBtn = document.getElementById('backup-cancel-btn');
    if (statusEl)
        statusEl.textContent = '⏳ Comprimindo...';
    if (fillEl)
        fillEl.style.width = '0%';
    if (textEl)
        textEl.textContent = '0%';
    if (startBtn)
        startBtn.disabled = false;
    if (cancelBtn)
        cancelBtn.textContent = 'Cancelar';
    const destInput = document.getElementById('backup-destination');
    if (destInput) {
        if (mountPoint === '/home') {
            destInput.placeholder = 'ex: /home/seu usuario/backups';
            destInput.value = '';
        }
        else if (mountPoint === '/') {
            destInput.value = '/root/backups';
        }
        else if (mountPoint.startsWith('/media') || mountPoint.startsWith('/mnt')) {
            destInput.value = mountPoint + '/backups';
        }
        else {
            destInput.value = mountPoint.replace(/\/[^/]+$/, '') + '/backups';
        }
    }
    overlay.classList.remove('hidden');
}
export async function handleStartBackup() {
    const source = document.getElementById('backup-source')?.textContent || '';
    const destInput = document.getElementById('backup-destination');
    const destination = destInput?.value?.trim() || '';
    if (!source || !destination) {
        showToast('error', 'Selecione uma origem e destino para o backup.');
        return;
    }
    const progressEl = document.getElementById('backup-progress');
    const resultEl = document.getElementById('backup-result');
    const statusEl = document.getElementById('backup-progress-status');
    const fillEl = document.getElementById('backup-progress-fill');
    const textEl = document.getElementById('backup-progress-text');
    const startBtn = document.getElementById('backup-start-btn');
    const cancelBtn = document.getElementById('backup-cancel-btn');
    if (progressEl)
        progressEl.classList.remove('hidden');
    if (resultEl)
        resultEl.classList.add('hidden');
    if (statusEl)
        statusEl.textContent = '⏳ Comprimindo...';
    if (fillEl)
        fillEl.style.width = '0%';
    if (textEl)
        textEl.textContent = '0%';
    if (startBtn)
        startBtn.disabled = true;
    if (cancelBtn)
        cancelBtn.textContent = '⏳';
    try {
        const result = await backupService.createBackup(source, destination, source);
        if (result.success) {
            if (statusEl)
                statusEl.textContent = '✅ Backup concluído!';
            if (fillEl)
                fillEl.style.width = '100%';
            if (textEl)
                textEl.textContent = '100%';
            if (resultEl) {
                resultEl.classList.remove('hidden');
                document.getElementById('backup-result-title').textContent = '✅ Backup concluído!';
                document.getElementById('backup-result-sub').textContent =
                    `${result.file_size} • ${result.duration_secs}s • ${result.file_path}`;
            }
            showToast('success', `Backup criado: ${result.file_size}`);
        }
        else {
            throw new Error(result.error || 'Erro desconhecido');
        }
    }
    catch (e) {
        const msg = (e + '') || 'Erro ao criar backup';
        if (statusEl)
            statusEl.textContent = '❌ ' + msg;
        if (fillEl)
            fillEl.style.width = '0%';
        if (resultEl) {
            resultEl.classList.remove('hidden');
            document.getElementById('backup-result-title').textContent = '❌ Falha no backup';
            document.getElementById('backup-result-sub').textContent = msg;
        }
        showToast('error', msg);
    }
    finally {
        if (startBtn)
            startBtn.disabled = false;
        if (cancelBtn)
            cancelBtn.textContent = 'Cancelar';
    }
}
