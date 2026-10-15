# TASK-006: Document the CDMS API from reference screenshots

Owner role: Human
Assigned agent: Codex
Proposed by: Leif
Proposed date: 2026-10-14
Approved by: Leif
Approved date: 2026-10-14
Related contracts: None
Related ADRs: None
Dependencies: Reference screenshots in `cdms api/`

## Desired outcome

Provide a consistent Markdown reference for the API shown in the supplied
screenshots without committing the source screenshots.

## Context

The repository contains a local `cdms api/` folder of API screenshots. The
screenshots are reference material for writing durable, text-searchable API
documentation, but should remain local and untracked.

## Scope

### Included

- Review every screenshot in `cdms api/`.
- Create a Markdown API reference under `docs/` using consistent terminology,
  endpoint structure, parameter tables, and response documentation.
- Add the entire `cdms api/` folder to `.gitignore`.
- Check the finished document against the screenshots for completeness and
  internal consistency.

### Excluded

- Changes to application API routes or generated OpenAPI documentation.
- Changes to the external BTClientDataAPI service.
- Committing or modifying the source screenshots.

## Plan

1. Inventory and inspect the reference screenshots.
2. Transcribe and normalize the documented endpoints and data shapes.
3. Add the Markdown reference and ignore the screenshot folder.
4. Validate coverage, formatting, links, and the resulting Git diff.

## Acceptance criteria

- [x] Every supplied screenshot has been reviewed and represented in the API
      documentation where it contains unique information.
- [x] Endpoint documentation uses a consistent format and preserves concrete
      paths, methods, parameters, and examples visible in the screenshots.
- [x] Unclear or absent source details are identified instead of invented.
- [x] `/cdms api/` is ignored by Git.
- [x] Unrelated working-tree changes remain untouched.

## Validation requirements

- Compare the Markdown document against all screenshots.
- Review `git diff --check`, `git diff`, and `git status --short`.

## Risks and assumptions

- The screenshots are treated as the authoritative source for this document.
- Some screenshot text may be clipped or ambiguous; such limitations will be
  called out explicitly rather than filled in speculatively.
- The direct human request is the approval and assignment authority for this
  task, so the task begins in `in-progress/`.

## Blocker

None.

## Implementation handoff

Task: TASK-006: Document the CDMS API from reference screenshots
Implementer: Codex
Date: 2026-10-14

### Changes made

- Added `docs/API_REFERENCE.md`, covering all 14 operations and both schemas
  represented across the 15 supplied screenshots.
- Used a consistent endpoint format with purpose, authentication, parameters,
  JSON examples, and response-status tables.
- Cross-checked cropped or abbreviated screenshot details against the generated
  OpenAPI document and the corresponding route implementations.
- Documented that `/api/health` is public in the implementation despite the
  lock shown in the captured Swagger UI.
- Added `/cdms api/` to `.gitignore`; the screenshots remain local and
  untracked.

### Validation performed

- Visually reviewed all 15 PNG screenshots in `cdms api/`.
- Compared the document against all 14 method/path operations in
  `public/openapi.json`: 14 documented, none missing.
- Confirmed the document's 40 fenced-code delimiters are balanced and that it
  contains no trailing whitespace.
- Ran `git diff --check -- .gitignore`: no whitespace errors (only the
  repository's expected LF-to-CRLF working-copy warning).
- Ran `git status --short --untracked-files=all`: `cdms api/` and its files no
  longer appear, while pre-existing unrelated changes remain present.

### Acceptance criteria evidence

- The endpoint summary and detailed sections include authentication (3),
  system (2), data (3), preferences (5), and tools (1) operations, matching the
  screenshot/OpenAPI inventory.
- The `User` and `Company` schema sections capture the two schema cards shown
  in the screenshots.
- Every detailed endpoint section uses the same method/path heading style and
  response table structure.
- The root-anchored `/cdms api/` ignore rule excludes the entire reference
  folder without broadening to similarly named folders elsewhere.

### Assumptions and deviations

- The screenshots defined the documentation scope. Route source was consulted
  only to recover cropped details and ensure the durable reference reflects
  actual response bodies.
- The current implementation, rather than the Swagger lock icon, was treated
  as authoritative for `/api/health` authentication.
- No application routes or generated OpenAPI artifacts were changed.

### Unresolved risks

- `docs/API_REFERENCE.md` is a manually maintained companion to the generated
  OpenAPI reference and can drift unless updated alongside route annotations.
- The generated OpenAPI definition still marks `/api/health` with inherited
  cookie security even though the proxy exposes it publicly; correcting that
  generator/annotation mismatch is outside this documentation-only task.

### Documentation updated

- Added `docs/API_REFERENCE.md`.

## Review

Not reviewed.

## Human acceptance

Pending.
