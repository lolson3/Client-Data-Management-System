# TASK-010: Fix device category classification

Owner role: Human
Assigned agent: Codex
Proposed by: Leif
Proposed date: 2026-10-15
Approved by: Leif
Approved date: 2026-10-15
Related contracts: None
Related ADRs: None
Dependencies: TASK-008 beta frontend alignment

## Desired outcome

Ensure device records appear in the redesigned category that matches their
actual type instead of treating every row from the devices API as Print & Scan.

## Context

Production data currently places network and server records such as an HP
ProCurve switch, PowerBIServer, and ESET Inspect Server in Print & Scan. The
redesign currently assigns the entire devices dataset to that category and the
API adapter omits the dataset's Device Type field.

## Scope

### Included

- Restore the devices API mapping for Device Type.
- Classify network, server, and print/scan records consistently across relevant
  source datasets, with safe inference from names/grouping for legacy rows.
- Route classified records to Network Devices, Servers & Directory, or Print &
  Scan while preserving source-aware edits, notes, and archival behavior.
- Add focused regression coverage and run production validation.

### Excluded

- Changing BTClientDataAPI data or schemas.
- Reorganizing unrelated dashboard categories.
- Automatically rewriting existing records.

## Plan

1. Add a shared device-category classifier and restore the missing field map.
2. Apply it to the derived dashboard categories and source-aware mutations.
3. Add regression tests for the reported examples and representative print
   devices.
4. Run full validation and record the handoff.

## Acceptance criteria

- [x] Switches, routers, firewalls, and related network appliances appear in
      Network Devices even when sourced from the devices dataset.
- [x] Server-named/type records do not appear in Print & Scan and are available
      in Servers & Directory.
- [x] Print & Scan contains only printer/scanner/MFP-style records.
- [x] Device Type is preserved from the devices API response.
- [x] Derived record mutations target their original dataset.
- [x] Automated and production validation pass.

## Validation requirements

- Focused classifier and mapping tests.
- `npm run validate`.
- `git diff --check`.

## Risks and assumptions

- Explicit Device Type values take priority; legacy rows without a type may be
  inferred from Name, Grouping, description, and note fields.
- Unrecognized devices remain visible in All Devices rather than being
  mislabeled as Print & Scan.

## Blocker

None.

## Implementation handoff

Task: TASK-010: Fix device category classification
Implementer: Codex
Date: 2026-10-15

### Changes made

- Restored the `device_type` to `Device Type` mapping for the devices API.
- Added a shared classifier that prioritizes explicit device types and falls
  back to legacy name, grouping, description, note, and machine-name fields.
- Restricted Print & Scan to printer/scanner/MFP-style records.
- Included network-classified devices-table rows in Network Devices and
  server-classified rows in Servers & Directory.
- Preserved original dataset metadata so derived notes, edits, and archival
  operations target `devices`, `core`, or `externalInfo` correctly.
- Kept unrecognized records visible in All Devices under Other Devices.

### Validation performed

- `npm run validate`: pass.
  - ESLint: pass with zero warnings.
  - Automated tests: 24/24 pass.
  - TypeScript: pass.
  - Next.js production build: pass; all 34 pages generated.
- `git diff --check`: pass (only expected LF-to-CRLF notices).
- Focused tests cover HP Pro Curve switch, PowerBIServer, ESET Inspect Server,
  explicit firewall/server/printer types, scanner grouping, unknown devices,
  and the devices API field mapping.

### Assumptions and deviations

- Explicit Device Type values are authoritative. Text inference exists for
  legacy rows whose type was previously absent from the frontend mapping.
- Unknown device types are not guessed into Print & Scan; they remain visible
  through All Devices.
- No production data or BTClientDataAPI schema was changed.

### Unresolved risks

- Previously unseen device terminology may initially fall under Other Devices
  until its explicit Device Type or classifier vocabulary is updated.

### Documentation updated

- Added this task record and implementation handoff.

## Review

Not reviewed.

## Human acceptance

Pending.
