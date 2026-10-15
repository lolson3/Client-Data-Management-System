# API and Frontend Compatibility Review

Date: 2026-10-14

Implementation update: TASK-008 resolved F-1, F-2, and F-7. F-6 was closed by
the product decision to keep UI preferences browser-local. F-3 remains an
accepted beta limitation; F-4 and F-5 remain documentation/contract follow-up
work. The findings below retain the original evidence and now state their
current disposition.

## Scope

This review compares:

- the screenshot-derived API reference in `docs/API_REFERENCE.md`;
- the current CDMS API route implementations;
- the current dashboard, login, theme, company-management, and preference
  behavior; and
- the uncommitted frontend updates present during the review.

This is a static contract review. It does not test the separately deployed
BTClientDataAPI or validate production data.

## Executive summary

The recent frontend edits for the black-based dark theme and closing the
settings menu do not introduce an API incompatibility. Authentication, runtime
configuration, client listing, company lookup/save, WHOIS lookup, logout, and
preference reads use response shapes that match the implemented routes.

At the time of review, there were two significant runtime integration problems
and several contract/documentation gaps:

1. Server preference writes are skipped because the frontend looks for a
   bearer token in `localStorage`, while CDMS uses an httpOnly session cookie.
   Existing server preferences can consequently override newer local choices
   after reload.
2. Client-data loads do not check HTTP status. Authentication failures and API
   failures are displayed as empty datasets instead of an error or login
   redirect.
3. The single company form performs a non-atomic sequence across the company
   and phone APIs, so a partial save can leave data only partly updated.
4. The API reference covers the screenshot surface, but omits 21 operations
   used by the current frontend.
5. Mutable-row metadata such as `_apiId` is essential to the frontend but is
   not explicitly documented as part of the API contract.

## Findings

### F-1 — Server preference writes never run

Severity: **High**

Type: Runtime integration mismatch

Status: **Resolved by TASK-008.** The frontend no longer reads or writes
account preferences. Selected client, sort settings, theme, and overview layout
are intentionally loaded from and saved to browser `localStorage`.

The API authenticates requests with the httpOnly `session` cookie. The login
page stores only display-safe user data in `localStorage`; it cannot and should
not read the session cookie. Despite this, both frontend preference writers
require `localStorage.getItem("token")` before calling `POST /api/preferences`:

- sort preferences: `src/app/dashboard/page.tsx:222-253`;
- selected client: `src/app/dashboard/page.tsx:1226-1249`;
- login stores `user`, not `token`: `src/app/login/page.tsx:35-37`;
- the proxy reads the `session` cookie: `src/proxy.ts:56`;
- preference routes identify the user from that cookie:
  `src/app/api/preferences/route.ts:68`.

No frontend code creates the expected local-storage token. Therefore the two
preference POST requests are skipped during normal authenticated use. The
`Authorization` header in those blocks is also unnecessary because the
preference route reads the cookie, not the bearer header.

Impact:

- selected-client and sort changes persist only in the current browser's local
  storage;
- they do not follow the user to another browser or device;
- the startup path reads server preferences before local preferences
  (`src/app/dashboard/page.tsx:1347-1408`), so an older server value can
  override a newer local choice after a reload; and
- a user can experience a selected client or sort order apparently reverting.

Recommended direction:

- Remove the local-storage token guard and `Authorization` header.
- Call `POST /api/preferences` as a same-origin request and let the browser send
  the session cookie.
- Check both `response.ok` and the documented `serverSaved` value.
- Decide whether a failed server save should retain local fallback behavior or
  show a non-blocking warning.
- Add tests proving a changed selected client and sort order are written and
  subsequently loaded.

### F-2 — API failures are rendered as empty client data

Severity: **High**

Type: Runtime error-handling mismatch

Status: **Resolved by TASK-008.** Frontend requests now share a status-aware
JSON handler, `401` responses clear cached display data and redirect to login,
and parallel dataset loads preserve successful responses while showing a
retryable list of failed sources.

The dashboard loads 19 client-data resources in parallel at
`src/app/dashboard/page.tsx:738-758`. Each request immediately calls
`response.json()` without checking `response.ok`. The result handler then uses
`result.data || []` or equivalent defaults at lines 759-783.

`fetch` resolves normally for HTTP `400`, `401`, `404`, `500`, and `503`
responses. Because CDMS error responses have an `error` property rather than a
`data` property, those failures become empty arrays. The `.catch` block only
handles network failures or response parsing failures.

The initial client-list request has the same pattern at
`src/app/dashboard/page.tsx:1341-1344`.

Impact:

- an expired session can make all client data disappear without redirecting to
  login;
- an outage of one backing dataset looks like that category contains no data;
- technicians could mistake an API failure for genuine absence of client
  records; and
- the bulk-load path has no per-source error state, retry state, or clear
  diagnostic for the user.

Recommended direction:

- Use a shared JSON request helper that rejects non-success status codes.
- Treat `401` as a session-expiration event and redirect to `/login`.
- Preserve per-dataset successes when one independent endpoint fails, but show
  a visible error for each failed category.
- Check `clientsRes.ok` before accepting an empty client list.
- Add integration tests for `401` and `500` responses during initial load and
  refresh.

### F-3 — Company and phone saves are not atomic

Severity: **Medium**

Type: Frontend workflow/API capability mismatch

Status: **Accepted beta limitation.** TASK-008 improves error propagation but
does not add a transactional backend operation.

The updated company dialog presents company fields and main phone numbers as
one save operation (`src/components/dashboard/DashboardRecordDialogs.tsx:223-259`).
The frontend implements that operation as multiple requests:

1. save the company with `POST /api/data/companies`;
2. delete removed phone rows;
3. update or add each remaining phone row through `POST /api/data/update`; and
4. refresh the client list.

The sequence is visible at `src/app/dashboard/page.tsx:983-1056`. There is no
transaction or rollback across these requests.

Impact:

- a company add can succeed while one or more phone writes fail;
- an update can delete old phone rows and then fail before adding replacements;
- retrying a partly successful add can return `409` because the company now
  exists; and
- the UI reports the combined action as failed without explaining which part
  was committed.

Recommended direction:

- Prefer a dedicated server endpoint that validates and saves the company and
  phone list as one operation, with transaction-like behavior where the backing
  service supports it.
- If an atomic endpoint is not practical, return and display structured
  per-step results and make retries idempotent.
- Avoid deleting phone rows before all replacement data has been validated.

### F-4 — The API reference is incomplete for the current frontend

Severity: **Medium**

Type: Documentation coverage gap

Status: **Open follow-up.** This does not prevent the current frontend from
running, but the complete route surface should be documented after beta
stabilization.

`docs/API_REFERENCE.md` accurately covers the 14 operations represented in the
screenshots. The current frontend uses 31 distinct method/path operations. Of
those, 21 are outside the reference:

- `GET /api/data/external-info`
- `GET /api/data/core`
- `GET /api/data/workstations-users`
- `GET /api/data/managed-info`
- `GET /api/data/admin-credentials`
- `GET /api/data/guacamole`
- `GET /api/data/devices`
- `GET /api/data/containers`
- `GET /api/data/vms`
- `GET /api/data/daemons`
- `GET /api/data/services`
- `GET /api/data/domains`
- `GET /api/data/cameras`
- `GET /api/data/emails`
- `GET /api/data/users`
- `GET /api/data/workstations`
- `GET /api/data/misc/{client}`
- `GET /api/data/phone-numbers`
- `GET /api/data/websites`
- `POST /api/data/update`
- `POST /api/data/misc/{client}`

The 19 reads appear together at `src/app/dashboard/page.tsx:739-757`; the
generic mutation route is used at lines 832, 898, 1018, and 1109; and the misc
mutation route is used at lines 1146, 1176, and 1202.

Impact:

- the reference cannot be used to reproduce or troubleshoot most dashboard
  behavior;
- request shapes for adding, editing, archiving, and misc-note operations are
  undocumented;
- generated Swagger/OpenAPI coverage has the same gap because those routes use
  ordinary comments instead of `@swagger` annotations; and
- future frontend changes can unknowingly depend on undocumented behavior.

Recommended direction:

- Add OpenAPI annotations for every frontend-facing route.
- Generate the Markdown reference from, or validate it against, that complete
  OpenAPI contract.
- Document the common `{ data, count }` collection response and the exceptional
  aggregate response from `/api/data/admin-credentials`.
- Document all mutation actions and their required fields.

### F-5 — Stable row identifiers are required but not part of the documented contract

Severity: **Medium**

Type: Contract gap

Status: **Open follow-up.** Runtime behavior remains compatible because current
dataset reads continue to include `_apiId`.

The data adapter adds `_apiId` and `_apiUpdatedAt` to every API-backed row at
`src/lib/data/silver-datasets.ts:311-315`. Mutations other than adds require a
positive `apiId`; `/api/data/update` rejects requests without one at
`src/app/api/data/update/route.ts:30-35`.

The frontend depends on this metadata for:

- inline edits (`src/app/dashboard/page.tsx:832-843`);
- archive actions (`src/app/dashboard/page.tsx:1109-1119`);
- company updates (`src/app/dashboard/page.tsx:983-990`); and
- phone updates and deletions (`src/app/dashboard/page.tsx:1017-1053`).

The Company schema allows additional properties but does not name `_apiId`, and
the undocumented collection endpoints have no schemas at all. The frontend
also sends `rowIdentifier` values, but `/api/data/update` currently ignores
them; `apiId` is the actual required identifier.

Impact:

- the frontend works with the current adapter, but this essential coupling is
  invisible in the reference;
- an API cleanup that removes underscore-prefixed metadata would break all
  edits and archives; and
- maintainers may incorrectly assume `rowIdentifier` provides a fallback when
  `_apiId` is absent.

Recommended direction:

- Define a reusable documented schema for mutable rows that includes a required
  positive `_apiId` and optional `_apiUpdatedAt`.
- Document that mutation requests send `_apiId` as `apiId`.
- Remove unused `rowIdentifier` request data or deliberately implement and
  document it as a fallback.

### F-6 — Theme preferences are local-only despite the server preference API

Severity: **Low**

Type: Product behavior divergence

Status: **Closed by product decision.** UI preferences are intentionally
device/browser-local and are not expected to follow an account.

The preference types define `theme` as a server-capable preference, and the API
reference uses it as the primary preference example. The current
`ThemeContext`, however, reads and writes only local storage
(`src/context/ThemeContext.tsx:42-50` and `:71-79`). It never calls the
preferences API.

Impact:

- the new dark/light/system selection works on the current browser;
- the setting does not follow the authenticated user to another browser or
  device; and
- an existing server-side `theme` preference is ignored.

Recommended direction:

- If cross-device theme persistence is desired, load and save `theme` through
  the preference API with local storage as the fallback.
- If theme is intentionally device-local, remove or clarify the server-theme
  implication in preference types and examples.

### F-7 — Selected client values are not consistently URL-encoded

Severity: **Low**, conditional on allowed abbreviation characters

Type: Input/URL construction mismatch

Status: **Resolved by TASK-008.** Client abbreviations are now encoded before
they are inserted into query values or dynamic path segments.

The Company contract accepts `Abbrv` as an unconstrained string, and the add
form does not enforce a restricted character set. Most bulk-load requests
interpolate `selectedClient` directly into a query string, and misc requests
interpolate it into a path (`src/app/dashboard/page.tsx:739-757`). Company and
phone lookup code elsewhere correctly uses `encodeURIComponent` at lines
941-942.

Impact:

- abbreviations containing `&`, `#`, `/`, `?`, spaces, or other reserved URL
  characters can select the wrong query value or path;
- ordinary alphanumeric abbreviations are unaffected.

Recommended direction:

- Apply `encodeURIComponent(selectedClient)` consistently to query and path
  values.
- Alternatively, define and validate a deliberately narrow abbreviation
  format in both the API and frontend.

## Known documentation inconsistency without frontend impact

`GET /api/health` is public in `src/proxy.ts:17-24`, while the captured Swagger
UI inherited the global cookie-security marker. `docs/API_REFERENCE.md`
already records the implementation behavior and the discrepancy. The current
frontend does not call this endpoint, so it does not block the redesigned UI.

## Confirmed-compatible behavior

The following integrations match the implemented routes:

- `POST /api/auth/login` sets the cookie automatically, and the login page uses
  the returned `user` object only for display caching.
- `GET /api/auth/me` returns the `user` wrapper expected by the root and
  dashboard pages.
- `GET /api/config` provides `authDisabled` and `version`, which the frontend
  consumes.
- `GET /api/data/clients` returns the `clients` array with `value`, `label`, and
  optional `group` fields expected by the client picker.
- `GET /api/data/companies?abbrv=...` returns the `company` wrapper used to
  populate the update dialog.
- `POST /api/data/companies` accepts the frontend's `add` and `update` request
  shapes. Company `Status` select values are converted to the numeric API field
  by the dataset adapter.
- `GET /api/preferences/{key}` returns `data.value`, matching the selected-client
  and sort-preference load paths.
- `GET /api/whois?action=check` and `action=lookup` return the fields the website
  autopopulation flow consumes. The UI safely ignores unused fields such as
  `nameServers` and `websiteIP`.
- `POST /api/auth/logout` clears the session cookie; the frontend does not
  depend on its response body.
- The recent dark-theme palette and settings-menu close changes are visual and
  local-state changes only; they do not alter request or response contracts.

## Suggested implementation order

1. Fix preference writes and add persistence tests.
2. Introduce shared response/error handling for dashboard reads, including
   session-expiration handling.
3. Document the 21 missing operations and mutable-row metadata.
4. Decide whether company/phone saves need an atomic server endpoint.
5. Decide whether theme should be user-scoped or device-local.
6. Encode or constrain client abbreviations.

## Validation performed

- Traced every literal frontend `/api/` call and its consuming response code.
- Compared request and response assumptions with the corresponding route
  implementations and `src/proxy.ts`.
- Reviewed the current frontend diff; the pending UI changes do not add API
  calls or alter payloads.
- `npm test`: 13 tests passed, 0 failed.
- `npx tsc --noEmit`: passed with no diagnostics.

Existing tests cover frontend structure, theme styling, and settings-menu
behavior, but do not exercise HTTP integration, preference persistence,
session expiry, partial company saves, or per-dataset failures. Those gaps are
why the findings above are not detected by the green test suite.
