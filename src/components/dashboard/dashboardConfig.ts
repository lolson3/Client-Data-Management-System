import type { SortConfig } from "@/components/DataTable";
import type { OverviewLayoutItem } from "@/lib/overviewLayout";

export const CLIENT_STORAGE_KEY = "selectedClient";
export const SORT_PREFS_STORAGE_KEY = "sortPreferences";
export const OVERVIEW_LAYOUT_STORAGE_KEY = "cdms-overview-layout-v5";
export const OVERVIEW_COLUMNS = 12;
export const OVERVIEW_ROWS = 12;
export const MIN_OVERVIEW_COLUMNS = 3;
export const MIN_OVERVIEW_ROWS = 1;
export const MAX_OVERVIEW_PANELS = 6;

export interface OverviewInteraction {
  type: "drag" | "resize";
  panelId: string;
  targetId?: string;
  columns?: number;
  rows?: number;
}

export interface OverviewPanelOption {
  id: string;
  title: string;
  source: string;
  description: string;
}

export const CURATED_OVERVIEW_PANELS: OverviewPanelOption[] = [
  { id: "adminCredentials", title: "Admin Credentials", source: "Accounts & Access", description: "Administrative, backup, DNS, VoIP, and remote-access credentials." },
  { id: "domainControllers", title: "Domain Controllers", source: "Servers & Directory", description: "Servers currently providing directory services." },
  { id: "externalNetwork", title: "Firewalls & Routers", source: "Network Devices", description: "Edge devices, routing equipment, and their network addresses." },
  { id: "serviceProviders", title: "Service Providers", source: "Apps & Providers", description: "Provider contacts, service types, phone numbers, and accounts." },
  { id: "mfaAttention", title: "MFA Attention", source: "Email & Mailboxes", description: "Active mailboxes that do not have MFA documented as enabled." },
];

export const CATEGORY_OVERVIEW_PANELS: OverviewPanelOption[] = [
  { id: "userDirectory", title: "Users", source: "Users", description: "People, mailboxes, and access accounts." },
  { id: "usersModal", title: "People", source: "Users", description: "People and their contact and workstation details." },
  { id: "emails", title: "Email & Mailboxes", source: "Users", description: "Mailbox identities, usernames, and MFA status." },
  { id: "accountsAccess", title: "Accounts & Access", source: "Users", description: "User, shared, application, and administrative accounts." },
  { id: "allDevices", title: "All Devices", source: "Devices", description: "The complete device inventory." },
  { id: "workstationsRaw", title: "Workstations", source: "Devices", description: "Managed laptops and desktops." },
  { id: "domainAD", title: "Servers & Directory", source: "Devices", description: "Servers, directory roles, and local domains." },
  { id: "networkDevices", title: "Network Devices", source: "Devices", description: "Routers, switches, and firewalls." },
  { id: "devices", title: "Print & Scan", source: "Devices", description: "Printers, scanners, and multifunction devices." },
  { id: "camerasModal", title: "Cameras & Security", source: "Devices", description: "Cameras and physical-security equipment." },
  { id: "systemsServices", title: "Services", source: "Services", description: "Virtualization, applications, providers, websites, and domains." },
  { id: "vms", title: "Virtualization", source: "Services", description: "Virtual machines, containers, and daemons." },
  { id: "servicesModal", title: "Apps & Providers", source: "Services", description: "Applications and external service providers." },
  { id: "websitesModal", title: "Websites & DNS", source: "Services", description: "Public websites, hosting, and DNS records." },
  { id: "misc", title: "Notes", source: "Workspace", description: "Client notes and operating information." },
];

export const DEFAULT_OVERVIEW_LAYOUT: OverviewLayoutItem[] = [
  { id: "domainAD", column: 1, row: 1, columns: 6, rows: 7 },
  { id: "workstationsRaw", column: 7, row: 1, columns: 6, rows: 7 },
  { id: "networkDevices", column: 1, row: 8, columns: 6, rows: 5 },
  { id: "adminCredentials", column: 7, row: 8, columns: 6, rows: 5 },
];

export const DEFAULT_SORTS: Record<string, SortConfig> = {
  devices: { key: "IP address", direction: "asc" },
  emails: { key: "Email", direction: "asc" },
  servicesModal: { key: "Name", direction: "asc" },
  usersModal: { key: "Login", direction: "asc" },
  domainAD: { key: "IP address", direction: "asc" },
  workstations: { key: "IP Address", direction: "asc" },
};
