// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { askDesktopShortcuts } from '@/features/tools/shortcuts';
import { mockInvoke } from '@/test/setup';

describe('askDesktopShortcuts', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="output-section">
        <pre id="output-log"></pre>
      </div>
    `;
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue('/home/user/Área de trabalho/git.desktop');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should do nothing when tool list is empty', async () => {
    await askDesktopShortcuts([]);
    expect(document.getElementById('shortcut-prompt')).toBeNull();
  });

  it('should do nothing when output section is missing', async () => {
    document.body.innerHTML = '';
    await expect(askDesktopShortcuts(['git'])).resolves.toBeUndefined();
  });

  it('should create a prompt with yes and no buttons', async () => {
    await askDesktopShortcuts(['git', 'node']);

    const prompt = document.getElementById('shortcut-prompt');
    expect(prompt).not.toBeNull();
    expect(prompt?.textContent).toContain('2 app(s)');
    expect(prompt?.textContent).toContain('git, node');
  });

  it('should create shortcuts for each tool when yes is clicked', async () => {
    vi.useFakeTimers();
    await askDesktopShortcuts(['git', 'node']);

    const yesBtn = document.querySelector('#shortcut-prompt')?.querySelectorAll('button')[0] as HTMLElement;
    yesBtn.click();
    await vi.runAllTimersAsync();

    expect(mockInvoke).toHaveBeenCalledWith('create_desktop_shortcut', { name: 'git' });
    expect(mockInvoke).toHaveBeenCalledWith('create_desktop_shortcut', { name: 'node' });
    expect(document.getElementById('output-log')?.textContent).toContain('git.desktop');
  });

  it('should skip failed shortcuts and report in log', async () => {
    vi.useFakeTimers();
    mockInvoke.mockRejectedValueOnce(new Error('falhou'));
    await askDesktopShortcuts(['git']);

    const yesBtn = document.querySelector('#shortcut-prompt')?.querySelectorAll('button')[0] as HTMLElement;
    yesBtn.click();
    await vi.runAllTimersAsync();

    expect(document.getElementById('output-log')?.textContent).toContain('falhou');
  });

  it('should remove prompt when no is clicked', async () => {
    vi.useFakeTimers();
    await askDesktopShortcuts(['git']);

    const noBtn = document.querySelector('#shortcut-prompt')?.querySelectorAll('button')[1] as HTMLElement;
    noBtn.click();

    expect(document.getElementById('shortcut-prompt')).toBeNull();
    expect(document.getElementById('output-log')?.textContent).toContain('Skipped');
  });

  it('should replace existing prompt', async () => {
    await askDesktopShortcuts(['git']);
    await askDesktopShortcuts(['node']);

    const prompt = document.getElementById('shortcut-prompt');
    expect(prompt).not.toBeNull();
    expect(prompt?.textContent).toContain('node');
  });
});
