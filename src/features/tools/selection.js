export let selectedTools = new Set();
export let removedTools = new Set();
export function updateButtons() {
    const installBtn = document.getElementById('install-btn');
    const removeBtn = document.getElementById('remove-btn');
    const count = document.getElementById('selected-count');
    const total = selectedTools.size + removedTools.size;
    if (installBtn) {
        installBtn.disabled = selectedTools.size === 0;
        installBtn.textContent = selectedTools.size > 0 ? `⚡ Instalar (${selectedTools.size})` : '⚡ Instalar Selecionadas';
    }
    if (count) {
        count.textContent = total > 0 ? `${total} ferramenta(s) selecionada(s)` : 'Nenhuma ferramenta selecionada';
    }
}
export function toggleInstall(name, card) {
    if (selectedTools.has(name)) {
        selectedTools.delete(name);
        card.classList.remove('selected');
    }
    else {
        selectedTools.add(name);
        card.classList.add('selected');
    }
    updateButtons();
}
export function toggleRemove(name, card) {
    if (removedTools.has(name)) {
        removedTools.delete(name);
        card.classList.remove('selected');
    }
    else {
        removedTools.add(name);
        card.classList.add('selected');
    }
    const removeBtn = document.getElementById('remove-btn');
    if (removeBtn)
        removeBtn.style.display = removedTools.size > 0 ? '' : 'none';
    updateButtons();
}
export function toggleCategorySelect(cat, items) {
    const allSelected = items.every(t => selectedTools.has(t.name));
    for (const tool of items) {
        const card = document.querySelector(`.tool-card[data-name="${tool.name}"]`);
        if (allSelected) {
            selectedTools.delete(tool.name);
            if (card)
                card.classList.remove('selected');
        }
        else {
            if (!tool.available) {
                selectedTools.add(tool.name);
                if (card)
                    card.classList.add('selected');
            }
        }
    }
    updateButtons();
}
