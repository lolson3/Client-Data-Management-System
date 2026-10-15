# CDMS API Reference

This document describes the CDMS endpoints represented in the supplied API
screenshots. The route implementations and generated OpenAPI definition were
used to resolve details that were cropped or abbreviated in those screenshots.
It does not document the separate BTClientDataAPI service that stores client
infrastructure data.

## Access and conventions

- All paths are relative to the running CDMS server (for local development,
  typically `http://localhost:6030`).
- Request and response bodies use `application/json`.
- Unless an endpoint is marked **Public**, send the signed `session` cookie
  issued by `POST /api/auth/login`. Browsers receive and send this httpOnly
  cookie automatically; other clients must retain it between requests.
- When `DISABLE_AUTH=true`, the server bypasses session checks. This setting is
  for local development only.
- Error responses use the shape `{ "error": "message" }`.
- The interactive Swagger UI is available at `/docs`; the generated OpenAPI
  document is available at `/openapi.json`.

### Endpoint summary

| Area | Method | Path | Authentication | Purpose |
| --- | --- | --- | --- | --- |
| Auth | `POST` | `/api/auth/login` | Public | Start a session |
| Auth | `POST` | `/api/auth/logout` | Public | End a session |
| Auth | `GET` | `/api/auth/me` | Required | Get the current user |
| System | `GET` | `/api/config` | Public | Get public runtime configuration |
| System | `GET` | `/api/health` | Public | Check required data sources |
| Data | `GET` | `/api/data/clients` | Required | List client options |
| Data | `GET` | `/api/data/companies` | Required | Get one company |
| Data | `POST` | `/api/data/companies` | Required | Add or update a company |
| Preferences | `GET` | `/api/preferences` | Required | Get all preferences |
| Preferences | `POST` | `/api/preferences` | Required | Set a preference |
| Preferences | `GET` | `/api/preferences/{key}` | Required | Get one preference |
| Preferences | `PUT` | `/api/preferences/{key}` | Required | Update one preference |
| Preferences | `DELETE` | `/api/preferences/{key}` | Required | Delete one preference |
| Tools | `GET` | `/api/whois` | Required | Check WHOIS support or inspect a domain |

`GET /api/health` is public in the current server implementation, even though
the captured Swagger UI displayed a lock for it because the generated OpenAPI
definition applies its default security requirement to that operation.

## Data models

### User

| Field | Type | Notes |
| --- | --- | --- |
| `id` | UUID string | User identifier |
| `username` | string | Login name |
| `email` | string or `null` | Email address |
| `role` | string | `admin` or `user` |
| `createdAt` | date-time string | Creation timestamp when returned |
| `updatedAt` | date-time string | Last-update timestamp when returned |

Some responses, including login and break-glass session responses, can contain
only the subset of user fields available to that authentication path.

### Company

| Field | Type | Notes |
| --- | --- | --- |
| `Company Name` | string | Display name |
| `Abbrv` | string | Company abbreviation and lookup key |
| `Group` | string | Company grouping |
| `Status` | integer | `0` = Good, `1` = Billing Issue, `2` = Must Contact Office |

Company objects may contain additional properties. The field names retain the
legacy workbook shape, but current reads and writes are made through
BTClientDataAPI.

## Authentication

### `POST /api/auth/login`

**Public.** Validates a username and password and sets a signed, httpOnly
`session` cookie.

Request body:

```json
{
  "username": "patrick",
  "password": "example-password"
}
```

Successful response (`200`):

```json
{
  "success": true,
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "username": "patrick",
    "email": null,
    "role": "admin"
  }
}
```

| Status | Meaning |
| --- | --- |
| `200` | Logged in; the `session` cookie is set |
| `400` | Invalid JSON or missing/invalid username or password |
| `401` | Invalid username or password |
| `429` | Too many failed attempts; retry after the seconds in `Retry-After` |
| `500` | Internal server error |

### `POST /api/auth/logout`

**Public.** Clears the `session` cookie. It succeeds whether or not the caller
has a valid session.

Successful response (`200`):

```json
{
  "message": "Logged out successfully"
}
```

### `GET /api/auth/me`

Returns the currently authenticated user.

Successful response (`200`):

```json
{
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "username": "patrick",
    "email": null,
    "role": "admin",
    "createdAt": "2026-10-14T15:19:37.338Z",
    "updatedAt": "2026-10-14T15:19:37.338Z"
  }
}
```

| Status | Meaning |
| --- | --- |
| `200` | Current user returned |
| `401` | Not authenticated |
| `500` | Internal server error |

## System

### `GET /api/config`

**Public.** Returns configuration that is safe for clients to read.

Successful response (`200`):

```json
{
  "authDisabled": false,
  "appName": "Client Data Management",
  "version": "1.5.1"
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `authDisabled` | boolean | Whether the server is running with `DISABLE_AUTH=true` |
| `appName` | string | Configured public application name |
| `version` | string | Application version from `package.json` |

### `GET /api/health`

**Public.** Runs the same data-source checks used during server startup. The
response reports each required source's type, backing table or tables,
availability, and row count. This response is sent with `Cache-Control:
no-store, max-age=0`.

Successful response (`200`):

```json
{
  "version": "1.5.1",
  "ok": true,
  "summary": "24/24 data sources OK",
  "sources": [
    {
      "key": "core",
      "type": "api",
      "container": "core",
      "ok": true,
      "rows": 42
    }
  ]
}
```

| Status | Meaning |
| --- | --- |
| `200` | Every required data source is available |
| `503` | One or more required data sources are unavailable; the same response shape describes the failures |

## Client and company data

### `GET /api/data/clients`

Returns companies as dropdown-ready client options sorted by `label`.

Successful response (`200`):

```json
{
  "clients": [
    {
      "value": "VANCE",
      "label": "Vance Industries (VANCE)",
      "group": "Example Group"
    }
  ]
}
```

`value` is the company abbreviation. `group` can be omitted when the source
company has no group.

| Status | Meaning |
| --- | --- |
| `200` | Client list returned |
| `401` | Not authenticated |
| `500` | Failed to load clients |

### `GET /api/data/companies`

Returns one company selected by exact abbreviation.

Query parameters:

| Name | Type | Required | Meaning |
| --- | --- | --- | --- |
| `abbrv` | string | Yes | Value of the company's `Abbrv` field |

Example: `GET /api/data/companies?abbrv=VANCE`

Successful response (`200`):

```json
{
  "company": {
    "Company Name": "Vance Industries",
    "Abbrv": "VANCE",
    "Group": "Example Group",
    "Status": 0
  }
}
```

| Status | Meaning |
| --- | --- |
| `200` | Matching company returned |
| `400` | `abbrv` is missing |
| `401` | Not authenticated |
| `404` | Company not found |
| `500` | Failed to load the company |

### `POST /api/data/companies`

Adds or updates a company through BTClientDataAPI.

Request body:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `action` | string | Yes | `add` or `update` |
| `rowData` | Company | Yes | Company fields to save |
| `apiId` | positive integer | For `update` | Identifier of the existing API row |

Add example:

```json
{
  "action": "add",
  "rowData": {
    "Company Name": "Vance Industries",
    "Abbrv": "VANCE",
    "Group": "Example Group",
    "Status": 0
  }
}
```

Update example:

```json
{
  "action": "update",
  "apiId": 123,
  "rowData": {
    "Company Name": "Vance Industries",
    "Abbrv": "VANCE",
    "Group": "Example Group",
    "Status": 0
  }
}
```

Successful response (`200`):

```json
{
  "success": true,
  "company": {
    "Company Name": "Vance Industries",
    "Abbrv": "VANCE",
    "Group": "Example Group",
    "Status": 0
  }
}
```

| Status | Meaning |
| --- | --- |
| `200` | Company saved |
| `400` | Missing `rowData`, missing/invalid `apiId` for an update, or invalid `action` |
| `401` | Not authenticated |
| `409` | An add used an abbreviation that already exists (case-insensitive) |
| `500` | Failed to save the company |

## Preferences

Preference values are strings scoped to the authenticated user. Preference
responses are not cached.

### `GET /api/preferences`

Returns all preference keys and values for the current user.

Successful response (`200`):

```json
{
  "data": {
    "theme": "dark"
  }
}
```

| Status | Meaning |
| --- | --- |
| `200` | Preferences returned |
| `401` | Not authenticated |

### `POST /api/preferences`

Sets a preference. A successful response can contain `serverSaved: false` if
the value could not be persisted in the server database; the client can then
fall back to local storage.

Request body:

```json
{
  "key": "theme",
  "value": "dark"
}
```

Successful response (`200`):

```json
{
  "success": true,
  "serverSaved": true,
  "data": {
    "key": "theme",
    "value": "dark"
  }
}
```

| Status | Meaning |
| --- | --- |
| `200` | Preference accepted |
| `400` | Invalid JSON or missing/invalid `key` or `value` |
| `401` | Not authenticated |

### `GET /api/preferences/{key}`

Returns one preference. Replace `{key}` with the preference name, for example
`GET /api/preferences/theme`.

Successful response (`200`):

```json
{
  "data": {
    "key": "theme",
    "value": "dark"
  }
}
```

| Status | Meaning |
| --- | --- |
| `200` | Preference returned |
| `401` | Not authenticated |
| `404` | Preference not found |

### `PUT /api/preferences/{key}`

Updates one preference.

Request body:

```json
{
  "value": "dark"
}
```

Successful response (`200`):

```json
{
  "success": true,
  "data": {
    "key": "theme",
    "value": "dark"
  }
}
```

| Status | Meaning |
| --- | --- |
| `200` | Preference updated |
| `400` | Invalid JSON or missing/invalid `value` |
| `401` | Not authenticated |
| `500` | Preference could not be saved |

### `DELETE /api/preferences/{key}`

Deletes one preference.

Successful response (`200`):

```json
{
  "success": true,
  "message": "Preference 'theme' deleted"
}
```

| Status | Meaning |
| --- | --- |
| `200` | Preference deleted |
| `401` | Not authenticated |
| `404` | Preference not found |

## WHOIS tool

### `GET /api/whois`

Checks whether a WHOIS executable is installed on the server or performs
WHOIS and DNS lookups for a domain.

Query parameters:

| Name | Type | Required | Meaning |
| --- | --- | --- | --- |
| `action` | string | Yes | `check` or `lookup` |
| `domain` | string | For `lookup` | Domain name to inspect, such as `example.com` |

Availability example: `GET /api/whois?action=check`

```json
{
  "available": true
}
```

Lookup example: `GET /api/whois?action=lookup&domain=example.com`

```json
{
  "registrar": "Example Registrar",
  "dnsHost": "example-dns.com",
  "nameServers": [
    "ns1.example-dns.com",
    "ns2.example-dns.com"
  ],
  "websiteHost": "Example Hosting Provider",
  "websiteIP": "203.0.113.10"
}
```

WHOIS, forward DNS, and reverse DNS failures can leave individual lookup
fields empty while the endpoint still returns `200` with the complete object
shape.

| Status | Meaning |
| --- | --- |
| `200` | Availability or lookup result returned |
| `400` | Invalid action, missing domain, or invalid domain name |
| `401` | Not authenticated |
