import { Dialog } from './Dialog.js';
export class UpdateDialog {
    dialog = null;
    options;
    state = 'info';
    progressFill = null;
    progressText = null;
    progressStatus = null;
    constructor(options) {
        this.options = options;
    }
    show() {
        this.state = 'info';
        this.renderInfoView();
    }
    renderInfoView() {
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
    renderProgressView() {
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
        if (this.dialog) {
            const dialogEl = this.dialog.dialog;
            if (dialogEl) {
                const body = dialogEl.querySelector('.dialog-body');
                const footerEl = dialogEl.querySelector('.dialog-footer');
                if (body)
                    body.innerHTML = content.innerHTML;
                if (footerEl)
                    footerEl.innerHTML = footer.innerHTML;
                this.progressFill = dialogEl.querySelector('#dialog-update-progress-fill');
                this.progressText = dialogEl.querySelector('#dialog-update-progress-text');
                this.progressStatus = dialogEl.querySelector('#dialog-update-progress-status');
            }
        }
    }
    bindInfoEvents() {
        if (!this.dialog)
            return;
        const footer = this.dialog.dialog?.querySelector('.dialog-footer');
        if (!footer)
            return;
        footer.querySelector('[data-action="later"]')?.addEventListener('click', () => {
            this.close();
            this.options.onLater();
        });
        footer.querySelector('[data-action="update"]')?.addEventListener('click', () => {
            this.startUpdate();
        });
    }
    async startUpdate() {
        this.state = 'progress';
        this.renderProgressView();
        try {
            await this.options.onUpdate();
        }
        catch (e) {
            console.error('Update failed:', e);
        }
    }
    updateProgress(percent, status) {
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
