import { vi } from 'vitest';

global.HTMLElement.prototype.scrollIntoView = vi.fn();
global.HTMLElement.prototype.focus = vi.fn();
global.HTMLElement.prototype.click = vi.fn();

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
});

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
});

vi.mock('@tauri-apps/api', () => ({
  invoke: vi.fn(),
  listen: vi.fn(),
  unlisten: vi.fn(),
  emit: vi.fn(),
  convertFileSrc: vi.fn((path) => path),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    minimize: vi.fn(),
    maximize: vi.fn(),
    close: vi.fn(),
    setTitle: vi.fn(),
    listen: vi.fn(),
  })),
}));

vi.mock('@tauri-apps/api/dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
  message: vi.fn(),
  ask: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@tauri-apps/api/notification', () => ({
  sendNotification: vi.fn(),
  isPermissionGranted: vi.fn().mockResolvedValue(true),
  requestPermission: vi.fn().mockResolvedValue('granted'),
}));

vi.mock('@tauri-apps/api/os', () => ({
  platform: vi.fn().mockResolvedValue('linux'),
  version: vi.fn().mockResolvedValue('1.0.0'),
  type: vi.fn().mockResolvedValue('Linux'),
  arch: vi.fn().mockResolvedValue('x86_64'),
}));

vi.mock('@tauri-apps/api/shell', () => ({
  open: vi.fn(),
  Command: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({ code: 0, stdout: '', stderr: '' }),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
  })),
}));

const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
  listen: vi.fn(),
  emit: vi.fn(),
}));

export { mockInvoke };

// Wire the mocked invoke into window.__TAURI_INTERNALS__ so services using
// getInvoke() (shared/utils/tauri.ts) call the test mock.
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  writable: true,
  value: { invoke: mockInvoke },
});

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
  once: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn(),
}));

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}