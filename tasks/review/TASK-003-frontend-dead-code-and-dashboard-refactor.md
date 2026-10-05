# TASK-003: Remove frontend dead code and refactor the dashboard

Owner role: Human
Assigned agent: Codex
Proposed by: Human
Proposed date: 2026-10-05
Approved by: Human
Approved date: 2026-10-05
Related contracts: None
Related ADRs: None
Dependencies: None

## Desired outcome

Remove confirmed remnants of the prior frontend, split the dashboard monolith
into coherent reusable components and modules, and preserve the behavior and
visual integrity of the current dashboard.

## Scope

### Included

- Audit dashboard state, functions, render paths, components, and dependencies
  for dead or unreachable frontend code.
- Remove confirmed dead components, functions, state, render paths, and stale
  frontend fields.
- Extract cohesive dashboard configuration and UI sections into focused React
  components or supporting modules where doing so reduces duplication and
  clarifies ownership.
- Preserve intentional saved-layout migration behavior.
- Validate lint, automated tests, TypeScript, and the production build after
  cleanup.
- Add or update focused tests where extraction exposes testable behavior.

### Excluded

- Product behavior redesign.
- Data-source or BTClientDataAPI schema changes.
- Removal of compatibility translation required by the live API.
- Visual changes beyond those necessary to eliminate stale UI remnants or
  preserve consistency during extraction.

## Acceptance criteria

- [x] Confirmed unreachable dashboard render paths and unused frontend
      components are removed.
- [x] The dashboard page is materially smaller and delegates cohesive sections
      to clearly named modules/components.
- [x] Current sidebar, overview, search, contacts, categories, reports, notes,
      add/edit/archive, theme, and saved-layout behavior remain intact.
- [x] Stale `Cell` UI remnants are removed without changing the backing API
      schema.
- [x] `npm run validate` succeeds.
- [x] A post-refactor integrity review finds no broken imports, unreachable
      navigation targets, or missing active modal surfaces.

## Validation requirements

- `npm run validate`
- Static navigation/modal reachability audit
- Targeted tests for any extracted pure dashboard behavior
- Read-only browser/API smoke test when the local runtime is available

## Risks and assumptions

- Saved browser layouts may contain old panel identifiers, so layout migration
  logic is intentional until a separately approved migration policy removes it.
- Some legacy-shaped field names are API translation concerns rather than dead
  frontend code and must remain where the live API requires them.

## Blocker

None.

## Implementation handoff

Task: TASK-003: Remove frontend dead code and refactor the dashboard
Implementer: Codex
Date: 2026-10-05

### Changes made

- Reduced `src/app/dashboard/page.tsx` from 4,129 lines to 1,935 lines and
  extracted cohesive dashboard concerns into focused modules:
  - header and contact/client controls;
  - sidebar navigation and search;
  - overview workspace rendering;
  - category modal surfaces;
  - reports;
  - add/update record dialogs;
  - dashboard configuration, icons, and record transforms.
- Replaced fifteen separately rendered add-record modals with one
  configuration-driven dialog surface.
- Removed unreachable Core Infrastructure, Workstations + Users, External
  Info, Admin Credentials, and Acronis Detail modal implementations, along
  with their orphaned filters, edit handlers, sort defaults, add forms, and
  overview `modal` metadata.
- Removed the permanently hidden legacy quick-navigation header block.
- Removed stale Cell and Asset ID UI fields while leaving the API translation
  layer unchanged.
- Removed unused `ThemeToggle`, generic `components/ui` primitives,
  `src/lib/utils.ts`, and the unused legacy `src/types/data.ts` type catalog.
- Removed sixteen direct packages used only by deleted frontend code; npm
  pruned 113 transitive packages and updated the lockfile.
- Removed five unused CDMS CSS selectors.
- Added frontend structure tests covering sidebar/modal reachability, removed
  surface regression guards, and extracted record-transform behavior.
- Fixed two strict unused-parameter findings exposed by the audit.

### Validation performed

- `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`: pass.
- `npm run validate`: pass.
  - ESLint: pass with zero warnings.
  - Automated tests: 11/11 pass.
  - TypeScript: pass.
  - Next.js production build: pass; all 34 pages generated.
- `git diff --check`: pass (only expected Git line-ending notices).
- Runtime smoke test against a temporary production server on port 6042:
  - data-source startup precheck: 3/3 healthy;
  - `/dashboard`: HTTP 200;
  - `/api/health`: HTTP 200;
  - `/api/data/clients`: HTTP 200;
  - `/api/data/core?client=BT`: HTTP 200.
- No write operations were sent to BTClientDataAPI during smoke testing.

### Assumptions and deviations

- Retained the saved-layout migration for old overview panel identifiers so
  browser-local layouts continue to upgrade safely.
- Retained legacy-shaped field names in the API translation layer because
  they are part of the current BTClientDataAPI integration rather than dead
  frontend code.
- No product behavior or category organization was intentionally changed.

### Unresolved risks

- npm reports 39 dependency advisories in the remaining dependency tree. They
  predate this refactor and were not auto-fixed because dependency security
  upgrades can be breaking and require a separately scoped review.
- The dashboard page remains the controller for data loading, normalization,
  persistence, and overview interactions. Its render concerns are now split
  into focused components, but a future typed data-hook extraction could
  reduce the remaining controller further without changing UI behavior.

### Documentation updated

- Added this task record and implementation handoff.

## Review

Not independently reviewed.
