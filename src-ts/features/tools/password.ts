// SPDX-License-Identifier: MIT

import { showPasswordModal } from '../../operations.js';

export function showInstallPasswordModal(tools: string[]): void {
  showPasswordModal({ type: 'install', tools });
}

export function showRemovePasswordModal(tools: string[]): void {
  showPasswordModal({ type: 'remove', tools });
}

export function showZramPasswordModal(): void {
  showPasswordModal({ type: 'zram' });
}

export function showCleanupPasswordModal(): void {
  showPasswordModal({ type: 'cleanup' });
}