# Project Definition

## Purpose

Client Data Management System (CDMS) replaces PowerBI as the interface for
viewing and managing client IT infrastructure data — servers, routers,
workstations, user accounts, email configurations, external
connections/VPNs, and contact information — for Biztech's clients. It was
originally a read/write layer over a set of shared Excel workbooks and is
migrating to a proper database-backed system.

## Users and stakeholders

- Biztech technicians and staff who look up and update client infrastructure
  data day to day.
- Admins who manage user accounts and break-glass access.
- The BTClientDataAPI service (sister project) that now owns the underlying
  data store this app reads from and writes to.

## Desired outcomes

- All application data reads and writes go through BTClientDataAPI instead of
  directly reading/writing shared `.xlsx` files. **Achieved** — the Excel
  read/write path and the `xlsx` npm dependency were fully retired in
  `tasks/completed/TASK-001-retire-excel-data-path.md`, removing the
  data-loss and dependency-security risks that path carried.
- Real user logins are required (no anonymous or shared-credential access),
  with a break-glass admin account for emergencies.

## Scope

### Included

- Web (Next.js) application for viewing and editing client infrastructure
  data across the dataset types already modeled in `src/lib/data/silver-datasets.ts`.
- Optional Electron desktop packaging of the same app.
- Authentication (JWT session cookie) and per-user preferences, stored locally
  in SQLite.
- Data access via BTClientDataAPI (`DATA_API_BASE_URL`) for all
  client-infrastructure datasets.

### Excluded

- Ownership of the underlying data store — that lives in BTClientDataAPI, a
  separate sister project.
- Long-term maintenance of the legacy Excel read/write path once retired.

## Constraints

- Runs behind a corporate firewall; pragmatic security trade-offs are
  accepted there, but real user logins are still required (see
  [[auth-architecture]] decisions carried over from before this workflow
  existed).
- BTClientDataAPI is a separate, independently deployed service
  (`http://192.168.203.238:7310` in this environment) — this app must degrade
  or surface a clear error if it is unreachable, not silently fall back to
  stale Excel data once the Excel path is retired.
- Client data includes credentials (server logins, admin passwords, VPN
  credentials) — treat all datasets as sensitive.

## Domain language

- **Dataset / table** — one category of infrastructure data (e.g. `core`,
  `workstations`, `services`, `domains`); each maps to a table served by
  BTClientDataAPI and, historically, to one Excel workbook.
- **Client** — an end customer of Biztech whose infrastructure this app
  tracks; most datasets are scoped by `Client`.
- **Silver data / silver row** — this app's naming (inherited from the
  `SilverRow` type in `src/lib/data/api-client.ts`) for a data-API-backed row,
  distinct from the legacy Excel row shape.
- **DATA_READ_SOURCE** — the app-level switch (`excel` | `api` | `compare`)
  between reading from the legacy Excel files, reading from BTClientDataAPI,
  or reading both and logging discrepancies.
- **Break-glass admin** — the `FALLBACK_ADMIN_USERNAME`/`PASSWORD` account
  from `.env`, which must always retain full admin access regardless of
  database state.
