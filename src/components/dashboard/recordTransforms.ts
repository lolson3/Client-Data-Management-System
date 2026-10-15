export function isAffirmativeValue(value: unknown): boolean {
  return value === true || value === 1 || /^(1|true|yes|enabled)$/i.test(String(value || "").trim());
}

export type DeviceCategory = "network" | "server" | "printScan" | "other";
export type DeviceOrganizationConfidence = "explicit" | "inferred" | "review";

export interface DeviceOrganization {
  category: DeviceCategory;
  confidence: DeviceOrganizationConfidence;
  basis: string;
}

export const ACCOUNT_ENTRY_TYPES = [
  "Windows / Domain",
  "Application",
  "Administrative Email",
  "VoIP Administration",
  "Backup Administration",
  "DNS Administration",
  "Remote Access",
] as const;

export interface PreparedAccountRecord {
  fileKey: string;
  rowData: Record<string, unknown>;
}

export function prepareAccountRecord(data: Record<string, unknown>): PreparedAccountRecord {
  const client = data.Client;
  const accountType = String(data["Account Type"] || "");
  const owner = data.Owner || "Client-wide";
  const account = data.Account;
  const password = data.Password;
  const resource = data.Resource;
  const url = data.URL;
  const notes = data.Notes;
  const requireResource = (): unknown => {
    if (!String(resource || "").trim()) {
      throw new Error(`${accountType} requires a resource, service, or provider`);
    }
    return resource;
  };

  switch (accountType) {
    case "Windows / Domain":
      return { fileKey: "users", rowData: { Client: client, Name: owner, Login: account, Password: password, "Computer Name": resource, Notes: notes, Active: 1 } };
    case "Application":
      return { fileKey: "services", rowData: { Client: client, Service: requireResource(), Username: account, Password: password, "Host / URL": url, Notes: notes } };
    case "Administrative Email":
      return { fileKey: "adminEmails", rowData: { Client: client, Name: owner, Email: account, Password: password, Notes: notes } };
    case "VoIP Administration":
      return { fileKey: "adminVoipLogins", rowData: { Client: client, Provider: requireResource(), Login: account, Password: password } };
    case "Backup Administration":
      return { fileKey: "acronisBackups", rowData: { Client: client, "Acronis Cyber Cloud ": requireResource(), UserName: account, PW: password } };
    case "DNS Administration":
      return { fileKey: "cloudflareAdmins", rowData: { Client: client, username: account, pass: password } };
    case "Remote Access":
      return { fileKey: "guacamoleHosts", rowData: { Client: client, "Cloud Name": requireResource(), IP: url, "Admin username": account, Password: password, Notes: notes } };
    default:
      throw new Error("Select a supported account type");
  }
}

const NETWORK_DEVICE_PATTERN = /firewall|router|switch|gateway|modem|access[ -]?point|wireless[ -]?ap|\bwap\b|network appliance|pro\s*curve|procurve/i;
const SERVER_DEVICE_PATTERN = /server/i;
const PRINT_SCAN_DEVICE_PATTERN = /printer|scanner|copier|plotter|multifunction|\bmfp\b|print\s*[&/-]\s*scan/i;

function categoryFromText(value: unknown): DeviceCategory | null {
  const text = String(value || "").trim();
  if (!text) return null;
  if (NETWORK_DEVICE_PATTERN.test(text)) return "network";
  if (SERVER_DEVICE_PATTERN.test(text)) return "server";
  if (PRINT_SCAN_DEVICE_PATTERN.test(text)) return "printScan";
  return null;
}

export function organizeDeviceRecord(record: Record<string, unknown>): DeviceOrganization {
  const declaredType = String(record["Device Type"] || "").trim();
  const explicitCategory = categoryFromText(declaredType);
  if (explicitCategory) {
    return { category: explicitCategory, confidence: "explicit", basis: "Device Type" };
  }

  const inferenceFields: Array<[string, unknown]> = [
    ["Grouping", record.Grouping],
    ["Name", record.Name],
    ["Machine Name / MAC", record["Machine Name / MAC"]],
    ["Description", record.Description],
    ["Note", record.Note],
    ["Note 1", record["Note 1"]],
    ["Note 2", record["Note 2"]],
    ["Note 3", record["Note 3"]],
  ];

  for (const [field, value] of inferenceFields) {
    const category = categoryFromText(value);
    if (category) return { category, confidence: "inferred", basis: field };
  }

  return { category: "other", confidence: "review", basis: "No recognized type" };
}

/**
 * Classify records that can originate in several legacy datasets. Device Type
 * is authoritative when present; older rows can still be placed from their
 * identifying text instead of defaulting every devices-table row to printing.
 */
export function classifyDeviceRecord(record: Record<string, unknown>): DeviceCategory {
  return organizeDeviceRecord(record).category;
}

export function recordNoteFields(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => /^Notes?(?:\s+\d+)?$/i.test(key)),
  );
}

export function flattenMiscNotes(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.flatMap((row, rowIndex) => (
    Object.entries(row).flatMap(([columnKey, rawValue]) => {
      const note = String(rawValue ?? "").trim();
      const isStandardNote = /^Notes?(?:\s+\d+)?$/i.test(columnKey);
      const isCriticalNote = /^Critical Notes?(?:\s+\d+)?$/i.test(columnKey);
      if (!note || (!isStandardNote && !isCriticalNote)) return [];

      return [{
        Note: note,
        ...(isCriticalNote ? { _original: { "Critical Note": note } } : {}),
        _apiId: row._apiId,
        _rowIndex: rowIndex,
        _columnKey: columnKey,
      }];
    })
  ));
}

export interface NoteSource {
  fileKey: string;
  row: Record<string, unknown>;
  identifierKeys: string[];
}

export function noteSource(fileKey: string, row: Record<string, unknown>, identifierKeys: string[]): NoteSource {
  return { fileKey, row, identifierKeys };
}
