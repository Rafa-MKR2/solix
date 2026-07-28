import type { PackageManager } from "../types/linux.js";
import type { SupportedPackageManager } from "./model.js";

export function resolvePackageManager(
  packageManager: PackageManager,
): SupportedPackageManager | null {
  if (packageManager === "unknown") {
    return null;
  }

  return packageManager;
}
