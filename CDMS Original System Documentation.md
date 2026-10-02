# CDMS Original System — Functional Reference

## Purpose and source material

This document records the visible behavior and data organization of the original **Infrastructure Dashboard / CDMS** system as a reference for redesign work. It is based on the screenshots captured on July 31, 2026 and the accompanying `CDMS Notes.txt` file.

The screenshots show the user interface and column labels, but not the underlying validation, permissions, save dialogs, or every report result. Where a field's purpose is inferred from its label, that interpretation is noted rather than presented as confirmed behavior. Credential values visible in the source screenshots are intentionally not reproduced here.

## Application structure

The system is client-centered. A user selects a client, then views a dashboard or opens a client-specific data set from the top navigation.

### Persistent header

| Control | Visible behavior / purpose |
|---|---|
| **Infrastructure Dashboard** | Application title and apparent link back to the main dashboard. |
| **Client selector** | Selects the active client. When no client is selected, it displays **Select a client**. With an active client, it displays that client's name. All dashboard data and tabs appear scoped to this selection. |
| **Refresh button** | Circular-arrow button beside the client selector; appears to reload the selected client's data. |
| **Guac** | Client-level shortcut, inferred to open the client's Apache Guacamole/remote-access page. The source notes call this the “Guac link for client.” |
| **Attend** | Client-level shortcut, inferred to open the client's Attend/remote-support resource. The source notes call this the “Attend link for client.” |
| **Misc** | Opens the Miscellaneous data table. |
| **Dev** | Opens Devices (Printers, Scanners, etc.). |
| **VMs** | Opens Virtual Machines, Containers & Daemons. |
| **Email** | Opens Email Accounts. |
| **Svc** | Opens Services. |
| **Users** | Opens Users. |
| **WS** | Opens Workstations (Raw Data). |
| **Sites** | Opens Websites / DNS. |
| **Reports** | Opens or selects reporting views. The selected report is visually highlighted. |
| **Clients ▼** | Client-management dropdown containing **Add** and **Update**. |
| **User menu ▼** | The screenshot shows a `guest` menu. It contains theme selection, logout, and the application version. |

### Client-management dropdown

| Menu item | Purpose |
|---|---|
| **Add** | Starts the workflow for creating a client record. |
| **Update** | Starts the workflow for changing the currently selected or an existing client record. The exact selection behavior is not visible. |

The client record should retain at least the client name and the two items explicitly called out in the original notes:

- **Domain** — display it when present and render it as a link.
- **Main phone number** — display it when present and render it as a callable telephone link.

### User/theme dropdown

| Menu item | Purpose |
|---|---|
| **Light** | Forces the light color theme. |
| **Dark** | Forces the dark color theme. |
| **System** | Follows the operating-system/browser theme. A checkmark identifies the current choice. |
| **Logout** | Ends the current session. |
| **Version** | Read-only version indicator; the screenshot shows Version 1.1.2. |

## Common table and dialog behavior

Most tabs open as large overlay dialogs above the dashboard. Dialogs can be dismissed with the **×** button in the upper-right and, where visible, a **Close** button at the bottom.

| Feature | Behavior visible in the screenshots |
|---|---|
| **Search all fields** | A single free-text search filters the table across all displayed fields. The VM screen uses the more specific prompt “Search VMs, containers, daemons, or hosts.” |
| **+ Add New** | Creates a new record in the current table or subsection. It is absent from a few aggregate/joined views. |
| **Export CSV** | Downloads the current data set in CSV form. The screenshots do not establish whether filtering affects the export. |
| **Inline editing** | A notice says **Double-click cells to edit**. This implies editable data cells enter edit mode on double-click. |
| **Sorting** | An upward arrow beside a column name indicates the current ascending sort column. Column headers shown with arrows include internal IP, email, service, login, and IP address. |
| **Actions** | Rightmost table column for row-level operations. The visible operation is **Archive**, implying soft removal rather than permanent deletion. |
| **Password masking** | Stored passwords are displayed as bullets in normal table view. |
| **Pagination** | Larger tables show record range, rows-per-page (50 in the captures), page count, and First/Previous/Next/Last controls. Disabled controls indicate no additional page. |
| **Empty state** | Empty tables/sections display messages such as “No data available” or a feature-specific message. |

Not every screenshot includes the lower part of its dialog. Pagination and row actions may therefore exist even when they are not visible in a narrow capture.

## Main dashboard

The dashboard summarizes the selected client's infrastructure in a multi-panel layout. Summary panels appear to be clickable because corresponding full-detail dialogs are shown elsewhere in the screenshot set.

### Servers/Switches (Core)

Core network and server inventory. The dashboard panel scrolls when it contains more records.

| Column | Meaning |
|---|---|
| **Location** | Physical or logical placement, such as a server room, production area, camera network, or site. |
| **Name** | Human-readable device/server name or role. |
| **IP Address** | Management or primary network address. |
| **Machine Name/MAC** | Hostname or hardware MAC identifier. The combined field supports either kind of identifier. |
| **Description** | Free-form explanation of the asset or its purpose. |

The detailed **Core Infrastructure (Servers/Routers/Switches)** view expands the record with these fields:

| Additional column | Meaning |
|---|---|
| **Service Tag** | Manufacturer service tag or serial-like support identifier. |
| **Login / Password** | Primary administrative credentials. Password is expected to be masked. |
| **Alt Login / Alt Password** | Secondary administrative credentials. |
| **Notes / Notes 2** | Two free-form annotation fields. |
| **Grouping** | Category used to organize or filter assets. |
| **Asset ID** | Internal asset-management identifier. |
| **Cores** | Processor core count; most relevant to server records. |
| **RAM (GB)** | Installed memory in gigabytes. |
| **Landing Page** | Likely a management-interface or documentation URL. |
| **Actions** | Row-level operations such as Archive; this final column may be outside the visible crop. |

The detailed view supports all-field search, adding records, CSV export, inline editing, sorting by IP address, and closing the overlay.

### Workstations + Users

Joined summary connecting workstation inventory with assigned users.

| Dashboard column | Meaning |
|---|---|
| **Location** | Workstation's physical/site location. |
| **IP Address** | Workstation network address. |
| **Computer Name** | Hostname or managed device name. |
| **Users** | User or users associated with the workstation. |

The detailed joined view includes:

| Column | Meaning |
|---|---|
| **Computer Name** | Workstation hostname. |
| **Location** | Assigned physical/site location. |
| **Users** | All associated users. |
| **Primary User** | Main assigned user, separated from any additional users. |
| **IP Address** | Workstation address; sortable in the capture. |
| **Service Tag** | Manufacturer service/support identifier. |
| **CPU** | Processor information. |
| **Description** | Free-form workstation description. |
| **Actions** | Row-level operations. |

This appears to be an aggregate view rather than the raw workstation editor: it provides search, CSV export, and inline editing, but no **Add New** button is visible.

### Firewalls/Routers (External)

Compact dashboard summary of internet-edge devices and connections.

| Dashboard column | Meaning |
|---|---|
| **Location** | Site or physical placement. |
| **Device Type** | Firewall/router make or model. |
| **Int IP Address** | Internal/LAN-side management address. |
| **Ext IP Address** | Public/WAN address or assignment method such as DHCP. |
| **Connection** | Internet connection/provider type. |

Selecting the panel opens **External Info (Firewalls/VPN)**, documented below.

### Points of Contact

Dashboard panel for client/vendor contacts. An empty client displays **No contacts**. Selecting it opens the Points of Contact detail table.

### Admin Credentials

The dashboard presents four color-coded credential summaries, each with a record count and a username/identifier preview or **No data**:

- **Emails**
- **VOIP**
- **Acronis**
- **Cloudflare**

Selecting this area opens the full Admin Credentials dialog. Passwords should remain masked and access should be restricted because these records are highly sensitive.

## Top navigation tabs

### Guac

Client-specific remote-access shortcut. The screenshots show only the header button, not the destination or configuration form. The redesign should define behavior for a missing link (disabled state, setup prompt, or omission) and should open external destinations safely.

### Attend

Client-specific Attend/remote-support shortcut. As with Guac, the screenshots do not show the destination or missing-link behavior.

### Misc — Miscellaneous

A flexible nine-field notes table for information that does not fit a dedicated module.

| Column | Purpose |
|---|---|
| **Notes** | Primary label, subject, or first note value. Existing records use it as the recognizable item name. |
| **Notes 1** through **Notes 9** | Generic free-form values. Existing rows show that these may hold usernames, passwords, short descriptors, or URLs depending on the record. Because the schema is untyped, meaning depends on each row. |
| **Actions** | Row operation; **Archive** is visible. |

Supported controls: all-field search, Add New, Export CSV, inline editing, archive, pagination, and close. The existing generic design is flexible but makes validation, labeling, and secure treatment of secrets difficult; a redesign should consider typed records or per-row field labels.

### Dev — Devices (Printers, Scanners, etc.)

Inventory for peripheral and non-workstation devices.

| Column | Meaning |
|---|---|
| **Name** | Device name or descriptive label. |
| **IP Address** | Network address; sortable in the screenshot. |
| **Machine Name/MAC** | Hostname or MAC address. |
| **Service Tag** | Vendor service tag/serial identifier. |
| **Login / Password** | Device management credentials. |
| **Note / Note 1 / Note 2 / Note 3** | Multiple free-form annotations. |
| **Grouping** | Category or organizational grouping. |
| **Asset ID** | Internal inventory identifier. |
| **Actions** | Row-level operations. |

Supported controls: search, Add New, Export CSV, inline editing, sorting, and close.

### VMs — Virtual Machines, Containers & Daemons

Hierarchical inventory for virtualized workloads and their hosts. The empty-state screenshot shows these controls:

| Control | Purpose |
|---|---|
| **Search VMs, containers, daemons, or hosts** | Searches across all workload and host types. |
| **Expand All** | Opens every hierarchy/group to expose child workloads. |
| **Collapse All** | Closes expanded hierarchy/groups. |
| **+ Add New** | Adds a host or workload record; the exact creation form is not shown. |
| **Type counters** | Displays totals in the form `hosts | VMs | containers | daemons`. |

When empty, the page states **No VMs, containers, or daemons found**. No populated hierarchy or record fields are captured, so their detailed schema cannot be confirmed from the source material.

### Email — Email Accounts

| Column | Meaning |
|---|---|
| **Username** | Account sign-in name. |
| **Email** | Email address; sortable in the screenshot. |
| **Name** | Display name or account owner. |
| **Password** | Stored account password, masked in standard view. |
| **Notes** | Free-form account details. |
| **Active** | Whether the mailbox/account is active. |
| **MFA** | Multi-factor authentication status. |
| **OWA** | Outlook Web Access status or permission. An **Override** label is shown. |
| **IMAP** | IMAP protocol status or permission, with override capability. |
| **POP** | POP protocol status or permission, with override capability. |
| **SMTP** | SMTP protocol status or permission, with override capability. |
| **Actions** | Row-level operations. |

“Override” is visible beside the four protocol fields, but the screenshots do not establish the source being overridden or the available states. Supported controls include search, Add New, Export CSV, inline editing, sorting by email, and close.

### Svc — Services

Credential/reference inventory for third-party or internal services.

| Column | Meaning |
|---|---|
| **Service** | Service/product name; sortable in the screenshot. |
| **Username** | Sign-in identifier. |
| **Password** | Service password, expected to be masked. |
| **Host/URL** | Service hostname, management endpoint, or website. |
| **Last Changed** | Date the record or password was last changed. |
| **Notes** | Free-form details. |
| **Actions** | Row-level operations. |

Supported controls: search, Add New, Export CSV, inline editing, sorting, and close.

### Users

User directory tied to workstation and business-system information.

| Column | Meaning |
|---|---|
| **Name** | Person's full/display name. |
| **Login** | Network or application username; sortable in the screenshot. |
| **Password** | Stored password, expected to be masked. |
| **Computer** | Assigned computer/workstation. |
| **Location** | Site, office, or work area. |
| **Phone** | Primary/desk phone. |
| **Cell** | Mobile phone. |
| **Notes / Notes 2** | Free-form annotations. |
| **Epicor #** | User identifier/number in Epicor. |
| **Active** | Employment/account activity status. |
| **Grouping** | Organizational category or group. |
| **Actions** | Row-level operations. |

Supported controls: search, Add New, Export CSV, inline editing, sorting by login, and close.

### WS — Workstations (Raw Data)

Underlying workstation inventory, distinct from the dashboard's joined **Workstations + Users** view.

| Column | Meaning |
|---|---|
| **Computer Name** | Hostname or managed device name. |
| **IP Address** | Network address; sortable in the screenshot. |
| **Users** | Associated user or users. |
| **Service Tag** | Manufacturer service/support identifier. |
| **CPU** | Processor information. |
| **Description** | Device description or purpose. |
| **Upstream** | Inferred parent/upstream network device or connection. Exact semantics are not shown. |
| **Notes / Notes 2** | Free-form annotations. |
| **Active** | Whether the workstation remains active/in service. |
| **Grouping** | Organizational or reporting group. |
| **Asset ID** | Internal asset-management identifier. |
| **Win11 Capable** | Windows 11 compatibility flag used by the readiness report. |
| **Actions** | Row-level operations. |

Supported controls: search, Add New, Export CSV, inline editing, sorting, and close.

### Sites — Websites / DNS

Combined registrar, DNS, hosting, and website-access inventory.

| Column | Meaning |
|---|---|
| **Registrar** | Domain registrar. |
| **Reg Cred Location** | Location/reference for registrar credentials, potentially a password vault rather than the secret itself. |
| **Reg Username / Reg Password** | Registrar sign-in credentials. |
| **DNS Host** | DNS provider. |
| **DNS Cred Location** | Location/reference for DNS credentials. |
| **DNS Username / DNS Password** | DNS-management credentials. |
| **Website Host** | Web hosting provider/platform. |
| **Web Cred Location** | Location/reference for hosting or CMS credentials. |
| **Web Username / Web Password** | Website/hosting sign-in credentials. |
| **URL** | Website or management address. |
| **Notes** | Free-form domain/site details. |
| **Actions** | Row-level operations. |

Supported controls: search, Add New, Export CSV, inline editing, and close.

### Reports

The Reports area provides seven report selectors:

| Report | Intended content visible or inferable from the UI |
|---|---|
| **Inactive Assets** | Assets marked inactive, likely drawn from workstation and other inventory status fields. |
| **Missing Data** | Records with required or useful fields absent. Exact completeness rules are not shown. |
| **MFA Status** | Email/account MFA adoption or exceptions. |
| **Firmware Versions** | Firmware inventory/compliance, likely using the firewall/VPN firmware field and possibly other devices. |
| **Host Resources** | Host compute capacity/usage. Likely related to VM hosts and core asset CPU/RAM fields; exact metrics are not captured. |
| **Password Age** | Credentials approaching or exceeding an age threshold, likely using fields such as Services' Last Changed value. Thresholds are not shown. |
| **Windows 11 Ready** | Workstations and VMs grouped by Windows 11 compatibility. |

#### Windows 11 Readiness report

The captured report contains three result groups:

| Group | Behavior/content |
|---|---|
| **Windows 11 Capable** | Count and list of compatible workstations. Shows **No data** when empty. |
| **Not Windows 11 Capable** | Count and list of incompatible workstations. Entries show a computer name and a parenthetical secondary value; the exact secondary field is not identified. |
| **VMs with Windows 11 Issues** | Count and list of affected VMs. Shows an explicit success message when none are flagged. |

The report subtitle states that workstations and VMs are grouped by Windows 11 compatibility. The raw workstation **Win11 Capable** field appears to feed this report.

## Dashboard detail dialogs not represented as top-level tabs

### External Info (Firewalls/VPN)

Full firewall, internet connection, and VPN configuration table.

| Column | Meaning |
|---|---|
| **Location** | Site/physical location. |
| **Connection Type** | ISP or connection technology/provider label. |
| **Device Type** | Firewall/router model or type. |
| **Int IP Address** | Internal/LAN management address; sortable in the capture. |
| **Ext IP Address** | External/WAN address or dynamic assignment indicator. |
| **Port** | Management or connection port. |
| **Username / Password** | Device or connection credentials. |
| **VPN Port** | Port used for VPN access. |
| **VPN Username / VPN Password** | VPN authentication credentials. |
| **VPN Domain** | VPN authentication/network domain. |
| **Firmware Version** | Installed device firmware. |
| **Notes / Notes 2** | Free-form details, used in the sample for items such as gateway and DNS information. |

Supported controls: search, Add New, Export CSV, inline editing, sorting by internal IP, pagination, and close. Passwords are masked in the normal view.

### Points of Contact

Detailed provider/vendor contact and circuit information.

| Column | Meaning |
|---|---|
| **Provider** | Vendor, ISP, carrier, or service provider. |
| **Contact Name** | Named representative or support contact. |
| **Email** | Contact email address. |
| **Phone 1** through **Phone 4** | Multiple contact/support telephone numbers. |
| **Account Number** | Client's account/reference number with the provider. |
| **Connection Type** | Associated circuit or service type. |
| **Primary IP / Secondary IP** | Provider-assigned addresses or circuit endpoints. |
| **Notes 1 / Notes 2** | Additional contact, escalation, or service details. |
| **Actions** | Row-level operations. |

The screenshot shows search and CSV export. No **Add New** control is visible, so contact creation may occur elsewhere or may be permission-dependent.

### Admin Credentials

One dialog divided into four independent credential sections. Each section has its own search and data table; populated sections support archiving. Admin Emails also exposes CSV export.

#### Admin Emails

| Column | Meaning |
|---|---|
| **Name** | Account label/name. |
| **Email** | Administrative email address. |
| **Password** | Masked password. |
| **Notes** | Purpose or scope of the account. |
| **Actions** | Archive or other row action. |

Controls: search, Add New, Export CSV, inline editing, and Archive.

#### VOIP Logins

| Column | Meaning |
|---|---|
| **VOIP Provider** | Telephone/voice service provider. |
| **Login** | Administrative username. |
| **Password** | Masked password. |
| **Actions** | Archive or other row action. |

Controls: search, Add New, and inline editing. The heading displays the number of records.

#### Acronis Backups

| Column | Meaning |
|---|---|
| **Username** | Acronis administrative/login identifier. |
| **Password** | Masked password. |
| **Actions** | Archive or other row action. |

Controls: search, Add New, inline editing, and Archive. The heading displays the number of records.

#### Cloudflare

| Column | Meaning |
|---|---|
| **Username** | Cloudflare login identifier. |
| **Password** | Masked password. |
| **Actions** | Archive or other row action. |

Controls: search, Add New, and inline editing. The heading displays the number of records.

## Relationships between data sets

The interface implies several useful relationships that should be preserved explicitly in a redesign:

| Source data | Consumer / relationship |
|---|---|
| Client | Scopes every dashboard panel, tab, credential group, and report. |
| Workstations + Users | Joined/summary view built from raw workstations and user assignments. |
| Workstations: **Win11 Capable** | Feeds the Windows 11 Readiness report. |
| Users: **Computer** and Workstations: **Users** | Bidirectional-looking assignment represented in both modules; the redesign should establish one source of truth. |
| Core Infrastructure: **Cores/RAM** and VM hosts | Likely feed the Host Resources report. |
| Firewall/VPN: **Firmware Version** | Likely feeds the Firmware Versions report. |
| Email: **MFA** | Feeds the MFA Status report. |
| Active flags across Users/Workstations | Likely feed Inactive Assets. |
| Credential dates such as Services: **Last Changed** | Likely feed Password Age. |

## Important redesign considerations exposed by the original

- Preserve client scoping visibly at all times and prevent stale data from a previously selected client remaining onscreen.
- Keep domain and main phone number directly accessible from the client header when available.
- Treat Guac and Attend as client-configurable links with clear missing/unconfigured states.
- Retain fast global search, column sorting, CSV export, pagination, and efficient editing.
- Replace ambiguous generic fields (`Notes 1`–`Notes 9`) with typed or user-labeled fields where practical.
- Define whether Archive is reversible, where archived records are viewed, and which reports include them.
- Establish explicit sources of truth for user-to-workstation assignment and fields reused by reports.
- Apply strict role-based access, audit logging, encryption, and secret-reveal controls to every password field. Masking alone does not protect stored credentials.
- Make URLs, domains, email addresses, and phone numbers actionable links while validating their schemes and destinations.
- Define report rules and thresholds in the UI, especially Missing Data, Password Age, firmware compliance, and Windows 11 readiness.
- Provide consistent Add New and Export behavior, or clearly explain intentional exceptions such as aggregate views.

## Screenshot coverage index

| Screenshot | Content documented |
|---|---|
| `110113` | Main header/dashboard behind External Info dialog; firewall/VPN table; pagination. |
| `110137`, `110634` | Servers/Switches and Workstations + Users dashboard panels. |
| `110151`, `110718` | Miscellaneous table. |
| `110157` | Devices table columns. |
| `110203` | VMs/containers/daemons empty state and controls. |
| `110209` | Email Accounts columns. |
| `110214` | Services columns. |
| `110220` | Users columns. |
| `110224` | Workstations raw-data columns. |
| `110228` | Websites/DNS columns. |
| `110233` | Report selectors and Windows 11 Readiness report. |
| `110240` | External Info columns. |
| `110244` | Points of Contact columns. |
| `110258` | Admin Credentials sections and fields. |
| `110702` | Core Infrastructure detail columns. |
| `110708` | Workstations + Users detail columns. |
| `110826` | Theme/account dropdown. |
| `110829` | Clients dropdown. |
| `110842` | Empty client selector and refresh control. |

## Code-derived implementation findings

The sections above describe the original system as visible in the supplied screenshots. This section records additional behavior and constraints found by examining the repository implementation. These findings are especially relevant to a redesign because some are implementation details, some reveal functionality not visible in the screenshots, and some expose inconsistencies that should not be carried forward accidentally.

### Current technical architecture and deployment

- The application is a Next.js 16 / React 19 / TypeScript application. It runs on port **6030** by default and is built with Next.js standalone output.
- The same web application can be used in a browser or through an Electron desktop shell. The Electron client can either start a bundled local server or connect to a configurable LAN/remote server URL. The choice is automatic by default: `localhost`/`127.0.0.1` starts the bundled server, while another host is treated as remote.
- Electron persists the selected server URL locally, provides a Settings window, and restarts the application after a server change. The main window defaults to 1400×1024.
- Links opened with `window.open`, including Guacamole and Attendance, are opened by Electron in a child browser window with an injected Back/Forward/Reload toolbar. In an ordinary browser they use the browser's normal new-tab/window behavior.
- Standalone server, Electron client, and Windows server-installer packaging are separate build products. The server installer bundles a portable Windows Node runtime. Version `1.1.2` is synchronized across the root package, Electron package, and installer metadata during builds.
- The application exposes authenticated interactive Swagger UI at `/docs`, generated OpenAPI JSON at `/openapi.json`, and a data-source health manifest at `/api/health`.

Redesign implication: preserve browser and desktop-client use cases only if both remain requirements. Configuration, external-link handling, update distribution, TLS, certificate trust, and desktop protocol launching should be designed explicitly rather than left as packaging side effects.

### Storage model and source registry

The operational/business data is not currently held in a relational application database. It is read from and written back to Excel workbooks. Authentication and per-user preferences use SQLite.

| Source | Current storage/container |
|---|---|
| Companies | `companies.xlsx` / `Companies` |
| Core infrastructure | `Core.xlsx` / `Infrastructure` |
| Users | `Users.xlsx` / `Users` |
| Workstations | `Workstations.xlsx` / `Workstations` |
| Phone numbers | `Phone Numbers.xlsx` / `Sheet1` |
| Email accounts | `Emails.xlsx` / `Email Addresses` |
| External/firewall information | `External_Info.xlsx` / `External Info` |
| Points of contact | `Managed_Info.xlsx` / `Sheet1` |
| Admin emails | `Admin Emails.xlsx` / `Admin Emails` |
| VOIP administrators | `Admin VOIP Logins.xlsx` / `Mitel Admins` |
| Acronis backups | `Acronis Backups.xlsx` / `Sheet1` |
| Cloudflare administrators | `Cloudflare_Admins.xlsx` / `CF Admins` |
| Guacamole hosts | `GuacamoleHosts.xlsx` / `Sheet1` |
| Devices | `Devices.xlsx` / `Devices` |
| Containers | `Containers.xlsx` / `Containers` |
| Virtual machines | `VMs.xlsx` / `Clients` |
| Daemons | `Daemons.xlsx` / `Sheet1` |
| Services | `Services.xlsx` / `Services` |
| Domains | `Domains.xlsx` / `Sheet1` |
| Cameras | `Cameras External.xlsx` / `Cameras` |
| Websites/DNS | `websites.xlsx` / `Websites` |
| Miscellaneous | One `<client>.xlsx` file per client in the `Misc` folder |
| Login users and preferences | SQLite `users` and `user_preferences` tables in the same database |

`EXCEL_BASE_PATH` selects the workbook directory (default `./Examples`); `COMPANIES_FILE_PATH` can independently override the company workbook; and `AUTH_DB_PATH` selects the SQLite file (default `./data/auth.db`). The data-source registry and health endpoint attempt to open every registered workbook and expected sheet, count its rows, inspect both SQLite tables, and count per-client Misc files. The Misc folder is the only source marked optional. The same report is printed at server startup.

Excel reads are cached in process memory for five minutes by default (`EXCEL_CACHE_TTL` can change this). Writes clear the affected cache, and the dashboard adds a timestamp and requests `no-store` after edits. A redesign needs an intentional cache-consistency strategy for multiple server processes and for workbooks changed externally.

### Current write and archive semantics

- One generalized endpoint supports `updateCell`, `updateRow`, `addRow`, `deleteRow`, and `setInactive` for any registered workbook key.
- Rows do not have durable system IDs. Updates locate the first row whose selected identifying columns match after string conversion. Examples include Client + Login, Client + Computer Name, or Client + Name + IP address. Duplicate or subsequently edited identifying values can therefore update the wrong row or make a row unaddressable.
- Each mutation parses the entire sheet into JSON, changes an in-memory row, rebuilds the sheet, and synchronously overwrites the workbook. There is no transaction, optimistic version check, file lock, atomic temporary-file replacement, conflict response, or audit record.
- Rebuilding sheets from JSON can alter workbook-level presentation or metadata, column order/types, formulas, formatting, and empty-column behavior. This is an important migration and coexistence concern if staff also open these workbooks directly.
- Archive is implemented by adding or setting a numeric `Inactive` column, except Websites use `Is Inactive`. Read helpers hide values equal to numeric or string `1`. Other datasets use `Active = 0`, producing two opposing status conventions.
- The generic API also implements permanent deletion, although the visible UI normally offers Archive. The redesign should decide whether hard deletion is allowed, who can perform it, and how retention/restoration work.
- Required-field validation exists primarily in the browser's Add dialog and varies by form. The generic write endpoint accepts arbitrary row shapes and performs no schema, uniqueness, referential-integrity, value-range, IP, email, URL, or authorization validation beyond checking the workbook key and action name.
- The update endpoint logs row identifiers, changed values, and complete added rows. Because many rows contain passwords, current server logs can receive plaintext secrets.

Redesign implication: introduce immutable IDs, server-side schemas, normalized status semantics, transactions/concurrency control, audit history, and explicit archive/restore/delete operations. If Excel import/export remains, treat it as a controlled interchange process rather than the live transactional store.

### Authentication, authorization, and preferences

- Normal authentication uses SQLite users with bcrypt password hashes. Users have an arbitrary string `role` (the management CLI defaults to `user` and accepts `admin`), email, and created/updated timestamps.
- A signed HS256 JWT is stored in an HTTP-only `session` cookie. The cookie is `SameSite=Lax`, secure only in production, and uses a configurable expiry. The global Next.js proxy protects all pages and API routes except login, logout, and public configuration endpoints.
- `DISABLE_AUTH=true` bypasses authentication and presents the UI user as a guest administrator. A separately configured environment-based break-glass administrator continues to authenticate even when SQLite is unavailable.
- Bearer-token middleware and a `requireRole` helper exist, but the dashboard relies on the cookie and the data endpoints do not apply role checks. In the current implementation, any authenticated user can read credential-bearing datasets and call the generic mutation endpoint; the UI also does not vary actions by role.
- There is no implemented per-client access scope, record/field permission model, credential-access approval, secret-reveal audit, mutation audit, login rate limiting, account lockout, session revocation list, or MFA for CDMS itself.
- The code falls back to a hard-coded development JWT secret if `JWT_SECRET` is missing. Production deployment must not permit that fallback.
- Theme, selected client, and per-table sort choices are intended to persist in SQLite per user and fall back to browser local storage when the database/user relationship is unavailable. The current dashboard still checks a legacy local-storage `token` before synchronizing some preferences, even though login authentication is cookie-based; this can prevent expected server persistence.

Redesign implication: define a permission matrix for viewing, revealing, copying, exporting, creating, editing, archiving, restoring, and administering each data class. Secrets require encryption at rest and audited access, not only password masking. Operational break-glass and auth-disabled modes need explicit controls, warnings, rotation, and audit policy.

### Additional domains and fields confirmed by code

The repository confirms several fields and modules not completely visible in the screenshots:

- **Core infrastructure:** `On Landing Page`, `Inactive`, `RDP?`, `VNC?`, `SSH?`, `Web?`, and `AD Server`, in addition to Cores and RAM. These flags drive dashboard inclusion, connection buttons, and Active Directory server identification.
- **Domains / Active Directory:** each client can have a primary Domain Name and Alt Domain. Clicking the domain header opens a domain/AD detail view that associates domain records with core rows flagged as AD servers.
- **Guacamole:** records include Cloud Name (used directly as the destination URL), optional IP or hard-coded IP, administrator username, password, and notes. Only the first returned Guacamole record drives the header button.
- **Attendance:** unlike Guacamole, the destination is currently a single hard-coded private-network URL (`http://192.168.203.241:6029/attendance`) and is not client-specific.
- **Phone numbers:** records contain Client, Name, Number, and Other. Only the first returned phone record is displayed in the header.
- **Cameras:** the data model includes Name, Vendor, Model, IP, Howto Connect, Login, Password, Notes, Notes 2, and Host NVR. Camera data is fetched, but there is no corresponding top-navigation table in the current dashboard.
- **Containers:** Name, IP, Port, Grouping, and optional Startup Notes.
- **Virtual machines:** Location, Name, IP, Type, Host, Startup memory (GB), Assigned cores, Assigned To, Notes, Grouping, Active, Windows 11 Issue?, Needs W11, and optional Startup Notes.
- **Daemons:** Location, Name, IP, Host, User, Notes, Inactive, and optional Startup Notes.
- **Host/core remote access:** host flags conditionally expose RDP, VNC, SSH, and Web buttons. VMs and daemons expose RDP; containers expose a web link using IP and Port. Host credential details allow show/hide and copy for main and alternate passwords.
- **Firmware tracking:** External Info includes Current Version, Last Reached Out To For Frimware Upgrade (the misspelling is part of the source column), Order, Grouping, Asset ID, DHCP, and On Landing Page.
- **Admin Acronis records:** the current schema permits one Acronis username/password plus up to seven encryption-password fields. These should become structured secret/version/recovery-key records rather than numbered columns.
- **Company status:** source comments define status values 0 = Good, 1 = Billing Issue, and 2 = Must Contact Office, but the client selector currently does not filter them out or visibly distinguish these states.
- **Device client-key inconsistency:** most datasets use `Client`; the Devices route and add form use lowercase `client`, while the TypeScript interface declares uppercase `Client`. Migration must detect and reconcile both spellings.

### Hierarchical workload behavior

The VMs screen is richer than the empty screenshot establishes. It groups active core infrastructure records that have positive Cores or RAM as hosts, then attaches VMs, containers, and daemons by their Host value. It provides:

- search across host and child workload details;
- expand/collapse per host and Expand All/Collapse All;
- counts for hosts, VMs, containers, and daemons;
- display of host CPU/RAM, credentials, notes, and supported connection methods;
- display of child IP, assignment, resource allocation, and Startup Notes;
- copy-IP and remote/web connection actions; and
- a host credential modal with explicit reveal/copy controls.

Host and child relationships are currently free-text matches rather than foreign keys. Renaming a host can orphan its VMs, containers, and daemons. A redesign should model hosts and workloads with immutable relationships and validate protocol/port destinations.

### Derived and duplicated data behavior

- The dashboard loads 19 client-scoped endpoints in one `Promise.all`. A failure or non-JSON response from any one request clears every dashboard dataset, so the user cannot see healthy sections alongside a failed source.
- Most filtering uses exact, case-sensitive equality on the client abbreviation. The workstation/user join is more forgiving: Computer Name is trimmed and compared case-insensitively.
- Workstations and users have a de facto many-to-many display relationship through the repeated free-text Computer Name field. The first matching user is treated as primary, but there is no explicit primary flag or junction record. Editing the aggregate view edits only that first user.
- External Info derives its internal IP by heuristically finding a Core row at the same SubName whose name/description resembles the device type, then falls back to the first Core row at that location. Editing this derived internal IP writes to the matched Core row. This heuristic can display or update the wrong device when a location contains several assets.
- The header chooses the first Domain, Phone Number, and Guacamole record without an explicit primary/order contract.
- Client values are interpolated directly into several dashboard query strings instead of consistently using URL encoding. Client identifiers containing reserved URL characters may fail or be interpreted incorrectly.

Redesign implication: make primary records and relationships explicit, return partial-source errors without erasing healthy data, and remove UI dependence on array order and fuzzy joins.

### Exact report rules implemented today

The reports are calculated entirely in the browser from the currently loaded client data; they are not persisted snapshots and have no cross-client view.

| Report | Current implemented rule |
|---|---|
| Inactive Assets | Lists VMs, Users, and Emails with `Active = 0`, plus Daemons with `Inactive = 1`. It omits other archivable datasets. More importantly, their API routes call the common inactive filter before returning data, so these rows normally never reach the report and the report is effectively unable to show them. |
| Missing Data | Core rows missing IP; Core rows missing Password; active/unspecified VMs missing IP; and Services missing Password. “Critical” completeness is not configurable and ignores other domains. |
| MFA Status | Active/unspecified email rows with `MFA or Ignore = 1` count as enabled; zero, missing, or false count as not enabled. The field combines two meanings—MFA completed and intentionally ignored—so the reported percentage cannot distinguish compliance from exception. |
| Firmware Versions | External Info rows with Current Version are tabulated; rows without it are listed as missing. There is no desired-version catalog, vendor/model comparison, age calculation, or compliance status. |
| Host Resources | Active/unspecified VMs are grouped by free-text Host. Assigned cores and Startup memory are numerically summed, then compared with Cores/RAM on a matching Core host. Missing or nonnumeric values collapse to zero. |
| Password Age | Uses Services' Date of last known change. Excel serial dates and parseable date strings are converted, then grouped as more than 90 days, 60–90 days, or under 60 days. Missing/unparseable dates are not a clearly separated quality category. |
| Windows 11 Ready | Workstations are grouped by `Win11 Capable = 1` versus all other values. VMs are flagged when Windows 11 Issue? is a nonempty value other than `No` or `0`. |

All report criteria and thresholds should be server-owned, testable, documented, and preferably configurable. Reports should state their evaluation time, source scope, exception policy, and treatment of unknown values.

### Table, form, and export behavior confirmed by code

- Table search is client-side and checks all configured visible values case-insensitively. Per-column filters are also supported in the reusable table even though they are not prominent in every screenshot.
- Sorting cycles through ascending, descending, and unsorted. IP-address columns have special numeric IPv4 sorting on the dashboard. Sort preferences are stored per table.
- Rows-per-page options default to 25, 50, 100, and 200 in the reusable component; individual tables can override them.
- CSV export is produced in the browser from the filtered/sorted data. Hidden implementation keys beginning with `_` and the Actions column should not become business data. The redesign should define whether secrets are excluded, redacted, or separately authorized in exports.
- Password columns are masked with eight bullets. On an editable password cell, double-clicking reveals the plaintext, copies it to the clipboard, and opens it for editing. The host modal separately provides Show and Copy. Clipboard lifetime/clearing and access auditing are not implemented.
- Inline edits save on blur or Enter; Escape cancels. Boolean cells use checkboxes and select fields can constrain choices. Failed writes are reported with browser alerts.
- Add forms support required fields, checkboxes, select lists, conditional visibility, auto-filled Client, and a secondary action. Validation types such as IP, email, URL, and password are displayed as ordinary text inputs rather than receiving comprehensive format validation.
- Website creation can call a WHOIS/DNS auto-population tool. It invokes a locally installed `whois` executable (Sysinternals Whois on Windows), validates the domain, parses registrar/name-server information, resolves an IPv4 address, and uses reverse DNS heuristics to infer a hosting provider. Failure is tolerated and fields remain editable. The inferred data should be labeled with provenance and verification status in a redesign.

### Reliability, security, and migration priorities found in code

1. Replace plaintext workbook credential storage with encrypted, access-controlled secret records or references to a dedicated secrets manager. Prevent secrets from entering logs, broad CSV exports, browser caches, telemetry, and backups unintentionally.
2. Add immutable entity IDs and explicit foreign keys for client, host/workload, workstation/user, external/core, domain/AD, and primary contact/link relationships.
3. Separate canonical data from derived presentation fields. Derived matches should expose provenance and never silently redirect an edit to a guessed source row.
4. Unify `Active`, `Inactive`, `Is Inactive`, company Status, and missing values into a documented lifecycle model with archive reason, actor, timestamp, restore, and retention behavior.
5. Enforce role and client scope on the server for every read, reveal, export, and mutation. Add audit events for authentication, secret access, changes, archives, restores, deletes, imports, and exports.
6. Add server-side validation and database constraints. Current TypeScript interfaces document expected workbook columns but do not protect runtime input or source files.
7. Design resilient partial loading and actionable source-health states instead of clearing the whole dashboard when one of 19 requests fails.
8. Preserve original values and provenance during migration, including spelling/case anomalies, Excel date serials, numeric/string booleans, blank versus zero, duplicated natural keys, trailing spaces in headings, and mixed client-key casing.
9. Decide whether external workbook editing remains supported. If it does, provide controlled import reconciliation, conflict detection, backups, validation reports, and idempotent migration tools.
10. Add automated tests around permissions, reports, joins, status filtering, Excel import edge cases, concurrency, secret redaction, and desktop/server configuration before changing the UI architecture.
