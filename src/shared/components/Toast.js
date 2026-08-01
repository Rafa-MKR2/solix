let toastContainer = null;
let toastIdCounter = 0;
const toasts = new Map();
function getToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}
const TOAST_ICONS = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    loading: '⏳',
};
const TOAST_TITLES = {
    success: 'Sucesso',
    error: 'Erro',
    warning: 'Atenção',
    info: 'Informação',
    loading: 'Carregando',
};
export function showToast(options) {
    const id = ++toastIdCounter;
    const container = getToastContainer();
    const { type, title, message, duration = 4000, action, persistent = false } = options;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-enter`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = TOAST_ICONS[type];
    toast.appendChild(icon);
    const content = document.createElement('div');
    content.className = 'toast-content';
    const titleEl = document.createElement('div');
    titleEl.className = 'toast-title';
    titleEl.textContent = title || TOAST_TITLES[type];
    content.appendChild(titleEl);
    if (message) {
        const messageEl = document.createElement('div');
        messageEl.className = 'toast-message';
        messageEl.textContent = message;
        content.appendChild(messageEl);
    }
    toast.appendChild(content);
    if (action) {
        const actionBtn = document.createElement('button');
        actionBtn.className = 'toast-action';
        actionBtn.textContent = action.label;
        actionBtn.addEventListener('click', () => {
            action.onClick();
            removeToast(id);
        });
        toast.appendChild(actionBtn);
    }
    if (!persistent) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('aria-label', 'Fechar');
        closeBtn.addEventListener('click', () => removeToast(id));
        toast.appendChild(closeBtn);
    }
    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-visible');
    });
    let timeoutId = null;
    if (!persistent && duration > 0) {
        timeoutId = setTimeout(() => removeToast(id), duration);
    }
    toasts.set(id, { id, element: toast, timeoutId });
    return id;
}
export function removeToast(id) {
    const toast = toasts.get(id);
    if (!toast)
        return;
    const { element, timeoutId } = toast;
    if (timeoutId)
        clearTimeout(timeoutId);
    element.classList.remove('toast-visible');
    element.classList.add('toast-exit');
    setTimeout(() => {
        element.remove();
        toasts.delete(id);
    }, 300);
}
export function updateToast(id, options) {
    const toast = toasts.get(id);
    if (!toast)
        return;
    const { element } = toast;
    if (options.type) {
        const oldType = Array.from(element.classList).find(c => c.startsWith('toast-'))?.replace('toast-', '');
        if (oldType) {
            element.classList.remove(`toast-${oldType}`);
        }
        element.classList.add(`toast-${options.type}`);
        const icon = element.querySelector('.toast-icon');
        if (icon)
            icon.textContent = TOAST_ICONS[options.type];
    }
    if (options.title) {
        const titleEl = element.querySelector('.toast-title');
        if (titleEl)
            titleEl.textContent = options.title;
    }
    if (options.message) {
        let messageEl = element.querySelector('.toast-message');
        if (messageEl) {
            messageEl.textContent = options.message;
        }
        else if (options.message) {
            messageEl = document.createElement('div');
            messageEl.className = 'toast-message';
            messageEl.textContent = options.message;
            element.querySelector('.toast-content')?.appendChild(messageEl);
        }
    }
    if (options.duration && !options.persistent) {
        const existing = toasts.get(id);
        if (existing?.timeoutId)
            clearTimeout(existing.timeoutId);
        const timeoutId = setTimeout(() => removeToast(id), options.duration);
        if (existing)
            toasts.set(id, { ...existing, timeoutId });
    }
}
export function showSuccess(title, message, duration) {
    return showToast({ type: 'success', title, message, duration });
}
export function showError(title, message, duration) {
    return showToast({ type: 'error', title, message, duration });
}
export function showWarning(title, message, duration) {
    return showToast({ type: 'warning', title, message, duration });
}
export function showInfo(title, message, duration) {
    return showToast({ type: 'info', title, message, duration });
}
export function showLoading(title, message) {
    return showToast({ type: 'loading', title, message, duration: 0, persistent: true });
}
export function dismissAllToasts() {
    toasts.forEach((_, id) => removeToast(id));
}
