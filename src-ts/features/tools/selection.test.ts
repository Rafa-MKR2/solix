import { describe, it, expect, vi, beforeEach } from 'vitest';
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
      <button id="install-btn" disabled>Instalar</button>
      <button id="remove-btn" disabled>Remover</button>
      <span id="install-count">0</span>
      <span id="remove-count">0</span>
    `;
  });

  it('should add tool to selectedTools when toggleInstall is called', () => {
    const mockTool = { name: 'git', category: 'Desenvolvimento' } as any;
    
    toggleInstall(mockTool, true);
    
    expect(selectedTools.has('git')).toBe(true);
    expect(selectedTools.get('git')).toEqual(mockTool);
  });

  it('should remove tool from selectedTools when toggleInstall is called with false', () => {
    const mockTool = { name: 'git', category: 'Desenvolvimento' } as any;
    
    toggleInstall(mockTool, true);
    toggleInstall(mockTool, false);
    
    expect(selectedTools.has('git')).toBe(false);
  });

  it('should add tool to removedTools when toggleRemove is called', () => {
    const mockTool = { name: 'vim', category: 'Utilitários' } as any;
    
    toggleRemove(mockTool, true);
    
    expect(removedTools.has('vim')).toBe(true);
  });

  it('should update button states based on selection', () => {
    const mockTool1 = { name: 'git', category: 'Desenvolvimento' } as any;
    const mockTool2 = { name: 'node', category: 'Desenvolvimento' } as any;
    
    toggleInstall(mockTool1, true);
    toggleInstall(mockTool2, true);
    updateButtons();
    
    const installBtn = document.getElementById('install-btn') as HTMLButtonElement;
    const installCount = document.getElementById('install-count');
    
    expect(installBtn.disabled).toBe(false);
    expect(installCount?.textContent).toBe('2');
  });

  it('should disable install button when no tools selected', () => {
    updateButtons();
    
    const installBtn = document.getElementById('install-btn') as HTMLButtonElement;
    expect(installBtn.disabled).toBe(true);
  });
});