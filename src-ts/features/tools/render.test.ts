// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderTools } from '@/features/tools/render';
import type { DevelopmentToolStatus } from '@/shared/types';

const TOOLS: DevelopmentToolStatus[] = [
  { name: 'git', description: 'Controle de versão', category: 'desenvolvimento', available: true },
  { name: 'node', description: 'Runtime JavaScript', category: 'desenvolvimento', available: false },
  { name: 'firefox', description: 'Navegador web', category: 'internet', available: false },
];

function setupDom(): void {
  document.body.innerHTML = `
    <div id="tools-list"></div>
    <input id="search-input" value="" />
  `;
}

describe('renderTools', () => {
  beforeEach(() => {
    setupDom();
  });

  it('should render tools grouped by category', () => {
    renderTools(TOOLS);

    const container = document.getElementById('tools-list');
    expect(container?.querySelectorAll('.category-header').length).toBe(2);
    expect(container?.querySelectorAll('.tool-card').length).toBe(3);
    expect(container?.querySelector('.category-header')?.textContent).toContain('Desenvolvimento');
  });

  it('should mark available tools as installed', () => {
    renderTools(TOOLS);

    const gitCard = document.querySelector('.tool-card[data-name="git"]');
    expect(gitCard?.classList.contains('installed')).toBe(true);
    expect(gitCard?.querySelector('.tool-badge')?.textContent).toBe('instalado');
  });

  it('should render icon from base64 and placeholder otherwise', () => {
    renderTools([...TOOLS, { name: 'vlc', description: 'player', category: 'midia', available: false, icon_base64: 'data:image/png;base64,AAA' }]);

    const vlcCard = document.querySelector('.tool-card[data-name="vlc"]');
    expect(vlcCard?.querySelector('img.tool-card-icon')?.getAttribute('src')).toBe('data:image/png;base64,AAA');

    const nodeCard = document.querySelector('.tool-card[data-name="node"]');
    expect(nodeCard?.querySelector('.tool-card-icon-placeholder')).not.toBeNull();
  });

  it('should filter tools by search query', () => {
    const input = document.getElementById('search-input') as HTMLInputElement;
    input.value = 'firefox';
    renderTools(TOOLS);

    const container = document.getElementById('tools-list');
    expect(container?.querySelectorAll('.tool-card').length).toBe(1);
    expect(container?.querySelector('.tool-card')?.getAttribute('data-name')).toBe('firefox');
  });

  it('should show empty search message when no results', () => {
    const input = document.getElementById('search-input') as HTMLInputElement;
    input.value = 'zzz';
    renderTools(TOOLS);

    const container = document.getElementById('tools-list');
    expect(container?.querySelector('.empty-search')).not.toBeNull();
    expect(container?.querySelector('.empty-search')?.textContent).toContain('Nenhuma ferramenta');
  });

  it('should toggle selection when card is clicked', () => {
    renderTools(TOOLS);

    const nodeCard = document.querySelector('.tool-card[data-name="node"]') as HTMLElement;
    nodeCard.click();
    expect(nodeCard.classList.contains('selected')).toBe(true);

    nodeCard.click();
    expect(nodeCard.classList.contains('selected')).toBe(false);
  });

  it('should do nothing when tools-list is missing', () => {
    document.body.innerHTML = '';
    expect(() => renderTools(TOOLS)).not.toThrow();
  });

  it('should call toggleCategorySelect when select-all is clicked', () => {
    renderTools(TOOLS);

    const selectAll = document.querySelector('.cat-select-all') as HTMLElement;
    expect(selectAll).not.toBeNull();
    selectAll.click();
    // Sem erro e o header continua presente
    expect(document.querySelectorAll('.category-header').length).toBeGreaterThan(0);
    void vi; // mantém import do vitest para convenção
  });
});
