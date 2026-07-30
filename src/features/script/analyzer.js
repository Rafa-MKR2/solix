import { showToast } from '../../utils.js';
import { scriptService } from '../../shared/services/index.js';
import { renderScriptAnalysis } from './renderer.js';
export async function handleScriptDrop(file) {
    const resultEl = document.getElementById('script-result');
    if (!resultEl)
        return;
    if (!file) {
        resultEl.classList.add('hidden');
        return;
    }
    const fileInfo = document.getElementById('script-file-info');
    const fileLabel = document.getElementById('script-file-label');
    if (fileInfo)
        fileInfo.classList.remove('hidden');
    if (fileLabel)
        fileLabel.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    const summaryEl = document.getElementById('script-summary');
    const commandsEl = document.getElementById('script-commands');
    if (summaryEl)
        summaryEl.innerHTML = '<div class="script-loading">⏳ Analisando script...</div>';
    if (commandsEl)
        commandsEl.innerHTML = '';
    resultEl.classList.remove('hidden');
    try {
        const text = await readFileAsText(file);
        const analysis = await scriptService.analyzeScript(text);
        renderScriptAnalysis(analysis);
    }
    catch (e) {
        console.error('analyze_script failed:', e);
        if (summaryEl)
            summaryEl.innerHTML = `<div class="script-loading" style="color:#e88">❌ Erro ao analisar script: ${e}</div>`;
    }
}
export async function handleAnalyzeText(text) {
    const resultEl = document.getElementById('script-result');
    if (!resultEl)
        return;
    if (!text.trim()) {
        showToast('error', 'Cole um script para analisar.');
        return;
    }
    const summaryEl = document.getElementById('script-summary');
    const commandsEl = document.getElementById('script-commands');
    if (summaryEl)
        summaryEl.innerHTML = '<div class="script-loading">⏳ Analisando código...</div>';
    if (commandsEl)
        commandsEl.innerHTML = '';
    resultEl.classList.remove('hidden');
    try {
        const analysis = await scriptService.analyzeScript(text);
        renderScriptAnalysis(analysis);
    }
    catch (e) {
        console.error('analyze_script failed:', e);
        if (summaryEl)
            summaryEl.innerHTML = `<div class="script-loading" style="color:#e88">❌ Erro ao analisar: ${e}</div>`;
    }
}
export function clearScriptAnalysis() {
    const resultEl = document.getElementById('script-result');
    const fileInfo = document.getElementById('script-file-info');
    const fileInput = document.getElementById('script-file-input');
    const textarea = document.getElementById('script-textarea');
    if (resultEl)
        resultEl.classList.add('hidden');
    if (fileInfo)
        fileInfo.classList.add('hidden');
    if (fileInput)
        fileInput.value = '';
    if (textarea)
        textarea.value = '';
    const summaryEl = document.getElementById('script-summary');
    const commandsEl = document.getElementById('script-commands');
    if (summaryEl)
        summaryEl.innerHTML = '';
    if (commandsEl)
        commandsEl.innerHTML = '';
    const analyzeBtn = document.getElementById('script-analyze-btn');
    if (analyzeBtn)
        analyzeBtn.disabled = true;
    const clearTextBtn = document.getElementById('script-clear-text-btn');
    if (clearTextBtn)
        clearTextBtn.style.display = 'none';
}
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject('Erro ao ler arquivo');
        reader.readAsText(file);
    });
}
