// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderRoadmap, initDeveloperPage } from '@/features/developer/message';

describe('developer page', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="roadmap"></div><a id="dev-github-link"></a>';
  });

  it('should render roadmap groups with items', () => {
    renderRoadmap();

    const container = document.getElementById('roadmap');
    expect(container?.querySelectorAll('.roadmap-group').length).toBe(3);
    expect(container?.querySelectorAll('.roadmap-item').length).toBeGreaterThan(10);
    expect(container?.textContent).toContain('Concluído');
    expect(container?.textContent).toContain('Em desenvolvimento');
    expect(container?.textContent).toContain('Planejado');
  });

  it('should render done items with status class', () => {
    renderRoadmap();

    const bullets = document.querySelectorAll('.roadmap-bullet');
    expect(bullets.length).toBeGreaterThan(0);
    expect(document.querySelector('.roadmap-group-header .roadmap-status-icon')?.className).toContain('status-done');
  });

  it('should do nothing when roadmap container is missing', () => {
    document.body.innerHTML = '';
    expect(() => renderRoadmap()).not.toThrow();
  });

  it('initDeveloperPage should render roadmap and set up github link', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => initDeveloperPage()).not.toThrow();

    const link = document.getElementById('dev-github-link');
    expect(link).not.toBeNull();
    (console.error as unknown as ReturnType<typeof vi.fn>).mockRestore();
  });
});
