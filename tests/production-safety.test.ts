import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as XLSX from "xlsx";
import { isSafeClientKey, resolveClientWorkbookPath } from "../src/lib/data/client-key";
import { DEFAULT_JWT_SECRET, getJwtSecret } from "../src/lib/auth/config";
import {
  clearLoginFailures,
  loginRetryAfterSeconds,
  recordLoginFailure,
} from "../src/lib/auth/login-rate-limit";
import {
  WorkbookLockedError,
  withWorkbookFileLock,
  writeWorkbookAtomically,
} from "../src/lib/excel/safe-write";

test("client workbook paths cannot escape the configured data directory", () => {
  assert.equal(isSafeClientKey("NOVA"), true);
  assert.equal(isSafeClientKey("client-01_test"), true);
  for (const invalid of ["../NOVA", "NOVA/../../secret", "NOVA.xlsx", "", " client"]) {
    assert.equal(isSafeClientKey(invalid), false);
    assert.throws(() => resolveClientWorkbookPath("C:\\data", "Misc", invalid));
  }
});

test("production authentication refuses a missing or default JWT secret", () => {
  const production = { NODE_ENV: "production", DISABLE_AUTH: "false" };
  assert.throws(() => getJwtSecret(production), /JWT_SECRET must be set/);
  assert.throws(
    () => getJwtSecret({ ...production, JWT_SECRET: DEFAULT_JWT_SECRET }),
    /JWT_SECRET must be set/
  );
  assert.equal(
    getJwtSecret({ ...production, JWT_SECRET: "test-only-strong-random-secret-0001" }),
    "test-only-strong-random-secret-0001"
  );
});

test("repeated login failures are temporarily rate limited", () => {
  const key = `test-${Date.now()}`;
  const now = 1_000_000;
  clearLoginFailures(key);
  for (let attempt = 0; attempt < 10; attempt += 1) recordLoginFailure(key, now);
  assert.equal(loginRetryAfterSeconds(key, now), 900);
  assert.equal(loginRetryAfterSeconds(key, now + 900_001), 0);
  clearLoginFailures(key);
});

test("workbook replacement retains a readable previous-version backup", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cdms-safe-write-"));
  const workbookPath = path.join(directory, "client.xlsx");
  try {
    const first = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(first, XLSX.utils.json_to_sheet([{ Note: "first" }]), "Notes");
    writeWorkbookAtomically(workbookPath, first);

    const second = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(second, XLSX.utils.json_to_sheet([{ Note: "second" }]), "Notes");
    writeWorkbookAtomically(workbookPath, second);

    const live = XLSX.read(fs.readFileSync(workbookPath), { type: "buffer" });
    const backup = XLSX.read(fs.readFileSync(`${workbookPath}.bak`), { type: "buffer" });
    assert.equal(XLSX.utils.sheet_to_json<{ Note: string }>(live.Sheets.Notes)[0].Note, "second");
    assert.equal(XLSX.utils.sheet_to_json<{ Note: string }>(backup.Sheets.Notes)[0].Note, "first");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("a workbook cannot be mutated through two simultaneous lock holders", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cdms-lock-"));
  const workbookPath = path.join(directory, "client.xlsx");
  try {
    withWorkbookFileLock(workbookPath, () => {
      assert.throws(
        () => withWorkbookFileLock(workbookPath, () => undefined),
        WorkbookLockedError
      );
    });
    assert.equal(fs.existsSync(`${workbookPath}.lock`), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
