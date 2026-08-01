import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGauge, updateGauge } from '@/shared/components/Gauge';

describe('Gauge Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should create a gauge SVG element', () => {
    const gauge = createGauge({ id: 'test-gauge', value: 50, max: 100 });
    
    expect(gauge).toBeInstanceOf(SVGElement);
    expect(gauge.tagName).toBe('svg');
    expect(gauge.getAttribute('id')).toBe('test-gauge');
  });

  it('should update gauge value correctly', () => {
    const gauge = createGauge({ id: 'test-gauge', value: 0, max: 100 });
    container.appendChild(gauge);
    
    updateGauge(gauge, 75);
    
    const circle = gauge.querySelector('circle.progress');
    expect(circle).not.toBeNull();
  });

  it('should handle different colors based on value thresholds', () => {
    const gauge = createGauge({ 
      id: 'test-gauge', 
      value: 90, 
      max: 100,
      thresholds: [
        { max: 50, color: '#4caf50' },
        { max: 80, color: '#ff9800' },
        { max: 100, color: '#f44336' },
      ]
    });
    
    expect(gauge).toBeInstanceOf(SVGElement);
  });
});

describe('createStatCard', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should create a stat card with title and value', () => {
    const { createStatCard } = await import('@/shared/components/Card');
    
    const card = createStatCard({
      title: 'CPU Usage',
      value: '45%',
      icon: '🖥️',
    });
    
    expect(card).toBeInstanceOf(HTMLElement);
    expect(card.querySelector('.stat-title')?.textContent).toBe('CPU Usage');
    expect(card.querySelector('.stat-value')?.textContent).toBe('45%');
  });
});