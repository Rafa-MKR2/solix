import { showToast } from '../../shared/utils/index.js';
import { packageService } from '../../shared/services/index.js';
import { showPasswordModal, passwordVerified } from '../../operations.js';
let selectedRepoPkgs = new Set();
export async function handleSearchRepoPackages(query) {
    const listEl = document.getElementById('pkg-search-list');
    if (!listEl)
        return;
    if (!query.trim()) {
        listEl.innerHTML = '<div class="pkg-empty">Digite um nome para buscar nos repositórios</div>';
        document.getElementById('pkg-search-actions').style.display = 'none';
        return;
    }
    listEl.innerHTML = '<div class="pkg-loading">⏳ Buscando...</div>';
    selectedRepoPkgs.clear();
    try {
        const pkgs = await packageService.searchRepo(query.trim());
        renderRepoPackages(pkgs);
    }
    catch (e) {
        console.error('search_repo_packages failed:', e);
        listEl.innerHTML = '<div class="pkg-empty">❌ Erro ao buscar pacotes.</div>';
    }
}
function renderRepoPackages(pkgs) {
    const listEl = document.getElementById('pkg-search-list');
    if (!listEl)
        return;
    if (pkgs.length === 0) {
        listEl.innerHTML = '<div class="pkg-empty">Nenhum pacote encontrado nos repositórios.</div>';
        document.getElementById('pkg-search-actions').style.display = 'none';
        return;
    }
    document.getElementById('pkg-search-actions').style.display = '';
    listEl.innerHTML = `<table class="pkg-table">
    <thead><tr>
      <th class="pkg-th-check"></th>
      <th class="pkg-th-name">Pacote</th>
      <th class="pkg-th-version">Versão</th>
      <th class="pkg-th-repo">Repositório</th>
      <th class="pkg-th-desc">Descrição</th>
    </tr></thead>
    <tbody>${pkgs.map(p => `
      <tr class="pkg-row ${selectedRepoPkgs.has(p.name) ? 'selected' : ''}" data-repo-pkg="${p.name}">
        <td><input type="checkbox" class="pkg-check" /></td>
        <td class="pkg-cell-name">${p.name}</td>
        <td class="pkg-cell-version">${p.version}</td>
        <td class="pkg-cell-repo">${p.repo}</td>
        <td class="pkg-cell-desc">${p.description || '—'}</td>
      </tr>
    `).join('')}</tbody></table>`;
    listEl.querySelectorAll('.pkg-row').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT')
                return;
            const cb = row.querySelector('.pkg-check');
            cb.checked = !cb.checked;
            cb.dispatchEvent(new Event('change'));
        });
        const cb = row.querySelector('.pkg-check');
        cb.addEventListener('change', () => {
            const name = row.dataset.repoPkg;
            if (cb.checked) {
                selectedRepoPkgs.add(name);
                row.classList.add('selected');
            }
            else {
                selectedRepoPkgs.delete(name);
                row.classList.remove('selected');
            }
            const btn = document.getElementById('pkg-install-repo-btn');
            if (btn) {
                btn.disabled = selectedRepoPkgs.size === 0;
                btn.textContent = selectedRepoPkgs.size > 0 ? `⬇️ Instalar (${selectedRepoPkgs.size})` : '⬇️ Instalar Selecionados';
            }
        });
    });
}
export async function handleInstallRepoPackages() {
    if (selectedRepoPkgs.size === 0)
        return;
    const names = Array.from(selectedRepoPkgs);
    const doInstall = async () => {
        try {
            const results = await packageService.installRepo(names);
            const listEl = document.getElementById('pkg-search-list');
            if (listEl) {
                listEl.innerHTML = `<div class="pkg-history-log">${results.map(r => `<div>${r}</div>`).join('')}</div>`;
            }
            showToast('success', `${names.length} pacote(s) instalado(s)!`);
            selectedRepoPkgs.clear();
        }
        catch (e) {
            showToast('error', (e + '') || 'Erro ao instalar pacotes.');
        }
    };
    if (passwordVerified) {
        await doInstall();
    }
    else {
        showPasswordModal({ type: 'install', tools: names });
    }
}
