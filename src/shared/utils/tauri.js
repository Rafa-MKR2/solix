export function getInvoke() {
    return window.__TAURI_INTERNALS__?.invoke || null;
}
