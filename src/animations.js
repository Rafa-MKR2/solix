const SPEEDO_LENGTH = 367.6;
let speedoAnimFrame = null;
export function setSpeedometer(mbps) {
    const maxSpeed = 1000;
    const pct = Math.min(Math.max(mbps / maxSpeed, 0), 1);
    const angle = 135 + pct * 270;
    const needle = document.getElementById('speedo-needle');
    const fill = document.getElementById('speedo-fill');
    const value = document.getElementById('speedo-value');
    const unit = document.getElementById('speedo-unit');
    if (needle)
        needle.setAttribute('transform', `rotate(${angle}, 120, 147)`);
    if (fill)
        fill.style.strokeDashoffset = SPEEDO_LENGTH * (1 - pct);
    if (value)
        value.textContent = mbps >= 10 ? Math.round(mbps).toString() : mbps.toFixed(1);
    if (unit)
        unit.textContent = mbps >= 1 ? 'Mbps' : 'Kbps';
}
export function showConfetti(duration = 3000) {
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6fb7', '#a66cff', '#ff9f43'];
    const container = document.createElement('div');
    container.className = 'confetti-container';
    container.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;overflow:hidden;';
    document.body.appendChild(container);
    for (let i = 0; i < 80; i++) {
        const particle = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 8 + 4;
        const left = Math.random() * 100;
        const delay = Math.random() * 1.5;
        const rotateEnd = Math.random() * 720 - 360;
        const fallDistance = Math.random() * 300 + 200;
        const isCircle = Math.random() > 0.5;
        particle.style.cssText = `
      position: absolute;
      top: -20px;
      left: ${left}%;
      width: ${size}px;
      height: ${isCircle ? size : size * 2.5}px;
      background: ${color};
      border-radius: ${isCircle ? '50%' : '2px'};
      opacity: 0;
      animation: confetti-fall ${duration}ms ease-out ${delay}s forwards;
      transform: rotate(0deg);
    `;
        particle.style.setProperty('--fall-dist', `${fallDistance}px`);
        particle.style.setProperty('--rotate-end', `${rotateEnd}deg`);
        container.appendChild(particle);
    }
    setTimeout(() => {
        if (container.parentNode)
            container.parentNode.removeChild(container);
    }, duration + 2000);
}
export function animateSpeedometerReach(targetMbps) {
    const needle = document.getElementById('speedo-needle');
    const fill = document.getElementById('speedo-fill');
    if (!needle || !fill)
        return;
    const maxSpeed = 1000;
    if (speedoAnimFrame)
        cancelAnimationFrame(speedoAnimFrame);
    const startTime = performance.now();
    const climbDuration = 2200;
    const startAngle = 135;
    const sweep = 270;
    const targetPct = Math.min(Math.max(targetMbps / maxSpeed, 0), 1);
    const targetAngle = startAngle + targetPct * sweep;
    function step(now) {
        const elapsed = now - startTime;
        const p = Math.min(elapsed / climbDuration, 1);
        let angle;
        if (p < 0.7) {
            const t = p / 0.7;
            const overshoot = Math.min(targetPct + 0.08, 1);
            const eased = t * t * (3 - 2 * t);
            angle = startAngle + eased * (startAngle + overshoot * sweep - startAngle);
        }
        else {
            const t = (p - 0.7) / 0.3;
            const bounce1 = 1 + 0.04 * Math.sin(t * Math.PI * 3) * (1 - t);
            angle = startAngle + targetPct * bounce1 * sweep;
        }
        needle.setAttribute('transform', `rotate(${angle}, 120, 147)`);
        const pct = (angle - startAngle) / sweep;
        fill.style.strokeDashoffset = SPEEDO_LENGTH * (1 - pct);
        if (p < 1) {
            speedoAnimFrame = requestAnimationFrame(step);
        }
        else {
            needle.setAttribute('transform', `rotate(${targetAngle}, 120, 147)`);
            fill.style.strokeDashoffset = SPEEDO_LENGTH * (1 - targetPct);
        }
    }
    speedoAnimFrame = requestAnimationFrame(step);
}
