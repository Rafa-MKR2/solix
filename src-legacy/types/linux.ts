export type DistributionFamily =
  "arch" | "debian" | "fedora" | "opensuse" | "unknown";

export type PackageManager = "apt" | "dnf" | "pacman" | "zypper" | "unknown";

export interface LinuxDistribution {
  id: string;
  name: string;
  version: string;
  family: DistributionFamily;
  packageManager: PackageManager;
}
