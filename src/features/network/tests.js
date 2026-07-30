import { networkService } from '../../shared/services/index.js';
import { animateSpeedometerReach, setSpeedometer } from '../../animations.js';
export function handleTestPingClick() {
    (async () => {
        const btn = document.getElementById('test-ping-btn');
        if (btn)
            btn.textContent = '\u23F3';
        const speedResult = document.getElementById('speed-result');
        try {
            const c = await networkService.getConnectivity();
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
            btn.textContent = '\uD83D\uDCE1';
    })();
}
export function handleTestSpeedClick() {
    (async () => {
        const btn = document.getElementById('test-speed-btn');
        const speedResult = document.getElementById('speed-result');
        if (btn) {
            btn.classList.add('measuring');
            btn.textContent = '\u23F3 Medindo...';
        }
        if (speedResult)
            speedResult.textContent = 'Testando...';
        setSpeedometer(0);
        setTimeout(() => {
            animateSpeedometerReach(700);
        }, 200);
        try {
            const result = await networkService.testSpeed();
            if (speedResult) {
                speedResult.textContent = `Download: ${result.formatted}`;
                speedResult.className = 'pulse';
                setTimeout(() => { if (speedResult)
                    speedResult.className = ''; }, 2000);
            }
            animateSpeedometerReach(result.mbps);
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
        catch (_) {
            if (speedResult)
                speedResult.textContent = 'Falhou';
        }
        if (btn) {
            btn.classList.remove('measuring');
            btn.textContent = '\uD83D\uDE80 Testar Velocidade';
        }
    })();
}
