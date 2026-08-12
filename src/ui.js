import { escapeHtml, showToast } from './utils.js';
import { processService, packageService } from './shared/services/index.js';
let processList = [];
let processSortField = 'cpu_percent';
let processSortAsc = false;
export function loadProcesses() {
    return fetchProcesses();
}
async function fetchProcesses() {
    try {
        const list = await processService.getProcesses();
        processList = list;
        renderProcesses();
    }
    catch (e) {
        console.error('loadProcesses failed:', e);
    }
}
function renderProcesses() {
    const tbody = document.getElementById('process-tbody');
    const count = document.getElementById('process-count');
    if (!tbody)
        return;
    const query = (document.getElementById('process-search')?.value || '').toLowerCase().trim();
    let filtered = processList;
    if (query) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || p.pid.toString().includes(query) || p.user.toLowerCase().includes(query));
    }
    const sorted = [...filtered].sort((a, b) => {
        let cmp = 0;
        const field = processSortField;
        if (field === 'pid')
            cmp = a.pid - b.pid;
        else if (field === 'cpu_percent')
            cmp = a.cpu_percent - b.cpu_percent;
        else if (field === 'mem_percent')
            cmp = a.mem_percent - b.mem_percent;
        else if (field === 'name')
            cmp = a.name.localeCompare(b.name);
        else if (field === 'state')
            cmp = a.state.localeCompare(b.state);
        else if (field === 'user')
            cmp = a.user.localeCompare(b.user);
        return processSortAsc ? cmp : -cmp;
    });
    if (count)
        count.textContent = `${sorted.length} processos`;
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
    document.querySelectorAll('#process-table th').forEach(th => {
        const field = th.dataset.sort;
        th.classList.toggle('sorted', field === processSortField);
        th.classList.toggle('desc', field === processSortField && !processSortAsc);
    });
}
export function handleProcessSortClick(field) {
    if (!field)
        return;
    if (processSortField === field)
        processSortAsc = !processSortAsc;
    else {
        processSortField = field;
        processSortAsc = true;
    }
    renderProcesses();
}
export function handleProcessSearch() {
    renderProcesses();
}
export async function showLockDiagnosis() {
    switchToPage('sistema');
    const diagnosis = document.getElementById('lock-diagnosis');
    if (!diagnosis)
        return;
    diagnosis.classList.remove('hidden');
    const infoEl = document.getElementById('lock-info');
    const spinnerEl = document.getElementById('lock-spinner');
    if (spinnerEl)
        spinnerEl.classList.remove('hidden');
    if (infoEl)
        infoEl.textContent = '🔍 Detectando...';
    try {
        const lockInfo = await packageService.checkPmLock();
        if (spinnerEl)
            spinnerEl.classList.add('hidden');
        if (infoEl) {
            if (lockInfo.locked) {
                infoEl.textContent = lockInfo.message;
            }
            else {
                infoEl.innerHTML = '🔒 O lock foi liberado! <button class="lock-retry-btn" id="lock-freed-retry-btn">🔄 Tentar Novamente</button>';
                document.getElementById('lock-freed-retry-btn')?.addEventListener('click', () => { getRetryLastOperationFn()?.(); });
            }
        }
        const retryBtn = document.getElementById('lock-retry-btn');
        if (retryBtn)
            retryBtn.classList.remove('hidden');
    }
    catch (e) {
        console.error('check_pm_lock failed:', e);
        if (spinnerEl)
            spinnerEl.classList.add('hidden');
        if (infoEl)
            infoEl.textContent = '❌ Não foi possível detectar o bloqueio. Feche outros programas (Pamac, Discover, terminal) e tente novamente.';
    }
}
export function setupLockActions() {
    document.querySelectorAll('.lock-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.dataset.action;
            switch (action) {
                case 'pamac':
                    showToast('info', 'Fechando Pamac...');
                    try {
                        await processService.killProcess('pamac');
                    }
                    catch (e) {
                        console.error(e);
                    }
                    break;
                case 'discover':
                    showToast('info', 'Fechando Discover...');
                    try {
                        await processService.killProcess('discover');
                    }
                    catch (e) {
                        console.error(e);
                    }
                    break;
                case 'terminals':
                    showToast('info', 'Feche terminais rodando pacman/apt/dnf');
                    break;
                case 'restart-pm':
                    showToast('info', 'Para reiniciar o gerenciador, execute no terminal: sudo systemctl restart <pm>');
                    break;
                case 'kill-lock': {
                    if (!confirm('Remover o arquivo de trava manualmente pode corromper o banco de dados do gerenciador. Tem certeza?'))
                        return;
                    try {
                        await processService.removeLockFiles();
                        showToast('success', 'Trava removida. Tente novamente.');
                    }
                    catch (e) {
                        showToast('error', 'Não foi possível remover a trava');
                    }
                    break;
                }
            }
        });
    });
}
let retryLastOperationRef = null;
export function setRetryLastOperationFn(fn) {
    retryLastOperationRef = fn;
}
export function getRetryLastOperationFn() {
    return retryLastOperationRef;
}
export function setupNav() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!hamburger || !sidebar)
        return;
    function openSidebar() {
        sidebar.classList.remove('hidden');
        if (overlay)
            overlay.classList.remove('hidden');
    }
    function closeSidebar() {
        sidebar.classList.add('hidden');
        if (overlay)
            overlay.classList.add('hidden');
    }
    hamburger.addEventListener('click', openSidebar);
    if (overlay)
        overlay.addEventListener('click', closeSidebar);
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (!page)
                return;
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const target = document.getElementById('page-' + page);
            if (target)
                target.classList.add('active');
            closeSidebar();
        });
    });
}
export function switchToPage(pageName) {
    const navItem = document.querySelector(`.nav-item[data-page="${pageName}"]`);
    if (!navItem)
        return;
    navItem.click();
}
