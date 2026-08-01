// SPDX-License-Identifier: MIT

import { Dialog } from './Dialog.js';

export interface UpdateInfo {
  current_version: string;
  latest_version: string;
  changelog: string;
  update_available: boolean;
}

export interface UpdateDialogOptions {
  info: UpdateInfo;
  onUpdate: () => Promise<void>;
  onLater: () => void;
  onCheckUpdate?: () => Promise<void>;
}

export class UpdateDialog {
  private dialog: Dialog | null = null;
  private options: UpdateDialogOptions;
  private state: 'info' | 'progress' = 'info';
  private progressFill: HTMLElement | null = null;
  private progressText: HTMLElement | null = null;
  private progressStatus: HTMLElement | null = null;

  constructor(options: UpdateDialogOptions) {
    this.options = options;
  }

  show(): void {
    this.state = 'info';
    this.renderInfoView();
  }

  private renderInfoView(): void {
    const { info } = this.options;

    const content = document.createElement('div');
    content.innerHTML = `
      <div class="update-version-row">
        <span>${info.current_version}</span>
        <span class="update-arrow">→</span>
        <span class="update-latest">${info.latest_version}</span>
      </div>
      <div class="update-changelog-label">📝 Novidades</div>
      <pre class="update-changelog">${this.escapeHtml(info.changelog)}</pre>
    `;

    const footer = document.createElement('div');
    footer.innerHTML = `
      <button class="btn-cancel" data-action="later">Depois</button>
      <button class="btn-confirm" data-action="update">⬇️ Atualizar</button>
    `;

    this.dialog = new Dialog({
      title: '⬆️ Nova versão disponível',
      content,
      size: 'md',
      footer,
      showCloseButton: true,
      onClose: this.options.onLater,
    });

    this.bindInfoEvents();
  }

  private renderProgressView(): void {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="update-progress-status" id="dialog-update-progress-status">Baixando...</div>
      <div class="update-progress-track">
        <div id="dialog-update-progress-fill" class="update-progress-fill" style="width:0%"></div>
      </div>
      <div class="update-progress-text" id="dialog-update-progress-text">0%</div>
    `;

    const footer = document.createElement('div');
    footer.innerHTML = `<span class="dialog-progress-note">Não feche esta janela durante a atualização</span>`;

    // Replace dialog content
    if (this.dialog) {
      const dialogEl = (this.dialog as any).dialog;
      if (dialogEl) {
        const body = dialogEl.querySelector('.dialog-body');
        const footerEl = dialogEl.querySelector('.dialog-footer');
        if (body) body.innerHTML = content.innerHTML;
        if (footerEl) footerEl.innerHTML = footer.innerHTML;

        this.progressFill = dialogEl.querySelector('#dialog-update-progress-fill');
        this.progressText = dialogEl.querySelector('#dialog-update-progress-text');
        this.progressStatus = dialogEl.querySelector('#dialog-update-progress-status');
      }
    }
  }

  private bindInfoEvents(): void {
    if (!this.dialog) return;

    const footer = (this.dialog as any).dialog?.querySelector('.dialog-footer');
    if (!footer) return;

    footer.querySelector('[data-action="later"]')?.addEventListener('click', () => {
      this.close();
      this.options.onLater();
    });

    footer.querySelector('[data-action="update"]')?.addEventListener('click', () => {
      this.startUpdate();
    });
  }

  private async startUpdate(): Promise<void> {
    this.state = 'progress';
    this.renderProgressView();

    try {
      await this.options.onUpdate();
    } catch (e) {
      console.error('Update failed:', e);
      // Could show error state here
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