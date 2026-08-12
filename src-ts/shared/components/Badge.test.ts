// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { createBadge, createStatusBadge, createCountBadge } from '@/shared/components/Badge';

describe('Badge Component', () => {
  it('should create a badge with default variant and size', () => {
    const badge = createBadge({ text: 'Ativo' });

    expect(badge).toBeInstanceOf(HTMLElement);
    expect(badge.className).toBe('badge badge-default badge-md');
    expect(badge.querySelector('.badge-text')?.textContent).toBe('Ativo');
  });

  it('should apply custom variant, size and className', () => {
    const badge = createBadge({ text: 'x', variant: 'danger', size: 'sm', className: 'extra' });

    expect(badge.className).toContain('badge-danger');
    expect(badge.className).toContain('badge-sm');
    expect(badge.className).toContain('extra');
  });

  it('should render a dot with variant color when dot is true', () => {
    const badge = createBadge({ text: 'x', dot: true, variant: 'success' });

    const dot = badge.querySelector('.badge-dot') as HTMLElement | null;
    expect(dot).not.toBeNull();
    expect(dot?.style.backgroundColor).toBe('rgb(0, 212, 170)'); // #00d4aa
  });

  it('should render a dot with custom color', () => {
    const badge = createBadge({ text: 'x', dot: true, dotColor: '#123456' });

    const dot = badge.querySelector('.badge-dot') as HTMLElement | null;
    expect(dot?.style.backgroundColor).toBe('rgb(18, 52, 86)'); // #123456
  });

  it('should not render a dot when dot is false', () => {
    const badge = createBadge({ text: 'x' });
    expect(badge.querySelector('.badge-dot')).toBeNull();
  });

  it('createStatusBadge should map known statuses', () => {
    const installed = createStatusBadge('installed');
    expect(installed.className).toContain('badge-success');

    const outdated = createStatusBadge('outdated');
    expect(outdated.className).toContain('badge-warning');

    const unknown = createStatusBadge('whatever');
    expect(unknown.className).toContain('badge-default');
  });

  it('createStatusBadge should be case-insensitive', () => {
    const badge = createStatusBadge('INSTALLED');
    expect(badge.className).toContain('badge-success');
  });

  it('createCountBadge should use primary for positive counts', () => {
    const badge = createCountBadge(3);
    expect(badge.className).toContain('badge-primary');
    expect(badge.querySelector('.badge-text')?.textContent).toBe('3');
  });

  it('createCountBadge should use ghost for zero', () => {
    const badge = createCountBadge(0);
    expect(badge.className).toContain('badge-ghost');
  });
});
