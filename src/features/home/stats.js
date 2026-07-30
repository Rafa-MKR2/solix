import { systemService } from '../../shared/services/index.js';
import { setGauge } from './gauges.js';
export async function loadHomeStats() {
    try {
        const h = await systemService.getHomeStats();
        const packagesEl = document.getElementById('stat-packages');
        const updatesEl = document.getElementById('stat-updates');
        const updatesSub = document.getElementById('stat-updates-sub');
        const loadEl = document.getElementById('stat-load');
        const swapEl = document.getElementById('stat-swap');
        const swapSub = document.getElementById('stat-swap-sub');
        const servicesEl = document.getElementById('stat-services');
        if (packagesEl)
            packagesEl.textContent = h.packages_formatted;
        if (updatesEl) {
            if (h.updates_available > 0) {
                updatesEl.textContent = h.updates_formatted;
                updatesEl.style.color = '#e8c547';
                if (updatesSub)
                    updatesSub.textContent = 'disponíveis';
            }
            else {
                updatesEl.textContent = '✓';
                updatesEl.style.color = '#4ae0a0';
                if (updatesSub)
                    updatesSub.textContent = 'sistema atualizado';
            }
        }
        if (loadEl)
            loadEl.textContent = h.load_average;
        if (swapEl) {
            if (h.swap_percent > 0) {
                swapEl.textContent = `${h.swap_used} / ${h.swap_total}`;
                if (swapSub)
                    swapSub.textContent = `${Math.round(h.swap_percent)}% usada`;
            }
            else {
                swapEl.textContent = '—';
                if (swapSub)
                    swapSub.textContent = 'sem swap ativo';
            }
        }
        if (servicesEl)
            servicesEl.textContent = h.services_active;
    }
    catch (e) {
        console.error('loadHomeStats failed:', e);
    }
}
export async function pollStats() {
    try {
        const s = await systemService.getStats();
        setGauge('gauge-cpu', 'gauge-cpu-value', s.cpu_percent, `${Math.round(s.cpu_percent)}%`);
        setGauge('gauge-ram', 'gauge-ram-value', s.memory_percent, `${Math.round(s.memory_percent)}%`);
        setGauge('gauge-temp', 'gauge-temp-value', s.temperature, `${Math.round(s.temperature)}°`);
        setGauge('gauge-cpu-home', 'gauge-cpu-home-value', s.cpu_percent, `${Math.round(s.cpu_percent)}%`);
        setGauge('gauge-ram-home', 'gauge-ram-home-value', s.memory_percent, `${Math.round(s.memory_percent)}%`);
        setGauge('gauge-temp-home', 'gauge-temp-home-value', s.temperature, `${Math.round(s.temperature)}°`);
    }
    catch (e) {
        console.error('pollStats failed:', e);
    }
}
