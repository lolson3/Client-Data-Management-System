# TASK-008: Align frontend API integration for beta deployment

Owner role: Human
Assigned agent: Codex
Proposed by: Leif
Proposed date: 2026-10-14
Approved by: Leif
Approved date: 2026-10-14
Related contracts: None
Related ADRs: None
Dependencies: TASK-007 compatibility review

## Desired outcome

Preserve the redesigned frontend while making its browser-local preferences,
authentication failure handling, reads, and writes reliable enough for a beta
deployment.

## Context

TASK-007 found that preference writes were gated on a nonexistent local-storage
token and that failed API reads could appear as empty datasets. The human has
decided preferences should remain browser-local rather than account-scoped.

## Scope

### Included

- Make theme, selected-client, sort, and layout preferences explicitly
  browser-local.
- Remove frontend reads and writes to the account preference API.
- Add consistent same-origin JSON response handling for frontend API calls.
- Redirect to login on authenticated API `401` responses.
- Surface failed client and dataset loads instead of treating them as empty
  data.
- Preserve successful data when independent dataset requests fail where
  practical.
- Encode client values used in query strings and dynamic paths.
- Harden mutation response handling without redesigning the UI.
- Add automated coverage for the integration behavior.
- Run validation appropriate for a beta deployment and update durable docs.

### Excluded

- Changes to BTClientDataAPI.
- Transactional company/phone backend work.
- Removing the existing preferences API routes, which may still serve other
  clients.
- Visual redesign or changes to dashboard organization.
- Production deployment itself.

## Plan

1. Extract or add a small frontend API response helper.
2. Convert browser preference code to local-only behavior.
3. Harden initial auth/client loading and parallel dataset loading.
4. Harden mutation calls and encode dynamic client values.
5. Add focused tests and update integration documentation.
6. Run tests, lint, type checking, docs generation/build, and review the diff.

## Acceptance criteria

- [x] No frontend preference path depends on a bearer token or the preferences
      API.
- [x] Theme, selected client, sort settings, and layout continue to persist in
      the current browser.
- [x] Authenticated API `401` responses route the user to login instead of
      displaying empty data.
- [x] Failed dataset requests produce visible error information and do not
      silently masquerade as empty data.
- [x] One failed dataset does not erase successful independent dataset results.
- [x] Client identifiers are URL-encoded in query and path construction.
- [x] Existing add, edit, archive, company, misc, WHOIS, and logout flows retain
      their request shapes and handle non-success responses consistently.
- [x] Existing frontend organization and visual changes are preserved.
- [x] Relevant automated tests and beta validation pass.

## Validation requirements

- `npm test`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run docs:generate`
- `npm run build`
- Targeted static/integration tests for browser-only preferences, response
  failures, and encoded client URLs.
- Review `git diff --check`, the owned diff, and final status.

## Risks and assumptions

- Browser-local preferences are an intentional product decision; cross-device
  persistence is not required.
- The existing CDMS and BTClientDataAPI mutation contracts remain unchanged.
- Company and phone saves remain a multi-request workflow; this task improves
  error handling but does not make the operation atomic.

## Blocker

None.

## Implementation handoff

Task: TASK-008: Align frontend API integration for beta deployment
Implementer: Codex
Date: 2026-10-14

### Changes made

- Added `src/lib/client-api.ts` as the shared same-origin JSON request layer,
  including structured status/payload errors and consistent API error messages.
- Converted login, session bootstrap, dashboard reads, and dashboard mutations
  to the shared request handling. Authenticated `401` responses now clear the
  cached display user and route to `/login`.
- Removed frontend use of `/api/preferences` and bearer-token checks. Theme,
  selected client, sort settings, and dashboard layout remain in browser
  storage.
- Changed independent client-data reads to settled parallel requests. Successful
  sources remain visible while failed sources produce a retryable dashboard
  warning instead of silently appearing as empty data.
- URL-encoded client identifiers used in query strings and dynamic paths and
  protected overlapping client loads from applying stale responses.
- Added focused request-helper and frontend integration tests.

### Validation performed

- `npm test`: 20 passed, 0 failed.
- `npm run lint`: passed with no diagnostics.
- `npx tsc --noEmit`: passed with no diagnostics.
- `npm run docs:generate`: passed and generated the documented API assets.
- `npm run build`: Next.js production compilation and type checking completed
  successfully; `.next/BUILD_ID` was generated.
- `git diff --check`: no whitespace errors; only expected LF-to-CRLF warnings
  for existing working-copy files.
- Reviewed final status and preserved pre-existing frontend changes unrelated
  to this integration task.

### Acceptance criteria evidence

- Static integration tests assert there are no frontend preference API,
  local-token, or authorization-header dependencies and that local-storage
  reads/writes remain present.
- The shared client helper is tested for successful JSON, structured API
  failures, invalid successful bodies, same-origin credentials, and fallback
  messages.
- Dashboard integration tests assert settled parallel loading, `401` routing,
  encoded client values, and visible partial-load error state.
- Mutation call sites use the same response helper while retaining their prior
  methods, paths, and request bodies.

### Assumptions and deviations

- Browser-local preference persistence is the approved product behavior; the
  retained account preference API is intentionally unused by this frontend.
- The backend and external BTClientDataAPI contracts were not changed.
- Automated beta validation was completed locally. Live authentication and
  representative-data smoke tests remain deployment-environment checks and are
  documented in `docs/BETA_DEPLOYMENT_CHECKLIST.md`.

### Unresolved risks

- Company and phone saves are still a non-atomic multi-request workflow, so a
  later request can fail after the company has already been saved.
- The external BTClientDataAPI and production cookie/TLS configuration were not
  exercised from this local environment.
- Mutable record operations still depend on the existing `_apiId` behavior,
  which is absent from the screenshot-derived public API reference.

### Documentation updated

- Updated `README.md`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`, and
  `docs/PROJECT.md` to describe browser-local UI preferences.
- Updated `docs/API_FRONTEND_COMPATIBILITY_REVIEW.md` with resolution status.
- Added `docs/BETA_DEPLOYMENT_CHECKLIST.md` for deployment configuration and
  live smoke testing.

## Review

Not reviewed.

## Human acceptance

Pending.
