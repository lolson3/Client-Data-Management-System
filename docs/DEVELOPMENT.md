# Development Guide

## Technology stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** + **Radix UI** primitives
- **better-sqlite3** for local auth/preferences data
- **jsonwebtoken** / **jose** for JWT session auth (Node and edge runtimes
  respectively)
- **Electron** for optional desktop packaging
- **next-swagger-doc** / **swagger-ui-dist** for the generated `/docs` API
  reference

## Repository layout

```
src/
  app/            Next.js App Router pages and API routes (src/app/api/**)
  components/     React components (DataTable, modals, host-grouped view, ...)
  lib/
    auth/         JWT + session handling, auth SQLite DB
    data/         Dataset registry, BTClientDataAPI client, data-source health
    db/           SQLite connection helper (auth/preferences)
    preferences/  User preferences SQLite access
  proxy.ts        Global auth enforcement (edge middleware)
  types/          Shared data/preferences types
scripts/          DB init/migrate/seed, docs generation, packaging scripts
electron-app/     Electron shell for desktop builds
docs/             Project, architecture, and DbC-process documentation (this system)
tasks/            DbC task lifecycle (proposed -> approved -> in-progress -> review -> completed)
```

## Setup and commands

```bash
npm install
cp .env.example .env.local   # or edit .env directly; see below
npm run auth:init            # initialize the auth SQLite database
npm run dev                  # http://localhost:6030
```

Key scripts (see `package.json` for the full list):

- `npm run dev` / `npm run build` / `npm run start` — standard Next.js
  lifecycle (port 6030).
- `npm run lint` — ESLint with Next.js core-web-vitals rules.
- `npm run db:init` / `db:migrate` / `db:seed` — local SQLite setup.
- `npm run auth:init`, `npm run preferences:init` — initialize the
  auth/preferences SQLite databases.
- `npm run users -- add <name> --role admin` — provision a user (no admin UI
  yet).
- `npm run docs:generate` — regenerate the Swagger/OpenAPI docs from
  `@swagger` JSDoc annotations on `src/app/api/**/route.ts` handlers (runs
  automatically as part of `npm run build`).
- `npm run electron:start` / `electron:build` / `build:all` — desktop
  packaging.

Relevant environment variables (see `.env`):

- `DATA_API_BASE_URL` — the BTClientDataAPI instance this app reads/writes
  client-infrastructure data through; see `docs/ARCHITECTURE.md`.
- `JWT_SECRET`, `JWT_EXPIRES_IN`, `AUTH_DB_PATH`, `DISABLE_AUTH` — auth
  configuration.
- `FALLBACK_ADMIN_USERNAME` / `FALLBACK_ADMIN_PASSWORD` — break-glass admin;
  unset to disable.

## Coding conventions

- TypeScript throughout; prefer explicit types on exported functions and
  public data shapes (see `src/lib/data/silver-datasets.ts` for the existing
  style of typed dataset definitions).
- New API routes are protected by `src/proxy.ts` automatically — do not add
  per-route auth checks; add an entry to `PUBLIC_PATHS` in `src/proxy.ts`
  only when a route genuinely needs to be public.
- Annotate new/changed API routes with `@swagger` JSDoc comments so
  `npm run docs:generate` picks them up.
- When adding or changing a client-infrastructure dataset, update its
  `DATASETS` entry (`src/lib/data/silver-datasets.ts`) — the API table name,
  the field mapping, and which fields are numeric.

## Testing philosophy

No automated test suite exists yet. Validate changes by:

- Running `npm run lint` and `npx tsc --noEmit` (or equivalent) for type
  safety.
- Exercising the affected dataset(s) through the dashboard UI in the browser,
  including the golden path and at least one edit/create/archive action.
- For data-source changes, checking `/api/health` (backed by
  `src/lib/data/registry.ts`) to confirm the relevant source reports `ok`.

Document required test levels here as they are established (e.g. if/when
integration or unit tests are introduced).

## Security and privacy

- Client datasets contain credentials (server/router logins, admin
  passwords, VPN credentials). Never log full row contents; mask passwords in
  UI and avoid writing them to error messages.
- `JWT_SECRET` and the break-glass admin credentials live only in `.env`
  (never commit real values); `DISABLE_AUTH=true` must never be set outside
  local development.
- BTClientDataAPI is reached over plain HTTP inside the corporate firewall;
  treat that boundary as trusted-network-only, not internet-facing.
