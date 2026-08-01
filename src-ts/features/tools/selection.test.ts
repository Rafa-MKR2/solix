import { describe, it, expect, beforeEach } from 'vitest';
import {
  selectedTools,
  removedTools,
  toggleInstall,
  toggleRemove,
  updateButtons,
} from '@/features/tools/selection';

describe('Tools Selection', () => {
  beforeEach(() => {
    selectedTools.clear();
    removedTools.clear();
    document.body.innerHTML = `
      <button id="install-btn" disabled>Instalar Selecionadas</button>
      <button id="remove-btn" disabled style="display:none">Remover</button>
      <span id="selected-count"></span>
    `;
  });

  it('should add tool to selectedTools when toggleInstall is called', () => {
    const card = document.createElement('div');

    toggleInstall('git', card);

    expect(selectedTools.has('git')).toBe(true);
    expect(card.classList.contains('selected')).toBe(true);
  });

  it('should remove tool from selectedTools when toggled again', () => {
    const card = document.createElement('div');

    toggleInstall('git', card);
    toggleInstall('git', card);

    expect(selectedTools.has('git')).toBe(false);
    expect(card.classList.contains('selected')).toBe(false);
  });

  it('should add tool to removedTools when toggleRemove is called', () => {
    const card = document.createElement('div');

    toggleRemove('vim', card);

    expect(removedTools.has('vim')).toBe(true);
    expect(card.classList.contains('selected')).toBe(true);
  });

  it('should update button states based on selection', () => {
    toggleInstall('git', document.createElement('div'));
    toggleInstall('node', document.createElement('div'));
    updateButtons();

    const installBtn = document.getElementById('install-btn') as HTMLButtonElement;
    const count = document.getElementById('selected-count');

    expect(installBtn.disabled).toBe(false);
    expect(count?.textContent).toBe('2 ferramenta(s) selecionada(s)');
  });

  it('should disable install button when no tools selected', () => {
    updateButtons();

    const installBtn = document.getElementById('install-btn') as HTMLButtonElement;
    expect(installBtn.disabled).toBe(true);
  });
});
