// SPDX-License-Identifier: MIT

import { Dialog } from './Dialog.js';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger' | 'warning';
  onConfirm: () => void;
  onCancel?: () => void;
}

export class ConfirmDialog {
  private dialog: Dialog | null = null;
  private options: ConfirmDialogOptions;

  constructor(options: ConfirmDialogOptions) {
    this.options = {
      confirmLabel: 'Confirmar',
      cancelLabel: 'Cancelar',
      variant: 'default',
      ...options,
    };
  }

  show(): void {
    const { title, message, confirmLabel, cancelLabel, variant } = this.options;

    const variantClasses: Record<string, string> = {
      default: '',
      danger: 'dialog-danger',
      warning: 'dialog-warning',
    };

    const safeConfirmLabel = confirmLabel ?? 'Confirmar';
    const safeCancelLabel = cancelLabel ?? 'Cancelar';
    const safeVariant = variant ?? 'default';

    const content = document.createElement('div');
    content.innerHTML = `<p>${this.escapeHtml(message)}</p>`;

    const footer = document.createElement('div');
    const confirmClass = safeVariant === 'danger' ? 'btn-danger' : safeVariant === 'warning' ? 'btn-warning' : 'btn-confirm';
    footer.innerHTML = `
      <button class="btn-cancel" data-action="cancel">${this.escapeHtml(safeCancelLabel)}</button>
      <button class="${confirmClass}" data-action="confirm">${this.escapeHtml(safeConfirmLabel)}</button>
    `;

    this.dialog = new Dialog({
      title,
      content,
      size: 'sm',
      footer,
      onClose: this.options.onCancel,
      showCloseButton: true,
    });

    const dialogEl = (this.dialog as any).dialog;
    if (dialogEl && safeVariant !== 'default') {
      dialogEl.classList.add(variantClasses[safeVariant]);
    }

    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.dialog) return;

    const dialogEl = (this.dialog as any).dialog;
    if (!dialogEl) return;

    const footer = dialogEl.querySelector('.dialog-footer');
    if (!footer) return;

    footer.querySelector('[data-action="confirm"]')?.addEventListener('click', () => {
      this.options.onConfirm();
      this.close();
    });

    footer.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      this.close();
    });
  }

  close(): void {
    this.dialog?.close();
    this.dialog = null;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Static helper methods
export function confirm(
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  options: Partial<ConfirmDialogOptions> = {}
): ConfirmDialog {
  const dialog = new ConfirmDialog({
    title: options.title || 'Confirmação',
    message,
    confirmLabel: options.confirmLabel,
    cancelLabel: options.cancelLabel,
    variant: options.variant,
    onConfirm,
    onCancel,
  });
  dialog.show();
  return dialog;
}

export function alert(
  message: string,
  onClose?: () => void,
  options: Partial<ConfirmDialogOptions> = {}
): ConfirmDialog {
  const dialog = new ConfirmDialog({
    title: options.title || 'Aviso',
    message,
    confirmLabel: 'OK',
    cancelLabel: '',
    variant: options.variant,
    onConfirm: () => {},
    onCancel: onClose,
  });
  // Override to show only OK button
  const originalShow = dialog.show.bind(dialog);
  dialog.show = () => {
    originalShow();
    // Hide cancel button after dialog is created
    setTimeout(() => {
      const dialogEl = (dialog as any).dialog;
      if (dialogEl) {
        const cancelBtn = dialogEl.querySelector('[data-action="cancel"]');
        if (cancelBtn) (cancelBtn as HTMLElement).style.display = 'none';
      }
    }, 0);
  };
  dialog.show();
  return dialog;
}