import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { isValidClient } from "@/lib/excel/reader";
import { resolveClientWorkbookPath } from "@/lib/data/client-key";
import { WorkbookLockedError, withWorkbookFileLock, writeWorkbookAtomically } from "@/lib/excel/safe-write";

// Standard and critical notes supported by the per-client notes workbook.
const MISC_COLUMNS = [
  "Notes",
  "Notes 1",
  "Notes 2",
  "Notes 3",
  "Notes 4",
  "Notes 5",
  "Notes 6",
  "Notes 7",
  "Notes 8",
  "Notes 9",
  "Critical Note",
  "Critical Note 2",
  "Critical Note 3",
  "Critical Note 4",
  "Critical Note 5",
  "Critical Note 6",
  "Critical Note 7",
  "Critical Note 8",
  "Critical Note 9",
  "Critical Note 10",
];

class MiscRequestError extends Error {}

function getMiscFilePath(client: string): string {
  const basePath = process.env.EXCEL_BASE_PATH || "./Examples";
  return resolveClientWorkbookPath(basePath, "Misc", client);
}

function isKnownClient(client: string): boolean {
  return isValidClient(client);
}

function readMiscData(filePath: string): { data: Record<string, any>[]; sheetName: string } | null {
  if (!fs.existsSync(filePath)) return null;

  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return null;

  const allData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
  const data = allData.map((row) => {
    const filtered: Record<string, any> = {};
    for (const col of MISC_COLUMNS) {
      filtered[col] = row[col] ?? "";
    }
    return filtered;
  });

  return { data, sheetName };
}

function writeMiscData(filePath: string, data: Record<string, any>[], sheetName: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  writeWorkbookAtomically(filePath, workbook);
}

/**
 * GET /api/data/misc/[client]
 * Reads the client-specific misc xlsx file from the Misc folder.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ client: string }> }
) {
  try {
    const { client } = await context.params;

    if (!client || !isKnownClient(client)) {
      return NextResponse.json(
        { error: "A valid client parameter is required" },
        { status: 400 }
      );
    }

    const filePath = getMiscFilePath(client);
    const result = readMiscData(filePath);

    if (!result) {
      return NextResponse.json({ data: [], count: 0 });
    }

    return NextResponse.json({
      data: result.data,
      count: result.data.length,
    });
  } catch (error) {
    console.error("Error reading misc file:", error);
    return NextResponse.json(
      { error: "Failed to load misc data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data/misc/[client]
 * Update, add, or delete rows in the client-specific misc xlsx file
 *
 * Body:
 * {
 *   action: 'updateCell' | 'addRow' | 'deleteNote' | 'deleteRow',
 *   rowIndex?: number,
 *   columnKey?: string,
 *   newValue?: any,
 *   rowData?: Record<string, any>
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ client: string }> }
) {
  try {
    const { client } = await context.params;

    if (!client || !isKnownClient(client)) {
      return NextResponse.json(
        { error: "A valid client parameter is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, rowIndex, columnKey, newValue, rowData } = body;

    if (!["updateCell", "addRow", "deleteNote", "deleteRow"].includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}` },
        { status: 400 }
      );
    }

    const filePath = getMiscFilePath(client);
    withWorkbookFileLock(filePath, () => {
      const result = readMiscData(filePath);
      const data = result?.data ?? [];
      const sheetName = result?.sheetName ?? "Sheet1";

      switch (action) {
      case "updateCell": {
        if (rowIndex == null || !columnKey) {
          throw new MiscRequestError("rowIndex and columnKey are required for updateCell");
        }
        if (rowIndex < 0 || rowIndex >= data.length) {
          throw new MiscRequestError(`rowIndex ${rowIndex} out of bounds`);
        }
        if (!MISC_COLUMNS.includes(columnKey)) {
          throw new MiscRequestError(`Invalid column: ${columnKey}`);
        }
        data[rowIndex][columnKey] = newValue ?? "";
        break;
      }

      case "addRow": {
        const newRow: Record<string, any> = {};
        for (const col of MISC_COLUMNS) {
          newRow[col] = rowData?.[col] ?? "";
        }
        data.push(newRow);
        break;
      }

      case "deleteNote": {
        if (rowIndex == null || !columnKey) {
          throw new MiscRequestError("rowIndex and columnKey are required for deleteNote");
        }
        if (rowIndex < 0 || rowIndex >= data.length) {
          throw new MiscRequestError(`rowIndex ${rowIndex} out of bounds`);
        }
        if (!MISC_COLUMNS.includes(columnKey)) {
          throw new MiscRequestError(`Invalid column: ${columnKey}`);
        }

        data[rowIndex][columnKey] = "";
        if (!MISC_COLUMNS.some((column) => String(data[rowIndex][column] ?? "").trim())) {
          data.splice(rowIndex, 1);
        }
        break;
      }

      case "deleteRow": {
        if (rowIndex == null) {
          throw new MiscRequestError("rowIndex is required for deleteRow");
        }
        if (rowIndex < 0 || rowIndex >= data.length) {
          throw new MiscRequestError(`rowIndex ${rowIndex} out of bounds`);
        }
        data.splice(rowIndex, 1);
        break;
      }
      }

      writeMiscData(filePath, data, sheetName);
    });

    return NextResponse.json({ success: true, message: `${action} completed successfully` });
  } catch (error: unknown) {
    console.error("Error updating misc file:", error);
    const status = error instanceof MiscRequestError ? 400 : error instanceof WorkbookLockedError ? 409 : 500;
    return NextResponse.json(
      { error: status === 500 ? "Failed to update misc data" : (error as Error).message },
      { status }
    );
  }
}
