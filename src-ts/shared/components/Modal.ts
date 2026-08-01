// SPDX-License-Identifier: MIT

export interface ModalOptions {
  title: string;
  content: string | HTMLElement;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
  onClose?: () => void;
  footer?: HTMLElement | string;
}

export class Modal {
  private overlay: HTMLElement;
  private modal: HTMLElement;
  private onClose: (() => void) | undefined;

  constructor(options: ModalOptions) {
    this.onClose = options.onClose;
    this.overlay = this.createOverlay();
    this.modal = this.createModal(options);
    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);

    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
      this.modal.classList.add('visible');
    });

    this.bindEvents(options.closable !== false);
  }

  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'overlay modal-overlay hidden';
    return overlay;
  }

  private createModal(options: ModalOptions): HTMLElement {
    const modal = document.createElement('div');
    modal.className = `modal modal-${options.size || 'md'}`;

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
      <h3 class="modal-title">${options.title}</h3>
      <button class="modal-close" aria-label="Fechar">&times;</button>
    `;
    modal.appendChild(header);

    const body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof options.content === 'string') {
      body.innerHTML = options.content;
    } else {
      body.appendChild(options.content);
    }
    modal.appendChild(body);

    if (options.footer) {
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      if (typeof options.footer === 'string') {
        footer.innerHTML = options.footer;
      } else {
        footer.appendChild(options.footer);
      }
      modal.appendChild(footer);
    }

    return modal;
  }

  private bindEvents(closable: boolean): void {
    const closeBtn = this.modal.querySelector('.modal-close');
    closeBtn?.addEventListener('click', () => this.close());

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
    this.modal.classList.remove('visible');

    setTimeout(() => {
      this.overlay.remove();
      document.removeEventListener('keydown', this.handleKeydown);
      this.onClose?.();
    }, 200);
  }

  static confirm(message: string, onConfirm: () => void, onCancel?: () => void): Modal {
    const footer = document.createElement('div');
    footer.innerHTML = `
      <button class="btn-cancel" data-action="cancel">Cancelar</button>
      <button class="btn-confirm" data-action="confirm">Confirmar</button>
    `;

    const modal = new Modal({
      title: 'Confirmação',
      content: `<p>${message}</p>`,
      size: 'sm',
      footer,
      onClose: onCancel,
    });

    footer.querySelector('[data-action="confirm"]')?.addEventListener('click', () => {
      onConfirm();
      modal.close();
    });

    footer.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      modal.close();
    });

    return modal;
  }
}