import { getInvoke } from '../utils/tauri.js';
function cmd() {
    return getInvoke();
}
export const diskService = {
    async openFileManager(path) {
        const invoke = cmd();
        if (!invoke)
            return;
        await invoke('open_file_manager', { path });
    },
    async analyzeUsage(mountPoint) {
        const invoke = cmd();
        if (!invoke)
            return [];
        return invoke('analyze_disk_usage', { mountPoint });
    },
    async getPartitionTable(device) {
        const invoke = cmd();
        if (!invoke)
            return '';
        return invoke('get_partition_table', { device });
    },
    async getSmartInfo(device) {
        const invoke = cmd();
        if (!invoke)
            throw new Error('Tauri not available');
        return invoke('get_disk_smart_info', { device });
    },
};
