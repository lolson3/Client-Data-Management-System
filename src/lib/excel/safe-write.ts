import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

const STALE_LOCK_MS = 2 * 60 * 1000;

export class WorkbookLockedError extends Error {
  constructor(filePath: string) {
    super(`Workbook is currently being updated: ${path.basename(filePath)}`);
    this.name = "WorkbookLockedError";
  }
}

function acquireLock(filePath: string): { descriptor: number; lockPath: string } {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  const lockPath = `${filePath}.lock`;

  try {
    return { descriptor: fs.openSync(lockPath, "wx"), lockPath };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST") throw error;

    try {
      const age = Date.now() - fs.statSync(lockPath).mtimeMs;
      if (age > STALE_LOCK_MS) {
        fs.unlinkSync(lockPath);
        return { descriptor: fs.openSync(lockPath, "wx"), lockPath };
      }
    } catch (lockError) {
      if ((lockError as NodeJS.ErrnoException).code === "ENOENT") {
        return { descriptor: fs.openSync(lockPath, "wx"), lockPath };
      }
      throw lockError;
    }

    throw new WorkbookLockedError(filePath);
  }
}

export function withWorkbookFileLock<T>(filePath: string, operation: () => T): T {
  const { descriptor, lockPath } = acquireLock(filePath);
  try {
    fs.writeFileSync(descriptor, `${process.pid}\n${new Date().toISOString()}\n`);
    return operation();
  } finally {
    fs.closeSync(descriptor);
    try {
      fs.unlinkSync(lockPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

/**
 * Writes a complete workbook to a same-directory temporary file, fsyncs it,
 * keeps the previous version as .bak, and only then replaces the live file.
 */
export function writeWorkbookAtomically(filePath: string, workbook: XLSX.WorkBook): void {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });

  const unique = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const temporaryPath = path.join(directory, `.${path.basename(filePath)}.${unique}.tmp`);
  const rollbackPath = path.join(directory, `.${path.basename(filePath)}.${unique}.rollback`);
  const backupPath = `${filePath}.bak`;
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  let movedOriginal = false;

  try {
    const descriptor = fs.openSync(temporaryPath, "wx");
    try {
      fs.writeFileSync(descriptor, buffer);
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }

    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      try {
        fs.renameSync(temporaryPath, filePath);
        return;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (!code || !["EEXIST", "EPERM", "EACCES"].includes(code)) throw error;

        // Windows may not replace an existing file with rename. Move the live
        // file aside first so restoration is always possible if replacement fails.
        fs.renameSync(filePath, rollbackPath);
        movedOriginal = true;
      }
    }

    fs.renameSync(temporaryPath, filePath);
    if (movedOriginal && fs.existsSync(rollbackPath)) fs.unlinkSync(rollbackPath);
  } catch (error) {
    if (movedOriginal && !fs.existsSync(filePath) && fs.existsSync(rollbackPath)) {
      fs.renameSync(rollbackPath, filePath);
    }
    throw error;
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    if (fs.existsSync(rollbackPath) && fs.existsSync(filePath)) fs.unlinkSync(rollbackPath);
  }
}
