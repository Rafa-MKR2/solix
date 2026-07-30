import { getInvoke } from '../utils/tauri.js';
function cmd() {
    return getInvoke();
}
export const networkService = {
    async getConnectivity() {
        const invoke = cmd();
        if (!invoke)
            return { internet: false, ping_latency_ms: 0, ethernet: false, ip_address: '', bluetooth: false, wifi_present: false, wifi_ssid: null, wifi_signal: 0 };
        return invoke('get_connectivity');
    },
    async getExternalInfo() {
        const invoke = cmd();
        if (!invoke)
            return { external_ip: '—', isp: '—', city: '—', region: '—' };
        return invoke('get_external_info');
    },
    async testSpeed() {
        const invoke = cmd();
        if (!invoke)
            return { mbps: 0, formatted: '0 Mbps' };
        return invoke('test_speed');
    },
    async getBattery() {
        const invoke = cmd();
        if (!invoke)
            return { present: false, percentage: 0, status: '', time_remaining: null };
        return invoke('get_battery');
    },
};
