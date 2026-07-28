import type { DevelopmentToolStatus } from "../tools/index.js";

export interface DoctorStatus {
  distributionDetected: boolean;
  packageManagerDetected: boolean;
  developmentTools: DevelopmentToolStatus[];
}
