import { getInvoke, showToast } from '../../utils.js';
import { systemService } from '../../shared/services/index.js';
import { passwordVerified, setPasswordVerified } from '../../shared/auth.js';
import { showPasswordModal } from '../../operations.js';
import { showUpdateBanner, showUpdateProgress, hideUpdateModal, } from './banner.js';
export function setupUpdateListener() {
    const invoke = getInvoke();
    if (!invoke)
        return;
    const tauri = window.__TAURI_INTERNALS__;
    if (!tauri?.transformCallback)
        return;
    const handler = tauri.transformCallback((event) => {
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
    }).catch(() => { });
}
export async function handleAppUpdate() {
    showUpdateProgress('download', 0, 'Preparando...');
    const doUpdate = async () => {
        try {
            await systemService.installUpdate();
        }
        catch (e) {
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
    }
    else {
        showPasswordModal({ type: 'app-update' });
    }
}
export async function initFooter() {
    try {
        const version = await systemService.getAppVersion();
        const footerEl = document.getElementById('footer-version');
        if (footerEl)
            footerEl.textContent = `Solix v${version}`;
    }
    catch (e) {
        console.error('initFooter failed:', e);
    }
    setTimeout(checkForAppUpdate, 2000);
}
async function checkForAppUpdate() {
    const checkLink = document.getElementById('footer-check-link');
    if (checkLink)
        checkLink.classList.add('checking');
    try {
        const info = await systemService.checkAppUpdate();
        if (checkLink) {
            checkLink.textContent = '🔍 Verificar atualizações';
            checkLink.classList.remove('checking');
        }
        if (info.update_available) {
            const footerVersion = document.getElementById('footer-version');
            if (footerVersion)
                footerVersion.textContent = `Solix v${info.current_version}`;
            const updateBtn = document.getElementById('footer-update-btn');
            const updateText = document.getElementById('footer-update-text');
            if (updateBtn)
                updateBtn.classList.remove('hidden');
            if (updateText) {
                updateText.classList.remove('hidden');
                updateText.textContent = `v${info.latest_version} disponível!`;
            }
            showUpdateBanner(info);
        }
    }
    catch (e) {
        console.error('checkForAppUpdate failed:', e);
        if (checkLink) {
            checkLink.textContent = '🔍 Verificar atualizações';
            checkLink.classList.remove('checking');
        }
    }
}
export async function handleCheckUpdateClick() {
    const el = document.getElementById('footer-check-link');
    if (el)
        el.textContent = '⏳ Verificando...';
    await checkForAppUpdate();
    const checkLink = document.getElementById('footer-check-link');
    if (checkLink && !checkLink.classList.contains('checking')) {
        checkLink.textContent = '🔍 Verificar atualizações';
    }
}
