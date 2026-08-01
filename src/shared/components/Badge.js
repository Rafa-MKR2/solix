export function createBadge(options) {
    const { text, variant = 'default', size = 'md', dot = false, dotColor, className = '', } = options;
    const badge = document.createElement('span');
    badge.className = `badge badge-${variant} badge-${size} ${className}`.trim();
    if (dot) {
        const dotEl = document.createElement('span');
        dotEl.className = 'badge-dot';
        dotEl.style.backgroundColor = dotColor || getVariantColor(variant);
        badge.appendChild(dotEl);
    }
    const textEl = document.createElement('span');
    textEl.className = 'badge-text';
    textEl.textContent = text;
    badge.appendChild(textEl);
    return badge;
}
function getVariantColor(variant) {
    switch (variant) {
        case 'primary': return '#00b5ad';
        case 'success': return '#00d4aa';
        case 'warning': return '#e8c547';
        case 'danger': return '#e84a4a';
        case 'info': return '#4da6ff';
        case 'ghost': return '#666';
        default: return '#888';
    }
}
export function createStatusBadge(status, options = {}) {
    const statusMap = {
        installed: 'success',
        available: 'info',
        outdated: 'warning',
        missing: 'danger',
        running: 'success',
        stopped: 'danger',
        active: 'success',
        inactive: 'ghost',
        connected: 'success',
        disconnected: 'danger',
        healthy: 'success',
        warning: 'warning',
        critical: 'danger',
        unknown: 'ghost',
    };
    const variant = statusMap[status.toLowerCase()] || 'default';
    return createBadge({ text: status, variant, ...options });
}
export function createCountBadge(count, options = {}) {
    const variant = count > 0 ? 'primary' : 'ghost';
    return createBadge({ text: String(count), variant, ...options });
}
