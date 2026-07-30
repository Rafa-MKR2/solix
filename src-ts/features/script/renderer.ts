// SPDX-License-Identifier: MIT

import type { ScriptAnalysis } from '../../types.js';
import { escapeHtml } from '../../utils.js';

// ─── Script Analysis Renderer ───

export function renderScriptAnalysis(analysis: ScriptAnalysis): void {
  const summaryEl = document.getElementById('script-summary');
  const commandsEl = document.getElementById('script-commands');
  if (!summaryEl || !commandsEl) return;

  const riskLevel = analysis.risk_level;
  const riskIcon = riskLevel === 'danger' ? '☠️' : riskLevel === 'warning' ? '⚠️' : riskLevel === 'medium' ? '⚡' : '✅';
  const riskLabel = riskLevel === 'danger' ? 'Alto Risco' : riskLevel === 'warning' ? 'Cuidado' : riskLevel === 'medium' ? 'Médio' : 'Seguro';

  const scriptTypeEmoji = analysis.script_type === 'python' ? '🐍' : '📜';
  const scriptTypeLabel = analysis.script_type === 'python' ? 'Python' : 'Shell Script';

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
