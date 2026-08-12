// SPDX-License-Identifier: MIT

import { getTooltip } from '../utils/tooltips.js';

export type TooltipPosition = 'auto' | 'top' | 'bottom' | 'left' | 'right';

export interface TooltipOptions {
  /** Posição do balão em relação ao gatilho. `auto` (padrão) mostra abaixo e vira para cima se faltar espaço. */
  position?: TooltipPosition;
  /** Classes extras aplicadas ao gatilho (ex.: `help-tip-sm`). */
  className?: string;
  /** Rótulo acessível do gatilho (default: "Mais informações"). */
  ariaLabel?: string;
}

const TRIGGER_SELECTOR = '.help-tip[data-help]';
const HIDE_DELAY_MS = 200;

let tooltipEl: HTMLElement | null = null;
let tooltipTarget: HTMLElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let tooltipIdCounter = 0;

interface RegisteredListener {
  type: string;
  handler: EventListenerOrEventListenerObject;
  capture: boolean;
}

const registeredListeners: RegisteredListener[] = [];

function addDocListener(type: string, handler: EventListenerOrEventListenerObject, capture = false): void {
  document.addEventListener(type, handler, capture);
  registeredListeners.push({ type, handler, capture });
}

function getText(el: HTMLElement): string | null {
  const key = el.dataset.help;
  return key ? getTooltip(key) : null;
}

function setupTriggerAccessibility(el: HTMLElement, ariaLabel?: string): void {
  if (el.getAttribute('role')) return;
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  el.setAttribute('aria-label', ariaLabel ?? 'Mais informações');
}

/**
 * Cria um gatilho ⓘ programático. O elemento usa `data-help` e a classe
 * `help-tip`, então funciona automaticamente com `initTooltips()`.
 */
export function createTooltipTrigger(key: string, options: TooltipOptions = {}): HTMLElement {
  const el = document.createElement('span');
  el.className = `help-tip ${options.className ?? ''}`.trim();
  el.dataset.help = key;
  if (options.position && options.position !== 'auto') el.dataset.position = options.position;
  el.textContent = '\u24D8'; // ⓘ
  setupTriggerAccessibility(el, options.ariaLabel);
  return el;
}

/** Exibe o balão de tooltip ancorado ao gatilho (substitui qualquer tooltip visível). */
export function showTooltip(text: string, targetEl: HTMLElement): void {
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
    const position = (targetEl.dataset.position as TooltipPosition | undefined) || 'auto';

    let left: number;
    let top: number;

    if (position === 'left') {
      left = rect.left - tipRect.width - 8;
      top = rect.top + rect.height / 2 - tipRect.height / 2;
    } else if (position === 'right') {
      left = rect.right + 8;
      top = rect.top + rect.height / 2 - tipRect.height / 2;
    } else {
      // bottom (padrão), com auto-flip para cima quando falta espaço
      let placeBottom = position !== 'top';
      if (position === 'auto' && rect.bottom + tipRect.height + 8 > window.innerHeight - 10) {
        placeBottom = false;
      }
      left = rect.left + rect.width / 2 - tipRect.width / 2;
      if (placeBottom) {
        top = rect.bottom + 8;
      } else {
        top = rect.top - tipRect.height - 8;
        el.classList.add('bottom');
      }
    }

    // Mantém o balão dentro da viewport
    left = Math.max(10, Math.min(left, window.innerWidth - tipRect.width - 10));
    top = Math.max(10, Math.min(top, window.innerHeight - tipRect.height - 10));

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  });
}

/** Remove o balão de tooltip e limpa os atributos ARIA do gatilho. */
export function hideTooltip(): void {
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

function clearHideTimer(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function toggleTooltip(el: HTMLElement): void {
  const text = getText(el);
  if (!text) return;
  clearHideTimer();
  if (tooltipTarget === el) {
    hideTooltip();
  } else {
    showTooltip(text, el);
  }
}

/**
 * Inicializa os tooltips por delegação de eventos em document.
 * Funciona com o markup estático (`<span class="help-tip" data-help="...">ⓘ</span>`)
 * e com gatilhos criados por `createTooltipTrigger()`.
 *
 * Acessível: gatilhos ganham `role="button"` + `tabindex`, navegação por
 * Enter/Espaço, fechamento com ESC, `aria-describedby` enquanto visível e
 * esconde ao sair do foco.
 */
export function initTooltips(): void {
  // Remove listeners de uma inicialização anterior (idempotente — evita
  // listeners duplicados e re-aplica acessibilidade a elementos novos).
  for (const l of registeredListeners) {
    document.removeEventListener(l.type, l.handler, l.capture);
  }
  registeredListeners.length = 0;

  document.querySelectorAll<HTMLElement>(TRIGGER_SELECTOR).forEach(el => setupTriggerAccessibility(el));

  addDocListener('mouseenter', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>(TRIGGER_SELECTOR);
    if (!el) return;
    const text = getText(el);
    if (!text) return;
    clearHideTimer();
    showTooltip(text, el);
  }, true);

  addDocListener('mouseleave', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>(TRIGGER_SELECTOR);
    if (!el) return;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => hideTooltip(), HIDE_DELAY_MS);
  }, true);

  addDocListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>(TRIGGER_SELECTOR);
    if (el) {
      e.stopPropagation();
      toggleTooltip(el);
    } else {
      hideTooltip();
    }
  });

  addDocListener('keydown', (e) => {
    const event = e as KeyboardEvent;
    if (event.key === 'Escape') {
      hideTooltip();
      return;
    }
    const el = (event.target as HTMLElement).closest<HTMLElement>(TRIGGER_SELECTOR);
    if (!el) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleTooltip(el);
    }
  });

  addDocListener('focusout', (e) => {
    const event = e as FocusEvent;
    const el = (event.target as HTMLElement).closest<HTMLElement>(TRIGGER_SELECTOR);
    if (el && !el.contains(event.relatedTarget as Node | null)) {
      hideTooltip();
    }
  });

  addDocListener('scroll', () => hideTooltip(), true);
}
