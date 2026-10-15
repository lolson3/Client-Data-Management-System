# Beta Deployment Checklist

Use this checklist before promoting a CDMS beta build. Automated validation
cannot replace the authenticated browser and live BTClientDataAPI checks below.

## Configuration

- [ ] `NODE_ENV=production` for the deployed server.
- [ ] `DISABLE_AUTH` is unset or `false`.
- [ ] `JWT_SECRET` is non-default and at least 32 characters.
- [ ] `DATA_API_BASE_URL` points to the intended BTClientDataAPI deployment.
- [ ] `AUTH_DB_PATH` and the preferences database directory are writable by the
      service account.
- [ ] `COOKIE_SECURE=true` when the beta is served over HTTPS; leave it `false`
      only for an HTTP-only internal beta.
- [ ] The break-glass account is either deliberately configured and tested or
      deliberately disabled by leaving its credentials unset.

Never record real secrets or client credentials in this checklist.

## Automated validation

Run from the repository root:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run docs:generate
npm run build
```

Expected results for TASK-008:

- 20 tests pass with no failures.
- ESLint reports no warnings or errors.
- TypeScript reports no diagnostics.
- API documentation generation reports 10 paths.
- The production Next.js build completes and writes `.next/BUILD_ID`.

## Live service checks

- [ ] Start the production build with the beta environment configuration.
- [ ] `GET /api/config` reports the expected version, app name, and
      `authDisabled: false`.
- [ ] `GET /api/health` returns `200`, `ok: true`, and no failing source.
- [ ] The `/docs` Swagger UI loads after authentication.
- [ ] No real client row contents or credentials appear in server logs.

## Browser smoke test

### Authentication

- [ ] Invalid credentials show the API error and do not start a session.
- [ ] Valid credentials reach the dashboard.
- [ ] Logout clears the session and returns to login.
- [ ] After session expiry, refreshing client data redirects to login instead
      of showing an empty dashboard.

### Browser-local preferences

- [ ] Select a client, reload the page, and confirm that client remains selected.
- [ ] Change a table sort, reload, and confirm the sort remains selected.
- [ ] Change light/dark/system theme, reload, and confirm it remains selected.
- [ ] Rearrange overview panels, reload, and confirm the layout remains.
- [ ] Open a private window or another browser and confirm it begins with its
      own independent preferences.

### Reads and failure handling

- [ ] Select a representative client and verify all dashboard categories load.
- [ ] Refresh data and confirm successful categories remain populated.
- [ ] If a dataset can safely be made unavailable in beta, verify a visible
      failed-source message appears and other categories remain populated.
- [ ] Restore the source and confirm Retry clears the error after a successful
      load.

### Writes

Use non-production beta records and verify the refreshed UI reflects each
operation:

- [ ] Add a record.
- [ ] Edit a text field inline.
- [ ] Toggle an active/inactive field.
- [ ] Archive a record.
- [ ] Add, edit, and remove a miscellaneous note.
- [ ] Add a company without phone numbers.
- [ ] Update a company.
- [ ] Add/update/remove company phone numbers.
- [ ] Confirm a duplicate company abbreviation returns a clear error.
- [ ] Confirm website WHOIS autopopulation is enabled only when the server WHOIS
      tool is available.

Company and phone changes are multiple API requests, not one transaction. If a
phone step fails after the company step succeeds, inspect the saved state before
retrying; this is an accepted beta limitation documented in
`docs/API_FRONTEND_COMPATIBILITY_REVIEW.md`.

## Known beta limitations

- The Markdown/OpenAPI reference does not yet describe every data route used by
  the dashboard.
- `_apiId` is required for edits and archives but is not yet represented in a
  reusable public schema.
- Company and phone saves are not atomic.
- BTClientDataAPI does not currently persist the `Encrypt PW 7` Acronis field.

## Sign-off record

Record the beta build/version, environment, tester, date, failed checks, and
explicitly accepted limitations in the deployment handoff. Do not mark a check
complete unless it was exercised against the intended beta environment.
