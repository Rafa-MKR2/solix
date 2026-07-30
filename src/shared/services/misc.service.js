import { getInvoke } from '../utils/tauri.js';
export const miscService = {
    async enableZram() {
        const invoke = getInvoke();
        if (!invoke)
            throw new Error('Tauri not available');
        return invoke('enable_zram');
    },
    async cleanupSystem() {
        const invoke = getInvoke();
        if (!invoke)
            throw new Error('Tauri not available');
        return invoke('cleanup_system');
    },
    async saveReportToDesktop(content) {
        const invoke = getInvoke();
        if (!invoke)
            return '';
        return invoke('save_report_to_desktop', { content });
    },
    async createDesktopShortcut(name) {
        const invoke = getInvoke();
        if (!invoke)
            return '';
        return invoke('create_desktop_shortcut', { name });
    },
    async openUrl(url) {
        const invoke = getInvoke();
        if (!invoke)
            return;
        await invoke('open_url', { url });
    },
};
