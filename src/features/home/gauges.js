export const CIRCUMFERENCE = 2 * Math.PI * 50;
export function setGauge(id, valueId, percent, label) {
    const circle = document.getElementById(id);
    const value = document.getElementById(valueId);
    if (!circle || !value)
        return;
    const clamped = Math.min(100, Math.max(0, percent));
    const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
    circle.style.strokeDasharray = `${CIRCUMFERENCE}`;
    circle.style.strokeDashoffset = `${offset}`;
    const hue = clamped > 80 ? 0 : clamped > 50 ? 30 : 160;
    circle.style.stroke = `hsl(${hue}, 80%, 50%)`;
    value.textContent = label;
}
