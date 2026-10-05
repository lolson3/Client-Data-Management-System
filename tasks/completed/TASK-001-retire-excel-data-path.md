# TASK-001: Retire the Excel data path, commit fully to BTClientDataAPI

Owner role: Human
Assigned agent: TBD
Proposed by: Claude
Proposed date: 2026-09-04
Approved by: Patrick
Approved date: 2026-09-04
Related contracts: None
Related ADRs: None
Dependencies: None

## Desired outcome

CDMS reads and writes all client-infrastructure data exclusively through
BTClientDataAPI. The legacy Excel read/write path, the `DATA_READ_SOURCE`
switch, the `xlsx` dependency, and the associated share-path configuration
(`EXCEL_BASE_PATH`, `COMPANIES_FILE_PATH`) are removed from the codebase.

## Context

`DATA_READ_SOURCE=api` is already set in `.env` and `DATA_API_BASE_URL`
(`http://192.168.203.238:7310`) responds to health checks. Every dataset in
`EXCEL_FILES` (`src/types/data.ts`) already has a matching entry in
`DATASETS` (`src/lib/data/silver-datasets.ts`), so the API path is exercised
for all 21 known datasets plus `miscRows`. The remaining work is deleting the
now-unused Excel fallback, per the deferred cleanup noted in project history:
the Excel write path has known data-loss risk (no file locking,
formula-destroying rewrites) and the `xlsx` package has known
vulnerabilities. Both were accepted as temporary risk specifically because
this migration would make them moot.

**Row-level data parity with the Excel files is explicitly not a goal of
this task.** The production Excel files are known to be out of sync with the
database already; the database is the source going forward regardless of
whether its row content currently matches Excel. What matters here is that
the correct tables/datasets exist in BTClientDataAPI with the expected
shape (fields the app reads/writes per `DATASETS` in
`silver-datasets.ts`) — not that their contents match the old files.

## Scope

### Included

- Confirm, for each dataset in `DATASETS` (`silver-datasets.ts`), that the
  corresponding table exists in BTClientDataAPI and exposes the fields the
  app expects (per each dataset's `fields` mapping) — a structural check, not
  a row-content/parity check against Excel.
- Confirm a `miscRows` table exists in BTClientDataAPI (replacing the
  per-client Misc-folder files checked by `checkMiscFolder` in
  `src/lib/data/registry.ts`), or explicitly scope it out with a follow-up
  task if it doesn't yet.
- Remove the Excel-mode and compare-mode branches from
  `src/lib/data/silver-datasets.ts` (`readExcelDataset`, `logComparison`,
  the `excel`/`compare` branches of `getReadSource()`/`readMigratedDataset`)
  once no longer needed.
- Remove `src/lib/excel/` (`reader.ts`, `cache.ts`, `types.ts`) and its call
  sites, and the `excel`/`folder` source types and checks in
  `src/lib/data/registry.ts`.
- Remove the `xlsx` dependency from `package.json`.
- Remove `EXCEL_BASE_PATH` and `COMPANIES_FILE_PATH` from `.env`,
  `.env.example`, and any code that reads them.
- Update `README.md`, `PROJECT_PLAN.md`, and `docs/ARCHITECTURE.md` to
  describe the API-only architecture.

### Excluded

- Changes to BTClientDataAPI itself (separate repository/service).
- Changes to authentication or preferences (already SQLite-only, not
  Excel-backed).
- Removing the `Examples/` sample `.xlsx` files used for local development
  reference — out of scope unless the human requests it separately.

## Plan

1. Confirm every expected table/dataset exists in BTClientDataAPI with the
   expected fields (schema check, not a data-content comparison).
2. Remove Excel/compare code paths and the `xlsx` dependency.
3. Remove now-unused env vars and update `.env.example`.
4. Update user-facing and architecture documentation.
5. Confirm the app builds, lints, and runs against BTClientDataAPI with no
   Excel share mounted.

## Acceptance criteria

- [x] `DATA_READ_SOURCE` no longer has an `excel` or `compare` mode; the app
      always reads/writes through BTClientDataAPI.
- [x] `src/lib/excel/` is removed, and nothing in `src/` imports it.
- [x] `xlsx` is removed from `package.json` / `package-lock.json`.
- [x] `EXCEL_BASE_PATH` and `COMPANIES_FILE_PATH` no longer appear in `.env`,
      `.env.example`, or application code.
- [x] `/api/health` (via `src/lib/data/registry.ts`) reports only API and
      SQLite sources, no `excel`/`folder` sources.
- [x] The app runs (`npm run dev`/`build`) with the GVFS Excel share
      unmounted (verified against the running dev server; the share was not
      mounted or referenced at any point during this task).
- [x] `README.md`, `PROJECT_PLAN.md`, and `docs/ARCHITECTURE.md` reflect the
      API-only architecture.

## Validation requirements

- `npm run lint` and a TypeScript build pass.
- Manual dashboard walkthrough covering at least one read, one inline edit,
  one add, and one archive action against BTClientDataAPI, to confirm the
  app functions end-to-end against each dataset's table (content need not
  match the old Excel files).
- `curl` or `/api/health` check confirming BTClientDataAPI reachability and
  no remaining Excel-source entries.

## Risks and assumptions

- Assumes BTClientDataAPI exposes a table with the expected fields for every
  dataset currently served from Excel. If a table is missing or structurally
  incomplete for a dataset, stop and raise it rather than removing that
  dataset's Excel fallback.
- Row-level data in BTClientDataAPI is known to differ from the (stale)
  production Excel files; that divergence is expected and out of scope to
  reconcile here — the database is the source of truth going forward
  regardless.
- Assumes a `miscRows` table exists to replace the ad hoc per-client Misc
  folder files; this needs explicit confirmation in step 1.

## Blocker

Resolved — see Implementation handoff below. (Kept here for the record.)

Step 1 (schema check) is done. The live BTClientDataAPI deployment
(`http://192.168.203.238:7310`) is out of sync with its own current source:

- `GET /api/data/misc_rows` returns `{"error":"Unknown silver table
  \"misc_rows\""}`, but `misc_rows` **is** registered in the live
  `BTClientDataAPI` checkout's `server/silver/tables.ts` (with `softDelete`
  configured), and the local build already includes it.
- 11 of 21 tables returned rows with no `inactive` key at all — `domains`,
  `cameras_external`, `phone_numbers`, `websites`, `containers`, `vms`,
  `managed_info`, `external_info`, `admin_emails`, `guacamole_hosts`,
  `companies` — but every one of them **also** has `softDelete: INACTIVE`
  configured in the current `tables.ts`.
- `acronis_backups` is missing the `encrypt_pw_7` field the app maps.

This isn't a schema-design gap in BTClientDataAPI's source. Its database is a
local, per-deployment PGlite data directory (`DB_PATH=./data/bronze.db`, not
shared), and there's no server process on this machine listening on 7310 —
the live instance at `.238` is a separate deployment. The evidence points to
that live deployment running older code and/or a database seeded before
`misc_rows` and several `inactive` columns were added to the source, with its
own startup migration (`migrateMiscDocumentsToRows`) not yet having run
against it.

Effect: removing the Excel fallback now would silently break the
archive/soft-delete action for those 11 datasets and drop `miscRows` and one
Acronis field entirely — not because the API can't support them, but because
the specific running instance hasn't caught up to its own code yet.
Resolution is redeploying/restarting the live BTClientDataAPI service from
current source (and letting its startup migration run), which is a change to
a shared, already-running service outside this repository. Patrick is
handling that redeploy directly. Once it's done, re-run the same schema
check (`GET /api/data/<table>?limit=1` for each dataset table, comparing
returned columns to `DATASETS[...].fields` in `silver-datasets.ts`) to
confirm `misc_rows` and the 11 `inactive` columns are present before
resuming steps 2-5.

## Implementation handoff

Patrick redeployed/restarted the live BTClientDataAPI service. Re-ran the
step-1 schema check against all 22 tables: all 11 previously-missing
`inactive` columns are now present and `misc_rows` is live (729 rows). Only
`acronis_backups.encrypt_pw_7` remains absent — a source-Excel-header gap,
not a stale-deployment issue. Per explicit direction from Patrick ("align the
system to match the database as it is; if we really need anything we lost in
this transition we will fix it later"), this was accepted as a known,
non-blocking gap rather than a reason to hold up the rest of the task — the
app will just never populate that one field until BTClientDataAPI's source
header (and a reseed) adds it.

With the schema confirmed, completed steps 2-5:

- Removed the `excel`/`compare` branches, `getReadSource`/`isApiWriteMode`/
  `isCompareMode`, and Excel-shaped dataset reading from
  `src/lib/data/silver-datasets.ts`; `readMigratedDataset` now always calls
  `readApiDataset`. Moved `filterOutInactive` (still needed by the API path
  and by `external-info/route.ts`) into this file since its old home
  (`src/lib/excel/reader.ts`) is gone.
- Deleted `src/lib/excel/` (`reader.ts`, `cache.ts`, `types.ts`) — confirmed
  via grep that nothing outside it used any of its other exports.
- Simplified `src/lib/data/registry.ts`: removed `checkExcelSource`,
  `checkMiscFolder`, and the `excel`/`folder` `DataSourceType` variants;
  `checkDataSources` now just returns the API + SQLite checks.
- Rewrote the Excel-fallback branches out of
  `src/app/api/data/update/route.ts`, `companies/route.ts`,
  `websites/route.ts`, and `src/app/api/data/misc/[client]/route.ts`
  (this last one dropped its own local `xlsx`-based file read/write helpers
  entirely). `external-info/route.ts` just repoints its `filterOutInactive`
  import.
- Removed `ExcelFileConfig`/`EXCEL_FILES` from `src/types/data.ts` (dead
  once nothing resolved Excel file paths from it).
- Ran `npm uninstall xlsx` (updates `package.json` and
  `package-lock.json` properly rather than hand-editing them).
- Removed `EXCEL_BASE_PATH`, `COMPANIES_FILE_PATH`, `EXCEL_CACHE_TTL`, and
  `DATA_READ_SOURCE` from `.env` and `.env.example`.
- Deleted `scripts/add-test-data.js` (an unreferenced, xlsx-only dev script
  that would have broken with `xlsx` gone; confirmed via grep it wasn't
  wired into any npm script or other code). Updated
  `scripts/package-standalone.js`'s generated standalone `.env` template and
  its README section to reference `DATA_API_BASE_URL` instead of the removed
  Excel path vars.
- Cleaned up now-dead `rowIdentifier`/`rowIndex` fields the dashboard was
  still sending alongside `apiId` in `src/app/dashboard/page.tsx` (harmless
  before, but no longer meaningful once the routes stopped reading them).
- Updated `README.md`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`, and
  `docs/PROJECT.md` to describe the API-only architecture. `PROJECT_PLAN.md`
  is a large historical planning document; rather than rewriting it, added a
  status note at the top and rewrote its "Migration Path from Excel to
  Database (Phase 3+)" section to describe what actually happened, pointing
  to `docs/ARCHITECTURE.md` as the current authority.

Validation:

- `npx tsc --noEmit` — clean.
- `npm run lint` (`next lint`) is broken independent of this task — this
  repo's ESLint 9 install needs `.eslintrc.json` migrated to
  `eslint.config.js`; noted in `docs/DEVELOPMENT.md` rather than fixed here
  (out of scope).
- `npm run build` — compiles and generates all routes successfully.
- Ran the existing local dev server (already running on :6030, picked up the
  changes via hot reload) through a real end-to-end check against the live
  BTClientDataAPI: logged in as the break-glass admin, hit `/api/health`
  (reports only `sqlite`/`api` sources, `misc_rows` included, `3/3 OK`), read
  `core`, `misc/BT`, and `companies` data, then did a full add → update →
  archive cycle against `phone_numbers` (one of the previously-broken
  tables) and a separate add → update → delete cycle against `miscRows`.
  Confirmed the archived `phone_numbers` row persisted `inactive: '1'` via a
  direct query against BTClientDataAPI. Also confirmed `/dashboard` returns
  200 for an authenticated session.

Assumptions and deviations: none beyond what's recorded above (the
`encrypt_pw_7` gap, accepted per Patrick's direction).

Unresolved risks:

- The validation writes above created real rows on the live BTClientDataAPI
  database (`phone_numbers` id 105, now archived/inactive; `miscRows` id 730,
  archived via delete). They're soft-deleted and won't appear in normal
  UI/API list views, but they still exist as rows — flagging in case anyone
  audits row counts later.
- `core` returns an extra `inactive_2` column and `services`/
  `cloudflare_admins` return an extra `empty` column, none of which are in
  the app's field mapping. Not blocking (the app ignores unmapped fields)
  but worth asking BTClientDataAPI's owner about at some point.
- The dashboard's other `/api/data/update` call sites (inline edit for most
  datasets, add-record, archive) still build and send a Excel-era
  `rowIdentifier` object alongside `apiId` — harmless since the route no
  longer reads it, but it's dead code left in `page.tsx` that a future pass
  could clean up along with the `identifierKeys` plumbing that feeds it.

## Review

Not independently reviewed.

## Human acceptance

Accepted by Patrick (2026-09-04), by moving this task to `tasks/completed/`.
