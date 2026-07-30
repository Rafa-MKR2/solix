// SPDX-License-Identifier: MIT

import { showToast } from '../../shared/utils/index.js';
import { packageService } from '../../shared/services/index.js';

export const pendingPkg = { data: null as string | null, fileName: null as string | null };

export async function handlePkgFileSelect(file: File | null): Promise<void> {
  const infoCard = document.getElementById('pkg-info');
  const nameEl = document.getElementById('pkg-name');
  const versionEl = document.getElementById('pkg-version');
  const sizeEl = document.getElementById('pkg-size');
  const archEl = document.getElementById('pkg-arch');
  const depsEl = document.getElementById('pkg-deps');
  const descEl = document.getElementById('pkg-desc');
  const compatEl = document.getElementById('pkg-compat');
  const installBtn = document.getElementById('pkg-install-btn') as HTMLButtonElement | null;
  const typeEl = document.getElementById('pkg-type');

  pendingPkg.data = null;
  pendingPkg.fileName = null;

  if (!file) {
    if (infoCard) infoCard.classList.add('hidden');
    return;
  }

  if (installBtn) { installBtn.disabled = true; installBtn.textContent = '⏳ Analisando...'; }
  if (infoCard) infoCard.classList.remove('hidden');
  if (nameEl) nameEl.textContent = file.name;
  if (versionEl) versionEl.textContent = 'Analisando...';
  if (sizeEl) sizeEl.textContent = '—';
  if (archEl) archEl.textContent = '—';
  if (depsEl) depsEl.textContent = '—';
  if (descEl) descEl.textContent = '—';
  if (compatEl) compatEl.className = 'pkg-compat';
  if (typeEl) typeEl.textContent = file.name.endsWith('.deb') ? '📦' : '📀';

  try {
    const base64 = await readFileAsBase64(file);
    const info = await packageService.inspectPackageData(base64, file.name);

    pendingPkg.data = base64;
    pendingPkg.fileName = file.name;

    if (nameEl) nameEl.textContent = info.package_name || file.name;
    if (versionEl) versionEl.textContent = info.version;
    if (sizeEl) sizeEl.textContent = info.file_size;
    if (archEl) archEl.textContent = info.architecture;
    if (descEl) descEl.textContent = info.description || 'Sem descrição';
    if (typeEl) typeEl.textContent = info.package_type === 'deb' ? '📦' : '📀';

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
  } catch (e) {
    console.error('inspect_package_data failed:', e);
    if (versionEl) versionEl.textContent = '❌ Erro';
    if (compatEl) {
      compatEl.textContent = '❌ ' + (e + '');
      compatEl.className = 'pkg-compat incompatible';
    }
    if (installBtn) { installBtn.disabled = true; installBtn.textContent = '⬇️ Instalar Pacote'; }
  }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject('Erro ao ler arquivo');
    reader.readAsDataURL(file);
  });
}
