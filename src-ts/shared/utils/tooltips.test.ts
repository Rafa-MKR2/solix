// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { tooltips, getTooltip } from './tooltips';

describe('tooltips dictionary', () => {
  it('should have educational content for every key', () => {
    expect(Object.keys(tooltips).length).toBeGreaterThanOrEqual(25);
    for (const [key, text] of Object.entries(tooltips)) {
      expect(key.length, `chave vazia`).toBeGreaterThan(0);
      expect(text.length, `conteúdo curto para ${key}`).toBeGreaterThan(20);
    }
  });

  it('should cover all keys used by the static markup', () => {
    // Chaves de data-help presentes em src/index.html (manter em sincronia)
    const usedKeys = [
      'atualizacoes', 'atualizar-sistema', 'carga', 'cpu', 'gpu', 'kernel',
      'limpeza', 'nucleos', 'pacotes', 'ram', 'reportar', 'section-analisador',
      'section-desempenho', 'section-discos', 'section-distribuicao',
      'section-hardware', 'section-pacotes', 'section-processos', 'section-rede',
      'section-visao-geral', 'servicos', 'speedtest', 'swap', 'uptime', 'zram',
    ];
    for (const key of usedKeys) {
      expect(getTooltip(key), `falta tooltip para ${key}`).not.toBeNull();
    }
  });

  it('getTooltip should return the text for a known key', () => {
    expect(getTooltip('cpu')).toBe(tooltips.cpu);
    expect(getTooltip('ram')).toContain('memória');
  });

  it('getTooltip should return null for an unknown key', () => {
    expect(getTooltip('chave-inexistente')).toBeNull();
  });
});
