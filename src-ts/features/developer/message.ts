// SPDX-License-Identifier: MIT

import { setupGitHubLink } from './github.js';

interface RoadmapItem {
  id: string;
  title: string;
  status: 'done' | 'wip' | 'planned';
}

interface RoadmapGroup {
  id: string;
  title: string;
  status: 'done' | 'wip' | 'planned';
  icon: string;
  items: RoadmapItem[];
}

const ROADMAP_GROUPS: RoadmapGroup[] = [
  {
    id: 'done',
    title: 'Concluído',
    status: 'done',
    icon: '✅',
    items: [
      { id: 'dashboard', title: 'Dashboard do Sistema', status: 'done' },
      { id: 'hardware', title: 'Informações de Hardware', status: 'done' },
      { id: 'monitoring', title: 'Monitoramento de CPU e RAM', status: 'done' },
      { id: 'disks', title: 'Gerenciamento de Discos', status: 'done' },
      { id: 'tools', title: 'Ferramentas e Instalação de Aplicativos', status: 'done' },
      { id: 'network', title: 'Painel de Rede', status: 'done' },
      { id: 'auto-update', title: 'Atualização Automática', status: 'done' },
      { id: 'packages', title: 'Gerenciamento de Pacotes', status: 'done' },
      { id: 'backup', title: 'Backup do sistema (tar)', status: 'done' },
      { id: 'help', title: 'Ajuda Educativa', status: 'done' },
    ],
  },
  {
    id: 'wip',
    title: 'Em desenvolvimento',
    status: 'wip',
    icon: '🚧',
    items: [
      { id: 'perf', title: 'Melhorias contínuas de desempenho', status: 'wip' },
      { id: 'catalog', title: 'Expansão do catálogo de aplicativos', status: 'wip' },
    ],
  },
  {
    id: 'planned',
    title: 'Planejado',
    status: 'planned',
    icon: '⏳',
    items: [
      { id: 'snapshots', title: 'Snapshots (Timeshift/Btrfs)', status: 'planned' },
      { id: 'systemd', title: 'Gerenciamento de Serviços (systemd)', status: 'planned' },
      { id: 'themes', title: 'Temas e personalização visual', status: 'planned' },
      { id: 'plugins', title: 'Plugins e extensões', status: 'planned' },
      { id: 'i18n', title: 'Internacionalização (i18n)', status: 'planned' },
      { id: 'wizard', title: 'Assistente de configuração inicial', status: 'planned' },
      { id: 'smart-recs', title: 'Recomendações inteligentes de software', status: 'planned' },
    ],
  },
];

function getStatusClass(status: RoadmapItem['status']): string {
  return `status-${status}`;
}

function getStatusIcon(status: RoadmapItem['status']): string {
  switch (status) {
    case 'done': return '✅';
    case 'wip': return '🚧';
    case 'planned': return '⏳';
  }
}

export function renderRoadmap(): void {
  const container = document.getElementById('roadmap');
  if (!container) return;

  container.innerHTML = ROADMAP_GROUPS.map(group => `
    <div class="roadmap-group">
      <div class="roadmap-group-header">
        <span class="roadmap-status-icon ${getStatusClass(group.status)}">${group.icon}</span>
        <span class="roadmap-group-title">${group.title}</span>
      </div>
      <div class="roadmap-list">
        ${group.items.map(item => `
          <div class="roadmap-item">
            <span class="roadmap-bullet ${getStatusClass(item.status)}"></span>
            ${item.title}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

export function initDeveloperPage(): void {
  renderRoadmap();
  setupGitHubLink();
}