import type { Column } from "@/components/DataTable";

export interface CategoryTableDefinition {
  id: string;
  title: string;
  description: string;
  itemLabel: string;
  columns: Column[];
  overviewKeys: string[];
}

const sortable = (key: string, label: string, extra: Partial<Column> = {}): Column => ({
  key,
  label,
  sortable: true,
  ...extra,
});

export const CATEGORY_TABLE_DEFINITIONS = {
  systemsServices: {
    id: "systemsServices", title: "Services", itemLabel: "records",
    description: "Virtual infrastructure, applications, websites, DNS, and public domains in one inventory.",
    columns: [sortable("Category", "Category"), sortable("Record Type", "Record Type"), sortable("Name", "Name"), sortable("Host", "Host"), sortable("Address", "Address"), sortable("Account", "Account / Owner")],
    overviewKeys: ["Category", "Record Type", "Name", "Host", "Address"],
  },
  misc: {
    id: "misc", title: "Notes", itemLabel: "notes",
    description: "General client notes and information that does not belong to a more specific category.",
    columns: [sortable("Note", "Note")],
    overviewKeys: ["Note"],
  },
  devices: {
    id: "devices", title: "Print & Scan", itemLabel: "devices",
    description: "Printers, scanners, multifunction units, and related peripheral endpoints.",
    columns: [sortable("Name", "Name"), sortable("Device Type", "Device Type"), sortable("IP address", "IP Address", { type: "ip" }), sortable("Machine Name / MAC", "Machine Name/MAC"), sortable("Service Tag", "Service Tag"), sortable("Login", "Login"), sortable("Password", "Password", { type: "password", sortable: false }), sortable("Grouping", "Grouping")],
    overviewKeys: ["Device Type", "Name", "IP address", "Machine Name / MAC", "Service Tag"],
  },
  camerasModal: {
    id: "camerasModal", title: "Cameras & Security", itemLabel: "devices",
    description: "Cameras, recording endpoints, and related physical-security equipment.",
    columns: [sortable("Device Type", "Device Type"), sortable("Name", "Name"), sortable("Vendor", "Vendor"), sortable("Model", "Model"), sortable("IP", "IP Address", { type: "ip" }), sortable("Login", "Login"), sortable("Password", "Password", { type: "password", sortable: false }), sortable("Host NVR", "Host NVR")],
    overviewKeys: ["Device Type", "Name", "Vendor", "Model", "IP"],
  },
  emails: {
    id: "emails", title: "Email & Mailboxes", itemLabel: "mailboxes",
    description: "Individual, shared, and administrative mailboxes with MFA and mail-service settings.",
    columns: [sortable("Username", "Username"), sortable("Email", "Email", { type: "email" }), sortable("Name", "Name"), sortable("Password", "Password", { type: "password", sortable: false }), sortable("MFA or Ignore", "MFA", { type: "checkbox" }), sortable("OWA_override", "OWA", { type: "checkbox", group: "Override" }), sortable("IMAP_override", "IMAP", { type: "checkbox", group: "Override" }), sortable("POP_override", "POP", { type: "checkbox", group: "Override" }), sortable("SMTP_override", "SMTP", { type: "checkbox", group: "Override" })],
    overviewKeys: ["Name", "Email", "Username", "MFA or Ignore"],
  },
  servicesModal: {
    id: "servicesModal", title: "Apps & Providers", itemLabel: "records",
    description: "Business applications and external service providers, including access, contact, account, and endpoint details.",
    columns: [sortable("Record Type", "Type"), sortable("Name", "Name"), sortable("Service Type", "Service Type"), sortable("Contact", "Contact"), sortable("Phone", "Phone"), sortable("Email", "Email", { type: "email" }), sortable("Account", "Username / Account"), sortable("Password", "Password", { type: "password", sortable: false }), sortable("Host / URL", "Host/URL")],
    overviewKeys: ["Record Type", "Name", "Contact", "Phone", "Email"],
  },
  websitesModal: {
    id: "websitesModal", title: "Websites & DNS", itemLabel: "records",
    description: "Public websites, hosting, and DNS configuration in one focused view.",
    columns: [sortable("Registrar", "Registrar"), sortable("Registrar Credential Location", "Reg Cred Location", { type: "select", options: ["Local", "Password Manager", "Client"] }), sortable("Registrar Username", "Reg Username"), sortable("Registrar Password", "Reg Password", { type: "password", sortable: false }), sortable("DNS Host", "DNS Host"), sortable("DNS Server Credential Location", "DNS Cred Location", { type: "select", options: ["Local", "Password Manager", "Client"] }), sortable("DNS Username", "DNS Username"), sortable("DNS Password", "DNS Password", { type: "password", sortable: false }), sortable("Website Host", "Website Host"), sortable("Website Credential Location", "Web Cred Location", { type: "select", options: ["Local", "Password Manager", "Client"] }), sortable("Website Username", "Web Username"), sortable("Website Password", "Web Password", { type: "password", sortable: false }), sortable("URL", "URL", { type: "url" })],
    overviewKeys: ["URL", "Website Host", "DNS Host"],
  },
  userDirectory: {
    id: "userDirectory", title: "Users", itemLabel: "records",
    description: "People, email and mailboxes, and user or shared access accounts in one combined inventory.",
    columns: [sortable("Category", "Category"), sortable("Record Type", "Record Type"), sortable("Name", "Name / Owner"), sortable("Account", "Username / Account"), sortable("Email", "Email", { type: "email" }), sortable("Phone", "Phone"), sortable("Resource", "Resource / Workstation"), sortable("Password", "Password", { type: "password", sortable: false })],
    overviewKeys: ["Category", "Record Type", "Name", "Account", "Email"],
  },
  accountsAccess: {
    id: "accountsAccess", title: "Accounts & Access", itemLabel: "accounts",
    description: "Windows, application, service, shared, and administrative accounts normalized by ownership and account type.",
    columns: [sortable("Account Type", "Account Type"), sortable("Owner", "Owner"), sortable("Owner Type", "Owner Type"), sortable("Account", "Username / Account"), sortable("Password", "Password", { type: "password", sortable: false }), sortable("Resource", "Resource"), sortable("URL", "Host / URL")],
    overviewKeys: ["Account Type", "Owner", "Account", "Resource", "URL"],
  },
  usersModal: {
    id: "usersModal", title: "People", itemLabel: "people",
    description: "General person records including contact details, location, workstation assignment, and status.",
    columns: [sortable("Name", "Name"), sortable("Login", "Login"), sortable("Password", "Password", { type: "password", sortable: false }), sortable("Computer Name", "Computer"), sortable("SubName", "Location"), sortable("Email", "Email", { type: "email", editable: false }), sortable("Phone", "Phone"), sortable("Epicor Number", "Epicor #"), sortable("Grouping", "Grouping")],
    overviewKeys: ["Name", "Login", "Email", "Phone", "Computer Name"],
  },
  allDevices: {
    id: "allDevices", title: "All Devices", itemLabel: "devices",
    description: "A combined inventory of workstations, servers, network equipment, printers, scanners, and cameras.",
    columns: [sortable("Category", "Category"), sortable("Device Type", "Device Type"), sortable("Name", "Name"), sortable("Location", "Location"), sortable("Internal IP", "Internal IP", { type: "ip" }), sortable("External IP", "External IP", { type: "ip" }), sortable("Service Tag", "Service Tag"), sortable("Description", "Description"), sortable("Grouping", "Grouping")],
    overviewKeys: ["Category", "Device Type", "Name", "Location", "Internal IP"],
  },
  networkDevices: {
    id: "networkDevices", title: "Network Devices", itemLabel: "devices",
    description: "Routers, switches, and firewalls consolidated into one network inventory.",
    columns: [sortable("Device Type", "Device Type"), sortable("Name", "Name"), sortable("Location", "Location"), sortable("Internal IP", "Internal IP", { type: "ip" }), sortable("External IP", "External IP", { type: "ip" }), sortable("Machine Name / MAC", "Machine Name/MAC"), sortable("Service Tag", "Service Tag"), sortable("Description", "Description"), sortable("Username", "Username"), sortable("Password", "Password", { type: "password", sortable: false }), sortable("Grouping", "Grouping")],
    overviewKeys: ["Device Type", "Name", "Location", "Internal IP", "External IP"],
  },
  domainAD: {
    id: "domainAD", title: "Servers & Directory", itemLabel: "servers",
    description: "Server inventory with directory roles, local network domains, and public web domains clearly separated.",
    columns: [sortable("Name", "Server Name"), sortable("SubName", "Location"), sortable("Device Type", "Device Type"), sortable("IP address", "IP Address", { type: "ip" }), sortable("Directory Role", "Directory Role", { editable: false }), sortable("Local Domain", "Local Domain", { editable: false }), sortable("Login", "Administrator Login"), sortable("Password", "Password", { type: "password", sortable: false }), sortable("Description", "Description")],
    overviewKeys: ["Name", "Device Type", "IP address", "Directory Role", "Local Domain"],
  },
  workstationsRaw: {
    id: "workstationsRaw", title: "Workstations", itemLabel: "workstations",
    description: "Managed laptops and desktops with assignments, hardware details, and readiness status.",
    columns: [sortable("Computer Name", "Computer Name", { editable: false }), sortable("IP Address", "IP Address", { type: "ip" }), sortable("_userCount", "Users", { editable: false }), sortable("Service Tag", "Service Tag"), sortable("CPU", "CPU"), sortable("Description", "Description"), sortable("Upstream", "Upstream"), sortable("Grouping", "Grouping"), sortable("Win11 Capable", "Win11 Capable")],
    overviewKeys: ["Computer Name", "IP Address", "_userCount", "Service Tag", "Description"],
  },
  vms: {
    id: "vms", title: "Virtualization", itemLabel: "records",
    description: "Virtual machines, containers, and daemons grouped by host with related access details.",
    columns: [sortable("Record Type", "Type"), sortable("Name", "Name"), sortable("Host", "Host"), sortable("Address", "Address")],
    overviewKeys: ["Record Type", "Name", "Host", "Address"],
  },
} satisfies Record<string, CategoryTableDefinition>;

export type CategoryTableId = keyof typeof CATEGORY_TABLE_DEFINITIONS;

export function getOverviewColumns(id: CategoryTableId): Column[] {
  const definition = CATEGORY_TABLE_DEFINITIONS[id];
  return definition.overviewKeys.map(key => definition.columns.find(column => column.key === key) ?? sortable(key, key));
}
