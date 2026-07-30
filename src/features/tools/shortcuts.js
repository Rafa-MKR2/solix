import { miscService } from '../../shared/services/index.js';
export async function askDesktopShortcuts(toolNames) {
    if (toolNames.length === 0)
        return;
    const outputLog = document.getElementById('output-log');
    const outputSection = document.getElementById('output-section');
    if (!outputSection)
        return;
    if (outputLog) {
        outputLog.textContent += `\n🪄 Create desktop shortcuts?\n`;
    }
    const existing = document.getElementById('shortcut-prompt');
    if (existing)
        existing.remove();
    const prompt = document.createElement('div');
    prompt.id = 'shortcut-prompt';
    prompt.style.cssText = 'display:flex;align-items:center;gap:0.6rem;margin-top:0.5rem;padding:0.6rem 0.8rem;background:#1a1a32;border:1px solid #3a3a5a;border-radius:8px;font-size:0.85rem;';
    const count = toolNames.length;
    const label = document.createElement('span');
    label.textContent = `🪄 Create desktop shortcuts for ${count} app(s): ${toolNames.join(', ')}?`;
    label.style.cssText = 'color:#ccc;flex:1;';
    const yesBtn = document.createElement('button');
    yesBtn.textContent = '✅ Yes';
    yesBtn.style.cssText = 'padding:0.3rem 0.8rem;background:#0f2a1a;border:1px solid #2a5a3a;border-radius:6px;color:#4ae0a0;cursor:pointer;font-size:0.8rem;';
    yesBtn.addEventListener('click', async () => {
        prompt.innerHTML = '<span style="color:#4ae0a0">⏳ Creating shortcuts...</span>';
        let created = 0;
        for (const name of toolNames) {
            try {
                const path = await miscService.createDesktopShortcut(name);
                if (outputLog)
                    outputLog.textContent += `  ✅ ${path}\n`;
                created++;
            }
            catch (e) {
                if (outputLog)
                    outputLog.textContent += `  ❌ ${name}: ${e}\n`;
            }
        }
        prompt.innerHTML = `<span style="color:#4ae0a0">✅ ${created}/${count} shortcut(s) created!</span>`;
        setTimeout(() => prompt.remove(), 4000);
    });
    const noBtn = document.createElement('button');
    noBtn.textContent = '❌ No';
    noBtn.style.cssText = 'padding:0.3rem 0.8rem;background:#2a1a1a;border:1px solid #5a2a2a;border-radius:6px;color:#e88;cursor:pointer;font-size:0.8rem;';
    noBtn.addEventListener('click', () => {
        if (outputLog)
            outputLog.textContent += `  Skipped shortcut creation\n`;
        prompt.remove();
    });
    prompt.appendChild(label);
    prompt.appendChild(yesBtn);
    prompt.appendChild(noBtn);
    outputSection.appendChild(prompt);
}
