// SPDX-License-Identifier: MIT

import type {
  DevelopmentToolStatus,
  AppUpdateInfo,
} from './types.js';
import { escapeHtml, showToast, setText } from './utils.js';
import { processService, packageService } from './shared/services/index.js';
// ─── Process List ───

import type { ProcessInfo } from './types.js';

let processList: ProcessInfo[] = [];
let processSortField = 'cpu_percent';
let processSortAsc = false;

type SortField = 'pid' | 'cpu_percent' | 'mem_percent' | 'name' | 'state' | 'user';

export function loadProcesses(): Promise<void> {
  return fetchProcesses();
}

async function fetchProcesses(): Promise<void> {
  try {
    const list = await processService.getProcesses();
    processList = list;
    renderProcesses();
  } catch (e) {
    console.error('loadProcesses failed:', e);
  }
}

function renderProcesses(): void {
  const tbody = document.getElementById('process-tbody');
  const count = document.getElementById('process-count');
  if (!tbody) return;

  const query = ((document.getElementById('process-search') as HTMLInputElement)?.value || '').toLowerCase().trim();
  let filtered = processList;
  if (query) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || p.pid.toString().includes(query) || p.user.toLowerCase().includes(query));
  }

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    const field = processSortField as SortField;
    if (field === 'pid') cmp = a.pid - b.pid;
    else if (field === 'cpu_percent') cmp = a.cpu_percent - b.cpu_percent;
    else if (field === 'mem_percent') cmp = a.mem_percent - b.mem_percent;
    else if (field === 'name') cmp = a.name.localeCompare(b.name);
    else if (field === 'state') cmp = a.state.localeCompare(b.state);
    else if (field === 'user') cmp = a.user.localeCompare(b.user);
    return processSortAsc ? cmp : -cmp;
  });

  if (count) count.textContent = `${sorted.length} processos`;

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

  document.querySelectorAll<HTMLElement>('#process-table th').forEach(th => {
    const field = th.dataset.sort;
    th.classList.toggle('sorted', field === processSortField);
    th.classList.toggle('desc', field === processSortField && !processSortAsc);
  });
}

export function handleProcessSortClick(field: string): void {
  if (!field) return;
  if (processSortField === field) processSortAsc = !processSortAsc;
  else { processSortField = field; processSortAsc = true; }
  renderProcesses();
}

export function handleProcessSearch(): void {
  renderProcesses();
}

// ─── Lock Diagnosis ───

export async function showLockDiagnosis(): Promise<void> {
  switchToPage('sistema');
  const diagnosis = document.getElementById('lock-diagnosis');
  if (!diagnosis) return;
  diagnosis.classList.remove('hidden');
  const infoEl = document.getElementById('lock-info');
  const spinnerEl = document.getElementById('lock-spinner');
  if (spinnerEl) spinnerEl.classList.remove('hidden');
  if (infoEl) infoEl.textContent = '🔍 Detectando...';

  try {
    const lockInfo = await packageService.checkPmLock();
    if (spinnerEl) spinnerEl.classList.add('hidden');
    if (infoEl) {
      if (lockInfo.locked) {
        infoEl.textContent = lockInfo.message;
      } else {
        infoEl.innerHTML = '🔒 O lock foi liberado! <button class="lock-retry-btn" id="lock-freed-retry-btn">🔄 Tentar Novamente</button>';
        document.getElementById('lock-freed-retry-btn')?.addEventListener('click', () => { getRetryLastOperationFn()?.(); });
      }
    }
    const retryBtn = document.getElementById('lock-retry-btn');
    if (retryBtn) retryBtn.classList.remove('hidden');
  } catch (e) {
    console.error('check_pm_lock failed:', e);
    if (spinnerEl) spinnerEl.classList.add('hidden');
    if (infoEl) infoEl.textContent = '❌ Não foi possível detectar o bloqueio. Feche outros programas (Pamac, Discover, terminal) e tente novamente.';
  }
}

export function setupLockActions(): void {
  document.querySelectorAll<HTMLElement>('.lock-action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      switch (action) {
        case 'pamac':
          showToast('info', 'Fechando Pamac...');
          try { await processService.killProcess('pamac'); } catch (e) { console.error(e); }
          break;
        case 'discover':
          showToast('info', 'Fechando Discover...');
          try { await processService.killProcess('discover'); } catch (e) { console.error(e); }
          break;
        case 'terminals':
          showToast('info', 'Feche terminais rodando pacman/apt/dnf');
          break;
        case 'restart-pm':
          showToast('info', 'Para reiniciar o gerenciador, execute no terminal: sudo systemctl restart <pm>');
          break;
        case 'kill-lock': {
          if (!confirm('Remover o arquivo de trava manualmente pode corromper o banco de dados do gerenciador. Tem certeza?')) return;
          try {
            await processService.removeLockFiles();
            showToast('success', 'Trava removida. Tente novamente.');
          } catch (e) {
            showToast('error', 'Não foi possível remover a trava');
          }
          break;
        }
      }
    });
  });
}

let retryLastOperationRef: (() => void) | null = null;

export function setRetryLastOperationFn(fn: () => void): void {
  retryLastOperationRef = fn;
}

export function getRetryLastOperationFn(): (() => void) | null {
  return retryLastOperationRef;
}

// ─── Help Tooltips ───

const helpTexts: Record<string, string> = {
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
  'section-analisador': 'Arraste um arquivo .sh para analisar. O Solix mostra cada comando, explica o que faz em português e classifica o nível de risco do script.',
};

let helpTooltipEl: HTMLElement | null = null;

function showHelpTooltip(text: string, targetEl: HTMLElement): void {
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

    if (left < 10) left = 10;
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

function hideHelpTooltip(): void {
  if (helpTooltipEl) {
    helpTooltipEl.remove();
    helpTooltipEl = null;
  }
}

let helpTipHideTimer: ReturnType<typeof setTimeout> | null = null;
let helpTipVisible = false;
let helpTipEl: HTMLElement | null = null;

function getHelpText(el: HTMLElement): string | null {
  const key = el.dataset.help;
  return key ? (helpTexts[key] || null) : null;
}

export function setupHelpTooltips(): void {
  document.addEventListener('mouseenter', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.help-tip');
    if (!el) return;
    const text = getHelpText(el);
    if (!text) return;
    if (helpTipHideTimer) { clearTimeout(helpTipHideTimer); helpTipHideTimer = null; }
    helpTipEl = el;
    showHelpTooltip(text, el);
    helpTipVisible = true;
  }, true);

  document.addEventListener('mouseleave', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.help-tip');
    if (!el) return;
    if (helpTipHideTimer) clearTimeout(helpTipHideTimer);
    helpTipHideTimer = setTimeout(() => {
      hideHelpTooltip();
      helpTipVisible = false;
      helpTipEl = null;
    }, 200);
  }, true);

  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.help-tip');
    if (el) {
      e.stopPropagation();
      const text = getHelpText(el);
      if (!text) return;
      if (helpTipVisible && helpTipEl === el) {
        hideHelpTooltip();
        helpTipVisible = false;
        helpTipEl = null;
      } else {
        if (helpTipHideTimer) { clearTimeout(helpTipHideTimer); helpTipHideTimer = null; }
        helpTipEl = el;
        showHelpTooltip(text, el);
        helpTipVisible = true;
      }
    } else {
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

// ─── Report Modal ───

export function showReportModal(reportText: string): void {
  const overlay = document.getElementById('report-overlay');
  const status = document.getElementById('report-status');
  const content = document.getElementById('report-content');
  const textEl = document.getElementById('report-text');
  const result = document.getElementById('report-result');
  const githubBtn = document.getElementById('report-github-btn') as HTMLButtonElement | null;
  const copyBtn = document.getElementById('report-copy-btn') as HTMLButtonElement | null;

  if (!overlay) return;

  // Show status briefly
  if (status) {
    status.classList.remove('hidden');
    status.classList.add('loading');
  }
  if (content) content.classList.add('hidden');
  if (result) result.classList.add('hidden');
  if (githubBtn) githubBtn.disabled = true;
  if (copyBtn) copyBtn.disabled = true;
  if (textEl) textEl.textContent = '';

  overlay.classList.remove('hidden');

  // Brief animation to show status, then reveal the report
  setTimeout(() => {
    if (status) {
      status.classList.add('hidden');
      status.classList.remove('loading');
    }
    if (content) content.classList.remove('hidden');
    if (textEl) textEl.textContent = reportText;
    if (githubBtn) githubBtn.disabled = false;
    if (copyBtn) copyBtn.disabled = false;
  }, 250);
}

export function hideReportModal(): void {
  const overlay = document.getElementById('report-overlay');
  if (overlay) overlay.classList.add('hidden');
}

// ─── Navigation ───

export function setupNav(): void {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!hamburger || !sidebar) return;

  function openSidebar(): void {
    sidebar!.classList.remove('hidden');
    if (overlay) overlay.classList.remove('hidden');
  }
  function closeSidebar(): void {
    sidebar!.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
  }

  hamburger.addEventListener('click', openSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  document.querySelectorAll<HTMLElement>('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (!page) return;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const target = document.getElementById('page-' + page);
      if (target) target.classList.add('active');
      closeSidebar();
    });
  });
}

export function switchToPage(pageName: string): void {
  const navItem = document.querySelector<HTMLElement>(`.nav-item[data-page="${pageName}"]`);
  if (!navItem) return;
  navItem.click();
}

// ─── Script Analysis Renderer ───

import type { ScriptAnalysis } from './types.js';

export function renderScriptAnalysis(analysis: ScriptAnalysis): void {
  const summaryEl = document.getElementById('script-summary');
  const commandsEl = document.getElementById('script-commands');
  if (!summaryEl || !commandsEl) return;

  const riskLevel = analysis.risk_level;
  const riskIcon = riskLevel === 'danger' ? '☠️' : riskLevel === 'warning' ? '⚠️' : riskLevel === 'medium' ? '⚡' : '✅';
  const riskLabel = riskLevel === 'danger' ? 'Alto Risco' : riskLevel === 'warning' ? 'Cuidado' : riskLevel === 'medium' ? 'Médio' : 'Seguro';

  const scriptTypeEmoji = analysis.script_type === 'python' ? '🐍' : '📜';
  const scriptTypeLabel = analysis.script_type === 'python' ? 'Python' : 'Shell Script';

  // Build stats tags
  const statsTags = [
    `<span class="script-stat-tag neutral">${scriptTypeEmoji} ${scriptTypeLabel}</span>`,
    `<span class="script-stat-tag neutral">📄 ${analysis.command_count} comandos</span>`,
    `<span class="script-stat-tag neutral">📏 ${analysis.total_lines} linhas</span>`,
  ];
  if (analysis.has_sudo) {
    statsTags.push(`<span class="script-stat-tag medium">🔑 Requer sudo</span>`);
  }
  if (analysis.has_install) {
    statsTags.push(`<span class="script-stat-tag safe">📦 Instala pacotes</span>`);
  }
  if (analysis.has_download_execute) {
    statsTags.push(`<span class="script-stat-tag danger">🌐 Download + Execução</span>`);
  }
  if (analysis.has_dangerous) {
    statsTags.push(`<span class="script-stat-tag danger">☠️ Operações perigosas</span>`);
  }

  summaryEl.innerHTML = `
    <div class="script-summary">
      <div class="script-summary-header">
        <span class="script-summary-icon">${riskIcon}</span>
        <span class="script-summary-title">${riskLabel} — ${escapeHtml(analysis.summary)}</span>
      </div>
      <div class="script-summary-stats">
        ${statsTags.join('\n        ')}
      </div>
    </div>
  `;

  // Build commands list
  if (analysis.commands.length === 0) {
    commandsEl.innerHTML = '<div class="script-cmd-item" style="color:#888;padding:1rem">Nenhum comando identificado neste script.</div>';
    return;
  }

  commandsEl.innerHTML = analysis.commands.map(cmd => {
    const riskIcons: Record<string, string> = {
      safe: '✅', sudo: '🔑', install: '📦', download: '🌐', system: '⚙️', danger: '☠️'
    };
    const riskLabels: Record<string, string> = {
      safe: 'Seguro', sudo: 'Sudo', install: 'Instalar', download: 'Download', system: 'Sistema', danger: 'Perigo'
    };
    const icon = riskIcons[cmd.risk] || '❓';
    const label = riskLabels[cmd.risk] || cmd.risk;
    const content = escapeHtml(cmd.content);
    const description = escapeHtml(cmd.description);

    return `
      <div class="script-cmd-item">
        <span class="script-cmd-line">${cmd.line}</span>
        <div class="script-cmd-body">
          <div class="script-cmd-text">${content}</div>
          <div class="script-cmd-desc">${description}</div>
        </div>
        <span class="script-cmd-risk ${cmd.risk}">${icon} ${label}</span>
      </div>
    `;
  }).join('');
}

// ─── Update Banner → Modal ───

export function showUpdateBanner(info: AppUpdateInfo): void {
  const overlay = document.getElementById('update-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');

  const currentEl = document.getElementById('update-current-version');
  const latestEl = document.getElementById('update-latest-version');
  const changelogEl = document.getElementById('update-changelog');

  if (currentEl) currentEl.textContent = `v${info.current_version}`;
  if (latestEl) latestEl.textContent = `v${info.latest_version}`;
  if (changelogEl) changelogEl.textContent = info.release_notes || 'Nenhuma informação disponível.';

  document.getElementById('update-info-view')?.classList.remove('hidden');
  document.getElementById('update-progress-view')?.classList.add('hidden');
  document.getElementById('update-now-btn')?.classList.remove('hidden');
  document.getElementById('update-later-btn')?.classList.remove('hidden');
}

export function hideUpdateModal(): void {
  const overlay = document.getElementById('update-overlay');
  if (overlay) overlay.classList.add('hidden');
}

export function showUpdateProgress(stage: string, percent: number, message: string): void {
  const infoView = document.getElementById('update-info-view');
  const progressView = document.getElementById('update-progress-view');
  const statusEl = document.getElementById('update-progress-status');
  const fillEl = document.getElementById('update-progress-fill');
  const textEl = document.getElementById('update-progress-text');
  const nowBtn = document.getElementById('update-now-btn');
  const laterBtn = document.getElementById('update-later-btn');

  if (infoView) infoView.classList.add('hidden');
  if (progressView) progressView.classList.remove('hidden');
  if (nowBtn) nowBtn.classList.add('hidden');
  if (laterBtn) laterBtn.classList.add('hidden');

  if (statusEl) statusEl.textContent = message;
  if (fillEl) fillEl.style.width = percent + '%';
  if (textEl) textEl.textContent = percent + '%';
}

// ─── Info Modal ───




