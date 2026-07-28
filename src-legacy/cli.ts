import { createRequire } from "node:module";
import { Command } from "commander";
import { promptConfirmation } from "./utils/prompt.js";
import { detectLinuxDistribution } from "./detection/linux-distribution.js";
import { detectDoctorStatus } from "./doctor/index.js";
import type { DoctorStatus } from "./doctor/index.js";
import { createInstallationPreview } from "./install/index.js";
import type { InstallationPreviewResult } from "./install/index.js";
import { detectPackageManagers } from "./package-managers/index.js";
import type { PackageManagerStatus } from "./package-managers/index.js";
import type { DistributionFamily } from "./types/linux.js";
import { detectDevelopmentTools } from "./tools/index.js";
import type { DevelopmentToolStatus } from "./tools/index.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

export function runCli(argv = process.argv): Promise<void> {
  const program = new Command();

  program
    .name("linux-post-install")
    .description("Bootstrap a Linux development environment.")
    .version(version);

  program
    .command("info")
    .description("Display project information.")
    .action(async () => {
      const distribution = await detectLinuxDistribution();
      const packageManagers = await detectPackageManagers();

      if (!distribution) {
        console.error(
          "Unable to detect Linux distribution information. Please run this command on a supported Linux system.",
        );
        process.exitCode = 1;
        return;
      }

      console.log(
        [
          "Linux Post Install",
          "",
          `Version: ${version}`,
          "",
          `Distribution : ${distribution.name}`,
          `ID           : ${distribution.id}`,
          `Family       : ${formatFamily(distribution.family)}`,
          `Version      : ${distribution.version}`,
          `Package Mgr  : ${distribution.packageManager}`,
          "",
          "Package Managers",
          ...packageManagers.map(formatPackageManagerStatus),
        ].join("\n"),
      );
    });

  program
    .command("doctor")
    .description("Check development tools installed on the system.")
    .action(async () => {
      const status = await detectDoctorStatus();
      console.log(formatDoctorStatus(status));
    });

  program
    .command("list")
    .description("List development tools known by the project.")
    .action(async () => {
      const developmentTools = await detectDevelopmentTools();
      console.log(formatToolList(developmentTools));
    });

  program
    .command("install <tool>")
    .description("Preview the installation command for a development tool.")
    .option("-y, --yes", "Skip confirmation prompt")
    .action(async (tool: string, options: { yes?: boolean }) => {
      const preview = await createInstallationPreview(tool);
      console.log(formatInstallationPreview(preview));

      if (preview.kind !== "preview") {
        return;
      }

      const confirmed = await promptConfirmation(options.yes ?? false);

      if (confirmed) {
        console.log("\nInstallation execution is disabled. Preview only mode.");
      } else {
        console.log("\nInstallation cancelled.");
      }
    });

  return program.parseAsync(argv).then(() => undefined);
}

function formatDoctorStatus(status: DoctorStatus): string {
  const checks = [
    status.distributionDetected,
    status.packageManagerDetected,
    ...status.developmentTools.map(({ available }) => available),
  ];
  const passed = checks.filter(Boolean).length;
  const failed = checks.length - passed;

  return [
    "Linux Post Install Doctor",
    "",
    "System",
    formatCheck(status.distributionDetected, "Distribution detected"),
    formatCheck(status.packageManagerDetected, "Package manager detected"),
    "",
    "Development Tools",
    ...status.developmentTools.map(formatDevelopmentToolStatus),
    "",
    "Summary",
    `Passed: ${passed}`,
    `Failed: ${failed}`,
  ].join("\n");
}

function formatDevelopmentToolStatus(status: DevelopmentToolStatus): string {
  const check = formatCheck(status.available, status.name);

  if (status.available || !status.suggestedCommand) {
    return check;
  }

  return [check, "  Suggestion:", `  ${status.suggestedCommand}`].join("\n");
}

function formatToolList(tools: DevelopmentToolStatus[]): string {
  return [
    "Linux Post Install",
    "",
    "Available Tools",
    "",
    "Development Tools",
    ...tools.map(formatListedTool),
  ].join("\n");
}

function formatListedTool(status: DevelopmentToolStatus): string {
  const check = formatCheck(status.available, status.name);

  return status.description
    ? [check, `  ${status.description}`].join("\n")
    : check;
}

function formatInstallationPreview(result: InstallationPreviewResult): string {
  if (result.kind === "tool-not-found") {
    return [
      "Linux Post Install",
      "",
      `Unknown tool: ${result.toolName}`,
      "",
      "Run linux-post-install list to view available tools.",
    ].join("\n");
  }

  if (result.kind === "distribution-not-detected") {
    return [
      "Linux Post Install",
      "",
      "Unable to detect the Linux distribution. Installation preview is unavailable.",
    ].join("\n");
  }

  if (result.kind === "unsupported-distribution") {
    return [
      "Linux Post Install",
      "",
      `Installing: ${result.tool.name}`,
      "",
      `Installation preview is not available for ${result.distribution.name}.`,
      "Supported package managers: pacman, apt, dnf, zypper.",
    ].join("\n");
  }

  const { preview } = result;

  return [
    "Linux Post Install",
    "",
    `Installing: ${preview.tool.name}`,
    "",
    "Detected:",
    "",
    `Distribution: ${preview.distribution.name}`,
    `Package Manager: ${preview.packageManager}`,
    "",
    "Installation command:",
    "",
    preview.command,
    "",
    "Execution disabled in preview mode.",
  ].join("\n");
}

function formatCheck(available: boolean, label: string): string {
  return `${available ? "✔" : "✖"} ${label}`;
}

function formatPackageManagerStatus(status: PackageManagerStatus): string {
  if (!status.available) {
    return `✖ ${status.name}`;
  }

  return `✔ ${status.name} (${status.executable})`;
}

function formatFamily(family: DistributionFamily): string {
  const labels: Record<DistributionFamily, string> = {
    arch: "Arch",
    debian: "Debian",
    fedora: "Fedora",
    opensuse: "openSUSE",
    unknown: "Unknown",
  };

  return labels[family];
}
