// SPDX-License-Identifier: MIT

export interface ProgressBarOptions {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  animated?: boolean;
  striped?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function createProgressBar(options: ProgressBarOptions): HTMLElement {
  const {
    value,
    max = 100,
    label,
    showPercent = true,
    animated = true,
    striped = true,
    color = 'primary',
    size = 'md',
    className = '',
  } = options;

  const clampedValue = Math.max(0, Math.min(max, value));
  const percentage = (clampedValue / max) * 100;

  const container = document.createElement('div');
  container.className = `progress-bar-container ${className}`.trim();

  if (label) {
    const labelEl = document.createElement('div');
    labelEl.className = 'progress-bar-label';
    labelEl.textContent = label;
    container.appendChild(labelEl);
  }

  const track = document.createElement('div');
  track.className = `progress-bar-track progress-bar-${size}`;

  const fill = document.createElement('div');
  fill.className = `progress-bar-fill progress-bar-${color} ${animated ? 'animated' : ''} ${striped ? 'striped' : ''}`;
  fill.style.width = `${percentage}%`;
  fill.setAttribute('role', 'progressbar');
  fill.setAttribute('aria-valuenow', String(clampedValue));
  fill.setAttribute('aria-valuemin', '0');
  fill.setAttribute('aria-valuemax', String(max));

  track.appendChild(fill);
  container.appendChild(track);

  if (showPercent) {
    const percentEl = document.createElement('div');
    percentEl.className = 'progress-bar-percent';
    percentEl.textContent = `${Math.round(percentage)}%`;
    container.appendChild(percentEl);
  }

  return container;
}

export function updateProgressBar(
  container: HTMLElement,
  value: number,
  max = 100
): void {
  const fill = container.querySelector('.progress-bar-fill') as HTMLElement | null;
  const percentEl = container.querySelector('.progress-bar-percent') as HTMLElement | null;

  if (!fill) return;

  const clampedValue = Math.max(0, Math.min(max, value));
  const percentage = (clampedValue / max) * 100;

  fill.style.width = `${percentage}%`;
  fill.setAttribute('aria-valuenow', String(clampedValue));

  if (percentEl) {
    percentEl.textContent = `${Math.round(percentage)}%`;
  }
}

export function createIndeterminateProgressBar(options: Omit<ProgressBarOptions, 'value'> = {}): HTMLElement {
  const container = document.createElement('div');
  container.className = `progress-bar-container ${options.className || ''}`.trim();

  if (options.label) {
    const labelEl = document.createElement('div');
    labelEl.className = 'progress-bar-label';
    labelEl.textContent = options.label;
    container.appendChild(labelEl);
  }

  const track = document.createElement('div');
  track.className = `progress-bar-track progress-bar-${options.size || 'md'}`;

  const fill = document.createElement('div');
  fill.className = `progress-bar-fill progress-bar-${options.color || 'primary'} indeterminate`;

  track.appendChild(fill);
  container.appendChild(track);

  return container;
}