import { detectExecutables } from "../executables/detect-executables.js";
import { developmentTools, type DevelopmentToolStatus } from "./model.js";

export async function detectDevelopmentTools(): Promise<
  DevelopmentToolStatus[]
> {
  const names = developmentTools.map(({ name }) => name);
  const executableStatuses = await detectExecutables(names);

  return executableStatuses.map((status) => ({
    ...developmentTools.find(({ name }) => name === status.name),
    ...status,
  }));
}
