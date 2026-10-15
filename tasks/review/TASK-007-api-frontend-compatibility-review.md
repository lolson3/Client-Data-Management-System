# TASK-007: Review API and frontend compatibility

Owner role: Human
Assigned agent: Codex
Proposed by: Leif
Proposed date: 2026-10-14
Approved by: Leif
Approved date: 2026-10-14
Related contracts: None
Related ADRs: None
Dependencies: `docs/API_REFERENCE.md` and the current frontend implementation

## Desired outcome

Produce a durable review of discrepancies between the screenshot-derived CDMS
API reference, the implemented API routes, and the updated frontend's actual
integration behavior.

## Context

The API reference now documents the operations shown in the supplied Swagger
screenshots. The current dashboard uses additional endpoints and combines some
API calls into higher-level user actions, so compatibility and documentation
coverage must be checked explicitly.

## Scope

### Included

- Inventory frontend API calls and compare them with `docs/API_REFERENCE.md`.
- Verify request and response assumptions against current route implementations.
- Identify behavior that can fail or behave unexpectedly in the updated UI.
- Rank findings by impact and recommend narrowly scoped corrections.
- Record confirmed-compatible areas to distinguish gaps from working behavior.

### Excluded

- Implementing fixes.
- Changing API routes, frontend behavior, or the existing API reference.
- Live testing against the external BTClientDataAPI deployment.

## Plan

1. Trace frontend API calls, authentication, preferences, data loading, and
   mutation flows.
2. Compare each relevant contract assumption with the API reference and route
   source.
3. Run available non-destructive validation.
4. Write a Markdown compatibility review with prioritized findings.

## Acceptance criteria

- [x] The review distinguishes runtime incompatibilities from documentation
      omissions and low-risk differences.
- [x] Each finding includes evidence, impact, and a recommended direction.
- [x] The review covers authentication, preferences, client data, mutations,
      and the recently updated frontend behavior.
- [x] Confirmed-compatible integrations are recorded.
- [x] No application behavior is changed.

## Validation requirements

- Run the existing automated tests.
- Cross-check cited frontend and route code locations.
- Review the final report and Git status.

## Risks and assumptions

- Static analysis can establish request/response compatibility but cannot prove
  availability or schema contents of the separately deployed BTClientDataAPI.
- The direct human request is the approval and assignment authority for this
  documentation task, so it begins in `in-progress/`.

## Blocker

None.

## Implementation handoff

Task: TASK-007: Review API and frontend compatibility
Implementer: Codex
Date: 2026-10-14

### Changes made

- Added `docs/API_FRONTEND_COMPATIBILITY_REVIEW.md` with a static audit of the
  API reference, route implementations, current frontend integration, and
  pending visual frontend changes.
- Recorded seven prioritized findings with evidence, user impact, and
  recommended remediation.
- Distinguished two high-impact runtime issues from documentation gaps,
  workflow risks, and conditional low-risk differences.
- Recorded ten frontend-used operations that match their implemented contracts
  and confirmed that the pending theme/menu edits do not alter API payloads.

### Validation performed

- Traced all literal `/api/` call sites in `src/` and reviewed the consuming
  response logic.
- Compared the relevant calls with `docs/API_REFERENCE.md`, `src/proxy.ts`, and
  their route handlers.
- Counted 31 distinct method/path operations used by the frontend, of which 21
  are absent from the screenshot-scoped API reference.
- `npm test`: 13 passed, 0 failed.
- `npx tsc --noEmit`: passed with no diagnostics.
- `git diff --no-index --check NUL
  docs/API_FRONTEND_COMPATIBILITY_REVIEW.md`: no whitespace errors (only the
  repository's LF-to-CRLF working-copy warning).

### Acceptance criteria evidence

- Each finding is explicitly labeled by severity and type, then provides
  evidence, impact, and a recommended direction.
- The report covers session-cookie authentication, preference reads/writes,
  bulk client-data loads, company and phone mutations, mutable-row identifiers,
  theme persistence, and client-abbreviation encoding.
- A dedicated confirmed-compatible section records the working integrations.
- Only the review document and task lifecycle record were added; no application
  source or behavior was changed by this task.

### Assumptions and deviations

- Static analysis was sufficient to confirm frontend-to-CDMS route contracts.
- Live calls to BTClientDataAPI were not made because availability and
  production data verification are outside the assigned review scope.
- The screenshot-derived API reference remains intentionally unchanged; this
  task documents its coverage gaps rather than silently expanding it.

### Unresolved risks

- Existing tests do not exercise HTTP integration, preference persistence,
  session expiry, per-dataset failures, or partial company saves. The green
  test suite therefore does not invalidate the runtime findings.
- External BTClientDataAPI behavior was not tested.

### Documentation updated

- Added `docs/API_FRONTEND_COMPATIBILITY_REVIEW.md`.

## Review

Not reviewed.

## Human acceptance

Pending.
