import { getInvoke } from './utils.js';
import { animateSpeedometerReach, setSpeedometer } from './animations.js';
export async function loadConnectivity() {
    const invoke = getInvoke();
    if (!invoke)
        return;
    try {
        const c = await invoke('get_connectivity');
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
            internet.textContent = c.internet ? 'Conectado ✓' : 'Desconectado ✗';
            internet.style.color = c.internet ? '#4ae0a0' : '#e88';
        }
        if (internetIcon)
            internetIcon.textContent = c.internet ? '🌐' : '🚫';
        if (pingEl) {
            pingEl.textContent = c.ping_latency_ms > 0 ? `${c.ping_latency_ms.toFixed(1)} ms` : '';
            pingEl.style.color = c.ping_latency_ms > 0 && c.ping_latency_ms < 100 ? '#4ae0a0' : c.ping_latency_ms >= 100 ? '#e8a040' : '';
        }
        if (ethernet) {
            ethernet.textContent = c.ethernet ? 'Conectado ✓' : 'Desconectado ✗';
            ethernet.style.color = c.ethernet ? '#4ae0a0' : '#666';
        }
        if (ethernetIcon)
            ethernetIcon.textContent = c.ethernet ? '🔌' : '🔌';
        if (ipEl)
            ipEl.textContent = c.ip_address || '';
        if (bluetooth) {
            bluetooth.textContent = c.bluetooth ? 'Ativo ✓' : 'Inativo ✗';
            bluetooth.style.color = c.bluetooth ? '#4ae0a0' : '#666';
        }
        if (bluetoothIcon)
            bluetoothIcon.textContent = c.bluetooth ? '🔵' : '⚫';
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
            wifiIcon.textContent = c.wifi_ssid ? '📶' : c.wifi_present ? '📡' : '📵';
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
            const invite = await invoke('get_battery');
            if (invite.present && invite.percentage > 0) {
                const charging = invite.status === 'Charging';
                bat.textContent = charging ? `🔌 ${invite.percentage}% (${invite.time_remaining || 'N/A'})` : `${invite.percentage}% (${invite.time_remaining || 'N/A'})`;
                bat.style.color = '#4ae0a0';
                if (batIcon)
                    batIcon.textContent = charging ? '🔌' : '🔋';
            }
            else {
                bat.textContent = 'Sem bateria';
                bat.style.color = '#666';
                if (batIcon)
                    batIcon.textContent = '🔌';
            }
        }
    }
    catch (e) {
        console.error('loadConnectivity failed:', e);
    }
}
export async function loadExternalInfo() {
    const invoke = getInvoke();
    if (!invoke)
        return;
    try {
        const info = await invoke('get_external_info');
        const ipEl = document.getElementById('info-external-ip');
        const ispEl = document.getElementById('info-isp');
        const locEl = document.getElementById('info-location');
        if (ipEl)
            ipEl.textContent = info.external_ip || '—';
        if (ispEl) {
            const org = info.isp || '';
            ispEl.textContent = org.replace(/^AS\d+\s*/, '') || '—';
        }
        if (locEl) {
            const parts = [info.city, info.region].filter(Boolean);
            locEl.textContent = parts.join(', ') || '—';
        }
    }
    catch (_) { }
    try {
        const c = await invoke('get_connectivity');
        const pingEl = document.getElementById('info-ping-display');
        if (pingEl) {
            pingEl.textContent = c.ping_latency_ms > 0 ? `${c.ping_latency_ms.toFixed(1)} ms` : '—';
            pingEl.style.color = c.ping_latency_ms > 0 && c.ping_latency_ms < 100 ? '#4ae0a0' : c.ping_latency_ms >= 100 ? '#e8a040' : '';
        }
    }
    catch (_) { }
}
export function handleTestPingClick() {
    (async () => {
        const invoke = getInvoke();
        if (!invoke)
            return;
        const btn = document.getElementById('test-ping-btn');
        if (btn)
            btn.textContent = '⏳';
        const speedResult = document.getElementById('speed-result');
        try {
            const c = await invoke('get_connectivity');
            if (speedResult)
                speedResult.textContent = c.ping_latency_ms > 0 ? `${c.ping_latency_ms.toFixed(1)} ms` : 'Sem resposta';
            if (speedResult)
                speedResult.className = 'pulse';
            setTimeout(() => { if (speedResult)
                speedResult.className = ''; }, 2000);
        }
        catch (_) {
            if (speedResult)
                speedResult.textContent = 'Falhou';
        }
        if (btn)
            btn.textContent = '📡';
    })();
}
export function handleTestSpeedClick() {
    (async () => {
        const invoke = getInvoke();
        if (!invoke)
            return;
        const btn = document.getElementById('test-speed-btn');
        const speedResult = document.getElementById('speed-result');
        if (btn) {
            btn.classList.add('measuring');
            btn.textContent = '⏳ Medindo...';
        }
        if (speedResult)
            speedResult.textContent = 'Testando...';
        setSpeedometer(0);
        setTimeout(() => {
            animateSpeedometerReach(700);
        }, 200);
        try {
            const result = await invoke('test_speed');
            if (speedResult) {
                speedResult.textContent = `Download: ${result.formatted}`;
                speedResult.className = 'pulse';
                setTimeout(() => { if (speedResult)
                    speedResult.className = ''; }, 2000);
            }
            animateSpeedometerReach(result.mbps);
            try {
                const c = await invoke('get_connectivity');
                const pingEl = document.getElementById('info-ping-display');
                if (pingEl) {
                    pingEl.textContent = c.ping_latency_ms > 0 ? `${c.ping_latency_ms.toFixed(1)} ms` : '—';
                    pingEl.style.color = c.ping_latency_ms > 0 && c.ping_latency_ms < 100 ? '#4ae0a0' : c.ping_latency_ms >= 100 ? '#e8a040' : '';
                }
            }
            catch (_) { }
        }
        catch (_) {
            if (speedResult)
                speedResult.textContent = 'Falhou';
        }
        if (btn) {
            btn.classList.remove('measuring');
            btn.textContent = '🚀 Testar Velocidade';
        }
    })();
}
