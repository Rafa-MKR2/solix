import { getInvoke, escapeHtml, showToast } from './utils.js';
export const CIRCUMFERENCE = 2 * Math.PI * 50;
export function setGauge(id, valueId, percent, label) {
    const circle = document.getElementById(id);
    const value = document.getElementById(valueId);
    if (!circle || !value)
        return;
    const clamped = Math.min(100, Math.max(0, percent));
    const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
    circle.style.strokeDasharray = `${CIRCUMFERENCE}`;
    circle.style.strokeDashoffset = `${offset}`;
    const hue = clamped > 80 ? 0 : clamped > 50 ? 30 : 160;
    circle.style.stroke = `hsl(${hue}, 80%, 50%)`;
    value.textContent = label;
}
function getBarColor(pct) {
    if (pct < 50)
        return 'green';
    if (pct < 75)
        return 'yellow';
    if (pct < 90)
        return 'orange';
    return 'red';
}
export async function handleOpenFileManager(mountPoint) {
    const invoke = getInvoke();
    if (!invoke)
        return;
    try {
        await invoke('open_file_manager', { path: mountPoint });
    }
    catch (e) {
        console.error('open_file_manager failed:', e);
        showToast('error', 'Erro ao abrir gerenciador de arquivos.');
    }
}
export async function handleAnalyzeDisk(mountPoint) {
    const invoke = getInvoke();
    if (!invoke)
        return;
    const modal = document.getElementById('disk-analysis-overlay');
    const list = document.getElementById('disk-analysis-list');
    const title = document.getElementById('disk-analysis-title');
    if (!modal || !list)
        return;
    if (title)
        title.textContent = `🔍 Analisando ${mountPoint}...`;
    list.innerHTML = '<div class="disk-analysis-loading">⏳ Escaneando pastas...</div>';
    modal.classList.remove('hidden');
    try {
        const items = await invoke('analyze_disk_usage', { mountPoint });
        if (title)
            title.textContent = `📂 ${mountPoint} — Pastas mais pesadas`;
        if (items.length === 0) {
            list.innerHTML = '<div class="hint">Nenhum resultado encontrado.</div>';
            return;
        }
        const maxSize = items.reduce((m, i) => {
            const v = parseFloat(i.size);
            return v > m ? v : m;
        }, 0);
        list.innerHTML = items.map(item => {
            const sizeVal = parseFloat(item.size) || 0;
            const pct = maxSize > 0 ? (sizeVal / maxSize) * 100 : 0;
            return `
        <div class="disk-analysis-item">
          <div class="disk-analysis-path">${item.path}</div>
          <div class="disk-analysis-size">${item.size}</div>
          <div class="disk-analysis-bar-bg">
            <div class="disk-analysis-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
      `;
        }).join('');
    }
    catch (e) {
        console.error('analyze_disk_usage failed:', e);
        list.innerHTML = '<div class="hint" style="color:#e88">❌ Erro ao analisar disco.</div>';
    }
}
export async function handleShowPartitions(device) {
    const invoke = getInvoke();
    if (!invoke)
        return;
    const modal = document.getElementById('disk-analysis-overlay');
    const list = document.getElementById('disk-analysis-list');
    const title = document.getElementById('disk-analysis-title');
    if (!modal || !list)
        return;
    if (title)
        title.textContent = `📋 Partições de ${device}`;
    list.innerHTML = '<div class="disk-analysis-loading">⏳ Carregando...</div>';
    modal.classList.remove('hidden');
    try {
        const output = await invoke('get_partition_table', { device });
        list.innerHTML = `<pre class="disk-partitions-output">${escapeHtml(output)}</pre>`;
    }
    catch (e) {
        console.error('get_partition_table failed:', e);
        list.innerHTML = `<div class="hint" style="color:#e88">❌ ${e}</div>`;
    }
}
document.getElementById('disk-analysis-close')?.addEventListener('click', () => {
    document.getElementById('disk-analysis-overlay')?.classList.add('hidden');
});
document.getElementById('disk-analysis-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        e.currentTarget.classList.add('hidden');
    }
});
export function renderDisks(disks) {
    const container = document.getElementById('disks-list');
    if (!container)
        return;
    container.innerHTML = '';
    if (!disks || disks.length === 0) {
        container.innerHTML = '<div class="hint">Nenhum disco detectado.</div>';
        return;
    }
    for (const d of disks) {
        const card = document.createElement('div');
        card.className = 'disk-card';
        const deviceName = d.filesystem.split('/').pop();
        const typeIcon = d.fstype === 'ntfs' ? '🪟' : d.fstype === 'vfat' ? '💾' : d.fstype === 'btrfs' ? '🌳' : '💽';
        card.innerHTML = `
      <div class="disk-card-top">
        <div class="disk-card-info">
          <div class="disk-device-row">
            <span class="disk-device-icon">${typeIcon}</span>
            <span class="disk-device-name">${deviceName || d.filesystem}</span>
          </div>
          <div class="disk-meta">
            <span class="disk-fstype">${d.fstype}</span>
            <span class="disk-mount">${d.mount_point}</span>
          </div>
        </div>
        <div class="disk-capacity">
          <span class="disk-total">${d.total}</span>
          <span class="disk-percent">${Math.round(d.percent_used)}%</span>
        </div>
      </div>
      <div class="disk-bar-bg"><div class="disk-bar-fill ${getBarColor(d.percent_used)}" style="width:${Math.min(d.percent_used, 100)}%"></div></div>
      <div class="disk-details">
        <span class="disk-used">📝 ${d.used} usados</span>
        <span class="disk-free">📦 ${d.available} livres</span>
      </div>
      <div class="disk-actions">
        <button class="disk-btn disk-btn-open" data-mount="${d.mount_point}">📂 Abrir <span class="help-tip" data-help="disco-abrir">ⓘ</span></button>
        <button class="disk-btn disk-btn-analyze" data-mount="${d.mount_point}">🔍 Analisar <span class="help-tip" data-help="disco-analisar">ⓘ</span></button>
        <button class="disk-btn disk-btn-partitions" data-device="${d.filesystem}">📋 Partições <span class="help-tip" data-help="disco-particoes">ⓘ</span></button>
      </div>
    `;
        container.appendChild(card);
        card.querySelector('.disk-btn-open').addEventListener('click', () => {
            handleOpenFileManager(d.mount_point);
        });
        card.querySelector('.disk-btn-analyze').addEventListener('click', () => {
            handleAnalyzeDisk(d.mount_point);
        });
        card.querySelector('.disk-btn-partitions').addEventListener('click', () => {
            handleShowPartitions(d.filesystem);
        });
    }
}
export const categoryLabels = {
    desenvolvimento: '🛠️ Desenvolvimento',
    internet: '🌐 Internet',
    container: '📦 Container',
    jogos: '🎮 Jogos',
    midia: '🎵 Mídia',
    escritorio: '📄 Escritório',
    comunicacao: '💬 Comunicação',
    utilitarios: '🔧 Utilitários',
    temas: '🎨 Temas',
};
const categoryOrder = ['desenvolvimento', 'internet', 'container', 'jogos', 'midia', 'escritorio', 'comunicacao', 'utilitarios', 'temas'];
export let selectedTools = new Set();
export let removedTools = new Set();
let updateButtonsRef = null;
export function setUpdateButtonsFn(fn) {
    updateButtonsRef = fn;
}
export function updateButtons() {
    const installBtn = document.getElementById('install-btn');
    const removeBtn = document.getElementById('remove-btn');
    const count = document.getElementById('selected-count');
    const total = selectedTools.size + removedTools.size;
    if (installBtn) {
        installBtn.disabled = selectedTools.size === 0;
        installBtn.textContent = selectedTools.size > 0 ? `⚡ Instalar (${selectedTools.size})` : '⚡ Instalar Selecionadas';
    }
    if (count) {
        count.textContent = total > 0 ? `${total} ferramenta(s) selecionada(s)` : 'Nenhuma ferramenta selecionada';
    }
}
export function toggleInstall(name, card) {
    if (selectedTools.has(name)) {
        selectedTools.delete(name);
        card.classList.remove('selected');
    }
    else {
        selectedTools.add(name);
        card.classList.add('selected');
    }
    updateButtons();
}
export function toggleRemove(name, card) {
    if (removedTools.has(name)) {
        removedTools.delete(name);
        card.classList.remove('selected');
    }
    else {
        removedTools.add(name);
        card.classList.add('selected');
    }
    const removeBtn = document.getElementById('remove-btn');
    if (removeBtn)
        removeBtn.style.display = removedTools.size > 0 ? '' : 'none';
    updateButtons();
}
function toggleCategorySelect(cat, items) {
    const allSelected = items.every(t => selectedTools.has(t.name));
    for (const tool of items) {
        const card = document.querySelector(`.tool-card[data-name="${tool.name}"]`);
        if (allSelected) {
            selectedTools.delete(tool.name);
            if (card)
                card.classList.remove('selected');
        }
        else {
            if (!tool.available) {
                selectedTools.add(tool.name);
                if (card)
                    card.classList.add('selected');
            }
        }
    }
    updateButtons();
}
export function renderTools(tools) {
    const container = document.getElementById('tools-list');
    if (!container)
        return;
    container.innerHTML = '';
    const query = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    const filtered = query
        ? tools.filter(t => t.name.toLowerCase().includes(query) || (t.description || '').toLowerCase().includes(query))
        : tools;
    if (filtered.length === 0 && query) {
        container.innerHTML = '<div class="empty-search">🔍 Nenhuma ferramenta encontrada para "<strong>' + query + '</strong>"</div>';
        return;
    }
    const grouped = {};
    for (const tool of filtered) {
        const cat = tool.category || 'outros';
        if (!grouped[cat])
            grouped[cat] = [];
        grouped[cat].push(tool);
    }
    let cardIndex = 0;
    for (const cat of categoryOrder) {
        const items = grouped[cat];
        if (!items)
            continue;
        const header = document.createElement('h3');
        header.className = 'category-header';
        header.textContent = categoryLabels[cat] || cat;
        header.dataset.category = cat;
        const selectAll = document.createElement('span');
        selectAll.className = 'cat-select-all';
        selectAll.textContent = 'Selecionar todas';
        selectAll.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCategorySelect(cat, items);
        });
        header.appendChild(selectAll);
        container.appendChild(header);
        for (const tool of items) {
            const card = document.createElement('div');
            card.className = 'tool-card';
            card.style.animationDelay = `${cardIndex * 0.025}s`;
            cardIndex++;
            if (tool.available)
                card.classList.add('installed');
            card.dataset.name = tool.name;
            const iconHtml = tool.icon_base64
                ? `<img class="tool-card-icon" src="${tool.icon_base64}" alt="" onerror="this.style.display='none'" />`
                : '<div class="tool-card-icon-placeholder"></div>';
            card.innerHTML = `
        ${iconHtml}
        <div class="tool-check">${tool.available ? '✓' : ''}</div>
        <div class="tool-info">
          <div class="tool-name">${tool.name}</div>
          <div class="tool-desc">${tool.description || ''}</div>
        </div>
        <div class="tool-badge">${tool.available ? 'instalado' : 'ausente'}</div>
        <button class="tool-info-btn" data-tool="${tool.name}" title="Detalhes">ⓘ</button>
      `;
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('tool-info-btn'))
                    return;
                if (tool.available) {
                    toggleRemove(tool.name, card);
                }
                else {
                    toggleInstall(tool.name, card);
                }
            });
            container.appendChild(card);
        }
    }
}
let processList = [];
let processSortField = 'cpu_percent';
let processSortAsc = false;
export function loadProcesses() {
    return fetchProcesses();
}
async function fetchProcesses() {
    const invoke = getInvoke();
    if (!invoke)
        return;
    try {
        const list = await invoke('get_processes');
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
    const invoke = getInvoke();
    if (!invoke)
        return;
    try {
        const lockInfo = await invoke('check_pm_lock');
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
            const invoke = getInvoke();
            switch (action) {
                case 'pamac':
                    showToast('info', 'Feche o Pamac manualmente ou execute: pkill pamac');
                    try {
                        await invoke('run_simple_command', { command: 'pkill -f pamac 2>/dev/null; pkill -f pamac-manager 2>/dev/null; echo done' });
                    }
                    catch (e) {
                        console.error(e);
                    }
                    break;
                case 'discover':
                    showToast('info', 'Feche o Discover manualmente ou execute: pkill discover');
                    try {
                        await invoke('run_simple_command', { command: 'pkill -f discover 2>/dev/null; echo done' });
                    }
                    catch (e) {
                        console.error(e);
                    }
                    break;
                case 'terminals':
                    showToast('info', 'Feche terminais rodando pacman/apt/dnf');
                    break;
                case 'restart-pm': {
                    const pmEl = document.getElementById('distro-pm');
                    const pm = pmEl?.textContent?.trim().toLowerCase() || 'pacman';
                    try {
                        await invoke('run_simple_command', { command: `sudo systemctl restart ${pm} 2>/dev/null; echo done` });
                        showToast('info', `Comando executado: sudo systemctl restart ${pm}`);
                    }
                    catch (e) {
                        showToast('error', 'Não foi possível reiniciar o gerenciador');
                    }
                    break;
                }
                case 'kill-lock': {
                    if (!confirm('Remover o arquivo de trava manualmente pode corromper o banco de dados do gerenciador. Tem certeza?'))
                        return;
                    try {
                        await invoke('run_simple_command', { command: 'sudo rm -f /var/lib/pacman/db.lck /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock 2>/dev/null; echo done' });
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
const helpTexts = {
    'section-distribuicao': 'Aqui você vê qual versão do Linux está usando. É como saber o modelo e a versão do sistema operacional do seu computador.',
    'section-hardware': 'Informações sobre as peças físicas do seu computador: processador, memória, placa de vídeo e outros componentes. Tudo que está dentro do gabinete!',
    'section-visao-geral': 'Um resumo rápido do estado do seu sistema: quantos programas estão instalados, se há atualizações disponíveis e como estão os recursos do computador.',
    'section-desempenho': 'Mostra em tempo real o desempenho do seu computador: uso do processador, memória e temperatura. Os gráficos são atualizados automaticamente a cada 3 segundos.',
    'section-processos': 'Lista de todos os programas e serviços rodando no seu computador agora. Se algo estiver lento, você pode identificar qual programa está consumindo muitos recursos.',
    'section-discos': 'Seus discos e partições. Mostra quanto espaço está ocupado e livre, o tipo de cada disco (ext4, btrfs, NTFS), e permite abrir pastas ou analisar o uso.',
    'section-ferramentas': 'Lista de programas úteis que você pode instalar com um clique. Basta selecionar os que deseja e clicar em "Instalar Selecionadas".',
    'section-rede': 'Informações sobre sua conexão com a internet, Wi-Fi, Bluetooth e bateria do notebook. Tudo que conecta seu computador ao mundo.',
    'cpu': 'O processador, ou "cérebro" do computador. Ele executa todos os cálculos. Quanto maior a porcentagem, mais ele está trabalhando. Entre 0-30% é uso normal.',
    'ram': 'A memória RAM é a memória de trabalho do computador. Os programas ficam nela enquanto estão abertos. Se ficar muito cheia (acima de 90%), o sistema pode ficar lento.',
    'temp': 'A temperatura do processador. Entre 30°C e 70°C é normal. Acima de 80°C merece atenção — pode ser hora de limpar o cooler ou trocar a pasta térmica.',
    'nucleos': 'Os núcleos do processador. Imagine cada núcleo como um "trabalhador": quanto mais núcleos, mais tarefas o computador consegue realizar ao mesmo tempo.',
    'kernel': 'O núcleo do Linux, a parte mais fundamental do sistema operacional. É como o "motor" do seu computador — essencial para tudo funcionar.',
    'gpu': 'Placa de vídeo (GPU). Responsável por mostrar imagens na tela. Importante para jogos, vídeos, edição de imagem e para o sistema ficar bonito e fluido.',
    'uptime': 'Há quanto tempo o computador está ligado sem desligar ou reiniciar. Se estiver com muitos dias ligado, uma reinicializada pode ajudar o desempenho.',
    'pacotes': 'Quantidade total de programas instalados no seu sistema. Isso inclui navegador, editor de texto, jogos e também componentes internos que fazem tudo funcionar.',
    'atualizacoes': 'Novas versões dos seus programas disponíveis para instalar. Manter tudo atualizado é importante para a segurança e para ter as últimas melhorias e correções.',
    'carga': 'Média de processos esperando o processador. São 3 números: do último minuto, dos últimos 5 e dos últimos 15 minutos. Números baixos = sistema tranquilo e rápido.',
    'swap': 'Uma área do disco que o sistema usa como "memória extra" quando a RAM está cheia. É mais lenta que a RAM, mas evita que o computador trave quando falta memória.',
    'servicos': 'Programas essenciais rodando em segundo plano, como som, rede, impressão e atualizações. Eles fazem tudo funcionar sem você precisar se preocupar.',
    'zram': 'Técnica que compacta parte da memória RAM para evitar lentidão quando o computador está com pouca memória. Recomendado para máquinas com 4GB ou menos de RAM.',
    'limpeza': 'Remove arquivos temporários, cache de programas e pacotes antigos. Libera espaço no disco e ajuda o sistema a ficar mais leve. É seguro fazer de vez em quando!',
    'atualizar-sistema': 'Baixa e instala as últimas atualizações de segurança e melhorias para todos os seus programas. Recomendado fazer sempre que aparecerem atualizações disponíveis.',
    'reportar': 'Se algo não funcionar como esperado, este botão gera um relatório automático do seu sistema e abre uma página para você reportar o problema no GitHub.',
    'speedtest': 'Testa a velocidade da sua internet baixando um arquivo de teste. O resultado mostra quantos Megabits por segundo (Mbps) sua conexão consegue baixar.',
    'disco-abrir': 'Abre o gerenciador de arquivos do seu sistema na pasta deste disco, para você ver e organizar seus arquivos e pastas.',
    'disco-analisar': 'Escaneia as pastas mais pesadas deste disco, mostrando o que está ocupando mais espaço. Útil para encontrar arquivos grandes e liberar espaço.',
    'disco-particoes': 'Mostra a tabela de partições do disco, com informações detalhadas: nome, tamanho, tipo e onde está montada cada partição.',
    'section-pacotes': 'Instale pacotes .deb ou .rpm baixados da internet. O Solix mostra as informações do pacote, verifica se é compatível com seu sistema, e só instala após sua confirmação.',
};
let helpTooltipEl = null;
function showHelpTooltip(text, targetEl) {
    hideHelpTooltip();
    const el = document.createElement('div');
    el.className = 'help-tooltip';
    el.textContent = text;
    document.body.appendChild(el);
    helpTooltipEl = el;
    requestAnimationFrame(() => {
        const rect = targetEl.getBoundingClientRect();
        const tipRect = el.getBoundingClientRect();
        let left = rect.left + rect.width / 2 - tipRect.width / 2;
        let top = rect.bottom + 8;
        if (left < 10)
            left = 10;
        if (left + tipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tipRect.width - 10;
        }
        if (top + tipRect.height > window.innerHeight - 10) {
            top = rect.top - tipRect.height - 8;
            el.classList.add('bottom');
        }
        el.style.left = left + 'px';
        el.style.top = top + 'px';
    });
}
function hideHelpTooltip() {
    if (helpTooltipEl) {
        helpTooltipEl.remove();
        helpTooltipEl = null;
    }
}
let helpTipHideTimer = null;
let helpTipVisible = false;
let helpTipEl = null;
function getHelpText(el) {
    const key = el.dataset.help;
    return key ? (helpTexts[key] || null) : null;
}
export function setupHelpTooltips() {
    document.addEventListener('mouseenter', (e) => {
        const el = e.target.closest('.help-tip');
        if (!el)
            return;
        const text = getHelpText(el);
        if (!text)
            return;
        if (helpTipHideTimer) {
            clearTimeout(helpTipHideTimer);
            helpTipHideTimer = null;
        }
        helpTipEl = el;
        showHelpTooltip(text, el);
        helpTipVisible = true;
    }, true);
    document.addEventListener('mouseleave', (e) => {
        const el = e.target.closest('.help-tip');
        if (!el)
            return;
        if (helpTipHideTimer)
            clearTimeout(helpTipHideTimer);
        helpTipHideTimer = setTimeout(() => {
            hideHelpTooltip();
            helpTipVisible = false;
            helpTipEl = null;
        }, 200);
    }, true);
    document.addEventListener('click', (e) => {
        const el = e.target.closest('.help-tip');
        if (el) {
            e.stopPropagation();
            const text = getHelpText(el);
            if (!text)
                return;
            if (helpTipVisible && helpTipEl === el) {
                hideHelpTooltip();
                helpTipVisible = false;
                helpTipEl = null;
            }
            else {
                if (helpTipHideTimer) {
                    clearTimeout(helpTipHideTimer);
                    helpTipHideTimer = null;
                }
                helpTipEl = el;
                showHelpTooltip(text, el);
                helpTipVisible = true;
            }
        }
        else {
            hideHelpTooltip();
            helpTipVisible = false;
            helpTipEl = null;
        }
    });
    document.addEventListener('scroll', () => {
        hideHelpTooltip();
        helpTipVisible = false;
        helpTipEl = null;
    }, true);
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
export function showUpdateBanner(info) {
    const existing = document.getElementById('update-banner');
    if (existing)
        existing.remove();
    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.className = 'show';
    banner.innerHTML = `
    <span class="update-banner-icon">⬆️</span>
    <div class="update-banner-text">
      <div>Nova versão disponível: <strong>v${info.latest_version}</strong></div>
      <div class="update-banner-sub">Clique em baixar para obter a atualização</div>
    </div>
    <a href="${info.release_url}" target="_blank" class="update-banner-dl">📥 Baixar</a>
    <button class="update-banner-close" id="update-banner-close">&times;</button>
  `;
    const topbar = document.getElementById('topbar');
    if (topbar && topbar.parentNode) {
        topbar.parentNode.insertBefore(banner, topbar.nextSibling);
    }
    document.getElementById('update-banner-close')?.addEventListener('click', () => {
        banner.remove();
    });
    setTimeout(() => {
        if (banner.parentNode)
            banner.remove();
    }, 30000);
}
export async function showInfoModal(toolName) {
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
}
export async function loadHomeStats() {
    const invoke = getInvoke();
    if (!invoke)
        return;
    try {
        const h = await invoke('get_home_stats');
        const packagesEl = document.getElementById('stat-packages');
        const updatesEl = document.getElementById('stat-updates');
        const updatesSub = document.getElementById('stat-updates-sub');
        const loadEl = document.getElementById('stat-load');
        const swapEl = document.getElementById('stat-swap');
        const swapSub = document.getElementById('stat-swap-sub');
        const servicesEl = document.getElementById('stat-services');
        if (packagesEl)
            packagesEl.textContent = h.packages_formatted;
        if (updatesEl) {
            if (h.updates_available > 0) {
                updatesEl.textContent = h.updates_formatted;
                updatesEl.style.color = '#e8c547';
                if (updatesSub)
                    updatesSub.textContent = 'disponíveis';
            }
            else {
                updatesEl.textContent = '✓';
                updatesEl.style.color = '#4ae0a0';
                if (updatesSub)
                    updatesSub.textContent = 'sistema atualizado';
            }
        }
        if (loadEl)
            loadEl.textContent = h.load_average;
        if (swapEl) {
            if (h.swap_percent > 0) {
                swapEl.textContent = `${h.swap_used} / ${h.swap_total}`;
                if (swapSub)
                    swapSub.textContent = `${Math.round(h.swap_percent)}% usada`;
            }
            else {
                swapEl.textContent = '—';
                if (swapSub)
                    swapSub.textContent = 'sem swap ativo';
            }
        }
        if (servicesEl)
            servicesEl.textContent = h.services_active;
    }
    catch (e) {
        console.error('loadHomeStats failed:', e);
    }
}
export async function pollStats() {
    const invoke = getInvoke();
    if (!invoke)
        return;
    try {
        const s = await invoke('get_system_stats');
        setGauge('gauge-cpu', 'gauge-cpu-value', s.cpu_percent, `${Math.round(s.cpu_percent)}%`);
        setGauge('gauge-ram', 'gauge-ram-value', s.memory_percent, `${Math.round(s.memory_percent)}%`);
        setGauge('gauge-temp', 'gauge-temp-value', s.temperature, `${Math.round(s.temperature)}°`);
        setGauge('gauge-cpu-home', 'gauge-cpu-home-value', s.cpu_percent, `${Math.round(s.cpu_percent)}%`);
        setGauge('gauge-ram-home', 'gauge-ram-home-value', s.memory_percent, `${Math.round(s.memory_percent)}%`);
        setGauge('gauge-temp-home', 'gauge-temp-home-value', s.temperature, `${Math.round(s.temperature)}°`);
    }
    catch (e) {
        console.error('pollStats failed:', e);
    }
}
