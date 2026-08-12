// SPDX-License-Identifier: MIT

/**
 * Estado do toast legado `#completion-toast` (shared/utils/toast.ts).
 * As features escrevem nele, não no componente Toast — este helper centraliza
 * a leitura para os testes.
 */
export function toastState(): { show: boolean; title: string | null; message: string | null } {
  const el = document.getElementById('completion-toast');
  return {
    show: el?.classList.contains('show') ?? false,
    title: el?.querySelector('.toast-title')?.textContent ?? null,
    message: document.getElementById('toast-message')?.textContent ?? null,
  };
}
