import { Dialog } from './Dialog.js';
export class ConfirmDialog {
    dialog = null;
    options;
    constructor(options) {
        this.options = {
            confirmLabel: 'Confirmar',
            cancelLabel: 'Cancelar',
            variant: 'default',
            ...options,
        };
    }
    show() {
        const { title, message, confirmLabel, cancelLabel, variant } = this.options;
        const variantClasses = {
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
        const dialogEl = this.dialog.dialog;
        if (dialogEl && safeVariant !== 'default') {
            dialogEl.classList.add(variantClasses[safeVariant]);
        }
        this.bindEvents();
    }
    bindEvents() {
        if (!this.dialog)
            return;
        const dialogEl = this.dialog.dialog;
        if (!dialogEl)
            return;
        const footer = dialogEl.querySelector('.dialog-footer');
        if (!footer)
            return;
        footer.querySelector('[data-action="confirm"]')?.addEventListener('click', () => {
            this.options.onConfirm();
            this.close();
        });
        footer.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
            this.close();
        });
    }
    close() {
        this.dialog?.close();
        this.dialog = null;
    }
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
export function confirm(message, onConfirm, onCancel, options = {}) {
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
export function alert(message, onClose, options = {}) {
    const dialog = new ConfirmDialog({
        title: options.title || 'Aviso',
        message,
        confirmLabel: 'OK',
        cancelLabel: '',
        variant: options.variant,
        onConfirm: () => { },
        onCancel: onClose,
    });
    const originalShow = dialog.show.bind(dialog);
    dialog.show = () => {
        originalShow();
        setTimeout(() => {
            const dialogEl = dialog.dialog;
            if (dialogEl) {
                const cancelBtn = dialogEl.querySelector('[data-action="cancel"]');
                if (cancelBtn)
                    cancelBtn.style.display = 'none';
            }
        }, 0);
    };
    dialog.show();
    return dialog;
}
