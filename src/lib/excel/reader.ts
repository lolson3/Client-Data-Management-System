import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { EXCEL_FILES } from "@/types/data";
import { WorkbookLockedError, withWorkbookFileLock, writeWorkbookAtomically } from "@/lib/excel/safe-write";

// Cache for parsed Excel data
const dataCache = new Map<string, { data: any[]; timestamp: number }>();

// Cache TTL from environment (default 5 minutes)
const CACHE_TTL = parseInt(process.env.EXCEL_CACHE_TTL || "300000", 10);

/**
 * Get the full path to an Excel file
 */
export function getExcelFilePath(fileKey: keyof typeof EXCEL_FILES): string {
  const config = EXCEL_FILES[fileKey];

  // Special handling for companies.xlsx - check COMPANIES_FILE_PATH at runtime
  if (fileKey === "companies" && process.env.COMPANIES_FILE_PATH) {
    return process.env.COMPANIES_FILE_PATH;
  }

  // Use custom path if specified (e.g., for companies.xlsx)
  if (config.path) {
    return config.path;
  }

  // Use base path from environment
  const basePath = process.env.EXCEL_BASE_PATH || "./Examples";
  return path.join(basePath, config.fileName);
}

/**
 * Ensure an Excel file exists, creating it with headers if missing
 */
export function ensureExcelFileExists(
  fileKey: keyof typeof EXCEL_FILES,
  headers: string[]
): void {
  const config = EXCEL_FILES[fileKey];
  const filePath = getExcelFilePath(fileKey);

  withWorkbookFileLock(filePath, () => {
    if (fs.existsSync(filePath)) return;

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(workbook, sheet, config.sheetName);
    writeWorkbookAtomically(filePath, workbook);
  });
}

/**
 * Read and parse an Excel file
 */
export function readExcelFile<T = any>(
  fileKey: keyof typeof EXCEL_FILES,
  useCache = true
): T[] {
  const config = EXCEL_FILES[fileKey];
  const filePath = getExcelFilePath(fileKey);

  // Check cache first
  if (useCache) {
    const cached = dataCache.get(fileKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as T[];
    }
  }

  try {
    // Read the Excel file
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });

    // Get the specified sheet
    const sheet = workbook.Sheets[config.sheetName];
    if (!sheet) {
      throw new Error(
        `Sheet "${config.sheetName}" not found in ${config.fileName}`
      );
    }

    // Convert sheet to JSON
    const data = XLSX.utils.sheet_to_json<T>(sheet);

    // Update cache
    dataCache.set(fileKey, { data, timestamp: Date.now() });

    return data;
  } catch (error) {
    console.error(`Error reading Excel file ${config.fileName}:`, error);
    throw error;
  }
}

/**
 * Clear cache for a specific file or all files
 */
export function clearCache(fileKey?: keyof typeof EXCEL_FILES): void {
  if (fileKey) {
    dataCache.delete(fileKey);
  } else {
    dataCache.clear();
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const stats: Record<string, { size: number; age: number }> = {};

  dataCache.forEach((value, key) => {
    stats[key] = {
      size: value.data.length,
      age: Date.now() - value.timestamp,
    };
  });

  return stats;
}

/**
 * Filter data by client
 */
export function filterByClient<T extends { Client: string }>(
  data: T[],
  client?: string
): T[] {
  if (!client) return data;
  return data.filter((item) => item.Client === client);
}

/**
 * Filter data by active status
 */
export function filterByActive<T extends { Active: number }>(
  data: T[],
  active?: boolean
): T[] {
  if (active === undefined) return data;
  return data.filter((item) => (active ? item.Active === 1 : item.Active === 0));
}

/**
 * Search data across multiple fields
 */
export function searchData<T extends Record<string, any>>(
  data: T[],
  searchTerm: string,
  fields: (keyof T)[]
): T[] {
  if (!searchTerm) return data;

  const lowerSearch = searchTerm.toLowerCase();
  return data.filter((item) =>
    fields.some((field) => {
      const value = item[field];
      return value != null && String(value).toLowerCase().includes(lowerSearch);
    })
  );
}

/**
 * Sort data by a field
 */
export function sortData<T extends Record<string, any>>(
  data: T[],
  field: keyof T,
  direction: "asc" | "desc" = "asc"
): T[] {
  return [...data].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (typeof aVal === "number" && typeof bVal === "number") {
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();

    if (direction === "asc") {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });
}

/**
 * Get all unique clients from companies file
 * Status meanings: 0=Good, 1=Billing Issue, 2=Must Contact Office
 */
export function getAllClients(): Array<{ value: string; label: string; group?: string }> {
  try {
    const companies = readExcelFile("companies");
    return companies
      .filter((c: any) => c.Abbrv && c["Company Name"]) // Only filter out entries without abbreviation or name
      .map((c: any) => ({
        value: c.Abbrv,
        label: `${c["Company Name"]} (${c.Abbrv})`,
        group: c.Group || undefined,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (error) {
    console.error("Error loading clients:", error);
    return [];
  }
}

/**
 * Validate that a client exists
 */
export function isValidClient(clientAbbr: string): boolean {
  const clients = getAllClients();
  return clients.some((c) => c.value === clientAbbr);
}

/**
 * Filter out rows where Inactive = 1
 */
export function filterOutInactive<T extends Record<string, any>>(data: T[]): T[] {
  return data.filter((item) =>
    item.Inactive !== 1 && item.Inactive !== '1' &&
    item['Is Inactive'] !== 1 && item['Is Inactive'] !== '1'
  );
}

/**
 * Update a single cell in an Excel file
 */
export function updateExcelCell(
  fileKey: keyof typeof EXCEL_FILES,
  rowIdentifier: Record<string, any>,
  columnKey: string,
  newValue: any
): boolean {
  const config = EXCEL_FILES[fileKey];
  const filePath = getExcelFilePath(fileKey);

  try {
    return withWorkbookFileLock(filePath, () => {
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const sheet = workbook.Sheets[config.sheetName];
      if (!sheet) return false;

      const data = XLSX.utils.sheet_to_json<any>(sheet);

    // Find the row matching all identifier fields
      const rowIndex = data.findIndex((row: any) =>
        Object.entries(rowIdentifier).every(([key, val]) => String(row[key]) === String(val))
      );

      if (rowIndex === -1) return false;

    // Update the value
      data[rowIndex][columnKey] = newValue;

    // Rebuild the sheet
      const newSheet = XLSX.utils.json_to_sheet(data);
      workbook.Sheets[config.sheetName] = newSheet;
      writeWorkbookAtomically(filePath, workbook);

    // Clear cache
      clearCache(fileKey);
      return true;
    });
  } catch (error) {
    if (error instanceof WorkbookLockedError) throw error;
    console.error(`Error updating cell in ${config.fileName}:`, error);
    return false;
  }
}

/**
 * Update an entire row in an Excel file
 */
export function updateExcelRow(
  fileKey: keyof typeof EXCEL_FILES,
  rowIdentifier: Record<string, any>,
  newRowData: Record<string, any>
): boolean {
  const config = EXCEL_FILES[fileKey];
  const filePath = getExcelFilePath(fileKey);

  try {
    return withWorkbookFileLock(filePath, () => {
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const sheet = workbook.Sheets[config.sheetName];
      if (!sheet) return false;

      const data = XLSX.utils.sheet_to_json<any>(sheet);

      const rowIndex = data.findIndex((row: any) =>
        Object.entries(rowIdentifier).every(([key, val]) => String(row[key]) === String(val))
      );

      if (rowIndex === -1) return false;

    // Merge new data into existing row
      data[rowIndex] = { ...data[rowIndex], ...newRowData };

      const newSheet = XLSX.utils.json_to_sheet(data);
      workbook.Sheets[config.sheetName] = newSheet;
      writeWorkbookAtomically(filePath, workbook);
      clearCache(fileKey);

      return true;
    });
  } catch (error) {
    if (error instanceof WorkbookLockedError) throw error;
    console.error(`Error updating row in ${config.fileName}:`, error);
    return false;
  }
}

/**
 * Add a new row to an Excel file
 */
export function addExcelRow(
  fileKey: keyof typeof EXCEL_FILES,
  rowData: Record<string, any>
): boolean {
  const config = EXCEL_FILES[fileKey];
  const filePath = getExcelFilePath(fileKey);

  try {
    return withWorkbookFileLock(filePath, () => {
      let workbook: XLSX.WorkBook;
      let data: any[] = [];

      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        workbook = XLSX.read(fileBuffer, { type: "buffer" });
        const sheet = workbook.Sheets[config.sheetName];
        if (!sheet) return false;
        data = XLSX.utils.sheet_to_json<any>(sheet);
      } else {
        workbook = XLSX.utils.book_new();
        const emptySheet = XLSX.utils.aoa_to_sheet([Object.keys(rowData)]);
        XLSX.utils.book_append_sheet(workbook, emptySheet, config.sheetName);
      }

      data.push(rowData);

      const newSheet = XLSX.utils.json_to_sheet(data);
      workbook.Sheets[config.sheetName] = newSheet;
      writeWorkbookAtomically(filePath, workbook);
      clearCache(fileKey);

      return true;
    });
  } catch (error) {
    if (error instanceof WorkbookLockedError) throw error;
    console.error(`Error adding row to ${config.fileName}:`, error);
    return false;
  }
}

/**
 * Delete a row from an Excel file
 */
export function deleteExcelRow(
  fileKey: keyof typeof EXCEL_FILES,
  rowIdentifier: Record<string, any>
): boolean {
  const config = EXCEL_FILES[fileKey];
  const filePath = getExcelFilePath(fileKey);

  try {
    return withWorkbookFileLock(filePath, () => {
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const sheet = workbook.Sheets[config.sheetName];
      if (!sheet) return false;

      const data = XLSX.utils.sheet_to_json<any>(sheet);

      const rowIndex = data.findIndex((row: any) =>
        Object.entries(rowIdentifier).every(([key, val]) => String(row[key]) === String(val))
      );

      if (rowIndex === -1) return false;

      data.splice(rowIndex, 1);

      const newSheet = XLSX.utils.json_to_sheet(data);
      workbook.Sheets[config.sheetName] = newSheet;
      writeWorkbookAtomically(filePath, workbook);
      clearCache(fileKey);

      return true;
    });
  } catch (error) {
    if (error instanceof WorkbookLockedError) throw error;
    console.error(`Error deleting row from ${config.fileName}:`, error);
    return false;
  }
}

/**
 * Ensure a column exists in an Excel file (add it if missing)
 */
export function ensureColumnExists(
  fileKey: keyof typeof EXCEL_FILES,
  columnName: string
): boolean {
  const config = EXCEL_FILES[fileKey];
  const filePath = getExcelFilePath(fileKey);

  try {
    return withWorkbookFileLock(filePath, () => {
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const sheet = workbook.Sheets[config.sheetName];
      if (!sheet) return false;

    // Check if column already exists by reading headers
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      const headers: string[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c });
        const cell = sheet[cellRef];
        if (cell) headers.push(String(cell.v));
      }

      if (headers.includes(columnName)) return true;

    // Add the column header
      const newColumnIndex = headers.length;
      const headerCellRef = XLSX.utils.encode_cell({ r: 0, c: newColumnIndex });
      sheet[headerCellRef] = { t: 's', v: columnName };

    // Update sheet range
      range.e.c = Math.max(range.e.c, newColumnIndex);
      sheet['!ref'] = XLSX.utils.encode_range(range);

      writeWorkbookAtomically(filePath, workbook);
      clearCache(fileKey);

      return true;
    });
  } catch (error) {
    if (error instanceof WorkbookLockedError) throw error;
    console.error(`Error ensuring column in ${config.fileName}:`, error);
    return false;
  }
}
