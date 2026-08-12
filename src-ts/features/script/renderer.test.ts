// SPDX-License-Identifier: MIT
import { describe, it, expect, beforeEach } from 'vitest';
import { renderScriptAnalysis } from '@/features/script/renderer';
import type { ScriptAnalysis } from '@/types';

function setupDom(): void {
  document.body.innerHTML = `
    <div id="script-summary"></div>
    <div id="script-commands"></div>
  `;
}

describe('renderScriptAnalysis', () => {
  beforeEach(() => {
    setupDom();
  });

  const base: ScriptAnalysis = {
    risk_level: 'safe',
    script_type: 'shell',
    summary: 'Script simples',
    command_count: 1,
    total_lines: 5,
    has_sudo: false,
    has_install: false,
    has_download_execute: false,
    has_dangerous: false,
    commands: [{ line: 1, risk: 'safe', content: 'echo oi', description: 'Exibe texto' }],
  };

  it('should render safe summary', () => {
    renderScriptAnalysis(base);

    const summary = document.getElementById('script-summary');
    expect(summary?.textContent).toContain('Seguro');
    expect(summary?.textContent).toContain('Script simples');
  });

  it('should render danger summary with warning icon', () => {
    renderScriptAnalysis({ ...base, risk_level: 'danger', summary: 'Remover sistema' });

    const summary = document.getElementById('script-summary');
    expect(summary?.textContent).toContain('Alto Risco');
    expect(summary?.querySelector('.script-summary-icon')?.textContent).toBe('☠️');
  });

  it('should render python type', () => {
    renderScriptAnalysis({ ...base, script_type: 'python' });

    const summary = document.getElementById('script-summary');
    expect(summary?.textContent).toContain('🐍 Python');
  });

  it('should render flags for sudo, install, download and dangerous', () => {
    renderScriptAnalysis({
      ...base,
      has_sudo: true,
      has_install: true,
      has_download_execute: true,
      has_dangerous: true,
    });

    const summary = document.getElementById('script-summary');
    expect(summary?.textContent).toContain('Requer sudo');
    expect(summary?.textContent).toContain('Instala pacotes');
    expect(summary?.textContent).toContain('Download + Execução');
    expect(summary?.textContent).toContain('Operações perigosas');
  });

  it('should render command items with risk labels', () => {
    renderScriptAnalysis({
      ...base,
      commands: [
        { line: 1, risk: 'safe', content: 'echo oi', description: 'Exibe texto' },
        { line: 2, risk: 'sudo', content: 'sudo pacman -S git', description: 'Instala pacote' },
      ],
    });

    const commandsEl = document.getElementById('script-commands');
    const items = commandsEl?.querySelectorAll('.script-cmd-item');
    expect(items?.length).toBe(2);
    expect(commandsEl?.textContent).toContain('sudo pacman -S git');
  });

  it('should escape command content', () => {
    renderScriptAnalysis({
      ...base,
      commands: [{ line: 1, risk: 'safe', content: '<script>x()</script>', description: 'd' }],
    });

    expect(document.getElementById('script-commands')?.innerHTML).not.toContain('<script>');
  });

  it('should show empty message when no commands', () => {
    renderScriptAnalysis({ ...base, commands: [], command_count: 0 });

    expect(document.getElementById('script-commands')?.textContent).toContain('Nenhum comando identificado');
  });

  it('should do nothing when elements are missing', () => {
    document.body.innerHTML = '';
    expect(() => renderScriptAnalysis(base)).not.toThrow();
  });
});
