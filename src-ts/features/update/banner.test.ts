// SPDX-License-Identifier: MIT
import { describe, it, expect, beforeEach } from 'vitest';
import { showUpdateBanner, hideUpdateModal, showUpdateProgress } from '@/features/update/banner';

const INFO = {
  current_version: '2.2.2',
  latest_version: '2.3.0',
  release_notes: 'Correções e melhorias',
  update_available: true,
};

function setupDom(): void {
  document.body.innerHTML = `
    <div id="update-overlay" class="hidden"></div>
    <span id="update-current-version"></span>
    <span id="update-latest-version"></span>
    <pre id="update-changelog"></pre>
    <div id="update-info-view"></div>
    <div id="update-progress-view" class="hidden"></div>
    <button id="update-now-btn"></button>
    <button id="update-later-btn"></button>
    <span id="update-progress-status"></span>
    <div id="update-progress-fill"></div>
    <span id="update-progress-text"></span>
  `;
}

describe('update banner', () => {
  beforeEach(() => {
    setupDom();
  });

  it('should show banner with versions and changelog', () => {
    showUpdateBanner(INFO);

    const overlay = document.getElementById('update-overlay');
    expect(overlay?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('update-current-version')?.textContent).toBe('v2.2.2');
    expect(document.getElementById('update-latest-version')?.textContent).toBe('v2.3.0');
    expect(document.getElementById('update-changelog')?.textContent).toBe('Correções e melhorias');
  });

  it('should show info view and hide progress view', () => {
    document.getElementById('update-progress-view')?.classList.remove('hidden');
    showUpdateBanner(INFO);

    expect(document.getElementById('update-info-view')?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('update-progress-view')?.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('update-now-btn')?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('update-later-btn')?.classList.contains('hidden')).toBe(false);
  });

  it('should use fallback text when no release notes', () => {
    showUpdateBanner({ ...INFO, release_notes: '' });
    expect(document.getElementById('update-changelog')?.textContent).toBe('Nenhuma informação disponível.');
  });

  it('should do nothing when overlay is missing', () => {
    document.body.innerHTML = '';
    expect(() => showUpdateBanner(INFO)).not.toThrow();
  });

  it('should hide the modal', () => {
    document.getElementById('update-overlay')?.classList.remove('hidden');
    hideUpdateModal();
    expect(document.getElementById('update-overlay')?.classList.contains('hidden')).toBe(true);
  });

  it('should show progress view with percent and message', () => {
    showUpdateProgress('download', 45, 'Baixando...');

    expect(document.getElementById('update-info-view')?.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('update-progress-view')?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('update-now-btn')?.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('update-later-btn')?.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('update-progress-status')?.textContent).toBe('Baixando...');
    expect((document.getElementById('update-progress-fill') as HTMLElement).style.width).toBe('45%');
    expect(document.getElementById('update-progress-text')?.textContent).toBe('45%');
  });
});
