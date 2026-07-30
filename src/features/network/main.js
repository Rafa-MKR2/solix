import { networkService } from '../../shared/services/index.js';
export async function loadConnectivity() {
    try {
        const c = await networkService.getConnectivity();
        const internet = document.getElementById('net-internet');
        const internetIcon = document.getElementById('net-internet-icon');
        const pingEl = document.getElementById('net-ping');
        const ethernet = document.getElementById('net-ethernet');
        const ethernetIcon = document.getElementById('net-ethernet-icon');
        const ipEl = document.getElementById('net-ip');
        const bluetooth = document.getElementById('net-bluetooth');
        const bluetoothIcon = document.getElementById('net-bluetooth-icon');
        const wifi = document.getElementById('net-wifi');
        const wifiIcon = document.getElementById('net-wifi-icon');
        const wifiSignal = document.getElementById('net-wifi-signal');
        if (internet) {
            internet.textContent = c.internet ? 'Conectado \u2713' : 'Desconectado \u2717';
            internet.style.color = c.internet ? '#4ae0a0' : '#e88';
        }
        if (internetIcon)
            internetIcon.textContent = c.internet ? '\uD83C\uDF10' : '\uD83D\uDEAB';
        if (pingEl) {
            pingEl.textContent = c.ping_latency_ms > 0 ? `${c.ping_latency_ms.toFixed(1)} ms` : '';
            pingEl.style.color = c.ping_latency_ms > 0 && c.ping_latency_ms < 100 ? '#4ae0a0' : c.ping_latency_ms >= 100 ? '#e8a040' : '';
        }
        if (ethernet) {
            ethernet.textContent = c.ethernet ? 'Conectado \u2713' : 'Desconectado \u2717';
            ethernet.style.color = c.ethernet ? '#4ae0a0' : '#666';
        }
        if (ethernetIcon)
            ethernetIcon.textContent = '\uD83D\uDD0C';
        if (ipEl)
            ipEl.textContent = c.ip_address || '';
        if (bluetooth) {
            bluetooth.textContent = c.bluetooth ? 'Ativo \u2713' : 'Inativo \u2717';
            bluetooth.style.color = c.bluetooth ? '#4ae0a0' : '#666';
        }
        if (bluetoothIcon)
            bluetoothIcon.textContent = c.bluetooth ? '\uD83D\uDD35' : '\u26AB';
        if (wifi) {
            if (c.wifi_ssid) {
                wifi.textContent = c.wifi_ssid;
                wifi.style.color = '#4ae0a0';
            }
            else if (c.wifi_present) {
                wifi.textContent = 'Desconectado';
                wifi.style.color = '#e8a040';
            }
            else {
                wifi.textContent = 'N/A';
                wifi.style.color = '#666';
            }
        }
        if (wifiIcon)
            wifiIcon.textContent = c.wifi_ssid ? '\uD83D\uDCF6' : c.wifi_present ? '\uD83D\uDCE1' : '\uD83D\uDCF5';
        if (wifiSignal) {
            if (c.wifi_ssid && c.wifi_signal > 0) {
                wifiSignal.textContent = `${c.wifi_signal}%`;
                wifiSignal.style.color = c.wifi_signal > 60 ? '#4ae0a0' : c.wifi_signal > 30 ? '#e8a040' : '#e88';
            }
            else if (c.wifi_ssid) {
                wifiSignal.textContent = 'conectado';
                wifiSignal.style.color = '#4ae0a0';
            }
            else {
                wifiSignal.textContent = '';
            }
        }
        const bat = document.getElementById('net-battery');
        const batIcon = document.getElementById('net-battery-icon');
        if (bat) {
            const invite = await networkService.getBattery();
            if (invite.present && invite.percentage > 0) {
                const charging = invite.status === 'Charging';
                bat.textContent = charging ? `\uD83D\uDD0C ${invite.percentage}% (${invite.time_remaining || 'N/A'})` : `${invite.percentage}% (${invite.time_remaining || 'N/A'})`;
                bat.style.color = '#4ae0a0';
                if (batIcon)
                    batIcon.textContent = charging ? '\uD83D\uDD0C' : '\uD83D\uDD0B';
            }
            else {
                bat.textContent = 'Sem bateria';
                bat.style.color = '#666';
                if (batIcon)
                    batIcon.textContent = '\uD83D\uDD0C';
            }
        }
    }
    catch (e) {
        console.error('loadConnectivity failed:', e);
    }
}
export async function loadExternalInfo() {
    try {
        const info = await networkService.getExternalInfo();
        const ipEl = document.getElementById('info-external-ip');
        const ispEl = document.getElementById('info-isp');
        const locEl = document.getElementById('info-location');
        if (ipEl)
            ipEl.textContent = info.external_ip || '\u2014';
        if (ispEl) {
            const org = info.isp || '';
            ispEl.textContent = org.replace(/^AS\d+\s*/, '') || '\u2014';
        }
        if (locEl) {
            const parts = [info.city, info.region].filter(Boolean);
            locEl.textContent = parts.join(', ') || '\u2014';
        }
    }
    catch (_) { }
    try {
        const c = await networkService.getConnectivity();
        const pingEl = document.getElementById('info-ping-display');
        if (pingEl) {
            pingEl.textContent = c.ping_latency_ms > 0 ? `${c.ping_latency_ms.toFixed(1)} ms` : '\u2014';
            pingEl.style.color = c.ping_latency_ms > 0 && c.ping_latency_ms < 100 ? '#4ae0a0' : c.ping_latency_ms >= 100 ? '#e8a040' : '';
        }
    }
    catch (_) { }
}
