import { showPasswordModal } from '../../operations.js';
export function showInstallPasswordModal(tools) {
    showPasswordModal({ type: 'install', tools });
}
export function showRemovePasswordModal(tools) {
    showPasswordModal({ type: 'remove', tools });
}
export function showZramPasswordModal() {
    showPasswordModal({ type: 'zram' });
}
export function showCleanupPasswordModal() {
    showPasswordModal({ type: 'cleanup' });
}
