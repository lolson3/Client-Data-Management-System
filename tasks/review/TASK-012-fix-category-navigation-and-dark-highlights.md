# TASK-012: Fix category navigation and dark highlights

Owner role: Human
Assigned agent: Codex
Proposed by: Leif
Proposed date: 2026-10-15
Approved by: Leif
Approved date: 2026-10-15
Related contracts: None
Related ADRs: None
Dependencies: TASK-008 beta frontend API alignment

## Desired outcome

Category navigation reliably replaces the overview with the selected data view,
and dark mode uses lighter, consistent red, green, and blue highlights.

## Context

The category portal currently looks up a host that is first mounted during the
same render as a navigation change. The lookup can therefore return null and
leave the main workspace blank. Dark-mode row and header action tints are also
darker than desired.

## Scope

### Included

- Keep the dashboard category portal host mounted across overview/category
  transitions.
- Add regression coverage for the stable host composition.
- Lighten active and inactive row highlights in dark mode.
- Reuse the lighter green treatment for Guacamole and use an equivalent lighter
  blue treatment for Contact in dark mode.
- Run full production validation.

### Excluded

- Navigation routing or URL changes.
- Redesigning the broader light or dark theme.
- Changes to category data behavior.

## Plan

1. Make the category content host persistent and conditionally show the overview.
2. Centralize semantic highlight colors and add dark-mode variants.
3. Add focused structural/style regression checks and validate the application.

## Acceptance criteria

- [x] Selecting any category from Overview renders into an already-mounted host.
- [x] Returning to Overview restores the overview workspace.
- [x] Dark-mode active/inactive row highlights are lighter but remain legible.
- [x] Dark-mode Guacamole and Contact buttons use matching green and lighter-blue
      semantic treatments.
- [x] Automated and production validation pass.

## Validation requirements

- Focused dashboard composition and theme regression tests.
- `npm run validate`.
- `git diff --check`.

## Risks and assumptions

- Category surfaces remain in-page portals rather than URL-routed pages.
- Lighter means a modest increase in tint and brighter semantic colors while
  retaining the black-based dark theme.

## Blocker

None.

## Implementation handoff

Implementer: Codex
Date: 2026-10-15

### Changes made

- Moved the category portal host into the persistent dashboard main area so it
  exists before any category navigation state change.
- Rendered the Overview workspace only while no category is selected, restoring
  it normally when the category state is cleared.
- Added shared positive, negative, and informational theme colors with brighter
  dark-mode variants.
- Applied matching dark-mode green treatments to active rows and Guacamole,
  lighter rose treatments to inactive rows, and a lighter blue treatment to
  Contact.
- Added structural regression coverage for the persistent host and semantic
  dark-mode colors.

### Validation performed

- `npm run validate`: passed (lint, 29 tests, TypeScript, and production build
  with 34 generated routes).
- `git diff --check`: passed; Git reported only expected LF-to-CRLF checkout
  notices.

### Acceptance criteria evidence

- The category portal host is always mounted and is shown by category state;
  the Overview workspace is shown by the inverse state.
- Regression tests enforce the host placement and brighter semantic variables.
- The production build verifies the updated composition and CSS compile.

### Assumptions and deviations

- The existing in-page portal navigation model is retained.
- Highlight lightening is limited to dark mode; the light-mode appearance keeps
  its previous tint strengths.
- No deviations from the approved scope.

### Unresolved risks

- No live-browser visual smoke test was available in this workspace; automated
  composition, styling, and production-build checks passed.

### Documentation updated

- This task contains the implementation and validation record. No architecture
  or contract behavior changed.

## Review

Not reviewed.

## Human acceptance

Pending.
