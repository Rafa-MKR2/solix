// SPDX-License-Identifier: MIT

export function showToast(type: 'success' | 'error' | 'info', message: string): void {
  const toast = document.getElementById('completion-toast');
  const msg = document.getElementById('toast-message');
  if (!toast) return;
  const icon = toast.querySelector('.toast-icon') as HTMLElement | null;
  const title = toast.querySelector('.toast-title') as HTMLElement | null;
  if (icon) icon.textContent = type === 'error' ? '❌' : '✅';
  if (title) title.textContent = type === 'error' ? 'Falhou!' : 'Concluído!';
  if (msg) msg.textContent = message;
  if (type === 'error') {
    toast.style.borderColor = '#e84a4a';
    toast.style.background = '#221111';
  } else {
    toast.style.borderColor = '#00d4aa';
    toast.style.background = '#112220';
  }
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}
