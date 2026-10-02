import * as path from "path";

const CLIENT_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export function isSafeClientKey(client: string): boolean {
  return CLIENT_KEY_PATTERN.test(client);
}

export function resolveClientWorkbookPath(basePath: string, folder: string, client: string): string {
  if (!isSafeClientKey(client)) {
    throw new Error("Invalid client identifier");
  }

  const directory = path.resolve(basePath, folder);
  const workbookPath = path.resolve(directory, `${client}.xlsx`);
  if (path.dirname(workbookPath) !== directory) {
    throw new Error("Client workbook path escaped its data directory");
  }
  return workbookPath;
}
