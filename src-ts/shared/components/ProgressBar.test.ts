// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import {
  createProgressBar,
  updateProgressBar,
  createIndeterminateProgressBar,
} from '@/shared/components/ProgressBar';

describe('ProgressBar Component', () => {
  it('should create a progress bar with value percentage', () => {
    const bar = createProgressBar({ value: 50 });

    const fill = bar.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('50%');
    expect(bar.querySelector('.progress-bar-percent')?.textContent).toBe('50%');
    expect(fill.getAttribute('aria-valuenow')).toBe('50');
    expect(fill.getAttribute('aria-valuemax')).toBe('100');
  });

  it('should clamp values above max', () => {
    const bar = createProgressBar({ value: 150 });

    const fill = bar.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
    expect(fill.getAttribute('aria-valuenow')).toBe('100');
  });

  it('should clamp negative values to zero', () => {
    const bar = createProgressBar({ value: -10 });

    const fill = bar.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
    expect(fill.getAttribute('aria-valuenow')).toBe('0');
  });

  it('should render label and custom max', () => {
    const bar = createProgressBar({ value: 2, max: 4, label: 'Backup' });

    expect(bar.querySelector('.progress-bar-label')?.textContent).toBe('Backup');
    const fill = bar.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('50%');
    expect(fill.getAttribute('aria-valuemax')).toBe('4');
  });

  it('should hide percentage when showPercent is false', () => {
    const bar = createProgressBar({ value: 50, showPercent: false });
    expect(bar.querySelector('.progress-bar-percent')).toBeNull();
  });

  it('should apply animated/striped classes and color/size', () => {
    const bar = createProgressBar({
      value: 50,
      animated: false,
      striped: false,
      color: 'success',
      size: 'lg',
    });

    const fill = bar.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill.className).toContain('progress-bar-success');
    expect(fill.className).not.toContain('animated');
    expect(fill.className).not.toContain('striped');
    expect(bar.querySelector('.progress-bar-track')?.className).toContain('progress-bar-lg');
  });

  it('should round percentage display', () => {
    const bar = createProgressBar({ value: 33.33 });
    expect(bar.querySelector('.progress-bar-percent')?.textContent).toBe('33%');
  });

  it('should update progress bar values', () => {
    const bar = createProgressBar({ value: 10 });
    updateProgressBar(bar, 80);

    const fill = bar.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('80%');
    expect(fill.getAttribute('aria-valuenow')).toBe('80');
    expect(bar.querySelector('.progress-bar-percent')?.textContent).toBe('80%');
  });

  it('should update progress bar with custom max', () => {
    const bar = createProgressBar({ value: 1, max: 4 });
    updateProgressBar(bar, 3, 4);

    const fill = bar.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill.style.width).toBe('75%');
  });

  it('should do nothing when fill is missing', () => {
    const div = document.createElement('div');
    expect(() => updateProgressBar(div, 50)).not.toThrow();
  });

  it('should create indeterminate progress bar', () => {
    const bar = createIndeterminateProgressBar({ label: 'Analisando...', color: 'info' });

    expect(bar.querySelector('.progress-bar-label')?.textContent).toBe('Analisando...');
    expect(bar.querySelector('.progress-bar-fill')?.className).toContain('indeterminate');
  });

  it('should create indeterminate progress bar without options', () => {
    const bar = createIndeterminateProgressBar();
    expect(bar.querySelector('.progress-bar-track')?.className).toContain('progress-bar-md');
    expect(bar.querySelector('.progress-bar-label')).toBeNull();
  });
});
