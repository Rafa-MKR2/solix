// SPDX-License-Identifier: MIT

import { getInvoke } from '../utils/tauri.js';
import type { ScriptAnalysis } from '../types/index.js';

export const scriptService = {
  async analyzeScript(content: string): Promise<ScriptAnalysis> {
    const invoke = getInvoke();
    if (!invoke) throw new Error('Tauri not available');
    return invoke<ScriptAnalysis>('analyze_script', { content });
  },
};
