// SPDX-License-Identifier: MIT

export const CIRCUMFERENCE = 2 * Math.PI * 50;

export function setGauge(id: string, valueId: string, percent: number, label: string): void {
  const circle = document.getElementById(id) as SVGElement | null;
  const value = document.getElementById(valueId);
  if (!circle || !value) return;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  (circle as any).style.strokeDasharray = `${CIRCUMFERENCE}`;
  (circle as any).style.strokeDashoffset = `${offset}`;
  const hue = clamped > 80 ? 0 : clamped > 50 ? 30 : 160;
  (circle as any).style.stroke = `hsl(${hue}, 80%, 50%)`;
  value.textContent = label;
}
