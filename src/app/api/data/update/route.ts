import { NextRequest, NextResponse } from "next/server";
import { updateExcelCell, updateExcelRow, addExcelRow, deleteExcelRow, ensureColumnExists } from "@/lib/excel/reader";
import { EXCEL_FILES } from "@/types/data";
import { WorkbookLockedError } from "@/lib/excel/safe-write";

/**
 * POST /api/data/update
 * Update, add, or delete data in Excel files
 *
 * Body:
 * {
 *   action: 'updateCell' | 'updateRow' | 'addRow' | 'deleteRow' | 'setInactive',
 *   fileKey: string (e.g., 'core', 'users', 'services'),
 *   rowIdentifier: { [key]: value } (for identifying the row),
 *   columnKey?: string (for updateCell),
 *   newValue?: any (for updateCell),
 *   updates?: { [key]: value } (for updateRow),
 *   rowData?: { [key]: value } (for addRow),
 *   inactive?: number (for setInactive, 1 = inactive, 0 = active)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, fileKey, rowIdentifier, columnKey, newValue, updates, rowData } = body;

    // Validate fileKey
    if (!fileKey || !(fileKey in EXCEL_FILES)) {
      return NextResponse.json(
        { error: `Invalid fileKey: ${fileKey}` },
        { status: 400 }
      );
    }

    // Validate action
    if (!['updateCell', 'updateRow', 'addRow', 'deleteRow', 'setInactive'].includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}` },
        { status: 400 }
      );
    }

    let success = false;

    switch (action) {
      case 'updateCell':
        if (!rowIdentifier || !columnKey) {
          return NextResponse.json(
            { error: 'rowIdentifier and columnKey are required for updateCell' },
            { status: 400 }
          );
        }
        success = updateExcelCell(fileKey as keyof typeof EXCEL_FILES, rowIdentifier, columnKey, newValue);
        break;

      case 'updateRow':
        if (!rowIdentifier || !updates) {
          return NextResponse.json(
            { error: 'rowIdentifier and updates are required for updateRow' },
            { status: 400 }
          );
        }
        success = updateExcelRow(fileKey as keyof typeof EXCEL_FILES, rowIdentifier, updates);
        break;

      case 'addRow':
        if (!rowData) {
          return NextResponse.json(
            { error: 'rowData is required for addRow' },
            { status: 400 }
          );
        }
        success = addExcelRow(fileKey as keyof typeof EXCEL_FILES, rowData);
        break;

      case 'deleteRow':
        if (!rowIdentifier) {
          return NextResponse.json(
            { error: 'rowIdentifier is required for deleteRow' },
            { status: 400 }
          );
        }
        success = deleteExcelRow(fileKey as keyof typeof EXCEL_FILES, rowIdentifier);
        break;

      case 'setInactive':
        if (!rowIdentifier) {
          return NextResponse.json(
            { error: 'rowIdentifier is required for setInactive' },
            { status: 400 }
          );
        }
        // Ensure the Inactive column exists (adds it if missing)
        const inactiveColumn = body.inactiveColumn || 'Inactive';
        ensureColumnExists(fileKey as keyof typeof EXCEL_FILES, inactiveColumn);
        // Set Inactive value (default to 1 if not specified)
        const inactiveValue = body.inactive !== undefined ? body.inactive : 1;
        success = updateExcelCell(fileKey as keyof typeof EXCEL_FILES, rowIdentifier, inactiveColumn, inactiveValue);
        break;
    }

    if (success) {
      return NextResponse.json({ success: true, message: `${action} completed successfully` });
    } else {
      return NextResponse.json(
        { error: `${action} failed` },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Update API error:', error);
    if (error instanceof WorkbookLockedError) {
      return NextResponse.json(
        { error: "This workbook is being updated by another request. Please retry." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
