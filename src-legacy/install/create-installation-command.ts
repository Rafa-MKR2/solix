import type { DevelopmentTool } from "../tools/index.js";
import type { SupportedPackageManager } from "./model.js";

const commandPrefixes: Record<SupportedPackageManager, string> = {
  pacman: "sudo pacman -S",
  apt: "sudo apt install",
  dnf: "sudo dnf install",
  zypper: "sudo zypper install",
};

export function createInstallationCommand(
  packageManager: SupportedPackageManager,
  tool: DevelopmentTool,
): string {
  return `${commandPrefixes[packageManager]} ${tool.name}`;
}
