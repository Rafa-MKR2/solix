import { getTooltip } from '../utils/tooltips.js';
const TRIGGER_SELECTOR = '.help-tip[data-help]';
const HIDE_DELAY_MS = 200;
let tooltipEl = null;
let tooltipTarget = null;
let hideTimer = null;
let tooltipIdCounter = 0;
const registeredListeners = [];
function addDocListener(type, handler, capture = false) {
    document.addEventListener(type, handler, capture);
    registeredListeners.push({ type, handler, capture });
}
function getText(el) {
    const key = el.dataset.help;
    return key ? getTooltip(key) : null;
}
function setupTriggerAccessibility(el, ariaLabel) {
    if (el.getAttribute('role'))
        return;
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.setAttribute('aria-label', ariaLabel ?? 'Mais informações');
}
export function createTooltipTrigger(key, options = {}) {
    const el = document.createElement('span');
    el.className = `help-tip ${options.className ?? ''}`.trim();
    el.dataset.help = key;
    if (options.position && options.position !== 'auto')
        el.dataset.position = options.position;
    el.textContent = '\u24D8';
    setupTriggerAccessibility(el, options.ariaLabel);
    return el;
}
export function showTooltip(text, targetEl) {
    clearHideTimer();
    hideTooltip();
    const el = document.createElement('div');
    const id = `tooltip-${++tooltipIdCounter}`;
    el.className = 'help-tooltip';
    el.id = id;
    el.setAttribute('role', 'tooltip');
    el.textContent = text;
    document.body.appendChild(el);
    tooltipEl = el;
    tooltipTarget = targetEl;
    targetEl.setAttribute('aria-describedby', id);
    targetEl.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
        const rect = targetEl.getBoundingClientRect();
        const tipRect = el.getBoundingClientRect();
        const position = targetEl.dataset.position || 'auto';
        let left;
        let top;
        if (position === 'left') {
            left = rect.left - tipRect.width - 8;
            top = rect.top + rect.height / 2 - tipRect.height / 2;
        }
        else if (position === 'right') {
            left = rect.right + 8;
            top = rect.top + rect.height / 2 - tipRect.height / 2;
        }
        else {
            let placeBottom = position !== 'top';
            if (position === 'auto' && rect.bottom + tipRect.height + 8 > window.innerHeight - 10) {
                placeBottom = false;
            }
            left = rect.left + rect.width / 2 - tipRect.width / 2;
            if (placeBottom) {
                top = rect.bottom + 8;
            }
            else {
                top = rect.top - tipRect.height - 8;
                el.classList.add('bottom');
            }
        }
        left = Math.max(10, Math.min(left, window.innerWidth - tipRect.width - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - tipRect.height - 10));
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
    });
}
export function hideTooltip() {
    if (tooltipEl) {
        tooltipEl.remove();
        tooltipEl = null;
    }
    if (tooltipTarget) {
        tooltipTarget.removeAttribute('aria-describedby');
        tooltipTarget.removeAttribute('aria-expanded');
        tooltipTarget = null;
    }
}
function clearHideTimer() {
    if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
    }
}
function toggleTooltip(el) {
    const text = getText(el);
    if (!text)
        return;
    clearHideTimer();
    if (tooltipTarget === el) {
        hideTooltip();
    }
    else {
        showTooltip(text, el);
    }
}
export function initTooltips() {
    for (const l of registeredListeners) {
        document.removeEventListener(l.type, l.handler, l.capture);
    }
    registeredListeners.length = 0;
    document.querySelectorAll(TRIGGER_SELECTOR).forEach(el => setupTriggerAccessibility(el));
    addDocListener('mouseenter', (e) => {
        const el = e.target.closest(TRIGGER_SELECTOR);
        if (!el)
            return;
        const text = getText(el);
        if (!text)
            return;
        clearHideTimer();
        showTooltip(text, el);
    }, true);
    addDocListener('mouseleave', (e) => {
        const el = e.target.closest(TRIGGER_SELECTOR);
        if (!el)
            return;
        if (hideTimer)
            clearTimeout(hideTimer);
        hideTimer = setTimeout(() => hideTooltip(), HIDE_DELAY_MS);
    }, true);
    addDocListener('click', (e) => {
        const el = e.target.closest(TRIGGER_SELECTOR);
        if (el) {
            e.stopPropagation();
            toggleTooltip(el);
        }
        else {
            hideTooltip();
        }
    });
    addDocListener('keydown', (e) => {
        const event = e;
        if (event.key === 'Escape') {
            hideTooltip();
            return;
        }
        const el = event.target.closest(TRIGGER_SELECTOR);
        if (!el)
            return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleTooltip(el);
        }
    });
    addDocListener('focusout', (e) => {
        const event = e;
        const el = event.target.closest(TRIGGER_SELECTOR);
        if (el && !el.contains(event.relatedTarget)) {
            hideTooltip();
        }
    });
    addDocListener('scroll', () => hideTooltip(), true);
}
