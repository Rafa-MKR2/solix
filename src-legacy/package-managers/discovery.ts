import { detectExecutables } from "../executables/detect-executables.js";
import { packageManagerNames, type PackageManagerStatus } from "./model.js";

export async function detectPackageManagers(): Promise<PackageManagerStatus[]> {
  return detectExecutables(packageManagerNames);
}
