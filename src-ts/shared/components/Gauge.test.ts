import { describe, it, expect } from 'vitest';
import { createGauge, updateGauge } from '@/shared/components/Gauge';
import { createStatCard } from '@/shared/components/Card';

describe('Gauge Component', () => {
  it('should create a gauge container with svg', () => {
    const gauge = createGauge({ value: 50, label: 'CPU', animate: false });

    expect(gauge).toBeInstanceOf(HTMLElement);
    expect(gauge.className).toContain('gauge-container');
    const svg = gauge.querySelector('svg.gauge');
    expect(svg).not.toBeNull();
  });

  it('should render the value text', () => {
    const gauge = createGauge({ value: 75, label: 'CPU', animate: false });

    const value = gauge.querySelector('.gauge-value');
    expect(value?.textContent).toBe('75%');
  });

  it('should update gauge value correctly', () => {
    const gauge = createGauge({ value: 20, label: 'RAM', animate: false });

    updateGauge(gauge, 80);

    const value = gauge.querySelector('.gauge-value');
    expect(value?.textContent).toBe('80%');

    const fill = gauge.querySelector('.gauge-fill');
    expect(fill).not.toBeNull();
  });

  it('should apply critical color for high values', () => {
    const gauge = createGauge({ value: 95, label: 'TEMP', animate: false });

    const fill = gauge.querySelector('.gauge-fill');
    expect(fill?.getAttribute('stroke')).toBe('#ff3366');
  });
});

describe('StatCard Component', () => {
  it('should create a stat card with label and value', () => {
    const card = createStatCard({ icon: '🖥️', label: 'CPU Usage', value: '45%' });

    expect(card).toBeInstanceOf(HTMLElement);
    expect(card.className).toContain('stat-card');
    expect(card.querySelector('.stat-label')?.textContent).toBe('CPU Usage');
    expect(card.querySelector('.stat-value')?.textContent).toBe('45%');
  });
});
