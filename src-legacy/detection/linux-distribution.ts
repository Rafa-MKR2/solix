import { readFile } from "node:fs/promises";
import { platform, release } from "node:os";
import type {
  DistributionFamily,
  LinuxDistribution,
  PackageManager,
} from "../types/linux.js";

const OS_RELEASE_PATH = "/etc/os-release";

interface DistributionMapping {
  family: DistributionFamily;
  packageManager: PackageManager;
}

const distributionMappings: Record<string, DistributionMapping> = {
  arch: { family: "arch", packageManager: "pacman" },
  garuda: { family: "arch", packageManager: "pacman" },
  endeavouros: { family: "arch", packageManager: "pacman" },
  manjaro: { family: "arch", packageManager: "pacman" },
  ubuntu: { family: "debian", packageManager: "apt" },
  debian: { family: "debian", packageManager: "apt" },
  linuxmint: { family: "debian", packageManager: "apt" },
  fedora: { family: "fedora", packageManager: "dnf" },
  opensuse: { family: "opensuse", packageManager: "zypper" },
  suse: { family: "opensuse", packageManager: "zypper" },
};

export async function detectLinuxDistribution(): Promise<LinuxDistribution | null> {
  const osRelease = await readOsRelease();

  if (osRelease) {
    const distribution = distributionFromOsRelease(osRelease);

    if (distribution) {
      return distribution;
    }
  }

  // Some Linux systems omit os-release; Node can still provide a minimal fallback.
  return distributionFromPlatform();
}

async function readOsRelease(): Promise<Record<string, string> | null> {
  try {
    const content = await readFile(OS_RELEASE_PATH, "utf8");
    return parseOsRelease(content);
  } catch {
    return null;
  }
}

function distributionFromOsRelease(
  osRelease: Record<string, string>,
): LinuxDistribution | null {
  const id = osRelease.ID?.toLowerCase();
  const name = osRelease.NAME ?? osRelease.PRETTY_NAME;
  const version =
    osRelease.VERSION_ID ?? osRelease.VERSION ?? osRelease.BUILD_ID;

  if (!id && !name && !version) {
    return null;
  }

  const mapping = findDistributionMapping(id, osRelease.ID_LIKE);

  return {
    id: id ?? "unknown",
    name: name ?? "Unknown Linux Distribution",
    version: version ?? "unknown",
    family: mapping.family,
    packageManager: mapping.packageManager,
  };
}

function distributionFromPlatform(): LinuxDistribution | null {
  if (platform() !== "linux") {
    return null;
  }

  return {
    id: "linux",
    name: "Linux",
    version: release(),
    family: "unknown",
    packageManager: "unknown",
  };
}

function findDistributionMapping(
  id: string | undefined,
  idLike: string | undefined,
): DistributionMapping {
  const candidates = [id, ...(idLike?.toLowerCase().split(/\s+/) ?? [])];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const mapping = distributionMappings[candidate];

    if (mapping) {
      return mapping;
    }

    if (candidate.startsWith("opensuse")) {
      return { family: "opensuse", packageManager: "zypper" };
    }
  }

  return { family: "unknown", packageManager: "unknown" };
}

function parseOsRelease(content: string): Record<string, string> {
  return content.split("\n").reduce<Record<string, string>>((values, line) => {
    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0 || line.startsWith("#")) {
      return values;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key) {
      values[key] = unquote(value);
    }

    return values;
  }, {});
}

function unquote(value: string): string {
  const isQuoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));

  if (!isQuoted) {
    return value;
  }

  return value.slice(1, -1).replace(/\\(["\\$`])/g, "$1");
}
