// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePkgFileSelect, handlePkgPath, pendingPkg } from '@/features/packages/upload';
import { mockInvoke } from '@/test/setup';

function setupDom(): void {
  document.body.innerHTML = `
    <div id="pkg-info" class="hidden"></div>
    <span id="pkg-name"></span>
    <span id="pkg-version"></span>
    <span id="pkg-size"></span>
    <span id="pkg-arch"></span>
    <span id="pkg-deps"></span>
    <span id="pkg-desc"></span>
    <span id="pkg-compat" class="pkg-compat"></span>
    <span id="pkg-type"></span>
    <button id="pkg-install-btn"></button>
  `;
}

const PKG_INFO = {
  package_name: 'meu-app',
  version: '1.2.3',
  file_size: '1.5 MB',
  architecture: 'amd64',
  dependencies: ['libc6', 'libgtk-3-0'],
  description: 'Um aplicativo de teste',
  compatible: true,
  compat_message: 'Compatível com seu sistema',
  package_type: 'deb',
};

describe('packages upload', () => {
  beforeEach(() => {
    setupDom();
    mockInvoke.mockReset();
    pendingPkg.data = null;
    pendingPkg.fileName = null;
    pendingPkg.path = null;
  });

  it('should hide info card when file is null', async () => {
    await handlePkgFileSelect(null);

    expect(document.getElementById('pkg-info')?.classList.contains('hidden')).toBe(true);
    expect(pendingPkg.fileName).toBeNull();
  });

  it('should analyze a .deb file via base64 and render info', async () => {
    mockInvoke.mockResolvedValue(PKG_INFO);

    const file = new File(['dummy'], 'meu-app.deb');
    await handlePkgFileSelect(file);

    expect(mockInvoke).toHaveBeenCalledWith('inspect_package_data', { data: expect.any(String), fileName: 'meu-app.deb' });
    expect(document.getElementById('pkg-name')?.textContent).toBe('meu-app');
    expect(document.getElementById('pkg-version')?.textContent).toBe('1.2.3');
    expect(document.getElementById('pkg-deps')?.textContent).toBe('libc6, libgtk-3-0');
    expect(document.getElementById('pkg-compat')?.textContent).toBe('Compatível com seu sistema');
    expect((document.getElementById('pkg-install-btn') as HTMLButtonElement).disabled).toBe(false);
    expect((document.getElementById('pkg-install-btn') as HTMLButtonElement).textContent).toBe('⬇️ Instalar Pacote');
  });

  it('should mark package as incompatible and disable install', async () => {
    mockInvoke.mockResolvedValue({ ...PKG_INFO, compatible: false, compat_message: 'Não suportado', package_type: 'rpm' });

    const file = new File(['dummy'], 'app.rpm');
    await handlePkgFileSelect(file);

    const compat = document.getElementById('pkg-compat');
    expect(compat?.className).toContain('incompatible');
    expect(compat?.textContent).toBe('Não suportado');
    expect((document.getElementById('pkg-install-btn') as HTMLButtonElement).disabled).toBe(true);
    expect((document.getElementById('pkg-install-btn') as HTMLButtonElement).textContent).toBe('🚫 Incompatível');
    expect(document.getElementById('pkg-type')?.textContent).toBe('📀');
  });

  it('should render dash placeholder for empty deps', async () => {
    mockInvoke.mockResolvedValue({ ...PKG_INFO, dependencies: [] });

    const file = new File(['dummy'], 'app.deb');
    await handlePkgFileSelect(file);

    expect(document.getElementById('pkg-deps')?.textContent).toBe('Nenhuma dependência listada');
  });

  it('should reset state and show error on analysis failure', async () => {
    mockInvoke.mockRejectedValue(new Error('formato inválido'));

    const file = new File(['dummy'], 'app.deb');
    await handlePkgFileSelect(file);

    expect(document.getElementById('pkg-version')?.textContent).toBe('❌ Erro');
    expect(document.getElementById('pkg-compat')?.textContent).toContain('formato inválido');
    expect(document.getElementById('pkg-compat')?.className).toContain('incompatible');
    expect((document.getElementById('pkg-install-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should analyze package by absolute path', async () => {
    mockInvoke.mockResolvedValue({ ...PKG_INFO, package_name: 'app2' });

    await handlePkgPath('/tmp/downloads/app2.deb');

    expect(mockInvoke).toHaveBeenCalledWith('inspect_local_package', { path: '/tmp/downloads/app2.deb' });
    expect(pendingPkg.path).toBe('/tmp/downloads/app2.deb');
    expect(document.getElementById('pkg-name')?.textContent).toBe('app2');
  });
});
