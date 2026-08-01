import { toggleCategorySelect, toggleInstall, toggleRemove } from './selection.js';
export const categoryLabels = {
    desenvolvimento: '🛠️ Desenvolvimento',
    internet: '🌐 Internet',
    container: '📦 Container',
    jogos: '🎮 Jogos',
    midia: '🎵 Mídia',
    escritorio: '📄 Escritório',
    comunicacao: '💬 Comunicação',
    utilitarios: '🔧 Utilitários',
    temas: '🎨 Temas',
};
const categoryOrder = ['desenvolvimento', 'internet', 'container', 'jogos', 'midia', 'escritorio', 'comunicacao', 'utilitarios', 'temas'];
export function renderTools(tools) {
    const container = document.getElementById('tools-list');
    if (!container)
        return;
    container.innerHTML = '';
    const query = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    const filtered = query
        ? tools.filter(t => t.name.toLowerCase().includes(query) || (t.description || '').toLowerCase().includes(query))
        : tools;
    if (filtered.length === 0 && query) {
        container.innerHTML = '<div class="empty-search">🔍 Nenhuma ferramenta encontrada para "<strong>' + query + '</strong>"</div>';
        return;
    }
    const grouped = {};
    for (const tool of filtered) {
        const cat = tool.category || 'outros';
        if (!grouped[cat])
            grouped[cat] = [];
        grouped[cat].push(tool);
    }
    let cardIndex = 0;
    for (const cat of categoryOrder) {
        const items = grouped[cat];
        if (!items)
            continue;
        const header = document.createElement('h3');
        header.className = 'category-header';
        header.textContent = categoryLabels[cat] || cat;
        header.dataset.category = cat;
        const selectAll = document.createElement('span');
        selectAll.className = 'cat-select-all';
        selectAll.textContent = 'Selecionar todas';
        selectAll.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCategorySelect(cat, items);
        });
        header.appendChild(selectAll);
        container.appendChild(header);
        for (const tool of items) {
            const card = document.createElement('div');
            card.className = 'tool-card';
            card.style.animationDelay = `${cardIndex * 0.025}s`;
            cardIndex++;
            if (tool.available)
                card.classList.add('installed');
            card.dataset.name = tool.name;
            const iconHtml = tool.icon_base64
                ? `<img class="tool-card-icon" src="${tool.icon_base64}" alt="" />`
                : '<div class="tool-card-icon-placeholder"></div>';
            card.innerHTML = `
        ${iconHtml}
        <div class="tool-check">${tool.available ? '\u2713' : ''}</div>
        <div class="tool-info">
          <div class="tool-name">${tool.name}</div>
          <div class="tool-desc">${tool.description || ''}</div>
        </div>
        <div class="tool-badge">${tool.available ? 'instalado' : 'ausente'}</div>
        <button class="tool-info-btn" data-tool="${tool.name}" title="Detalhes">ⓘ</button>
      `;
            const icon = card.querySelector('.tool-card-icon');
            if (icon) {
                icon.addEventListener('error', () => {
                    icon.style.display = 'none';
                });
            }
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('tool-info-btn'))
                    return;
                if (tool.available) {
                    toggleRemove(tool.name, card);
                }
                else {
                    toggleInstall(tool.name, card);
                }
            });
            container.appendChild(card);
        }
    }
}
