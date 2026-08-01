import { Dialog } from './Dialog.js';
export class ReportDialog {
    dialog = null;
    options;
    state = 'loading';
    constructor(options) {
        this.options = options;
    }
    show() {
        this.state = 'loading';
        this.renderLoadingView();
        setTimeout(() => {
            this.state = 'content';
            this.renderContentView();
        }, 1500);
    }
    renderLoadingView() {
        const content = document.createElement('div');
        content.innerHTML = `
      <div class="report-status">
        <span class="report-status-icon">⏳</span>
        <span class="report-status-text">Coletando informações do sistema...</span>
      </div>
      <div class="report-content hidden" id="dialog-report-content">
        <div class="report-info-msg">
          Veja abaixo as informações do seu sistema. Nenhum dado será enviado sem sua ação.
        </div>
        <pre class="report-text" id="dialog-report-text">${this.escapeHtml(this.options.reportData.systemInfo)}</pre>
        <div class="report-result hidden" id="dialog-report-result">
          <span class="report-result-icon" id="dialog-report-result-icon">✅</span>
          <span class="report-result-text" id="dialog-report-result-text"></span>
        </div>
      </div>
    `;
        const footer = document.createElement('div');
        footer.id = 'dialog-report-buttons';
        footer.innerHTML = `
      <button class="btn-cancel" data-action="close">✖ Fechar</button>
      <button class="btn-secondary" data-action="save">💾 Salvar</button>
      <button class="btn-secondary" data-action="email">📧 Email</button>
      <button class="btn-secondary" data-action="copy">📋 Copiar</button>
      <button class="btn-confirm" data-action="github">🐛 GitHub</button>
    `;
        this.dialog = new Dialog({
            title: '🐛 Reportar Problema',
            content,
            size: 'lg',
            footer,
            onClose: this.options.onClose,
        });
        this.bindEvents();
    }
    renderContentView() {
        if (!this.dialog)
            return;
        const dialogEl = this.dialog.dialog;
        if (!dialogEl)
            return;
        const statusEl = dialogEl.querySelector('.report-status');
        const contentEl = dialogEl.querySelector('#dialog-report-content');
        statusEl?.classList.add('hidden');
        contentEl?.classList.remove('hidden');
    }
    bindEvents() {
        if (!this.dialog)
            return;
        const dialogEl = this.dialog.dialog;
        if (!dialogEl)
            return;
        const footer = dialogEl.querySelector('#dialog-report-buttons');
        if (!footer)
            return;
        footer.querySelector('[data-action="close"]')?.addEventListener('click', () => this.close());
        footer.querySelector('[data-action="save"]')?.addEventListener('click', () => this.options.onSave());
        footer.querySelector('[data-action="email"]')?.addEventListener('click', () => this.options.onEmail());
        footer.querySelector('[data-action="copy"]')?.addEventListener('click', () => this.options.onCopy());
        footer.querySelector('[data-action="github"]')?.addEventListener('click', () => this.options.onGitHub());
    }
    showResult(success, message) {
        if (!this.dialog)
            return;
        const dialogEl = this.dialog.dialog;
        if (!dialogEl)
            return;
        const resultEl = dialogEl.querySelector('#dialog-report-result');
        const iconEl = dialogEl.querySelector('#dialog-report-result-icon');
        const textEl = dialogEl.querySelector('#dialog-report-result-text');
        resultEl?.classList.remove('hidden');
        if (iconEl)
            iconEl.textContent = success ? '✅' : '❌';
        if (textEl)
            textEl.textContent = message;
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
