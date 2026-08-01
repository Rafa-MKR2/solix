// SPDX-License-Identifier: MIT

import { Dialog } from './Dialog.js';

export interface BackupDialogOptions {
  sourcePath: string;
  defaultDestination: string;
  onStart: (destination: string) => Promise<void>;
  onCancel?: () => void;
}

export class BackupDialog {
  private dialog: Dialog | null = null;
  private destinationInput: HTMLInputElement | null = null;
  private startBtn: HTMLButtonElement | null = null;
  private progressFill: HTMLElement | null = null;
  private progressText: HTMLElement | null = null;
  private progressStatus: HTMLElement | null = null;
  private options: BackupDialogOptions;
  private state: 'config' | 'progress' | 'result' = 'config';

  constructor(options: BackupDialogOptions) {
    this.options = options;
  }

  show(): void {
    this.state = 'config';
    this.renderConfigView();
  }

  private renderConfigView(): void {
    const { sourcePath, defaultDestination } = this.options;

    const content = document.createElement('div');
    content.innerHTML = `
      <div class="backup-field">
        <span class="backup-label">📂 Origem</span>
        <span class="backup-value">${this.escapeHtml(sourcePath)}</span>
      </div>
      <div class="backup-field">
        <span class="backup-label">💾 Destino</span>
        <input type="text" id="dialog-backup-destination" class="backup-input" placeholder="${this.escapeHtml(defaultDestination)}" value="${this.escapeHtml(defaultDestination)}" />
      </div>
      <p class="backup-hint">O backup será salvo como <code>solix-backup-<pasta>-<data>.tar.gz</code> na pasta de destino.</p>
      <div id="dialog-backup-progress" class="backup-progress hidden">
        <div class="backup-progress-status" id="dialog-backup-progress-status">⏳ Comprimindo...</div>
        <div class="backup-progress-track">
          <div id="dialog-backup-progress-fill" class="update-progress-fill" style="width:0%"></div>
        </div>
        <div class="backup-progress-text" id="dialog-backup-progress-text">0%</div>
      </div>
      <div id="dialog-backup-result" class="backup-result hidden">
        <div class="backup-result-icon">✅</div>
        <div class="backup-result-info">
          <span class="backup-result-title" id="dialog-backup-result-title">Backup concluído!</span>
          <span class="backup-result-sub" id="dialog-backup-result-sub"></span>
        </div>
      </div>
    `;

    const footer = document.createElement('div');
    footer.innerHTML = `
      <button class="btn-cancel" data-action="cancel">Cancelar</button>
      <button class="btn-confirm" data-action="start">💾 Iniciar Backup</button>
    `;

    this.dialog = new Dialog({
      title: '💾 Criar Backup',
      content,
      size: 'md',
      footer,
      onClose: this.options.onCancel,
    });

    this.bindConfigEvents();
  }

  private bindConfigEvents(): void {
    if (!this.dialog) return;

    const dialogEl = (this.dialog as any).dialog;
    if (!dialogEl) return;

    this.destinationInput = dialogEl.querySelector('#dialog-backup-destination');
    this.startBtn = dialogEl.querySelector('[data-action="start"]');
    const cancelBtn = dialogEl.querySelector('[data-action="cancel"]');

    cancelBtn?.addEventListener('click', () => this.close());
    this.startBtn?.addEventListener('click', () => this.handleStart());
  }

  private async handleStart(): Promise<void> {
    const destination = this.destinationInput?.value?.trim() || this.options.defaultDestination;
    if (!destination) return;

    this.state = 'progress';
    this.switchToProgressView();

    try {
      await this.options.onStart(destination);
      this.showSuccess('Backup concluído com sucesso!');
    } catch (e) {
      this.showError(`Erro: ${e instanceof Error ? e.message : 'Falha no backup'}`);
    }
  }

  private switchToProgressView(): void {
    if (!this.dialog) return;

    const dialogEl = (this.dialog as any).dialog;
    if (!dialogEl) return;

    const progressEl = dialogEl.querySelector('#dialog-backup-progress');
    const configFields = dialogEl.querySelectorAll('.backup-field');
    const hint = dialogEl.querySelector('.backup-hint');
    const footer = dialogEl.querySelector('.dialog-footer');

    configFields.forEach((el: Element) => { (el as HTMLElement).style.display = 'none'; });
    if (hint) (hint as HTMLElement).style.display = 'none';
    progressEl?.classList.remove('hidden');

    this.progressFill = dialogEl.querySelector('#dialog-backup-progress-fill');
    this.progressText = dialogEl.querySelector('#dialog-backup-progress-text');
    this.progressStatus = dialogEl.querySelector('#dialog-backup-progress-status');

    if (footer) {
      footer.innerHTML = `<span class="dialog-progress-note">Não feche esta janela durante o backup</span>`;
    }
  }

  updateProgress(percent: number, status?: string): void {
    if (this.progressFill) {
      this.progressFill.style.width = `${percent}%`;
    }
    if (this.progressText) {
      this.progressText.textContent = `${percent}%`;
    }
    if (status && this.progressStatus) {
      this.progressStatus.textContent = status;
    }
  }

  private showSuccess(message: string): void {
    if (!this.dialog) return;

    const dialogEl = (this.dialog as any).dialog;
    if (!dialogEl) return;

    const progressEl = dialogEl.querySelector('#dialog-backup-progress');
    const resultEl = dialogEl.querySelector('#dialog-backup-result');
    const titleEl = dialogEl.querySelector('#dialog-backup-result-title');
    const subEl = dialogEl.querySelector('#dialog-backup-result-sub');
    const footer = dialogEl.querySelector('.dialog-footer');

    progressEl?.classList.add('hidden');
    resultEl?.classList.remove('hidden');
    if (titleEl) titleEl.textContent = 'Backup concluído!';
    if (subEl) subEl.textContent = message;

    if (footer) {
      footer.innerHTML = `<button class="btn-confirm" data-action="close">Fechar</button>`;
      footer.querySelector('[data-action="close"]')?.addEventListener('click', () => this.close());
    }

    this.state = 'result';
  }

  private showError(message: string): void {
    if (!this.dialog) return;

    const dialogEl = (this.dialog as any).dialog;
    if (!dialogEl) return;

    const progressEl = dialogEl.querySelector('#dialog-backup-progress');
    const statusEl = dialogEl.querySelector('#dialog-backup-progress-status');
    const footer = dialogEl.querySelector('.dialog-footer');

    progressEl?.classList.add('hidden');

    if (footer) {
      footer.innerHTML = `
        <button class="btn-cancel" data-action="close">Fechar</button>
        <button class="btn-confirm" data-action="retry">Tentar Novamente</button>
      `;
      footer.querySelector('[data-action="close"]')?.addEventListener('click', () => this.close());
      footer.querySelector('[data-action="retry"]')?.addEventListener('click', () => {
        this.state = 'config';
        this.renderConfigView();
      });
    }

    if (statusEl) {
      statusEl.innerHTML = `❌ ${this.escapeHtml(message)}`;
    }
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