# TASK-004: Recalibrate the dark theme around a black base

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

Make dark mode substantially darker, using actual black for the application
canvas and a restrained set of near-black surfaces, borders, overlays, and
muted colors that remain readable and visually distinct.

## Scope

### Included

- Recalibrate semantic dark-theme variables around a `#000` base.
- Give CDMS dashboard surfaces, controls, borders, and overlays a consistent
  near-black hierarchy.
- Normalize legacy Tailwind gray utilities through a shared theme palette so
  tables, dialogs, reports, and authentication views match the dashboard.
- Preserve light-theme colors and application behavior.
- Add a focused regression check for the dark palette and run production
  validation.

### Excluded

- Layout, interaction, category, or data changes.
- Removing the light theme or changing browser-local theme persistence.
- Reworking semantic status colors beyond the contrast adjustments supplied
  by their existing opacity-based treatments.

## Acceptance criteria

- [x] The dark application background is actual black.
- [x] Panels, inputs, menus, dialogs, and table surfaces use distinguishable
      near-black layers rather than blue-gray backgrounds.
- [x] Dark borders, primary text, muted text, and accent states retain clear
      contrast.
- [x] Legacy Tailwind-based surfaces share the same dark palette.
- [x] Light mode remains unchanged.
- [x] `npm run validate` succeeds.

## Validation requirements

- Focused automated theme-token regression test.
- `npm run validate`.
- `git diff --check`.

## Risks and assumptions

- Existing status colors continue to identify warnings, errors, and active
  records; only their surrounding neutral palette is being recalibrated.
- A shared variable-backed gray scale is preferable to duplicating dark color
  replacements across individual components.

## Blocker

None.

## Implementation handoff

Task: TASK-004: Recalibrate the dark theme around a black base
Implementer: Codex
Date: 2026-10-05

### Changes made

- Changed the dark semantic canvas and Tailwind `gray-900` surface to actual
  black.
- Recalibrated cards, popovers, secondary surfaces, inputs, borders, text,
  muted text, rings, and destructive surfaces around a neutral near-black
  palette.
- Changed the CDMS workspace to a `#000` canvas with a `#08090c` primary
  surface, neutral borders, brighter foreground text, and a slightly lifted
  cyan accent.
- Defined the Tailwind gray scale through shared RGB variables so legacy
  utility-based tables, dialogs, reports, login fields, and other controls
  consume the same palette without component-by-component color duplication.
- Added a missing `gray-750` shade used by an existing hover state.
- Increased dark-mode dialog scrims to 70-75% black while preserving their
  existing light-mode opacity.
- Added a regression test for the black canvas, near-black surface, and shared
  Tailwind palette wiring.

### Validation performed

- `npm run validate`: pass.
  - ESLint: pass with zero warnings.
  - Automated tests: 12/12 pass.
  - TypeScript: pass.
  - Next.js production build: pass; all 34 pages generated.
- `git diff --check`: pass (only expected Git line-ending notices).

### Assumptions and deviations

- Light-theme values were retained at their existing Tailwind and CDMS colors.
- Existing semantic status hues remain unchanged; their black-based neutral
  surroundings and existing transparency continue to provide differentiation.
- No interaction, persistence, layout, or data behavior was changed.

### Unresolved risks

- Visual tuning is inherently display-dependent. The palette has been checked
  structurally and through the production build, but may benefit from minor
  brightness adjustments after normal use on the target monitors.

### Documentation updated

- Added this task record and implementation handoff.

## Review

Not independently reviewed.

## Human acceptance

Pending.
