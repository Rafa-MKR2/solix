// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTooltipTrigger, showTooltip, hideTooltip, initTooltips } from './Tooltip';
import { tooltips } from '../utils/tooltips';

function triggerEl(key = 'cpu'): HTMLElement {
  const el = document.createElement('span');
  el.className = 'help-tip';
  el.dataset.help = key;
  el.textContent = 'ⓘ';
  document.body.appendChild(el);
  return el;
}

function tooltipInDom(): HTMLElement | null {
  return document.querySelector('.help-tooltip');
}

describe('Tooltip Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    hideTooltip();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('createTooltipTrigger', () => {
    it('should create a help-tip trigger with data-help and ⓘ icon', () => {
      const el = createTooltipTrigger('ram');
      expect(el.className).toContain('help-tip');
      expect(el.dataset.help).toBe('ram');
      expect(el.textContent).toBe('ⓘ');
    });

    it('should be keyboard accessible', () => {
      const el = createTooltipTrigger('ram');
      expect(el.getAttribute('role')).toBe('button');
      expect(el.tabIndex).toBe(0);
      expect(el.getAttribute('aria-label')).toBe('Mais informações');
    });

    it('should apply position, className and ariaLabel options', () => {
      const el = createTooltipTrigger('ram', { position: 'top', className: 'help-tip-sm', ariaLabel: 'Ajuda' });
      expect(el.classList.contains('help-tip-sm')).toBe(true);
      expect(el.dataset.position).toBe('top');
      expect(el.getAttribute('aria-label')).toBe('Ajuda');
    });
  });

  describe('showTooltip / hideTooltip', () => {
    it('should create a tooltip with role, id and content', () => {
      const target = triggerEl();
      showTooltip('conteúdo de teste', target);

      const tip = tooltipInDom();
      expect(tip).not.toBeNull();
      expect(tip?.getAttribute('role')).toBe('tooltip');
      expect(tip?.textContent).toBe('conteúdo de teste');
      expect(tip?.id).toBeTruthy();
    });

    it('should wire aria-describedby and aria-expanded on the trigger', () => {
      const target = triggerEl();
      showTooltip('x', target);

      const tip = tooltipInDom();
      expect(target.getAttribute('aria-describedby')).toBe(tip?.id);
      expect(target.getAttribute('aria-expanded')).toBe('true');
    });

    it('should position the tooltip after a frame', async () => {
      const target = triggerEl();
      showTooltip('x', target);
      await new Promise(resolve => setTimeout(resolve, 30));

      const tip = tooltipInDom() as HTMLElement;
      expect(tip.style.left).toBe('10px');
      expect(tip.style.top).toBe('10px');
    });

    it('should add bottom arrow class when forced to top position', async () => {
      const target = triggerEl();
      target.dataset.position = 'top';
      showTooltip('x', target);
      await new Promise(resolve => setTimeout(resolve, 30));

      expect((tooltipInDom() as HTMLElement).classList.contains('bottom')).toBe(true);
    });

    it('hideTooltip should remove the tooltip and ARIA state', () => {
      const target = triggerEl();
      showTooltip('x', target);
      hideTooltip();

      expect(tooltipInDom()).toBeNull();
      expect(target.hasAttribute('aria-describedby')).toBe(false);
      expect(target.hasAttribute('aria-expanded')).toBe(false);
    });
  });

  describe('initTooltips event delegation', () => {
    it('should make existing static triggers accessible', () => {
      const el = triggerEl();
      initTooltips();
      expect(el.getAttribute('role')).toBe('button');
      expect(el.tabIndex).toBe(0);
      expect(el.getAttribute('aria-label')).toBe('Mais informações');
    });

    it('should show the dictionary tooltip on mouseenter', () => {
      const el = triggerEl('cpu');
      initTooltips();
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      expect(tooltipInDom()?.textContent).toBe(tooltips.cpu);
    });

    it('should hide the tooltip on mouseleave after a delay', () => {
      vi.useFakeTimers();
      const el = triggerEl();
      initTooltips();
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      expect(tooltipInDom()).not.toBeNull();

      el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      vi.advanceTimersByTime(250);
      expect(tooltipInDom()).toBeNull();
    });

    it('should toggle the tooltip on click', () => {
      const el = triggerEl();
      initTooltips();
      el.click();
      expect(tooltipInDom()).not.toBeNull();

      el.click();
      expect(tooltipInDom()).toBeNull();
    });

    it('should hide the tooltip when clicking elsewhere', () => {
      const el = triggerEl();
      initTooltips();
      el.click();
      expect(tooltipInDom()).not.toBeNull();

      document.body.click();
      expect(tooltipInDom()).toBeNull();
    });

    it('should open with Enter and close with Escape', () => {
      const el = triggerEl();
      initTooltips();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(tooltipInDom()).not.toBeNull();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(tooltipInDom()).toBeNull();
    });

    it('should hide when focus leaves the trigger', () => {
      const el = triggerEl();
      initTooltips();
      el.click();
      expect(tooltipInDom()).not.toBeNull();

      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
      expect(tooltipInDom()).toBeNull();
    });

    it('should hide on scroll', () => {
      const el = triggerEl();
      initTooltips();
      el.click();
      expect(tooltipInDom()).not.toBeNull();

      document.dispatchEvent(new Event('scroll'));
      expect(tooltipInDom()).toBeNull();
    });

    it('should not show a tooltip for an unknown key', () => {
      const el = triggerEl('nao-existe');
      initTooltips();
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      expect(tooltipInDom()).toBeNull();
    });

    it('should be idempotent and re-apply accessibility to new elements', () => {
      initTooltips();
      const el = triggerEl();
      initTooltips();
      expect(el.getAttribute('role')).toBe('button');

      // listeners não duplicam: clique toggla uma única vez
      el.click();
      expect(tooltipInDom()).not.toBeNull();
      el.click();
      expect(tooltipInDom()).toBeNull();
    });
  });
});
