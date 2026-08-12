// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from 'vitest';
import { createCard, createStatCard } from '@/shared/components/Card';

describe('Card Component', () => {
  it('should create a card without header when no title or icon', () => {
    const card = createCard({ children: '<p>corpo</p>' });

    expect(card.className).toBe('card');
    expect(card.querySelector('.card-header')).toBeNull();
    expect(card.querySelector('.card-body')?.innerHTML).toBe('<p>corpo</p>');
  });

  it('should create a card with title and icon', () => {
    const card = createCard({ title: 'Título', icon: '🖥️', children: 'x' });

    expect(card.querySelector('.card-icon')?.textContent).toBe('🖥️');
    expect(card.querySelector('.card-title')?.textContent).toContain('Título');
  });

  it('should render subtitle inside title', () => {
    const card = createCard({ title: 'T', subtitle: 'sub', children: 'x' });

    expect(card.querySelector('.card-subtitle')?.textContent).toBe('sub');
  });

  it('should append HTMLElement children', () => {
    const child = document.createElement('span');
    child.textContent = 'filho';
    const card = createCard({ children: child });

    expect(card.querySelector('.card-body')?.querySelector('span')?.textContent).toBe('filho');
  });

  it('should wire action buttons with onClick', () => {
    const onClick = vi.fn();
    const card = createCard({
      title: 'T',
      children: 'x',
      actions: [{ label: 'Ok', onClick }],
    });

    const btn = card.querySelector('.card-actions button') as HTMLButtonElement;
    expect(btn.textContent).toBe('Ok');
    btn.click();
    expect(onClick).toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    const card = createCard({ children: 'x', className: 'custom-card' });
    expect(card.className).toBe('card custom-card');
  });
});

describe('StatCard Component', () => {
  it('should create a stat card with icon, label and value', () => {
    const card = createStatCard({ icon: '📊', label: 'CPU', value: '45%' });

    expect(card.className).toContain('stat-card');
    expect(card.querySelector('.stat-icon')?.textContent).toBe('📊');
    expect(card.querySelector('.stat-label')?.textContent).toBe('CPU');
    expect(card.querySelector('.stat-value')?.textContent).toBe('45%');
  });

  it('should convert numeric value to string', () => {
    const card = createStatCard({ icon: '📊', label: 'N', value: 42 });
    expect(card.querySelector('.stat-value')?.textContent).toBe('42');
  });

  it('should render subLabel when provided', () => {
    const card = createStatCard({ icon: 'i', label: 'L', value: 1, subLabel: 'extra' });
    expect(card.querySelector('.stat-sub')?.textContent).toBe('extra');
  });

  it('should render upward trend', () => {
    const card = createStatCard({ icon: 'i', label: 'L', value: 1, trend: 'up', trendValue: '+12%' });

    const trend = card.querySelector('.stat-trend') as HTMLElement;
    expect(trend.className).toContain('up');
    expect(trend.querySelector('.trend-value')?.textContent).toBe('+12%');
  });

  it('should render downward trend', () => {
    const card = createStatCard({ icon: 'i', label: 'L', value: 1, trend: 'down', trendValue: '-5%' });

    const trend = card.querySelector('.stat-trend') as HTMLElement;
    expect(trend.className).toContain('down');
    expect(trend.querySelector('.trend-icon')?.textContent).toBe('▼');
  });

  it('should not render trend when only trend is provided without value', () => {
    const card = createStatCard({ icon: 'i', label: 'L', value: 1, trend: 'up' });
    expect(card.querySelector('.stat-trend')).toBeNull();
  });

  it('should apply custom className', () => {
    const card = createStatCard({ icon: 'i', label: 'L', value: 1, className: 'hero' });
    expect(card.className).toContain('hero');
  });
});
