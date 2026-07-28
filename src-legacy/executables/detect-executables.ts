import { findExecutable } from "./find-executable.js";

export interface ExecutableStatus<Name extends string> {
  name: Name;
  available: boolean;
  executable?: string;
}

export async function detectExecutables<Name extends string>(
  names: readonly Name[],
): Promise<ExecutableStatus<Name>[]> {
  return Promise.all(names.map((name) => detectExecutable(name)));
}

async function detectExecutable<Name extends string>(
  name: Name,
): Promise<ExecutableStatus<Name>> {
  const executable = await findExecutable(name);

  return executable
    ? { name, available: true, executable }
    : { name, available: false };
}
