export function setText(id, text) {
    const el = document.getElementById(id);
    if (el)
        el.textContent = text || '—';
}
