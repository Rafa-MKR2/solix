import { getInvoke } from '../utils/tauri.js';
function cmd() {
    return getInvoke();
}
export const systemService = {
    async getInfo() {
        const invoke = cmd();
        if (!invoke)
            throw new Error('Tauri not available');
        return invoke('get_system_info');
    },
    async getStats() {
        const invoke = cmd();
        if (!invoke)
            return { cpu_percent: 0, memory_percent: 0, temperature: 0 };
        return invoke('get_system_stats');
    },
    async getHomeStats() {
        const invoke = cmd();
        if (!invoke)
            return { packages_formatted: '—', updates_available: 0, updates_formatted: '—', load_average: '—', swap_percent: 0, swap_used: '—', swap_total: '—', services_active: '—' };
        return invoke('get_home_stats');
    },
    async getReportInfo() {
        const invoke = cmd();
        if (!invoke)
            throw new Error('Tauri not available');
        return invoke('get_report_info');
    },
    async getAppVersion() {
        const invoke = cmd();
        if (!invoke)
            return '—';
        return invoke('get_app_version');
    },
    async checkAppUpdate() {
        const invoke = cmd();
        if (!invoke)
            throw new Error('Tauri not available');
        return invoke('check_app_update');
    },
    async installUpdate() {
        const invoke = cmd();
        if (!invoke)
            throw new Error('Tauri not available');
        await invoke('install_update');
    },
};
