// SPDX-License-Identifier: MIT

import { showToast } from '../../utils.js';
import { scriptService } from '../../shared/services/index.js';
import { renderScriptAnalysis } from './renderer.js';
import type { ScriptAnalysis } from '../../types.js';

// ─── Script Analyzer ───

async function analyzeAndRender(fileName: string, analyze: () => Promise<ScriptAnalysis>): Promise<void> {
  const resultEl = document.getElementById('script-result');
  if (!resultEl) return;

  const fileInfo = document.getElementById('script-file-info');
  const fileLabel = document.getElementById('script-file-label');
  if (fileInfo) fileInfo.classList.remove('hidden');
  if (fileLabel) fileLabel.textContent = fileName;

  const summaryEl = document.getElementById('script-summary');
  const commandsEl = document.getElementById('script-commands');
  if (summaryEl) summaryEl.innerHTML = '<div class="script-loading">⏳ Analisando script...</div>';
  if (commandsEl) commandsEl.innerHTML = '';
  resultEl.classList.remove('hidden');

  try {
    const analysis = await analyze();
    renderScriptAnalysis(analysis);
  } catch (e) {
    console.error('analyze_script failed:', e);
    if (summaryEl) summaryEl.innerHTML = `<div class="script-loading" style="color:#e88">❌ Erro ao analisar script: ${e}</div>`;
  }
}

export async function handleScriptDrop(file: File | null): Promise<void> {
  const resultEl = document.getElementById('script-result');
  if (!resultEl) return;

  if (!file) {
    resultEl.classList.add('hidden');
    return;
  }

  const label = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  await analyzeAndRender(label, async () => {
    const text = await readFileAsText(file);
    return scriptService.analyzeScript(text);
  });
}

/** Analisa um script a partir do caminho absoluto (diálogo nativo ou drag-drop do Tauri). */
export async function handleScriptPath(path: string): Promise<void> {
  const fileName = path.split('/').pop() || path;
  await analyzeAndRender(fileName, () => scriptService.analyzeScriptFile(path));
}

export async function handleAnalyzeText(text: string): Promise<void> {
  const resultEl = document.getElementById('script-result');
  if (!resultEl) return;

  if (!text.trim()) {
    showToast('error', 'Cole um script para analisar.');
    return;
  }

  const summaryEl = document.getElementById('script-summary');
  const commandsEl = document.getElementById('script-commands');
  if (summaryEl) summaryEl.innerHTML = '<div class="script-loading">⏳ Analisando código...</div>';
  if (commandsEl) commandsEl.innerHTML = '';
  resultEl.classList.remove('hidden');

  try {
    const analysis = await scriptService.analyzeScript(text);
    renderScriptAnalysis(analysis);
  } catch (e) {
    console.error('analyze_script failed:', e);
    if (summaryEl) summaryEl.innerHTML = `<div class="script-loading" style="color:#e88">❌ Erro ao analisar: ${e}</div>`;
  }
}

export function clearScriptAnalysis(): void {
  const resultEl = document.getElementById('script-result');
  const fileInfo = document.getElementById('script-file-info');
  const fileInput = document.getElementById('script-file-input') as HTMLInputElement | null;
  const textarea = document.getElementById('script-textarea') as HTMLTextAreaElement | null;

  if (resultEl) resultEl.classList.add('hidden');
  if (fileInfo) fileInfo.classList.add('hidden');
  if (fileInput) fileInput.value = '';
  if (textarea) textarea.value = '';

  const summaryEl = document.getElementById('script-summary');
  const commandsEl = document.getElementById('script-commands');
  if (summaryEl) summaryEl.innerHTML = '';
  if (commandsEl) commandsEl.innerHTML = '';

  const analyzeBtn = document.getElementById('script-analyze-btn') as HTMLButtonElement | null;
  if (analyzeBtn) analyzeBtn.disabled = true;

  const clearTextBtn = document.getElementById('script-clear-text-btn');
  if (clearTextBtn) clearTextBtn.style.display = 'none';
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject('Erro ao ler arquivo');
    reader.readAsText(file);
  });
}
