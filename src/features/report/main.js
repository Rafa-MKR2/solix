import { showToast } from '../../utils.js';
import { systemService, miscService } from '../../shared/services/index.js';
let lastReportText = '';
let lastIssueUrl = '';
export function showReportModal(reportText) {
    const overlay = document.getElementById('report-overlay');
    const status = document.getElementById('report-status');
    const content = document.getElementById('report-content');
    const textEl = document.getElementById('report-text');
    const result = document.getElementById('report-result');
    const githubBtn = document.getElementById('report-github-btn');
    const copyBtn = document.getElementById('report-copy-btn');
    if (!overlay)
        return;
    if (status) {
        status.classList.remove('hidden');
        status.classList.add('loading');
    }
    if (content)
        content.classList.add('hidden');
    if (result)
        result.classList.add('hidden');
    if (githubBtn)
        githubBtn.disabled = true;
    if (copyBtn)
        copyBtn.disabled = true;
    if (textEl)
        textEl.textContent = '';
    overlay.classList.remove('hidden');
    setTimeout(() => {
        if (status) {
            status.classList.add('hidden');
            status.classList.remove('loading');
        }
        if (content)
            content.classList.remove('hidden');
        if (textEl)
            textEl.textContent = reportText;
        if (githubBtn)
            githubBtn.disabled = false;
        if (copyBtn)
            copyBtn.disabled = false;
    }, 250);
}
export function hideReportModal() {
    const overlay = document.getElementById('report-overlay');
    if (overlay)
        overlay.classList.add('hidden');
}
export async function reportProblem() {
    const btn = document.getElementById('report-btn');
    if (btn)
        btn.textContent = '⏳ Coletando...';
    try {
        const info = await systemService.getReportInfo();
        const outputLog = document.getElementById('output-log');
        const logText = outputLog?.textContent?.trim() || '(vazio)';
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const report = [
            '📋 Relatório do Solix — v' + info.app_version,
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '',
            '🖥️  SISTEMA',
            '  Distribuição : ' + info.distro_name + ' ' + info.distro_version,
            '  Kernel       : ' + info.kernel,
            '  Pacotes      : ' + info.package_manager,
            '',
            '📊  DESEMPENHO (no momento do relatório)',
            '  CPU    : ' + Math.round(info.cpu_percent) + '%',
            '  RAM    : ' + Math.round(info.memory_percent) + '%',
            '  Temp.  : ' + Math.round(info.temperature) + '°C',
            '',
            '📜  ÚLTIMA OPERAÇÃO',
            '  ' + logText.replace(/\n/g, '\n  '),
            '',
            '🕐  Gerado em: ' + now,
        ].join('\n');
        lastReportText = report;
        lastIssueUrl = 'https://github.com/Rafa-MKR2/solix/issues/new?body=' +
            encodeURIComponent('## Descrição do problema\n\n' +
                '(Descreva aqui o que aconteceu)\n\n' +
                '---\n' +
                '```\n' + report + '\n```');
        showReportModal(report);
        if (btn)
            btn.textContent = '🐛 Reportar Problema';
    }
    catch (e) {
        console.error('reportProblem failed:', e);
        showToast('error', 'Erro ao gerar relatório.');
        if (btn)
            btn.textContent = '🐛 Reportar Problema';
    }
}
export function handleCopyReport() {
    if (!lastReportText)
        return;
    navigator.clipboard.writeText(lastReportText).then(() => {
        const resultEl = document.getElementById('report-result');
        const resultText = document.getElementById('report-result-text');
        const resultIcon = document.getElementById('report-result-icon');
        if (resultIcon)
            resultIcon.textContent = '✅';
        if (resultEl)
            resultEl.classList.remove('hidden');
        if (resultText)
            resultText.textContent = '📋 Relatório copiado! Cole onde quiser.';
        setTimeout(() => {
            if (resultEl)
                resultEl.classList.add('hidden');
        }, 3000);
        showToast('success', 'Relatório copiado para a área de transferência!');
    }).catch(() => {
        const textEl = document.getElementById('report-text');
        if (textEl) {
            const range = document.createRange();
            range.selectNodeContents(textEl);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            showToast('info', 'Selecione o texto e copie (Ctrl+C)');
        }
    });
}
export async function handleOpenIssue() {
    if (!lastIssueUrl)
        return;
    try {
        await miscService.openUrl(lastIssueUrl);
        hideReportModal();
        showToast('success', '✅ GitHub aberto no navegador! Descreva o problema e envie.');
    }
    catch (e) {
        console.error('open_url failed:', e);
        showToast('error', 'Erro ao abrir o GitHub. Copie o relatório e abra manualmente.');
    }
}
export async function handleSaveReport() {
    if (!lastReportText)
        return;
    try {
        const filePath = await miscService.saveReportToDesktop(lastReportText);
        showToast('success', `💾 Relatório salvo! ${filePath}`);
        const resultEl = document.getElementById('report-result');
        const resultText = document.getElementById('report-result-text');
        if (resultEl)
            resultEl.classList.remove('hidden');
        if (resultText)
            resultText.textContent = `💾 Salvo em: ${filePath.split('/').pop()}`;
        setTimeout(() => {
            if (resultEl)
                resultEl.classList.add('hidden');
        }, 4000);
    }
    catch (e) {
        console.error('save_report_to_desktop failed:', e);
        showToast('error', 'Erro ao salvar relatório: ' + (e + ''));
    }
}
export async function handleEmailReport() {
    if (!lastReportText)
        return;
    const subject = encodeURIComponent('Relatório Solix - Problema');
    const body = encodeURIComponent('Relatório do sistema gerado pelo Solix\n\n' +
        '---\n\n' +
        lastReportText +
        '\n\n---\n\n' +
        'Descreva seu problema acima.\n' +
        'Obrigado por ajudar a melhorar o Solix!');
    const mailto = `mailto:rafaeldocarmo.dev@gmail.com?subject=${subject}&body=${body}`;
    try {
        await miscService.openUrl(mailto);
        hideReportModal();
        showToast('success', '📧 Cliente de email aberto! Envie o relatório para o desenvolvedor.');
    }
    catch (e) {
        console.error('open_url mailto failed:', e);
        showToast('error', 'Erro ao abrir cliente de email. Copie o relatório e envie manualmente para rafaeldocarmo.dev@gmail.com');
    }
}
