import { listen } from '@tauri-apps/api/event';
import { getInvoke, showToast, setText } from './utils.js';
import { renderTools, renderDisks, selectedTools, removedTools, showLockDiagnosis, switchToPage, showUpdateBanner, } from './ui.js';
export let toolStatuses = [];
export let systemDistro = '';
let cachedPassword = '';
let pendingAction = null;
let lastPendingAction = null;
let isOperating = false;
let pendingPkgData = null;
let pendingPkgFileName = null;
export function setupProgressListener() {
    listen('operation-progress', (event) => {
        const { current, total, tool_name, status } = event.payload;
        const area = document.getElementById('progress-area');
        const fill = document.getElementById('progress-bar-fill');
        const text = document.getElementById('progress-text');
        if (!area || !fill || !text)
            return;
        if (status === 'done') {
            area.classList.add('hidden');
            return;
        }
        area.classList.remove('hidden');
        const pct = Math.round((current / total) * 100);
        fill.style.width = pct + '%';
        text.textContent = tool_name ? `${tool_name} (${current}/${total})` : `${pct}%`;
    });
}
export async function loadSystemInfo() {
    const invoke = getInvoke();
    if (!invoke)
        return;
    try {
        const info = await invoke('get_system_info');
        if (info.distribution) {
            setText('distro-name', info.distribution.name);
            setText('distro-version', info.distribution.version);
            setText('distro-family', info.distribution.family);
            setText('distro-pm', info.distribution.package_manager);
            systemDistro = info.distribution.package_manager;
            const pmBadge = document.getElementById('pm-badge');
            if (pmBadge)
                pmBadge.textContent = `📦 ${info.distribution.package_manager}`;
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
            }
            else {
                const initial = (u.full_name || u.username).charAt(0).toUpperCase();
                document.getElementById('avatar-placeholder').textContent = initial;
            }
        }
        toolStatuses = info.tools || [];
        renderTools(toolStatuses);
    }
    catch (err) {
        console.error('loadSystemInfo failed:', err);
        showToast('error', 'Erro ao carregar informações do sistema.');
    }
}
export async function confirmPassword() {
    const input = document.getElementById('password-input');
    const error = document.getElementById('password-error');
    const password = input?.value || '';
    if (!password)
        return;
    const invoke = getInvoke();
    if (!invoke)
        return;
    try {
        const result = await invoke('install_tools', { toolNames: ['__verify__'], password });
        if (result && result[0] && !result[0].success) {
            if (error)
                error.classList.remove('hidden');
            return;
        }
    }
    catch (e) {
        const msg = (e + '').toLowerCase();
        if (msg.includes('senha') || msg.includes('password') || msg.includes('incorrect') || msg.includes('tentativa')) {
            if (error)
                error.classList.remove('hidden');
            return;
        }
        console.error('confirmPassword error:', e);
        showToast('error', 'Erro ao verificar senha. Tente novamente.');
        return;
    }
    cachedPassword = password;
    document.getElementById('password-overlay').classList.add('hidden');
    if (error)
        error.classList.add('hidden');
    if (input)
        input.value = '';
    executePending();
}
export function cancelPassword() {
    document.getElementById('password-overlay').classList.add('hidden');
    document.getElementById('password-error').classList.add('hidden');
    pendingAction = null;
    const input = document.getElementById('password-input');
    if (input)
        input.value = '';
}
export async function showPasswordModal(action) {
    pendingAction = action;
    if (cachedPassword) {
        const invoke = getInvoke();
        if (invoke) {
            try {
                await invoke('install_tools', { toolNames: ['__verify__'], password: cachedPassword });
                executePending();
                return;
            }
            catch (e) {
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
async function executePending() {
    const invoke = getInvoke();
    if (!invoke || !pendingAction || isOperating)
        return;
    isOperating = true;
    switchToPage('sistema');
    const outputLog = document.getElementById('output-log');
    const outputSection = document.getElementById('output-section');
    const cancelBtn = document.getElementById('cancel-btn');
    if (outputLog)
        outputLog.textContent = '';
    if (outputSection)
        outputSection.classList.remove('hidden');
    if (outputSection)
        outputSection.classList.remove('closed');
    if (cancelBtn)
        cancelBtn.classList.remove('hidden');
    const isUpdate = pendingAction.type === 'update';
    const isZram = pendingAction.type === 'zram';
    const isCleanup = pendingAction.type === 'cleanup';
    const isInstall = pendingAction.type === 'install';
    const isRemove = pendingAction.type === 'remove';
    const isInstallPkg = pendingAction.type === 'install-package';
    if (outputLog) {
        if (isInstall)
            outputLog.textContent = '⏳ Instalando...\n';
        else if (isRemove)
            outputLog.textContent = '⏳ Removendo...\n';
        else if (isUpdate)
            outputLog.textContent = '⏳ Atualizando sistema...\n';
        else if (isZram)
            outputLog.textContent = '⏳ Ativando ZRAM...\n';
        else if (isCleanup)
            outputLog.textContent = '⏳ Limpando sistema...\n';
        else if (isInstallPkg)
            outputLog.textContent = '🔐 Instalando pacote...\n';
    }
    try {
        let result;
        if (isUpdate) {
            result = await invoke('update_system', { password: cachedPassword });
        }
        else if (isZram) {
            result = await invoke('enable_zram', { password: cachedPassword });
        }
        else if (isCleanup) {
            result = await invoke('cleanup_system', { password: cachedPassword });
        }
        else if (isInstall) {
            result = await invoke('install_tools', { toolNames: pendingAction.tools, password: cachedPassword });
        }
        else if (isRemove) {
            result = await invoke('remove_tools', { toolNames: pendingAction.tools, password: cachedPassword });
        }
        else if (isInstallPkg) {
            result = await invoke('install_package_data', {
                data: pendingPkgData,
                fileName: pendingPkgFileName,
                password: cachedPassword,
            });
        }
        if (outputLog) {
            if (Array.isArray(result)) {
                const hasLockError = result.some(r => !r.success && (r.error?.includes('db.lck') ||
                    r.error?.includes('não foi possível travar') ||
                    r.error?.includes('could not lock') ||
                    r.error?.includes('Could not get lock') ||
                    r.error?.includes('unable to lock')));
                outputLog.textContent = result.map(r => {
                    const name = r.tool_name || 'desconhecido';
                    if (r.cancelled)
                        return `${name}: cancelado`;
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
            }
            else if (result) {
                const r = result;
                outputLog.textContent = r.output || JSON.stringify(r, null, 2);
            }
        }
        if (result) {
            const failed = Array.isArray(result) ? result.filter(r => !r.success) : [];
            if (failed.length === 0) {
                showToast('success', isUpdate ? 'Sistema atualizado!' : isZram ? 'ZRAM ativado!' : isCleanup ? 'Limpeza concluída!' : 'Operação concluída!');
            }
            else {
                showToast('error', `Falha em ${failed.length} item(ns)`);
            }
        }
        if (!isUpdate && !isZram && !isCleanup) {
            if (!isInstallPkg) {
                selectedTools.clear();
                removedTools.clear();
                await loadSystemInfo();
                const removeBtn = document.getElementById('remove-btn');
                if (removeBtn)
                    removeBtn.style.display = 'none';
            }
        }
        document.getElementById('lock-diagnosis')?.classList.add('hidden');
    }
    catch (err) {
        const msg = (err + '').toLowerCase();
        let friendly = 'Erro na operação.';
        if (msg.includes('db.lck') || msg.includes('não foi possível travar') || msg.includes('could not lock') || msg.includes('unable to lock')) {
            friendly = 'Outro gerenciador de pacotes está em execução. Feche o Pamac/Discover/terminal e tente novamente.';
            showLockDiagnosis();
        }
        else if (msg.includes('password') || msg.includes('senha')) {
            friendly = 'Senha incorreta. Tente novamente.';
        }
        if (outputLog)
            outputLog.textContent = friendly;
        showToast('error', friendly);
    }
    finally {
        isOperating = false;
        lastPendingAction = pendingAction;
        pendingAction = null;
        if (cancelBtn)
            cancelBtn.classList.add('hidden');
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
export function retryLastOperation() {
    const action = pendingAction || lastPendingAction;
    if (!action && !cachedPassword)
        return;
    document.getElementById('lock-diagnosis')?.classList.add('hidden');
    if (action) {
        showPasswordModal(action);
    }
    else if (cachedPassword) {
        showToast('error', 'Selecione a operação novamente.');
    }
}
export async function handlePkgFileSelect(file) {
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
        if (infoCard)
            infoCard.classList.add('hidden');
        return;
    }
    const invoke = getInvoke();
    if (!invoke)
        return;
    if (installBtn) {
        installBtn.disabled = true;
        installBtn.textContent = '⏳ Analisando...';
    }
    if (infoCard)
        infoCard.classList.remove('hidden');
    if (nameEl)
        nameEl.textContent = file.name;
    if (versionEl)
        versionEl.textContent = 'Analisando...';
    if (sizeEl)
        sizeEl.textContent = '—';
    if (archEl)
        archEl.textContent = '—';
    if (depsEl)
        depsEl.textContent = '—';
    if (descEl)
        descEl.textContent = '—';
    if (compatEl)
        compatEl.className = 'pkg-compat';
    if (typeEl)
        typeEl.textContent = file.name.endsWith('.deb') ? '📦' : '📀';
    try {
        const base64 = await readFileAsBase64(file);
        const info = await invoke('inspect_package_data', {
            data: base64,
            fileName: file.name,
        });
        pendingPkgData = base64;
        pendingPkgFileName = file.name;
        if (nameEl)
            nameEl.textContent = info.package_name || file.name;
        if (versionEl)
            versionEl.textContent = info.version;
        if (sizeEl)
            sizeEl.textContent = info.file_size;
        if (archEl)
            archEl.textContent = info.architecture;
        if (descEl)
            descEl.textContent = info.description || 'Sem descrição';
        if (typeEl)
            typeEl.textContent = info.package_type === 'deb' ? '📦' : '📀';
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
    }
    catch (e) {
        console.error('inspect_package_data failed:', e);
        if (versionEl)
            versionEl.textContent = '❌ Erro';
        if (compatEl) {
            compatEl.textContent = '❌ ' + (e + '');
            compatEl.className = 'pkg-compat incompatible';
        }
        if (installBtn) {
            installBtn.disabled = true;
            installBtn.textContent = '⬇️ Instalar Pacote';
        }
    }
}
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            const base64 = result.split(',')[1] || result;
            resolve(base64);
        };
        reader.onerror = () => reject('Erro ao ler arquivo');
        reader.readAsDataURL(file);
    });
}
export async function initFooter() {
    const invoke = getInvoke();
    if (!invoke)
        return;
    try {
        const version = await invoke('get_app_version');
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
    const invoke = getInvoke();
    if (!invoke)
        return;
    const checkLink = document.getElementById('footer-check-link');
    if (checkLink)
        checkLink.classList.add('checking');
    try {
        const info = await invoke('check_app_update');
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
export async function reportProblem() {
    const invoke = getInvoke();
    if (!invoke)
        return;
    const btn = document.getElementById('report-btn');
    if (btn)
        btn.textContent = '⏳ Coletando...';
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
        if (btn)
            btn.textContent = '✅ Aberto!';
        setTimeout(() => {
            if (btn)
                btn.textContent = '🐛 Reportar Problema';
        }, 3000);
    }
    catch (e) {
        console.error('reportProblem failed:', e);
        showToast('error', 'Erro ao gerar relatório.');
        if (btn)
            btn.textContent = '🐛 Reportar Problema';
    }
}
export async function cancelOperation() {
    const invoke = getInvoke();
    if (invoke) {
        try {
            await invoke('cancel_operation');
        }
        catch (e) {
            console.error('cancel failed:', e);
        }
    }
}
