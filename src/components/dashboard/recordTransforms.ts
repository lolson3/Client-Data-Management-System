export function isAffirmativeValue(value: unknown): boolean {
  return value === true || value === 1 || /^(1|true|yes|enabled)$/i.test(String(value || "").trim());
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
