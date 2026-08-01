export function createCard(options) {
    const card = document.createElement('div');
    card.className = `card ${options.className || ''}`.trim();
    if (options.title || options.icon) {
        const header = document.createElement('div');
        header.className = 'card-header';
        if (options.icon) {
            const iconEl = document.createElement('span');
            iconEl.className = 'card-icon';
            iconEl.textContent = options.icon;
            header.appendChild(iconEl);
        }
        if (options.title) {
            const titleEl = document.createElement('h4');
            titleEl.className = 'card-title';
            titleEl.textContent = options.title;
            header.appendChild(titleEl);
            if (options.subtitle) {
                const subtitleEl = document.createElement('span');
                subtitleEl.className = 'card-subtitle';
                subtitleEl.textContent = options.subtitle;
                titleEl.appendChild(subtitleEl);
            }
        }
        if (options.actions && options.actions.length > 0) {
            const actionsEl = document.createElement('div');
            actionsEl.className = 'card-actions';
            options.actions.forEach(action => {
                const btn = document.createElement('button');
                btn.className = `btn btn-sm ${action.class || ''}`;
                btn.textContent = action.label;
                btn.addEventListener('click', action.onClick);
                actionsEl.appendChild(btn);
            });
            header.appendChild(actionsEl);
        }
        card.appendChild(header);
    }
    const body = document.createElement('div');
    body.className = 'card-body';
    if (typeof options.children === 'string') {
        body.innerHTML = options.children;
    }
    else {
        body.appendChild(options.children);
    }
    card.appendChild(body);
    return card;
}
export function createStatCard(options) {
    const card = document.createElement('div');
    card.className = `stat-card ${options.className || ''}`.trim();
    const header = document.createElement('div');
    header.className = 'stat-card-header';
    const iconEl = document.createElement('span');
    iconEl.className = 'stat-icon';
    iconEl.textContent = options.icon;
    header.appendChild(iconEl);
    const labelEl = document.createElement('span');
    labelEl.className = 'stat-label';
    labelEl.textContent = options.label;
    header.appendChild(labelEl);
    card.appendChild(header);
    const valueEl = document.createElement('div');
    valueEl.className = 'stat-value';
    valueEl.textContent = String(options.value);
    card.appendChild(valueEl);
    if (options.subLabel) {
        const subEl = document.createElement('div');
        subEl.className = 'stat-sub';
        subEl.textContent = options.subLabel;
        card.appendChild(subEl);
    }
    if (options.trend && options.trendValue) {
        const trendEl = document.createElement('div');
        trendEl.className = `stat-trend ${options.trend}`;
        trendEl.innerHTML = `
      <span class="trend-icon">${options.trend === 'up' ? '▲' : options.trend === 'down' ? '▼' : '●'}</span>
      <span class="trend-value">${options.trendValue}</span>
    `;
        card.appendChild(trendEl);
    }
    return card;
}
