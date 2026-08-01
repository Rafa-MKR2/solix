// SPDX-License-Identifier: MIT

import { Dialog } from './Dialog.js';
import { miscService } from '../services/index.js';

export type PasswordDialogType = 'install' | 'remove' | 'zram' | 'cleanup' | 'app-update' | 'install-package';

export interface PasswordDialogOptions {
  type: PasswordDialogType;
  tools?: string[];
  onConfirm: (password: string) => Promise<void>;
  onCancel?: () => void;
}

export class PasswordDialog {
  private dialog: Dialog | null = null;
  private input: HTMLInputElement | null = null;
  private errorEl: HTMLElement | null = null;
  private confirmBtn: HTMLButtonElement | null = null;
  private options: PasswordDialogOptions;

  constructor(options: PasswordDialogOptions) {
    this.options = options;
  }

  show(): void {
    const { type, tools } = this.options;

    const titles: Record<PasswordDialogType, string> = {
      install: '🔒 Senha para Instalação',
      remove: '🔒 Senha para Remoção',
      zram: '🔒 Senha para Ativar ZRAM',
      cleanup: '🔒 Senha para Limpeza',
      'app-update': '⚠️ Atualizar Sistema',
      'install-package': '🔒 Senha para Instalar Pacote',
    };

    const messages: Record<PasswordDialogType, string> = {
      install: tools && tools.length > 0
        ? `Instalar <strong>${tools.length}</strong> ferramenta(s): ${tools.join(', ')}`
        : 'Para instalar programas, o Linux precisa da sua senha de administrador.',
      remove: tools && tools.length > 0
        ? `Remover <strong>${tools.length}</strong> ferramenta(s): ${tools.join(', ')}`
        : 'Para remover programas, o Linux precisa da sua senha de administrador.',
      zram: 'Ativar ZRAM compacta parte da RAM. Requer privilégios de administrador.',
      cleanup: 'Limpeza remove cache e pacotes antigos. Requer privilégios de administrador.',
      'app-update': 'Tem certeza que deseja atualizar todo o sistema? Isso pode levar alguns minutos e requer conexão com a internet.',
      'install-package': 'Para instalar este pacote, o Linux precisa da sua senha de administrador.',
    };

    const isAppUpdate = type === 'app-update';

    const content = document.createElement('div');
    if (isAppUpdate) {
      content.innerHTML = `<p>${messages[type]}</p>`;
    } else {
      content.innerHTML = `
        <p>${messages[type]}</p>
        <div class="password-field">
          <input type="password" id="dialog-password-input" placeholder="Digite sua senha" autocomplete="off" />
          <span id="dialog-password-error" class="password-error hidden">Senha incorreta. Tente novamente.</span>
        </div>
      `;
    }

    const footer = document.createElement('div');
    if (isAppUpdate) {
      footer.innerHTML = `
        <button class="btn-cancel" data-action="cancel">Cancelar</button>
        <button class="btn-confirm" data-action="confirm">Sim, atualizar</button>
      `;
    } else {
      footer.innerHTML = `
        <button class="btn-cancel" data-action="cancel">Cancelar</button>
        <button class="btn-confirm" data-action="confirm" disabled>Confirmar</button>
      `;
    }

    this.dialog = new Dialog({
      title: titles[type],
      content,
      size: 'sm',
      footer,
      onClose: this.options.onCancel,
      showCloseButton: !isAppUpdate,
    });

    this.bindEvents(isAppUpdate);
  }

  private bindEvents(isAppUpdate: boolean): void {
    if (!this.dialog) return;

    const footer = this.dialog['dialog']?.querySelector('.dialog-footer');
    if (!footer) return;

    this.confirmBtn = footer.querySelector('[data-action="confirm"]') as HTMLButtonElement | null;
    const cancelBtn = footer.querySelector('[data-action="cancel"]') as HTMLButtonElement | null;

    if (!isAppUpdate) {
      this.input = this.dialog['dialog']?.querySelector('#dialog-password-input') as HTMLInputElement | null;
      this.errorEl = this.dialog['dialog']?.querySelector('#dialog-password-error') as HTMLElement | null;

      this.input?.addEventListener('input', () => {
        if (this.confirmBtn && this.input) {
          this.confirmBtn.disabled = this.input.value.trim().length === 0;
        }
        if (this.errorEl) this.errorEl.classList.add('hidden');
      });

      this.input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && this.confirmBtn && !this.confirmBtn.disabled) {
          this.handleConfirm();
        }
      });

      // Focus input
      setTimeout(() => this.input?.focus(), 100);
    }

    cancelBtn?.addEventListener('click', () => this.close());
    this.confirmBtn?.addEventListener('click', () => this.handleConfirm());
  }

  private async handleConfirm(): Promise<void> {
    if (!this.dialog) return;

    if (this.options.type === 'app-update') {
      // For app-update, just confirm and close
      this.close();
      await this.options.onConfirm('');
      return;
    }

    const password = this.input?.value || '';
    if (!password.trim()) {
      this.showError('Digite sua senha');
      return;
    }

    this.confirmBtn!.disabled = true;
    this.confirmBtn!.textContent = 'Verificando...';

    try {
      await this.options.onConfirm(password);
      this.close();
    } catch (e) {
      this.showError('Senha incorreta. Tente novamente.');
      this.confirmBtn!.disabled = false;
      this.confirmBtn!.textContent = 'Confirmar';
      this.input?.focus();
    }
  }

  private showError(message: string): void {
    if (this.errorEl) {
      this.errorEl.textContent = message;
      this.errorEl.classList.remove('hidden');
    }
  }

  close(): void {
    this.dialog?.close();
    this.dialog = null;
  }
}

// Helper function for backward compatibility
export function showPasswordModal(options: PasswordDialogOptions): void {
  const dialog = new PasswordDialog(options);
  dialog.show();
}