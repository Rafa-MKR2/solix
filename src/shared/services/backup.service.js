import { getInvoke } from '../utils/tauri.js';
export const backupService = {
    async createBackup(source, destination, mountPoint) {
        const invoke = getInvoke();
        if (!invoke)
            throw new Error('Tauri not available');
        return invoke('create_backup', { source, destination, mountPoint });
    },
};
