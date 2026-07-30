// SPDX-License-Identifier: MIT

import type { InvokeFn } from '../types/index.js';

export function getInvoke(): InvokeFn | null {
  return window.__TAURI_INTERNALS__?.invoke || null;
}
