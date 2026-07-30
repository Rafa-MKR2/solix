import { getInvoke } from '../utils/tauri.js';
export const processService = {
    async getProcesses() {
        const invoke = getInvoke();
        if (!invoke)
            return [];
        return invoke('get_processes');
    },
    async killProcess(name) {
        const invoke = getInvoke();
        if (!invoke)
            return '';
        return invoke('kill_process', { name });
    },
    async removeLockFiles() {
        const invoke = getInvoke();
        if (!invoke)
            return '';
        return invoke('remove_lock_files');
    },
};
