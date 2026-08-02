export function resolveDropTarget(element, activePageId) {
    if (element) {
        if (document.getElementById('script-upload-area')?.contains(element))
            return 'script';
        if (document.getElementById('pkg-upload-area')?.contains(element))
            return 'pkg';
    }
    if (activePageId === 'page-analisador')
        return 'script';
    if (activePageId === 'page-pacotes')
        return 'pkg';
    return null;
}
