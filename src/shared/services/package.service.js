import { getInvoke } from '../utils/tauri.js';
function cmd() {
    return getInvoke();
}
export const packageService = {
    async setPassword(password) {
        const invoke = cmd();
        if (!invoke)
            throw new Error('Tauri not available');
        await invoke('set_password', { password });
    },
    async installTools(toolNames) {
        const invoke = cmd();
        if (!invoke)
            return [];
        return invoke('install_tools', { toolNames });
    },
    async removeTools(toolNames) {
        const invoke = cmd();
        if (!invoke)
            return [];
        return invoke('remove_tools', { toolNames });
    },
    async updateSystem() {
        const invoke = cmd();
        if (!invoke)
            throw new Error('Tauri not available');
        return invoke('update_system');
    },
    async cancelOperation() {
        const invoke = cmd();
        if (!invoke)
            return;
        await invoke('cancel_operation');
    },
    async checkPmLock() {
        const invoke = cmd();
        if (!invoke)
            return { locked: false, message: '' };
        return invoke('check_pm_lock');
    },
    async listInstalled() {
        const invoke = cmd();
        if (!invoke)
            return [];
        return invoke('list_installed_packages');
    },
    async searchRepo(query) {
        const invoke = cmd();
        if (!invoke)
            return [];
        return invoke('search_repo_packages', { query });
    },
    async getHistory() {
        const invoke = cmd();
        if (!invoke)
            return [];
        return invoke('get_package_history');
    },
    async removeSystem(packageNames) {
        const invoke = cmd();
        if (!invoke)
            return [];
        return invoke('remove_system_packages', { packageNames });
    },
    async installRepo(packageNames) {
        const invoke = cmd();
        if (!invoke)
            return [];
        return invoke('install_repo_packages', { packageNames });
    },
    async getPackageInfo(toolName) {
        const invoke = cmd();
        if (!invoke)
            throw new Error('Tauri not available');
        return invoke('get_package_info', { toolName });
    },
    async inspectPackageData(data, fileName) {
        const invoke = cmd();
        if (!invoke)
            throw new Error('Tauri not available');
        return invoke('inspect_package_data', { data, fileName });
    },
    async installPackageData(data, fileName) {
        const invoke = cmd();
        if (!invoke)
            throw new Error('Tauri not available');
        return invoke('install_package_data', { data, fileName });
    },
};
