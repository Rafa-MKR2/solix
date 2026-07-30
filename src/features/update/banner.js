export function showUpdateBanner(info) {
    const overlay = document.getElementById('update-overlay');
    if (!overlay)
        return;
    overlay.classList.remove('hidden');
    const currentEl = document.getElementById('update-current-version');
    const latestEl = document.getElementById('update-latest-version');
    const changelogEl = document.getElementById('update-changelog');
    if (currentEl)
        currentEl.textContent = `v${info.current_version}`;
    if (latestEl)
        latestEl.textContent = `v${info.latest_version}`;
    if (changelogEl)
        changelogEl.textContent = info.release_notes || 'Nenhuma informação disponível.';
    document.getElementById('update-info-view')?.classList.remove('hidden');
    document.getElementById('update-progress-view')?.classList.add('hidden');
    document.getElementById('update-now-btn')?.classList.remove('hidden');
    document.getElementById('update-later-btn')?.classList.remove('hidden');
}
export function hideUpdateModal() {
    const overlay = document.getElementById('update-overlay');
    if (overlay)
        overlay.classList.add('hidden');
}
export function showUpdateProgress(stage, percent, message) {
    const infoView = document.getElementById('update-info-view');
    const progressView = document.getElementById('update-progress-view');
    const statusEl = document.getElementById('update-progress-status');
    const fillEl = document.getElementById('update-progress-fill');
    const textEl = document.getElementById('update-progress-text');
    const nowBtn = document.getElementById('update-now-btn');
    const laterBtn = document.getElementById('update-later-btn');
    if (infoView)
        infoView.classList.add('hidden');
    if (progressView)
        progressView.classList.remove('hidden');
    if (nowBtn)
        nowBtn.classList.add('hidden');
    if (laterBtn)
        laterBtn.classList.add('hidden');
    if (statusEl)
        statusEl.textContent = message;
    if (fillEl)
        fillEl.style.width = percent + '%';
    if (textEl)
        textEl.textContent = percent + '%';
}
