// SPDX-License-Identifier: MIT

export interface DialogOptions {
  title: string;
  content: string | HTMLElement;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
  onClose?: () => void;
  footer?: HTMLElement | string;
  showCloseButton?: boolean;
}

export class Dialog {
  private overlay: HTMLElement;
  private dialog: HTMLElement;
  private onClose: (() => void) | undefined;

  constructor(options: DialogOptions) {
    this.onClose = options.onClose;
    this.overlay = this.createOverlay();
    this.dialog = this.createDialog(options);
    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);

    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
      this.dialog.classList.add('visible');
    });

    this.bindEvents(options.closable !== false, options.showCloseButton !== false);
  }

  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'overlay dialog-overlay hidden';
    return overlay;
  }

  private createDialog(options: DialogOptions): HTMLElement {
    const dialog = document.createElement('div');
    dialog.className = `dialog dialog-${options.size || 'md'}`;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'dialog-title');

    const header = document.createElement('div');
    header.className = 'dialog-header';

    const title = document.createElement('h3');
    title.id = 'dialog-title';
    title.className = 'dialog-title';
    title.textContent = options.title;
    header.appendChild(title);

    if (options.showCloseButton !== false) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'dialog-close';
      closeBtn.setAttribute('aria-label', 'Fechar');
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => this.close());
      header.appendChild(closeBtn);
    }

    dialog.appendChild(header);

    const body = document.createElement('div');
    body.className = 'dialog-body';
    if (typeof options.content === 'string') {
      body.innerHTML = options.content;
    } else {
      body.appendChild(options.content);
    }
    dialog.appendChild(body);

    if (options.footer) {
      const footer = document.createElement('div');
      footer.className = 'dialog-footer';
      if (typeof options.footer === 'string') {
        footer.innerHTML = options.footer;
      } else {
        footer.appendChild(options.footer);
      }
      dialog.appendChild(footer);
    }

    return dialog;
  }

  private bindEvents(closable: boolean, _showCloseButton: boolean): void {
    if (closable) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });

      document.addEventListener('keydown', this.handleKeydown);
    }
  }

  private handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.close();
  };

  close(): void {
    this.overlay.classList.remove('visible');
    this.dialog.classList.remove('visible');

    setTimeout(() => {
      this.overlay.remove();
      document.removeEventListener('keydown', this.handleKeydown);
      this.onClose?.();
    }, 200);
  }

  static confirm(message: string, onConfirm: () => void, onCancel?: () => void): Dialog {
    const footer = document.createElement('div');
    footer.innerHTML = `
      <button class="btn-cancel" data-action="cancel">Cancelar</button>
      <button class="btn-confirm" data-action="confirm">Confirmar</button>
    `;

    const dialog = new Dialog({
      title: 'Confirmação',
      content: `<p>${message}</p>`,
      size: 'sm',
      footer,
      onClose: onCancel,
    });

    footer.querySelector('[data-action="confirm"]')?.addEventListener('click', () => {
      onConfirm();
      dialog.close();
    });

    footer.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      dialog.close();
    });

    return dialog;
  }

  static alert(message: string, onClose?: () => void): Dialog {
    const footer = document.createElement('div');
    footer.innerHTML = `<button class="btn-confirm" data-action="ok">OK</button>`;

    const dialog = new Dialog({
      title: 'Aviso',
      content: `<p>${message}</p>`,
      size: 'sm',
      footer,
      onClose,
    });

    footer.querySelector('[data-action="ok"]')?.addEventListener('click', () => {
      dialog.close();
    });

    return dialog;
  }
}