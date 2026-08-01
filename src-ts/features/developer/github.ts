// SPDX-License-Identifier: MIT

import { miscService } from '../../shared/services/index.js';

const GITHUB_REPO_URL = 'https://github.com/Rafa-MKR2/solix';

export async function handleGitHubLinkClick(e: Event): Promise<void> {
  e.preventDefault();
  try {
    await miscService.openUrl(GITHUB_REPO_URL);
  } catch {
    window.open(GITHUB_REPO_URL, '_blank');
  }
}

export function setupGitHubLink(): void {
  const link = document.getElementById('dev-github-link');
  if (link) {
    link.addEventListener('click', handleGitHubLinkClick);
  }
}