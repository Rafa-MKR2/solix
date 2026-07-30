export function showReportModal(reportText) {
    const overlay = document.getElementById('report-overlay');
    const status = document.getElementById('report-status');
    const content = document.getElementById('report-content');
    const textEl = document.getElementById('report-text');
    const result = document.getElementById('report-result');
    const githubBtn = document.getElementById('report-github-btn');
    const copyBtn = document.getElementById('report-copy-btn');
    if (!overlay)
        return;
    if (status) {
        status.classList.remove('hidden');
        status.classList.add('loading');
    }
    if (content)
        content.classList.add('hidden');
    if (result)
        result.classList.add('hidden');
    if (githubBtn)
        githubBtn.disabled = true;
    if (copyBtn)
        copyBtn.disabled = true;
    if (textEl)
        textEl.textContent = '';
    overlay.classList.remove('hidden');
    setTimeout(() => {
        if (status) {
            status.classList.add('hidden');
            status.classList.remove('loading');
        }
        if (content)
            content.classList.remove('hidden');
        if (textEl)
            textEl.textContent = reportText;
        if (githubBtn)
            githubBtn.disabled = false;
        if (copyBtn)
            copyBtn.disabled = false;
    }, 250);
}
export function hideReportModal() {
    const overlay = document.getElementById('report-overlay');
    if (overlay)
        overlay.classList.add('hidden');
}
