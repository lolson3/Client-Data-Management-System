export function isAffirmativeValue(value: unknown): boolean {
  return value === true || value === 1 || /^(1|true|yes|enabled)$/i.test(String(value || "").trim());
}

export type DeviceCategory = "network" | "server" | "printScan" | "other";

const NETWORK_DEVICE_PATTERN = /firewall|router|switch|gateway|modem|access[ -]?point|wireless[ -]?ap|\bwap\b|network appliance|pro\s*curve|procurve/i;
const SERVER_DEVICE_PATTERN = /server/i;
const PRINT_SCAN_DEVICE_PATTERN = /printer|scanner|copier|plotter|multifunction|\bmfp\b|print[ &/-]?scan/i;

/**
 * Classify records that can originate in several legacy datasets. Device Type
 * is authoritative when present; older rows can still be placed from their
 * identifying text instead of defaulting every devices-table row to printing.
 */
export function classifyDeviceRecord(record: Record<string, unknown>): DeviceCategory {
  const declaredType = String(record["Device Type"] || "").trim();
  if (NETWORK_DEVICE_PATTERN.test(declaredType)) return "network";
  if (SERVER_DEVICE_PATTERN.test(declaredType)) return "server";
  if (PRINT_SCAN_DEVICE_PATTERN.test(declaredType)) return "printScan";

  const identifyingText = [
    record.Name,
    record.Grouping,
    record.Description,
    record.Note,
    record["Note 1"],
    record["Note 2"],
    record["Note 3"],
    record["Machine Name / MAC"],
  ].filter(Boolean).join(" ");

  if (NETWORK_DEVICE_PATTERN.test(identifyingText)) return "network";
  if (SERVER_DEVICE_PATTERN.test(identifyingText)) return "server";
  if (PRINT_SCAN_DEVICE_PATTERN.test(identifyingText)) return "printScan";
  return "other";
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
