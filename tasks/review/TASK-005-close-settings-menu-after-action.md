# TASK-005: Close the settings menu after an action

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

Dismiss the header settings dropdown after the user chooses an option.

## Scope

### Included

- Close the menu after selecting Light, Dark, or System theme.
- Preserve the existing close behavior for Reset Overview, Logout, and
  outside clicks.
- Add a focused regression check and run production validation.

### Excluded

- Redesigning the dropdown or changing theme persistence.

## Acceptance criteria

- [x] Every actionable settings-menu option closes the menu after activation.
- [x] The selected action still executes normally.
- [x] `npm run validate` succeeds.

## Validation requirements

- Focused automated regression check.
- `npm run validate`.
- `git diff --check`.

## Risks and assumptions

- The version label is informational and is not expected to close the menu.

## Blocker

None.

## Implementation handoff

Task: TASK-005: Close the settings menu after an action
Implementer: Codex
Date: 2026-10-05

### Changes made

- Added one theme-selection handler that applies the selected theme and then
  closes the header settings dropdown.
- Routed Light, Dark, and System through the shared handler.
- Preserved the existing dismissal behavior for Reset Overview, Logout, and
  outside clicks.
- Added a regression check covering all three theme actions and the shared
  close behavior.

### Validation performed

- `npm run validate`: pass.
  - ESLint: pass with zero warnings.
  - Automated tests: 13/13 pass.
  - TypeScript: pass.
  - Next.js production build: pass; all 34 pages generated.
- `git diff --check`: pass (only expected Git line-ending notices).

### Assumptions and deviations

- The version label remains non-interactive and therefore does not dismiss the
  menu.
- No theme persistence or visual behavior was changed.

### Unresolved risks

None identified.

### Documentation updated

- Added this task record and implementation handoff.

## Review

Not independently reviewed.

## Human acceptance

Pending.
