import { getInvoke } from '../utils/tauri.js';
export const scriptService = {
    async analyzeScript(content) {
        const invoke = getInvoke();
        if (!invoke)
            throw new Error('Tauri not available');
        return invoke('analyze_script', { content });
    },
};
