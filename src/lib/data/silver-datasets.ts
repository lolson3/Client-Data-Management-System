import "server-only";

import {
  archiveSilverRow,
  createSilverRow,
  listSilverRows,
  updateSilverRow,
  type SilverRow,
} from "@/lib/data/api-client";

export type MigratedDatasetKey =
  | "core"
  | "services"
  | "domains"
  | "cameras"
  | "emails"
  | "phoneNumbers"
  | "websites"
  | "devices"
  | "containers"
  | "vms"
  | "daemons"
  | "managedInfo"
  | "users"
  | "workstations"
  | "externalInfo"
  | "adminEmails"
  | "adminVoipLogins"
  | "acronisBackups"
  | "cloudflareAdmins"
  | "guacamoleHosts"
  | "companies"
  | "miscRows";

interface DatasetDefinition {
  table: string;
  fields: Record<string, string>;
  comparisonKeys: string[];
  numberFields?: string[];
}

const FILE_KEY_ALIASES: Record<string, MigratedDatasetKey> = {
  core: "core", services: "services", domains: "domains", cameras: "cameras",
  emails: "emails", phoneNumbers: "phoneNumbers", websites: "websites", devices: "devices",
  containers: "containers", vms: "vms", daemons: "daemons", managedInfo: "managedInfo",
  users: "users", workstations: "workstations", externalInfo: "externalInfo",
  adminEmails: "adminEmails", adminVoipLogins: "adminVoipLogins",
  acronisBackups: "acronisBackups", cloudflareAdmins: "cloudflareAdmins",
  guacamoleHosts: "guacamoleHosts", companies: "companies",
  miscRows: "miscRows",
};

export const DATASETS: Record<MigratedDatasetKey, DatasetDefinition> = {
  core: {
    table: "core",
    comparisonKeys: ["Client", "Name", "SubName"],
    numberFields: [
      "on_landing_page", "cores", "ram_gb", "inactive", "rdp", "vnc", "ssh", "web",
      "ad_server",
    ],
    fields: {
      client: "Client", subname: "SubName", name: "Name", ip_address: "IP address",
      machine_name_mac: "Machine Name / MAC", service_tag: "Service Tag",
      description: "Description", login: "Login", password: "Password",
      alt_login: "Alt Login", alt_passwd: "Alt Passwd", notes: "Notes",
      notes_2: "Notes 2", on_landing_page: "On Landing Page", grouping: "Grouping",
      asset_id: "Asset ID", cores: "Cores", ram_gb: "Ram (GB)", inactive: "Inactive",
      rdp: "RDP?", vnc: "VNC?", ssh: "SSH?", web: "Web?", ad_server: "AD Server",
    },
  },
  services: {
    table: "services",
    comparisonKeys: ["Client", "Service", "Username"],
    numberFields: ["date_of_last_known_change", "inactive"],
    fields: {
      client: "Client", service: "Service", username: "Username", password: "Password",
      date_of_last_known_change: "Date of last known change", host_url: "Host / URL",
      notes: "Notes", inactive: "Inactive",
    },
  },
  domains: {
    table: "domains",
    comparisonKeys: ["Client", "Domain Name"],
    numberFields: ["inactive"],
    fields: {
      client: "Client", domain_name: "Domain Name", alt_domain: "Alt Domain",
      inactive: "Inactive",
    },
  },
  cameras: {
    table: "cameras_external",
    comparisonKeys: ["Client", "Name"],
    numberFields: ["inactive"],
    fields: {
      client: "Client", name: "Name", vendor: "Vendor", model: "Model", ip: "IP",
      howto_connect: "Howto Connect", login: "Login", password: "Password",
      notes: "Notes", notes_2: "Notes 2", host_nvr: "Host NVR", inactive: "Inactive",
    },
  },
  emails: {
    table: "emails",
    comparisonKeys: ["Client", "Email"],
    numberFields: ["mfa_or_ignore", "active", "inactive"],
    fields: {
      client: "Client", username: "Username", email: "Email", name: "Name",
      password: "Password", notes: "Notes", mfa_or_ignore: "MFA or Ignore",
      active: "Active", inactive: "Inactive", owa_override: "OWA_override",
      imap_override: "IMAP_override", pop_override: "POP_override",
      smtp_override: "SMTP_override",
    },
  },
  phoneNumbers: {
    table: "phone_numbers",
    comparisonKeys: ["Client", "Name", "Number"],
    numberFields: ["inactive"],
    fields: { client: "Client", name: "Name", number: "Number", other: "Other", inactive: "Inactive" },
  },
  websites: {
    table: "websites",
    comparisonKeys: ["Client", "DNS Host", "URL"],
    numberFields: ["inactive"],
    fields: {
      client: "Client", registrar: "Registrar",
      registrar_credential_location: "Registrar Credential Location",
      registrar_username: "Registrar Username", registrar_password: "Registrar Password",
      dns_host: "DNS Host", dns_server_credential_location: "DNS Server Credential Location",
      dns_username: "DNS Username", dns_password: "DNS Password",
      website_host: "Website Host", website_credential_location: "Website Credential Location",
      website_username: "Website Username", website_password: "Website Password",
      url: "URL", notes: "Notes", inactive: "Inactive",
    },
  },
  devices: {
    table: "devices",
    comparisonKeys: ["client", "Name"],
    numberFields: ["inactive"],
    fields: {
      client: "client", name: "Name", ip_address: "IP address",
      machine_name_mac: "Machine Name / MAC", service_tag: "Service Tag",
      login: "Login", password: "Password", note: "Note", note_1: "Note 1",
      note_2: "Note 2", note_3: "Note 3", grouping: "Grouping",
      asset_id: "Asset ID", inactive: "Inactive",
    },
  },
  containers: {
    table: "containers",
    comparisonKeys: ["Client", "Name", "IP"],
    numberFields: ["port", "inactive"],
    fields: {
      client: "Client", name: "Name", ip: "IP", port: "Port", grouping: "Grouping",
      daemon: "Daemon", startup_notes: "Startup Notes", inactive: "Inactive",
    },
  },
  vms: {
    table: "vms",
    comparisonKeys: ["Client", "Name", "Host"],
    numberFields: ["startup_memory_gb", "active", "inactive"],
    fields: {
      client: "Client", location: "Location", name: "Name", ip: "IP", type: "Type",
      host: "Host", startup_memory_gb: "Startup memory (GB)", active: "Active",
      windows_11_issue: "Windows 11 Issue?", needs_w11: "Needs W11",
      assigned_cores: "Assigned cores", assigned_to: "Assigned To", notes: "Notes",
      grouping: "Grouping", startup_notes: "Startup Notes", inactive: "Inactive",
    },
  },
  daemons: {
    table: "daemons",
    comparisonKeys: ["Client", "Name", "Host"],
    numberFields: ["inactive"],
    fields: {
      client: "Client", location: "Location", name: "Name", ip: "IP", host: "Host",
      user: "User", notes: "Notes", inactive: "Inactive", startup_notes: "Startup Notes",
    },
  },
  managedInfo: {
    table: "managed_info",
    comparisonKeys: ["Client", "Provider", "Account #"],
    numberFields: ["managed", "active", "inactive"],
    fields: {
      client: "Client", provider: "Provider", name: "Name", email: "Email", ip_1: "IP 1",
      ip_2: "IP 2", managed: "Managed", phone_1: "Phone 1", phone_2: "Phone 2",
      phone_3: "Phone 3", phone_4: "Phone 4", account: "Account #", type: "Type",
      note_1: "Note 1", note_2: "Note 2", active: "Active", inactive: "Inactive",
    },
  },
  users: {
    table: "users",
    comparisonKeys: ["Client", "Login"],
    numberFields: ["active", "inactive"],
    fields: {
      client: "Client", subname: "SubName", computer_name: "Computer Name", name: "Name",
      login: "Login", password: "Password", phone: "Phone", cell: "Cell", notes: "Notes",
      notes_2: "Notes 2", epicor_number: "Epicor Number", active: "Active",
      inactive: "Inactive", grouping: "Grouping",
    },
  },
  workstations: {
    table: "workstations",
    comparisonKeys: ["Client", "Computer Name"],
    numberFields: ["active", "inactive", "on_landing_page", "win11_capable"],
    fields: {
      client: "Client", computer_name: "Computer Name", ip_address: "IP Address",
      service_tag: "Service Tag", description: "Description", upstream: "Upstream",
      notes: "Notes", notes_2: "Notes 2", on_landing_page: "On Landing Page",
      active: "Active", inactive: "Inactive", grouping: "Grouping", asset_id: "Asset ID",
      cpu: "CPU", win11_capable: "Win11 Capable",
    },
  },
  externalInfo: {
    table: "external_info",
    comparisonKeys: ["Client", "SubName", "Device Type"],
    numberFields: ["port", "vpn_port", "dhcp", "on_landing_page", "order", "inactive"],
    fields: {
      client: "Client", subname: "SubName", connection_type: "Connection Type",
      device_type: "Device Type", ip_address: "IP address", port: "Port",
      username: "Username", password: "Password", notes: "Notes", vpn_port: "VPN Port",
      vpn_username: "VPN Username", vpn_password: "VPN Password", vpn_domain: "VPN Domain",
      dhcp: "DHCP", on_landing_page: "On Landing Page", notes_2: "Notes 2",
      current_version: "Current Version",
      last_reached_out_to_for_frimware_upgrade: "Last Reached Out To For Frimware Upgrade",
      order: "Order", grouping: "Grouping", asset_id: "Asset ID", inactive: "Inactive",
    },
  },
  adminEmails: {
    table: "admin_emails",
    comparisonKeys: ["Client", "Email"],
    numberFields: ["automate", "inactive"],
    fields: {
      client: "Client", name: "Name", email: "Email", password: "Password",
      notes: "Notes", automate: "Automate", inactive: "Inactive",
    },
  },
  adminVoipLogins: {
    table: "admin_voip_logins",
    comparisonKeys: ["Client", "Provider", "Login"],
    numberFields: ["inactive"],
    fields: {
      client: "Client", provider: "Provider", login: "Login", password: "Password",
      inactive: "Inactive",
    },
  },
  acronisBackups: {
    table: "acronis_backups",
    comparisonKeys: ["Client", "UserName"],
    numberFields: ["inactive"],
    fields: {
      acronis_cyber_cloud: "Acronis Cyber Cloud ", client: "Client", username: "UserName",
      pw: "PW", encrypt_pw: "Encrypt PW", encrypt_pw2: "Encrypt PW2",
      encrypt_pw3: "Encrypt PW3", encrypt_pw4: "Encrypt PW4",
      encrypt_pw_5: "Encrypt PW 5", encrypt_pw_6: "Encrypt PW 6",
      encrypt_pw_7: "Encrypt PW 7", inactive: "Inactive",
    },
  },
  cloudflareAdmins: {
    table: "cloudflare_admins",
    comparisonKeys: ["Client", "username"],
    numberFields: ["inactive"],
    fields: {
      client: "Client", username: "username", pass: "pass", inactive: "Inactive",
    },
  },
  guacamoleHosts: {
    table: "guacamole_hosts",
    comparisonKeys: ["Client", "Cloud Name"],
    numberFields: ["inactive"],
    fields: {
      client: "Client", cloud_name: "Cloud Name", ip: "IP", hard_coded_ip: "Hard Coded IP",
      admin_username: "Admin username", password: "Password", notes: "Notes", inactive: "Inactive",
    },
  },
  companies: {
    table: "companies",
    comparisonKeys: ["Abbrv"],
    numberFields: ["status", "inactive"],
    fields: {
      company_name: "Company Name", abbrv: "Abbrv", group: "Group", status: "Status",
      inactive: "Inactive",
    },
  },
  miscRows: {
    table: "misc_rows",
    comparisonKeys: ["Client", "Source Row"],
    numberFields: ["source_row", "inactive"],
    fields: {
      client: "Client", source_row: "Source Row", notes: "Notes", notes_1: "Notes 1",
      notes_2: "Notes 2", notes_3: "Notes 3", notes_4: "Notes 4", notes_5: "Notes 5",
      notes_6: "Notes 6", notes_7: "Notes 7", notes_8: "Notes 8", notes_9: "Notes 9",
      inactive: "Inactive",
    },
  },
};

/**
 * Filter out rows where Inactive = 1
 */
export function filterOutInactive<T extends Record<string, any>>(data: T[]): T[] {
  return data.filter((item) =>
    item.Inactive !== 1 && item.Inactive !== '1' &&
    item['Is Inactive'] !== 1 && item['Is Inactive'] !== '1'
  );
}

function normalizeValue(value: unknown, numeric: boolean): unknown {
  if (numeric && typeof value === "string" && value.trim() !== "") {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return value === null ? undefined : value;
}

function toExcelShape(row: SilverRow, definition: DatasetDefinition): Record<string, unknown> {
  const result: Record<string, unknown> = {
    _apiId: row.id,
    _apiUpdatedAt: row.updated_at,
  };
  for (const [apiField, excelField] of Object.entries(definition.fields)) {
    result[excelField] = normalizeValue(
      row[apiField],
      definition.numberFields?.includes(apiField) === true,
    );
  }
  return result;
}

function toApiShape(
  values: Record<string, unknown>,
  definition: DatasetDefinition,
): Record<string, unknown> {
  const reverseFields = new Map(
    Object.entries(definition.fields).map(([apiField, uiField]) => [uiField, apiField]),
  );
  const result: Record<string, unknown> = {};
  for (const [uiField, value] of Object.entries(values)) {
    const apiField = reverseFields.get(uiField);
    if (apiField) result[apiField] = value === undefined ? null : value;
  }
  return result;
}

export function resolveDatasetKey(fileKey: string): MigratedDatasetKey | undefined {
  return FILE_KEY_ALIASES[fileKey];
}

export async function createMigratedRow(
  fileKey: string,
  rowData: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const key = resolveDatasetKey(fileKey);
  if (!key) throw new Error(`No data API mapping exists for ${fileKey}`);
  const definition = DATASETS[key];
  const apiValues = toApiShape(rowData, definition);
  if (Object.keys(apiValues).length === 0) {
    throw new Error(`No mapped fields were supplied for ${fileKey}`);
  }
  return toExcelShape(
    await createSilverRow(definition.table, apiValues),
    definition,
  );
}

export async function updateMigratedRow(
  fileKey: string,
  id: number,
  updates: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const key = resolveDatasetKey(fileKey);
  if (!key) throw new Error(`No data API mapping exists for ${fileKey}`);
  const definition = DATASETS[key];
  const apiUpdates = toApiShape(updates, definition);
  if (Object.keys(apiUpdates).length === 0) {
    throw new Error(`No mapped fields were supplied for ${fileKey}`);
  }
  return toExcelShape(
    await updateSilverRow(definition.table, id, apiUpdates),
    definition,
  );
}

export async function archiveMigratedRow(fileKey: string, id: number): Promise<void> {
  const key = resolveDatasetKey(fileKey);
  if (!key) throw new Error(`No data API mapping exists for ${fileKey}`);
  await archiveSilverRow(DATASETS[key].table, id);
}

export async function readMigratedDataset(
  key: MigratedDatasetKey,
  client?: string,
  options: { includeInactive?: boolean } = {},
): Promise<Record<string, unknown>[]> {
  return readApiDataset(key, client, options);
}

export async function readApiDataset(
  key: MigratedDatasetKey,
  client?: string,
  options: { includeInactive?: boolean } = {},
): Promise<Record<string, unknown>[]> {
  const definition = DATASETS[key];
  const apiRows = (await listSilverRows(definition.table, { client }))
    .map((row) => toExcelShape(row, definition));
  return options.includeInactive === true ? apiRows : filterOutInactive(apiRows);
}
