// SPDX-License-Identifier: MIT

export type DropTarget = 'script' | 'pkg' | null;

/**
 * Decide o destino de um drop de arquivo (evento nativo `tauri://drag-drop`).
 * Prioriza a área sob o cursor (`#script-upload-area` / `#pkg-upload-area`) e,
 * se o drop cair fora delas, usa a página ativa como fallback
 * (`page-analisador` → script, `page-pacotes` → pkg).
 */
export function resolveDropTarget(element: Element | null, activePageId: string | null): DropTarget {
  if (element) {
    if (document.getElementById('script-upload-area')?.contains(element)) return 'script';
    if (document.getElementById('pkg-upload-area')?.contains(element)) return 'pkg';
  }
  if (activePageId === 'page-analisador') return 'script';
  if (activePageId === 'page-pacotes') return 'pkg';
  return null;
}
