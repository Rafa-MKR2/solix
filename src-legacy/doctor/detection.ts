import { detectLinuxDistribution } from "../detection/linux-distribution.js";
import { detectPackageManagers } from "../package-managers/index.js";
import { detectDevelopmentTools } from "../tools/index.js";
import type { DoctorStatus } from "./model.js";

export async function detectDoctorStatus(): Promise<DoctorStatus> {
  const [distribution, packageManagers, developmentTools] = await Promise.all([
    detectLinuxDistribution(),
    detectPackageManagers(),
    detectDevelopmentTools(),
  ]);

  return {
    distributionDetected: distribution !== null,
    packageManagerDetected: packageManagers.some(({ available }) => available),
    developmentTools,
  };
}
