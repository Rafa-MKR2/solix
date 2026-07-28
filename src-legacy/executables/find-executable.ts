import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { delimiter, resolve } from "node:path";

export async function findExecutable(
  name: string,
): Promise<string | undefined> {
  const directories = process.env.PATH?.split(delimiter) ?? [];

  for (const directory of directories) {
    const candidate = resolve(directory || ".", name);

    if (await isExecutableFile(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function isExecutableFile(path: string): Promise<boolean> {
  try {
    const metadata = await stat(path);
    await access(path, constants.X_OK);
    return metadata.isFile();
  } catch {
    return false;
  }
}
