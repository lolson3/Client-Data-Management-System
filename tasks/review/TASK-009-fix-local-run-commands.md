# TASK-009: Fix local build and server commands

Owner role: Human
Assigned agent: Codex
Proposed by: Leif
Proposed date: 2026-10-14
Approved by: Leif
Approved date: 2026-10-14
Related contracts: None
Related ADRs: None
Dependencies: TASK-008 beta frontend alignment

## Desired outcome

Make `npm run build`, `npm run dev`, and `npm start` usable for local beta
validation without requiring a Google Fonts network request during compilation.

## Scope

### Included

- Remove the build-time Google Fonts dependency while retaining a clean sans
  serif UI font stack.
- Add regression coverage for offline-compatible root layout styling.
- Validate production build, development startup, and standalone startup.
- Document environment-specific failures and any remaining prerequisites.

### Excluded

- Redesigning typography.
- Changing deployment infrastructure or authentication policy.
- Deploying the application.

## Acceptance criteria

- [x] `npm run build` succeeds without downloading Google Fonts.
- [x] `npm run dev` starts and serves the application locally.
- [x] `npm start` starts the generated standalone application.
- [x] Existing tests, lint, and type checking pass.

## Validation requirements

- `npm test`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- Start and probe both development and standalone servers.

## Risks and assumptions

- The default Tailwind sans stack is an acceptable local replacement for Inter.
- Production authentication still requires a valid `JWT_SECRET` unless
  explicitly disabled for local testing.

## Blocker

None.

## Implementation handoff

Task: TASK-009: Fix local build and server commands
Implementer: Codex
Date: 2026-10-14

### Changes made

- Removed the `next/font/google` Inter import from the root layout, eliminating
  the build-time request to `fonts.googleapis.com`.
- Applied Tailwind's local `font-sans` stack to the document body so typography
  remains sans serif without a downloaded asset.
- Added a regression assertion that rejects a Google font import in the root
  layout and requires the local sans class.

### Validation performed

- `npm test`: 21 passed, 0 failed.
- `npm run lint`: passed with no diagnostics.
- `npx tsc --noEmit`: passed with no diagnostics.
- `npm run build`: completed successfully, including all 34 generated pages.
- `npm run dev`: reached ready state on port 6030; `GET /login` returned 200.
- `npm start`: generated standalone server reached ready state on port 6030;
  `GET /login` returned 200.

### Acceptance criteria evidence

- The successful production build was performed in the same environment where
  the prior build failed fetching Inter from Google.
- Both development and standalone servers were exercised over HTTP rather than
  validated only from startup output.

### Assumptions and deviations

- Tailwind's platform-native sans stack replaces Inter. No layout or component
  organization was changed.
- Server startup used the repository's existing `.env.local` configuration.

### Unresolved risks

- The startup data-source precheck reports `DATA_API_BASE_URL` is not
  configured. This does not prevent the application from starting, but the
  external client datasets will be unavailable until it is configured.
- Production authentication still requires a non-default `JWT_SECRET` of at
  least 32 characters.

### Documentation updated

- No durable documentation change was needed; the source no longer has an
  external font prerequisite.

## Review

Not reviewed.

## Human acceptance

Pending.
