export const packageManagerNames = ["pacman", "apt", "dnf", "zypper"] as const;

export type PackageManagerName = (typeof packageManagerNames)[number];

export interface PackageManagerStatus {
  name: PackageManagerName;
  available: boolean;
  executable?: string;
}
