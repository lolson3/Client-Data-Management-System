# Architecture

## System boundaries

CDMS is a Next.js (App Router) web application, optionally packaged as an
Electron desktop app, sitting between Biztech staff and two backing stores:

- **BTClientDataAPI** (sister project, separate deployment) — the system of
  record for client infrastructure data. Reached over HTTP at
  `DATA_API_BASE_URL` (e.g. `http://192.168.203.238:7310`). CDMS is a client
  of this API, not a co-owner of its schema.
- **Local SQLite** (`better-sqlite3`) — owns authentication (`AUTH_DB_PATH`,
  default `./data/auth.db`) and user preferences. This has already fully
  migrated off Excel/flat files; it is local to each CDMS deployment, not
  shared with BTClientDataAPI.
- **Legacy Excel workbooks** — the original data store for client
  infrastructure data, retired (see "Migration state" below). `Examples/`
  still holds sample `.xlsx` files for reference; the app no longer reads
  them.

## Major components

- `src/app/` — Next.js App Router pages (dashboard, login, API routes under
  `src/app/api/**`) and the generated Swagger/OpenAPI docs at `/docs`.
- `src/proxy.ts` — global request middleware; verifies the JWT session cookie
  (via `jose`, edge runtime) and enforces authentication on every route
  except `PUBLIC_PATHS`. `DISABLE_AUTH=true` bypasses this entirely (dev
  only).
- `src/lib/auth/` — JWT issuing/verification (`jwt.ts`), session cookie
  handling (`session.ts`), the auth SQLite database (`db.ts`, `db-sqlite.ts`),
  and route-level middleware helpers.
- `src/lib/data/`
  - `silver-datasets.ts` — the dataset registry: for each of the 22 known
    dataset keys (core, users, workstations, services, domains, miscRows, …)
    it defines the BTClientDataAPI table name, the table-field ↔ UI-field
    (legacy Excel-column-shaped) mapping, and which fields are numeric.
    `readMigratedDataset`/`readApiDataset` always read through the API.
  - `api-client.ts` — thin typed HTTP client for BTClientDataAPI
    (list/create/update/archive `SilverRow`s), including timeout and error
    handling.
  - `registry.ts` — cross-cutting health/status check for every configured
    data source (the SQLite auth/preferences DBs and the API), consumed by
    `src/instrumentation.ts` and `/api/health`.
- `src/components/` — dashboard UI: `DataTable` (search/sort/paginate/inline
  edit/expand), `FullPageModal`, `HostGroupedView`, `AddRecordModal`, theme
  toggle.

## Data flow

1. A page/API route calls `readMigratedDataset(key, client, opts)` in
   `silver-datasets.ts`, which calls `readApiDataset`.
2. `readApiDataset` hits BTClientDataAPI through `api-client.ts` and reshapes
   the response into the legacy Excel-like field names the UI expects
   (`toExcelShape`).
3. Writes (`createMigratedRow` / `updateMigratedRow` / `archiveMigratedRow`)
   go to BTClientDataAPI; archiving sets that table's `inactive` column
   (soft delete only — BTClientDataAPI has no hard-delete path).
4. Auth and per-user preferences never touch the API — they are local
   SQLite reads/writes gated by `src/proxy.ts`.

## Trust boundaries

- `src/proxy.ts` is the single enforcement point for authentication; new API
  routes are protected automatically and should not add their own
  per-route auth (see `docs/DEVELOPMENT.md`).
- BTClientDataAPI is trusted network-internal infrastructure (corporate
  firewall), reached over plain HTTP; it is a separate deployment with its
  own security posture, out of scope for this repository.
- The break-glass admin (`FALLBACK_ADMIN_USERNAME`/`PASSWORD` in `.env`) is a
  deliberate bypass of normal DB-backed auth and must always work.

## Migration state

The Excel read/write path, the `DATA_READ_SOURCE` switch, the `xlsx`
dependency, and the `EXCEL_BASE_PATH`/`COMPANIES_FILE_PATH` config have been
removed (`tasks/completed/TASK-001-retire-excel-data-path.md`). All 22
datasets (including `miscRows`) are served by BTClientDataAPI. Row-level data
in BTClientDataAPI is not guaranteed to match the old Excel files — that
divergence was accepted as out of scope for the retirement; the database is
the source of truth going forward. One known minor gap: the `acronis_backups`
table doesn't have an `encrypt_pw_7` column, so that one field is
write-only-to-nothing until BTClientDataAPI's source Excel header (and a
reseed) adds it.
