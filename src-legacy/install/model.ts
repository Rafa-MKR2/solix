import type { DevelopmentTool } from "../tools/index.js";
import type { LinuxDistribution } from "../types/linux.js";
import type { PackageManagerName } from "../package-managers/model.js";

export type SupportedPackageManager = PackageManagerName;

export interface InstallationPreview {
  tool: DevelopmentTool;
  distribution: LinuxDistribution;
  packageManager: SupportedPackageManager;
  command: string;
}

export type InstallationPreviewResult =
  | { kind: "preview"; preview: InstallationPreview }
  | { kind: "tool-not-found"; toolName: string }
  | { kind: "distribution-not-detected" }
  | {
      kind: "unsupported-distribution";
      tool: DevelopmentTool;
      distribution: LinuxDistribution;
    };
