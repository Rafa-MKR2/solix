import { describe, it, expect, beforeEach } from 'vitest';
import { resolveDropTarget } from '@/features/upload/routing';

describe('resolveDropTarget (roteamento de drag-drop)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="script-upload-area"><div class="script-child"></div></div>
      <div id="pkg-upload-area"><div class="pkg-child"></div></div>
      <div class="outside"></div>
    `;
  });

  it('roteia para script quando o elemento está dentro da script-upload-area', () => {
    const el = document.querySelector('.script-child');
    expect(resolveDropTarget(el, null)).toBe('script');
  });

  it('roteia para pkg quando o elemento está dentro da pkg-upload-area', () => {
    const el = document.querySelector('.pkg-child');
    expect(resolveDropTarget(el, null)).toBe('pkg');
  });

  it('usa a página ativa analisador como fallback quando o drop cai fora das áreas', () => {
    const el = document.querySelector('.outside');
    expect(resolveDropTarget(el, 'page-analisador')).toBe('script');
  });

  it('usa a página ativa pacotes como fallback quando o drop cai fora das áreas', () => {
    const el = document.querySelector('.outside');
    expect(resolveDropTarget(el, 'page-pacotes')).toBe('pkg');
  });

  it('retorna null quando drop fora das áreas e página não é upload', () => {
    const el = document.querySelector('.outside');
    expect(resolveDropTarget(el, 'page-rede')).toBeNull();
    expect(resolveDropTarget(null, null)).toBeNull();
  });

  it('prioriza a área sob o cursor sobre a página ativa', () => {
    const el = document.querySelector('.script-child');
    expect(resolveDropTarget(el, 'page-pacotes')).toBe('script');
  });
});
