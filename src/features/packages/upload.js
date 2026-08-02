import { packageService } from '../../shared/services/index.js';
export const pendingPkg = {
    data: null,
    fileName: null,
    path: null,
};
async function analyzeAndRender(fileName, analyze) {
    const infoCard = document.getElementById('pkg-info');
    const nameEl = document.getElementById('pkg-name');
    const versionEl = document.getElementById('pkg-version');
    const sizeEl = document.getElementById('pkg-size');
    const archEl = document.getElementById('pkg-arch');
    const depsEl = document.getElementById('pkg-deps');
    const descEl = document.getElementById('pkg-desc');
    const compatEl = document.getElementById('pkg-compat');
    const installBtn = document.getElementById('pkg-install-btn');
    const typeEl = document.getElementById('pkg-type');
    if (installBtn) {
        installBtn.disabled = true;
        installBtn.textContent = '⏳ Analisando...';
    }
    if (infoCard)
        infoCard.classList.remove('hidden');
    if (nameEl)
        nameEl.textContent = fileName;
    if (versionEl)
        versionEl.textContent = 'Analisando...';
    if (sizeEl)
        sizeEl.textContent = '—';
    if (archEl)
        archEl.textContent = '—';
    if (depsEl)
        depsEl.textContent = '—';
    if (descEl)
        descEl.textContent = '—';
    if (compatEl)
        compatEl.className = 'pkg-compat';
    if (typeEl)
        typeEl.textContent = fileName.endsWith('.deb') ? '📦' : '📀';
    try {
        pendingPkg.data = null;
        pendingPkg.path = null;
        pendingPkg.fileName = fileName;
        const info = await analyze();
        if (nameEl)
            nameEl.textContent = info.package_name || fileName;
        if (versionEl)
            versionEl.textContent = info.version;
        if (sizeEl)
            sizeEl.textContent = info.file_size;
        if (archEl)
            archEl.textContent = info.architecture;
        if (descEl)
            descEl.textContent = info.description || 'Sem descrição';
        if (typeEl)
            typeEl.textContent = info.package_type === 'deb' ? '📦' : '📀';
        if (depsEl) {
            depsEl.textContent = info.dependencies && info.dependencies.length > 0
                ? info.dependencies.join(', ')
                : 'Nenhuma dependência listada';
        }
        if (compatEl) {
            compatEl.textContent = info.compat_message;
            compatEl.className = 'pkg-compat ' + (info.compatible ? 'compatible' : 'incompatible');
        }
        if (installBtn) {
            installBtn.disabled = !info.compatible;
            installBtn.textContent = info.compatible ? '⬇️ Instalar Pacote' : '🚫 Incompatível';
        }
    }
    catch (e) {
        console.error('inspect package failed:', e);
        pendingPkg.data = null;
        pendingPkg.fileName = null;
        pendingPkg.path = null;
        if (versionEl)
            versionEl.textContent = '❌ Erro';
        if (compatEl) {
            compatEl.textContent = '❌ ' + (e + '');
            compatEl.className = 'pkg-compat incompatible';
        }
        if (installBtn) {
            installBtn.disabled = true;
            installBtn.textContent = '⬇️ Instalar Pacote';
        }
    }
}
export async function handlePkgFileSelect(file) {
    const infoCard = document.getElementById('pkg-info');
    if (!file) {
        pendingPkg.data = null;
        pendingPkg.fileName = null;
        pendingPkg.path = null;
        if (infoCard)
            infoCard.classList.add('hidden');
        return;
    }
    await analyzeAndRender(file.name, async () => {
        const base64 = await readFileAsBase64(file);
        const info = await packageService.inspectPackageData(base64, file.name);
        pendingPkg.data = base64;
        return info;
    });
}
export async function handlePkgPath(path) {
    const fileName = path.split('/').pop() || path;
    await analyzeAndRender(fileName, async () => {
        const info = await packageService.inspectLocalPackage(path);
        pendingPkg.path = path;
        return info;
    });
}
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            const base64 = result.split(',')[1] || result;
            resolve(base64);
        };
        reader.onerror = () => reject('Erro ao ler arquivo');
        reader.readAsDataURL(file);
    });
}
export function showInstallPackagePasswordModal() {
    import('../../operations.js').then(m => m.showPasswordModal({ type: 'install-package' }));
}
