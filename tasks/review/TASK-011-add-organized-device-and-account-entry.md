# TASK-011: Add organized device and account entry

Owner role: Human
Assigned agent: Codex
Proposed by: Leif
Proposed date: 2026-10-15
Approved by: Leif
Approved date: 2026-10-15
Related contracts: None
Related ADRs: None
Dependencies: TASK-010 device category classification

## Desired outcome

Provide Add New actions for Network Devices, Cameras & Security, and Accounts &
Access while requiring enough explicit type information to organize new records
and continuing to classify legacy records safely.

## Context

The redesigned aggregate categories omitted entry actions for these sections.
Core and camera Device Type fields also exist upstream but are absent from the
frontend adapter. Legacy device records still require lightweight deterministic
inference when explicit type information is missing.

## Scope

### Included

- Add entry actions and forms for Network Devices, Cameras & Security, and
  Accounts & Access.
- Require controlled type selections for new device, core, camera, and account
  records.
- Route aggregate account submissions to their existing source datasets.
- Restore missing core/camera Device Type mappings.
- Add classification confidence/basis metadata for legacy device organization
  and visibly flag unclassified records in All Devices.
- Add regression coverage and run production validation.

### Excluded

- Adding or changing BTClientDataAPI tables or columns.
- Bulk rewriting legacy records.
- Building a separate classification service or machine-learning system.

## Plan

1. Extend the deterministic device organizer with confidence and basis.
2. Restore type mappings and require controlled type selections in forms.
3. Add category entry actions and map aggregate account types to existing
   datasets.
4. Add focused tests and run full validation.

## Acceptance criteria

- [x] Network Devices and Cameras & Security expose working Add New actions.
- [x] Accounts & Access exposes an Add New action with a required account type.
- [x] New device and camera records require an explicit controlled type.
- [x] Core and camera Device Type values round-trip through the API adapter.
- [x] New aggregate account records are saved to the correct source dataset.
- [x] Legacy device organization reports explicit, inferred, or needs-review
      status without hiding unknown records.
- [x] Automated and production validation pass.

## Validation requirements

- Focused organization, form, routing, and mapping regression tests.
- `npm run validate`.
- `git diff --check`.

## Risks and assumptions

- Existing source datasets remain the systems of record for aggregate account
  types; no generic accounts table is introduced.
- Unknown legacy devices remain in All Devices and are marked for review rather
  than aggressively guessed into a category.

## Blocker

None.

## Implementation handoff

Implementer: Codex
Date: 2026-10-15

### Changes made

- Added category-level Add New actions and controlled type selectors for Network
  Devices, Cameras & Security, and Accounts & Access.
- Routed aggregate account entry to the existing account source datasets and
  retained source-specific required-field validation.
- Restored core and camera Device Type mappings and required explicit types for
  new device records.
- Added deterministic legacy organization metadata (`explicit`, `inferred`, or
  `needs review`) and kept unknown records visible in All Devices.
- Added regression coverage for form structure, type mapping, account routing,
  and legacy classification.

### Validation performed

- `npm run validate`: passed (lint, 27 tests, TypeScript, and production build
  with 34 generated routes).
- `git diff --check`: passed; Git reported only expected LF-to-CRLF checkout
  notices.

### Acceptance criteria evidence

- Structural tests verify each category action and required type field.
- Transformation tests verify all supported account routes and device
  organization confidence states.
- The production build verifies the updated dashboard compiles and renders.

### Assumptions and deviations

- Existing datasets remain the systems of record; no backend schema was added.
- Resource is required only for account types whose destination schema needs it.
- No deviations from the approved scope.

### Unresolved risks

- Unseen legacy naming patterns may remain marked `Needs review`; this is
  intentional to avoid silently misclassifying records.
- No live BTClientDataAPI write smoke test was performed in this workspace.

### Documentation updated

- This task contains the implementation and validation record. No architecture
  or contract behavior changed.

## Review

Not reviewed.

## Human acceptance

Pending.
