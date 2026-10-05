# TASK-002: Migrate ESLint config so `npm run lint` works again

Owner role: Human
Assigned agent: openai-coder
Proposed by: Claude
Proposed date: 2026-09-04
Approved by: Patrick
Approved date: 09/04/26
Related contracts: None
Related ADRs: None
Dependencies: None

## Desired outcome

`npm run lint` (`next lint`) runs successfully again and actually lints the
codebase, instead of failing immediately.

## Context

Discovered while validating TASK-001: this repo has `eslint` `^9.39.2`
installed (see `package.json`) but still configures it via the legacy
`.eslintrc.json` (`{ "extends": "next/core-web-vitals" }`). ESLint 9 requires
flat config (`eslint.config.js`/`.mjs`) by default and no longer reads
`.eslintrc.json` automatically, so `next lint` fails immediately with:

```
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
```

This means lint has not actually been running — no lint regressions from
recent work have been caught. `eslint-config-next` (`^16.0.10`, already a
dependency) ships flat-config support; this is a config migration, not a
rule/behavior change.

## Scope

### Included

- Replace `.eslintrc.json` with a flat `eslint.config.js` (or `.mjs`) that
  preserves the intent of `next/core-web-vitals` (Next.js's recommended flat
  config setup, per `eslint-config-next` for this installed version).
- Confirm `npm run lint` runs and actually lints (not just exits 0 because
  it's finding zero files).
- Fix or explicitly document any lint findings the now-working linter
  surfaces on the current codebase — don't just silence them to get to a
  clean run.
- Remove `docs/DEVELOPMENT.md`'s note that lint is currently broken once
  fixed.

### Excluded

- Introducing new lint rules or stricter rule sets beyond what
  `next/core-web-vitals` already implies, unless a finding requires it.
- Setting up lint in CI (not currently in scope — no CI pipeline exists yet).

## Plan

1. Add `eslint.config.js` using the flat-config equivalent of
   `next/core-web-vitals` for this Next.js/ESLint version.
2. Remove `.eslintrc.json`.
3. Run `npm run lint`, triage and fix (or consciously accept with reasoning)
   whatever it finds.
4. Update `docs/DEVELOPMENT.md`.

## Acceptance criteria

- [ ] `npm run lint` exits successfully and visibly lints project files
      (confirm by temporarily introducing an obvious lint violation and
      seeing it get flagged, then removing it).
- [ ] `.eslintrc.json` is removed.
- [ ] No new lint errors are left unaddressed without a documented reason.
- [ ] `docs/DEVELOPMENT.md` no longer says lint is broken.

## Validation requirements

- `npm run lint` run against the full repo.
- Spot-check that Next.js-specific rules (e.g. `next/core-web-vitals`'s
  image/link checks) are actually active, not silently dropped in the
  migration.

## Risks and assumptions

- Assumes the flat-config migration is mechanical (config-only) and doesn't
  require touching application code beyond fixing genuine lint findings.

## Blocker

None.

## Implementation handoff

Task: TASK-002: Migrate ESLint config so `npm run lint` works again
Implementer: openai-coder
Date: 2026-09-04

### Changes made

- Added root `eslint.config.js`, directly spreading the native flat-config
  array exported by `eslint-config-next/core-web-vitals` and adding only
  global ignores for generated, gitignored packaging/API-documentation
  artifacts.
- Removed the root `.eslintrc.json`.
- Changed the `lint` package script from removed Next 16 CLI command
  `next lint` to `eslint .`.
- Replaced the flagged raw logo `<img>` in
  `src/components/EasterEggs/TitleEater.tsx:131` with `next/image`, preserving
  its intrinsic aspect ratio and existing display styling.
- Added a narrow `react-hooks/set-state-in-effect` suppression at
  `src/context/ThemeContext.tsx:47`, with an adjacent reason: the local-only
  stored preference must be read after hydration to keep the server render
  stable. No rule was disabled globally.

### Validation performed

- `npm run lint` before migration: exit 1; Next 16 treated `lint` as a
  directory and reported `Invalid project directory provided, no such
  directory: .../lint`.
- `npm run lint` with the native config before project generated-artifact
  ignores: exit 2 after scanning generated distribution/Swagger bundles;
  ESLint's stylish formatter failed with `RangeError: Invalid string length`.
- `npm run lint` after generated-artifact ignores: exit 1 with two genuine
  source findings: `@next/next/no-img-element` at
  `TitleEater.tsx:130` (warning) and `react-hooks/set-state-in-effect` at
  `ThemeContext.tsx:46` (error).
- `npm run lint` after addressing those findings: exit 0, no findings.
- Temporary unused-variable probe in real `TitleEater.tsx`, then
  `npm run lint`: exit 0 with no finding because the installed native config
  does not enable a general unused-variable rule. The probe was reverted and
  no stricter rule was added.
- Temporary raw `<img>` probe in real `TitleEater.tsx`, then `npm run lint`:
  exit 0 with one warning at line 131 from
  `@next/next/no-img-element`, proving both real-file scanning and the Next.js
  plugin rule. The probe was reverted.
- `npx eslint --print-config src/components/EasterEggs/TitleEater.tsx` piped
  to a Node JSON check: exit 0; resolved
  `@next/next/no-img-element: [1]` and
  `@next/next/no-html-link-for-pages: [2]`.
- Final `npm run lint`: exit 0; output was only the npm script banner and
  `eslint .`.
- `npx tsc --noEmit`: exit 0 with no output.

### Acceptance criteria evidence

- The reverted raw-`<img>` probe was reported in a real source file, so the
  successful final lint is not a zero-file false positive.
- Root `.eslintrc.json` is gone and root `eslint.config.js` loads the installed
  package's native core-web-vitals export.
- Final lint has no errors or warnings. The only retained exception is the
  documented, one-line hydration-related Hooks suppression described above.
- `docs/DEVELOPMENT.md` now describes lint as working with Next.js
  core-web-vitals rules.
- No CI or additional/stricter lint rules were added.

### Assumptions and deviations

- Installed `eslint-config-next` is 16.1.1 (resolved from the declared
  `^16.0.10`). Its `package.json` explicitly exports
  `./core-web-vitals`, whose module returns a native four-item flat-config
  array; therefore no `FlatCompat` dependency or translation is needed.
- Next 16 no longer provides `next lint`, so restoring the approved
  `npm run lint` outcome required the minimal package-script change to
  `eslint .` in addition to the planned config migration.
- Generated artifact ignores mirror existing `.gitignore` build/output paths
  and only prevent generated copies and vendor bundles from crashing lint;
  they do not exclude application source, scripts, or configuration.

### Unresolved risks

- None known. The localStorage initialization suppression intentionally keeps
  existing hydration behavior and should be reconsidered only as part of a
  separately scoped theme-state redesign.

### Documentation updated

- Updated `docs/DEVELOPMENT.md` under “Setup and commands” to remove the stale
  broken-lint caveat. The testing guidance already accurately called for both
  lint and TypeScript checks and needed no further change.

## Review

Not independently reviewed.

## Human acceptance

Accepted by Patrick (2026-09-04), by moving this task to `tasks/completed/`.
