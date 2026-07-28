import { detectLinuxDistribution } from "../detection/linux-distribution.js";
import { findDevelopmentTool } from "../tools/index.js";
import { createInstallationCommand } from "./create-installation-command.js";
import type { InstallationPreviewResult } from "./model.js";
import { resolvePackageManager } from "./resolve-package-manager.js";

export async function createInstallationPreview(
  toolName: string,
): Promise<InstallationPreviewResult> {
  const tool = findDevelopmentTool(toolName);

  if (!tool) {
    return { kind: "tool-not-found", toolName };
  }

  const distribution = await detectLinuxDistribution();

  if (!distribution) {
    return { kind: "distribution-not-detected" };
  }

  const packageManager = resolvePackageManager(distribution.packageManager);

  if (!packageManager) {
    return { kind: "unsupported-distribution", tool, distribution };
  }

  return {
    kind: "preview",
    preview: {
      tool,
      distribution,
      packageManager,
      command: createInstallationCommand(packageManager, tool),
    },
  };
}
