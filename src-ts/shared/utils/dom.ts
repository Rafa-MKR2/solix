// SPDX-License-Identifier: MIT

export function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text || '—';
}
