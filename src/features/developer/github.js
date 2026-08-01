import { miscService } from '../../shared/services/index.js';
const GITHUB_REPO_URL = 'https://github.com/Rafa-MKR2/solix';
export async function handleGitHubLinkClick(e) {
    e.preventDefault();
    try {
        await miscService.openUrl(GITHUB_REPO_URL);
    }
    catch {
        window.open(GITHUB_REPO_URL, '_blank');
    }
}
export function setupGitHubLink() {
    const link = document.getElementById('dev-github-link');
    if (link) {
        link.addEventListener('click', handleGitHubLinkClick);
    }
}
