// SPDX-License-Identifier: MIT
import { describe, it, expect, beforeEach } from 'vitest';
import { setGauge, CIRCUMFERENCE } from '@/features/home/gauges';

function circleSvg(id: string, valueId: string): void {
  document.body.innerHTML = `
    <svg><circle id="${id}"></circle></svg>
    <span id="${valueId}"></span>
  `;
}

describe('setGauge', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should expose the circumference constant', () => {
    expect(CIRCUMFERENCE).toBeCloseTo(2 * Math.PI * 50);
  });

  it('should update stroke attributes and value text', () => {
    circleSvg('g1', 'g1-value');
    setGauge('g1', 'g1-value', 50, '50%');

    const circle = document.getElementById('g1') as unknown as SVGElement & { style: CSSStyleDeclaration };
    expect(circle.style.strokeDasharray).toBe(String(CIRCUMFERENCE));
    expect(circle.style.strokeDashoffset).toBe(String(CIRCUMFERENCE / 2));
    expect(document.getElementById('g1-value')?.textContent).toBe('50%');
  });

  it('should use green color for low usage', () => {
    circleSvg('g1', 'g1-value');
    setGauge('g1', 'g1-value', 10, '10%');

    const circle = document.getElementById('g1') as unknown as SVGElement & { style: CSSStyleDeclaration };
    expect(circle.style.stroke).toBe('hsl(160, 80%, 50%)');
  });

  it('should use red color for high usage', () => {
    circleSvg('g1', 'g1-value');
    setGauge('g1', 'g1-value', 90, '90%');

    const circle = document.getElementById('g1') as unknown as SVGElement & { style: CSSStyleDeclaration };
    expect(circle.style.stroke).toBe('hsl(0, 80%, 50%)');
  });

  it('should clamp percent above 100', () => {
    circleSvg('g1', 'g1-value');
    setGauge('g1', 'g1-value', 150, '150%');

    const circle = document.getElementById('g1') as unknown as SVGElement & { style: CSSStyleDeclaration };
    expect(circle.style.strokeDashoffset).toBe('0');
  });

  it('should clamp percent below zero', () => {
    circleSvg('g1', 'g1-value');
    setGauge('g1', 'g1-value', -20, '-20%');

    const circle = document.getElementById('g1') as unknown as SVGElement & { style: CSSStyleDeclaration };
    expect(circle.style.strokeDashoffset).toBe(String(CIRCUMFERENCE));
  });

  it('should do nothing when elements are missing', () => {
    expect(() => setGauge('missing', 'missing-value', 50, 'x')).not.toThrow();
  });
});
