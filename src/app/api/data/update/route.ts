import { NextRequest, NextResponse } from "next/server";
import {
  archiveMigratedRow,
  createMigratedRow,
  resolveDatasetKey,
  updateMigratedRow,
} from "@/lib/data/silver-datasets";

/**
 * POST /api/data/update
 * Creates, updates, or archives a BTClientDataAPI-backed dataset row.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, fileKey, columnKey, newValue, updates, rowData, apiId } = body;

    if (typeof fileKey !== "string" || !resolveDatasetKey(fileKey)) {
      return NextResponse.json({ error: `Invalid fileKey: ${fileKey}` }, { status: 400 });
    }

    if (action === "addRow") {
      if (!rowData || typeof rowData !== "object") {
        return NextResponse.json({ error: "rowData is required for addRow" }, { status: 400 });
      }
      const row = await createMigratedRow(fileKey, rowData);
      return NextResponse.json({ success: true, row });
    }

    if (!Number.isInteger(apiId) || apiId <= 0) {
      return NextResponse.json(
        { error: `A stable apiId is required for ${action}` },
        { status: 400 }
      );
    }

    if (action === "updateCell") {
      if (typeof columnKey !== "string" || !columnKey) {
        return NextResponse.json({ error: "columnKey is required for updateCell" }, { status: 400 });
      }
      const row = await updateMigratedRow(fileKey, apiId, { [columnKey]: newValue });
      return NextResponse.json({ success: true, row });
    }

    if (action === "updateRow") {
      if (!updates || typeof updates !== "object") {
        return NextResponse.json({ error: "updates are required for updateRow" }, { status: 400 });
      }
      const row = await updateMigratedRow(fileKey, apiId, updates);
      return NextResponse.json({ success: true, row });
    }

    if (action === "deleteRow" || action === "setInactive") {
      await archiveMigratedRow(fileKey, apiId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("Update API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
