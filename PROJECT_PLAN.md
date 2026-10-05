# Client Data Management System - Project Plan

> **Status note:** This plan is historical — it documents the original
> Excel + PowerBI-to-Next.js migration (Phases 1-2, both complete) and a
> "Phase 3+" database migration that was originally scoped as speculative
> future work (see "Migration Path from Excel to Database" below). That
> migration has since happened: all client-infrastructure data now reads and
> writes through BTClientDataAPI, and the Excel read/write path has been
> fully removed. See `docs/PROJECT.md` and `docs/ARCHITECTURE.md` for the
> current, authoritative description of the system; treat the rest of this
> document as a historical record of the original plan rather than the
> current architecture.

## Executive Summary

This project converts an Excel + PowerBI-based client data management system into a modern Next.js web application with optional Electron desktop deployment. The system manages IT infrastructure data for multiple clients, including workstations, servers, users, credentials, and contact information.

### Original State (superseded)
- Technicians entered data into Excel files stored on network drive (S:\PBIData\NetDoc\Manual)
- PowerBI dashboard provided read-only data visualization
- Semi-normalized data across 10+ Excel files
- Client relationships tracked via abbreviation codes (e.g., "BT" for Biztech)

### Original Target State (Phases 1-2, since superseded by the database migration)
- Next.js web application with authentication
- Read and write access to Excel files (maintaining Excel as data store)
- Responsive UI with tables and filters
- Support for both web deployment and Electron desktop app

---

## Data Model Overview

### Core Entities and Relationships

#### Master Data
- **companies.xlsx** (`S:\PBIData\Biztech\companies.xlsx`)
  - Fields: Company Name, Abbrv, Group, Status
  - Primary reference for all client data
  - The "Abbrv" field is the foreign key used across all other files

#### Client-Specific Data Files
All files stored in: `S:\PBIData\NetDoc\Manual\`

| File | Sheet Name | Purpose | Key Fields | Relationship |
|------|------------|---------|------------|--------------|
| Core.xlsx | Infrastructure | Servers, routers, switches, core infrastructure | Client, SubName, Name, IP address, Login, Password | Client → companies.Abbrv |
| Users.xlsx | Users | User accounts per client | Client, Computer Name, Name, Login, Password | Client → companies.Abbrv |
| Workstations.xlsx | Workstations | PC/laptop inventory | Client, Computer Name, IP Address, Service Tag | Client → companies.Abbrv |
| Phone Numbers.xlsx | Sheet1 | Main phone numbers | Client, Name, Number | Client → companies.Abbrv |
| Emails.xlsx | Email Addresses | Email accounts | Client, Username, Email, Password, Active | Client → companies.Abbrv |
| External_Info.xlsx | External Info | Firewalls, VPN, external connections | Client, Connection Type, IP address, VPN info | Client → companies.Abbrv |
| Managed_Info.xlsx | Sheet1 | Managed WAN/ISP provider info | Client, Provider, IP 1, Phone 1-4, Account # | Client → companies.Abbrv |
| Admin Emails.xlsx | Admin Emails | Admin email accounts | Client, Name, Email, Password | Client → companies.Abbrv |
| Admin Mitel Logins.xlsx | Mitel Admins | Phone system admin logins | Client, Login, Password | Client → companies.Abbrv |
| Acronis Backups.xlsx | Sheet1 | Acronis backup credentials | Client, UserName, PW, Encrypt PW (1-7) | Client → companies.Abbrv |
| Cloudflare_Admins.xlsx | CF Admins | Cloudflare credentials | Client, username, pass | Client → companies.Abbrv |

### Data Relationships
```
companies (Master)
    ├── Core.xlsx (Infrastructure)
    ├── Users.xlsx (User Accounts)
    ├── Workstations.xlsx (PC Inventory)
    ├── Phone Numbers.xlsx (Contact Info)
    ├── Emails.xlsx (Email Accounts)
    ├── External_Info.xlsx (External Access)
    ├── Managed_Info.xlsx (Managed WAN/ISP Info)
    ├── Admin Emails.xlsx (Admin Credentials)
    ├── Admin Mitel Logins.xlsx (Phone Admin)
    ├── Acronis Backups.xlsx (Backup Admin)
    └── Cloudflare_Admins.xlsx (Cloud Admin)
```

### Common Field Patterns
- **Client**: Foreign key to companies.Abbrv (e.g., "BT", "AE", "GPI")
- **SubName**: Sub-category or location (e.g., "Office")
- **Name**: Human-readable name or description
- **Active**: Boolean flag (1=active, 0=inactive)
- **Notes/Notes 2**: Additional information fields
- **On Landing Page**: Boolean flag for featured items

---

## Phase 1: PowerBI Frontend Replacement

### Objective
Create a read-only dashboard to replace PowerBI, displaying the 4 most important data views.

### Priority Data Views (to be confirmed with stakeholder)
Based on data structure, recommended initial views:
1. **Infrastructure Dashboard** (many .xlsx files)
   - Filterable by Client
   - four tables (External Data, Core data, a fusion of worstation and users data, and notes for managed WAN info.)
   - a section for the administration email and password
   - a section for the administration phone (mitel) name and password
   - a section for the administration acronis name and password
   - a section for the administration cloudflare name and password.
2. **Infrastructure Dashboard** (Core.xlsx)
   - Filterable by Client, SubName, Grouping
   - Key fields: Name, IP address, Login, Description
   - Show "On Landing Page" items prominently

3. **Workstations Overview** (Workstations.xlsx)
   - Filterable by Client, Active status
   - Key fields: Computer Name, IP Address, Service Tag, Description

4. **User Accounts** (Users.xlsx)
   - Filterable by Client, Active status
   - Key fields: Name, Login, Computer Name, Phone


### Features
- [ ] Single-select dropdown filters for Client selection
- [ ] Active/Inactive status toggles
- [ ] Search functionality within tables
- [ ] Sortable columns
- [ ] Responsive table design
- [ ] Export to CSV functionality
- [ ] Auto-refresh from Excel files (configurable interval)

### Technical Requirements
- Read Excel files from network path (configurable via .env)
- Parse Excel files using `xlsx` library
- Cache parsed data with invalidation strategy
- Handle file access errors gracefully
- Support for both web and Electron deployment

---

## Phase 2: Data Entry Interface

### Objective
Enable technicians to create, update, and delete records directly in the web interface.

### CRUD Operations
- [ ] Add new records to any data sheet
- [ ] Edit existing records with validation
- [ ] Soft delete (set Active=0) or hard delete rows
- [ ] Bulk operations (multi-row update/delete)
- [ ] Duplicate record functionality

### Data Validation
- [ ] Required field validation
- [ ] Format validation (IP addresses, emails, phone numbers)
- [ ] Client abbreviation must exist in companies.xlsx
- [ ] Prevent duplicate keys where applicable

### Concurrent Access Handling
- [ ] File locking mechanism (warn if file is open)
- [ ] Last-write-wins with conflict detection
- [ ] Audit trail of changes (timestamp, user, action)

### Features
- [ ] Form-based data entry with field validation
- [ ] Inline table editing
- [ ] Change history/audit log
- [ ] Undo recent changes
- [ ] Import from Excel (bulk upload)

---

## Technical Architecture

### Tech Stack

#### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible UI components
- **Lucide React** - Icon library
- **TypeScript** - Type safety

#### Data Layer
- **xlsx** - Excel file parsing and writing
- **PapaParse** - CSV export functionality
- **File System API** - Direct file access (Node.js)

#### Authentication
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT-based authentication
- **sql.js** or **libsql/client** - User credentials storage

#### Desktop
- **Electron** - Desktop application wrapper
- **electron-builder** - Build and packaging

### Project Structure
```
client-data-management/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx            # Dashboard layout with nav
│   │   │   ├── page.tsx              # Home/overview
│   │   │   ├── infrastructure/       # Core.xlsx view
│   │   │   ├── workstations/         # Workstations.xlsx view
│   │   │   ├── users/                # Users.xlsx view
│   │   │   ├── clients/              # companies.xlsx view
│   │   │   ├── emails/               # Emails.xlsx view
│   │   │   ├── external/             # External_Info.xlsx view
│   │   │   └── admin/                # Admin credentials views
│   │   ├── api/
│   │   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── data/                 # Data CRUD endpoints
│   │   │   │   ├── companies/
│   │   │   │   ├── core/
│   │   │   │   ├── users/
│   │   │   │   └── workstations/
│   │   │   └── export/               # CSV export endpoints
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                       # Radix UI components
│   │   ├── data-table/               # Reusable table component
│   │   ├── filters/                  # Filter components
│   │   ├── forms/                    # Data entry forms
│   │   └── layout/                   # Layout components
│   ├── lib/
│   │   ├── excel/
│   │   │   ├── reader.ts             # Excel reading utilities
│   │   │   ├── writer.ts             # Excel writing utilities
│   │   │   ├── cache.ts              # File caching layer
│   │   │   └── types.ts              # TypeScript types for data
│   │   ├── auth/
│   │   │   ├── jwt.ts                # JWT utilities
│   │   │   ├── middleware.ts         # Auth middleware
│   │   │   └── users.ts              # User management
│   │   ├── validation/               # Data validation schemas
│   │   └── utils.ts                  # Shared utilities
│   └── types/
│       └── data.ts                   # TypeScript interfaces
├── public/                           # Static assets
├── scripts/
│   ├── init-auth-db.ts              # Initialize auth database
│   └── sync-version.js              # Version sync for Electron
├── electron-main.js                 # Electron entry point
├── electron-builder.json            # Electron build config
├── .env.local                       # Environment variables
├── .env.example                     # Environment template
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Environment Configuration

Create `.env.local` file:
```bash
# Excel File Paths
EXCEL_BASE_PATH=S:/PBIData/NetDoc/Manual
COMPANIES_FILE_PATH=S:/PBIData/Biztech/companies.xlsx

# Authentication
JWT_SECRET=your-secret-key-change-in-production
AUTH_DB_PATH=./data/auth.db

# Application
NEXT_PUBLIC_APP_NAME=Client Data Management System

# Cache Settings
EXCEL_CACHE_TTL=300000  # 5 minutes in milliseconds
```

---

## Implementation Phases

### Phase 1: Frontend Replacement (4-6 weeks)

#### Week 1-2: Project Setup & Infrastructure
- [ ] Initialize Next.js project with TypeScript
- [ ] Install and configure dependencies (Tailwind, Radix UI, etc.)
- [ ] Set up project structure and folders
- [ ] Create environment configuration system
- [ ] Build Excel reading utilities
  - [ ] Read Excel files from network path
  - [ ] Parse sheets into TypeScript objects
  - [ ] Implement caching layer
  - [ ] Error handling for file access
- [ ] Set up authentication system
  - [ ] Create auth database schema
  - [ ] Implement login/logout
  - [ ] JWT middleware
  - [ ] Protected routes

#### Week 3-4: Core Data Views
- [ ] Build reusable data table component
  - [ ] Sortable columns
  - [ ] Search/filter functionality
  - [ ] Pagination
  - [ ] Responsive design
- [ ] Implement 4 priority views:
  - [ ] Infrastructure Dashboard (Core.xlsx)
  - [ ] Workstations Overview (Workstations.xlsx)
  - [ ] User Accounts (Users.xlsx)
  - [ ] Client Master List (companies.xlsx)
- [ ] Build filter components
  - [ ] Client multi-select dropdown
  - [ ] Active/Inactive toggles
  - [ ] Custom filters per view
- [ ] Create API routes for data fetching
  - [ ] GET endpoints for each data source
  - [ ] Data transformation layer
  - [ ] Error responses

#### Week 5-6: Polish & Testing
- [ ] Add CSV export functionality
- [ ] Build dashboard/home page with overview
- [ ] Implement auto-refresh mechanism
- [ ] Create user management interface
- [ ] Responsive design testing
- [ ] Cross-browser testing
- [ ] Documentation
- [ ] User acceptance testing
- [ ] Deploy to test environment

### Phase 2: Data Entry Interface (4-6 weeks)

#### Week 1-2: Write Operations
- [ ] Build Excel writing utilities
  - [ ] Update existing rows
  - [ ] Append new rows
  - [ ] Delete rows
  - [ ] Preserve formatting
- [ ] Implement file locking mechanism
- [ ] Create audit trail system
  - [ ] Log all changes
  - [ ] Track user, timestamp, action
  - [ ] Store in SQLite database
- [ ] Build API routes for mutations
  - [ ] POST /api/data/{entity} (create)
  - [ ] PUT /api/data/{entity}/{id} (update)
  - [ ] DELETE /api/data/{entity}/{id} (delete)

#### Week 3-4: Data Entry UI
- [ ] Create form components for each entity type
  - [ ] Infrastructure form
  - [ ] Workstation form
  - [ ] User form
  - [ ] Client form
- [ ] Implement validation schemas
  - [ ] Required fields
  - [ ] Format validation (IP, email, phone)
  - [ ] Foreign key validation (Client exists)
- [ ] Add inline editing to tables
- [ ] Build modal dialogs for CRUD operations
- [ ] Implement optimistic UI updates
- [ ] Add undo functionality

#### Week 5-6: Advanced Features & Testing
- [ ] Bulk operations interface
- [ ] Import from Excel functionality
- [ ] Change history viewer
- [ ] Conflict resolution UI
- [ ] Comprehensive testing
  - [ ] Unit tests for data operations
  - [ ] Integration tests for API routes
  - [ ] E2E tests for critical flows
- [ ] Security audit
- [ ] Performance optimization
- [ ] User acceptance testing
- [ ] Production deployment

### Phase 3: Extended Features (Future)

- [ ] Add remaining 6+ data views
- [ ] Advanced reporting and analytics
- [ ] Data migration to proper database (PostgreSQL/SQLite)
- [ ] Real-time collaboration features
- [ ] Mobile-responsive improvements
- [ ] Role-based access control (per-client permissions)
- [ ] Data backup and restore
- [ ] Integration with external systems
- [ ] Advanced search and filtering
- [ ] Custom dashboard builder

---

## Deployment Options

### Option 1: Web Application
- Deploy to Windows Server with IIS
- Use Node.js process manager (PM2)
- Configure file system access to network drive
- Set up SSL certificate
- Configure Windows authentication (optional)

### Option 2: Electron Desktop App
- Build standalone executable
- Install on technician workstations
- Direct file system access to S:\ drive
- Auto-update functionality
- Offline capability

### Option 3: Hybrid
- Web app for management/reporting
- Desktop app for field technicians
- Shared authentication system

---

## Security Considerations

### Data Protection
- [ ] All credentials encrypted at rest
- [ ] Secure password storage (bcrypt)
- [ ] HTTPS enforced in production
- [ ] JWT tokens with expiration
- [ ] File access logging
- [ ] Input sanitization and validation
- [ ] SQL injection prevention (if migrating to DB)

### Access Control
- [ ] User authentication required
- [ ] Role-based permissions (Phase 3)
- [ ] Audit trail for all data changes
- [ ] Session management
- [ ] Password complexity requirements
- [ ] Account lockout after failed attempts

### Network Security
- [ ] File access restricted to authorized network
- [ ] VPN requirement for remote access
- [ ] Regular security updates
- [ ] Backup of Excel files before writes

---

## Testing Strategy

### Unit Tests
- Excel reader/writer functions
- Data validation logic
- Authentication utilities
- API route handlers

### Integration Tests
- End-to-end data flow (Excel → API → UI)
- Authentication flow
- File locking mechanisms
- Cache invalidation

### User Acceptance Testing
- Technician workflow testing
- Data entry validation
- Report accuracy verification
- Performance under load
- Concurrent user scenarios

### Test Data
- Use Examples folder for development
- Create test company data
- Automated test data generation
- Backup production data for testing

---

## Migration Path from Excel to Database (Phase 3+) — Completed

This section originally scoped a hypothetical future migration; it has since
happened. What actually shipped, for the record:

- BTClientDataAPI (a separate sister project) became the system of record,
  with a normalized "silver" table per dataset.
- CDMS added an API-backed read/write path alongside the Excel path
  (`DATA_READ_SOURCE` switch: `excel` / `api` / `compare`), rather than a
  literal dual-write — BTClientDataAPI owned its own ingestion from the
  source Excel files independently.
- Once the API path was trusted, CDMS cut over fully
  (`tasks/completed/TASK-001-retire-excel-data-path.md`): the Excel
  read/write path, the `xlsx` dependency, and the `DATA_READ_SOURCE` switch
  were removed from this repository entirely. Row-level parity with the old
  Excel files was explicitly not required — the database is the source of
  truth going forward.

See `docs/ARCHITECTURE.md` for the current data flow.

---

## Key Decisions & Questions

### To Be Decided
1. **Which 4 views are priority for Phase 1?**
   - Current recommendation: Infrastructure, Workstations, Users, Clients
   - Confirm with stakeholders

2. **Authentication source?**
   - Local user database (recommended)
   - Active Directory integration
   - Single Sign-On (SSO)

3. **Deployment preference?**
   - Web-first, Electron later
   - Both simultaneously
   - Electron-only

4. **File locking strategy?**
   - Advisory locks (warning only)
   - Mandatory locks (prevent concurrent writes)
   - Last-write-wins with conflict detection

5. **Data refresh frequency?**
   - Real-time (read on every request)
   - Cached with TTL (5-10 minutes)
   - Manual refresh button

### Assumptions
- Network drive (S:\) is accessible from web server
- Excel files follow consistent schema
- Client abbreviations are unique and stable
- Concurrent write operations are rare
- Users have Windows authentication to network

---

## Success Metrics

### Phase 1
- [ ] All 4 priority views displaying correct data
- [ ] Page load time < 3 seconds
- [ ] Support for 10+ concurrent users
- [ ] 99%+ data accuracy vs. PowerBI
- [ ] User satisfaction > 4/5

### Phase 2
- [ ] Data entry time reduced by 50%
- [ ] Zero data corruption incidents
- [ ] < 1% data entry errors
- [ ] All technicians trained and using system
- [ ] Complete audit trail for 100% of changes

---

## Risk Management

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Network file access issues | High | Medium | Implement robust error handling, fallback mechanisms, local caching |
| Concurrent write conflicts | Medium | Low | File locking, conflict detection, audit trail |
| Data corruption | High | Low | Backup before write, validation, rollback capability |
| User adoption resistance | Medium | Medium | Training, gradual rollout, familiar UI design |
| Performance with large files | Medium | Medium | Caching strategy, pagination, lazy loading |
| Security breach | High | Low | Authentication, encryption, audit logging, regular updates |

---

## Development Guidelines

### Code Standards
- TypeScript strict mode enabled
- ESLint configuration enforced
- Prettier for code formatting
- Meaningful variable/function names
- Comprehensive error handling
- JSDoc comments for complex functions

### Git Workflow
- Feature branches from main
- Pull requests required
- Code review before merge
- Semantic versioning
- Changelog maintained

### Documentation
- Inline code comments
- API documentation (JSDoc)
- User guides for each feature
- Admin setup documentation
- Troubleshooting guide

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Access to S:\ network drive
- Git

### Initial Setup
```bash
# Clone repository
git clone <repo-url>
cd client-data-management-system

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your paths
# Update EXCEL_BASE_PATH and COMPANIES_FILE_PATH

# Initialize auth database
npm run auth:init

# Run development server
npm run dev

# Open browser to http://localhost:6029
```

### Building for Production
```bash
# Build web application
npm run build

# Build standalone server
npm run build:standalone

# Build Electron desktop app
npm run electron:build

# Build everything
npm run build:all
```

---

## Support & Maintenance

### Ongoing Tasks
- Regular dependency updates
- Security patches
- Performance monitoring
- Backup verification
- User feedback collection
- Bug fixes and enhancements

### Documentation Updates
- Keep this document updated as requirements evolve
- Document all architectural decisions
- Maintain API documentation
- Update user guides with new features

---

## Appendix

### Useful Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Radix UI Components](https://www.radix-ui.com/primitives/docs/overview/introduction)
- [xlsx Library](https://docs.sheetjs.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Electron Documentation](https://www.electronjs.org/docs/latest)

### Contact
- Project Lead: [Name]
- Technical Lead: [Name]
- Stakeholders: [Names]

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
**Next Review:** After Phase 1 completion


**Misc work:**

SQLite Schema:


CREATE TABLE misc_documents (
  client TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_data BLOB NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
This will store the entire Excel file as a BLOB, allowing you to:

Retrieve and download the original file
Display it in a viewer/editor later
Keep the original structure intact
Migration Script: (scripts/migrate-misc.ts)

Scan the Examples/Misc/ folder for .xlsx files
Read each file as binary
Insert into SQLite with client abbreviation (from filename)
Delete the Misc folder after successful migration
API Endpoint: (/api/data/misc?client=BT)

Returns the BLOB as a downloadable file
Or returns metadata about the misc document
Next Steps:

Please add the Examples/Misc/ folder with a couple example client files (e.g., BT.xlsx, AE.xlsx), and I'll:

Examine their structure to understand what we're storing
Build the migration script
Create the API endpoint
Update the dashboard to show/download these files
Once you've added the folder, let me know and I'll get started!