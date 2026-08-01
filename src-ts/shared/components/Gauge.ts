// SPDX-License-Identifier: MIT

export interface GaugeOptions {
  value: number;
  max?: number;
  min?: number;
  label: string;
  unit?: string;
  size?: number;
  strokeWidth?: number;
  colors?: {
    low: string;
    medium: string;
    high: string;
    critical: string;
  };
  thresholds?: {
    low: number;
    medium: number;
    high: number;
  };
  showValue?: boolean;
  animate?: boolean;
}

const DEFAULT_COLORS = {
  low: '#00d4aa',
  medium: '#e8c547',
  high: '#e84a4a',
  critical: '#ff3366',
};

const DEFAULT_THRESHOLDS = {
  low: 30,
  medium: 60,
  high: 85,
};

const CIRCUMFERENCE = 2 * Math.PI * 50;

export function createGauge(options: GaugeOptions): HTMLElement {
  const {
    value,
    max = 100,
    min = 0,
    label,
    unit = '%',
    size = 120,
    strokeWidth = 10,
    colors = DEFAULT_COLORS,
    thresholds = DEFAULT_THRESHOLDS,
    showValue = true,
    animate = true,
  } = options;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.max(min, Math.min(max, value));
  const percentage = (clampedValue - min) / (max - min);

  let color = colors.low;
  if (percentage > thresholds.high / 100) color = colors.critical;
  else if (percentage > thresholds.medium / 100) color = colors.high;
  else if (percentage > thresholds.low / 100) color = colors.medium;

  const offset = circumference * (1 - percentage);

  const container = document.createElement('div');
  container.className = 'gauge-container';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'gauge');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.style.width = `${size}px`;
  svg.style.height = `${size}px`;

  // Background circle
  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.setAttribute('class', 'gauge-bg');
  bgCircle.setAttribute('cx', String(size / 2));
  bgCircle.setAttribute('cy', String(size / 2));
  bgCircle.setAttribute('r', String(radius));
  bgCircle.setAttribute('fill', 'none');
  bgCircle.setAttribute('stroke', '#1a1a30');
  bgCircle.setAttribute('stroke-width', String(strokeWidth));
  svg.appendChild(bgCircle);

  // Progress circle
  const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  progressCircle.setAttribute('class', 'gauge-fill');
  progressCircle.setAttribute('cx', String(size / 2));
  progressCircle.setAttribute('cy', String(size / 2));
  progressCircle.setAttribute('r', String(radius));
  progressCircle.setAttribute('fill', 'none');
  progressCircle.setAttribute('stroke', color);
  progressCircle.setAttribute('stroke-width', String(strokeWidth));
  progressCircle.setAttribute('stroke-linecap', 'round');
  progressCircle.setAttribute('stroke-dasharray', String(circumference));
  progressCircle.setAttribute('stroke-dashoffset', String(circumference));
  progressCircle.style.transform = 'rotate(-90deg)';
  progressCircle.style.transformOrigin = 'center';
  progressCircle.style.transition = animate ? 'stroke-dashoffset 0.8s ease-out, stroke 0.3s ease' : 'none';
  svg.appendChild(progressCircle);

  // Label
  const labelEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  labelEl.setAttribute('class', 'gauge-label');
  labelEl.setAttribute('x', String(size / 2));
  labelEl.setAttribute('y', String(size / 2 - 8));
  labelEl.setAttribute('text-anchor', 'middle');
  labelEl.setAttribute('font-size', '12');
  labelEl.setAttribute('font-weight', '600');
  labelEl.setAttribute('fill', '#888');
  labelEl.textContent = label;
  svg.appendChild(labelEl);

  // Value
  if (showValue) {
    const valueEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    valueEl.setAttribute('class', 'gauge-value');
    valueEl.setAttribute('x', String(size / 2));
    valueEl.setAttribute('y', String(size / 2 + 18));
    valueEl.setAttribute('text-anchor', 'middle');
    valueEl.setAttribute('font-size', String(Math.max(16, size * 0.2)));
    valueEl.setAttribute('font-weight', '700');
    valueEl.setAttribute('fill', '#eee');
    valueEl.textContent = `${Math.round(clampedValue)}${unit}`;
    svg.appendChild(valueEl);
  }

  container.appendChild(svg);

  // Animate on mount
  if (animate) {
    requestAnimationFrame(() => {
      progressCircle.setAttribute('stroke-dashoffset', String(offset));
    });
  } else {
    progressCircle.setAttribute('stroke-dashoffset', String(offset));
  }

  return container;
}

export function updateGauge(
  container: HTMLElement,
  value: number,
  options: Partial<GaugeOptions> = {}
): void {
  const progressCircle = container.querySelector('.gauge-fill') as SVGCircleElement | null;
  const valueEl = container.querySelector('.gauge-value') as SVGTextElement | null;
  const labelEl = container.querySelector('.gauge-label') as SVGTextElement | null;

  if (!progressCircle) return;

  const max = options.max ?? 100;
  const min = options.min ?? 0;
  const clampedValue = Math.max(min, Math.min(max, value));
  const percentage = (clampedValue - min) / (max - min);

  const colors = { ...DEFAULT_COLORS, ...options.colors };
  const thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };

  let color = colors.low;
  if (percentage > thresholds.high / 100) color = colors.critical;
  else if (percentage > thresholds.medium / 100) color = colors.high;
  else if (percentage > thresholds.low / 100) color = colors.medium;

  const radius = (options.size ?? 120 - (options.strokeWidth ?? 10)) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage);

  progressCircle.setAttribute('stroke', color);
  progressCircle.setAttribute('stroke-dashoffset', String(offset));

  if (valueEl && options.showValue !== false) {
    const unit = options.unit ?? '%';
    valueEl.textContent = `${Math.round(clampedValue)}${unit}`;
  }

  if (labelEl && options.label) {
    labelEl.textContent = options.label;
  }
}