import { NextRequest, NextResponse } from "next/server";
import {
  archiveMigratedRow,
  createMigratedRow,
  readApiDataset,
  updateMigratedRow,
} from "@/lib/data/silver-datasets";

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
];

const isPositiveInteger = (value: unknown): value is number => (
  typeof value === "number" && Number.isInteger(value) && value > 0
);

/**
 * GET /api/data/misc/[client]
 * Returns the client's misc note rows from BTClientDataAPI.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ client: string }> }
) {
  try {
    const { client } = await context.params;
    if (!client) {
      return NextResponse.json({ error: "Client parameter required" }, { status: 400 });
    }

    const data = await readApiDataset("miscRows", client);
    return NextResponse.json({ data, count: data.length });
  } catch (error) {
    console.error("Error reading misc data:", error);
    return NextResponse.json({ error: "Failed to load misc data" }, { status: 500 });
  }
}

/**
 * POST /api/data/misc/[client]
 * Adds, edits, clears, or archives a client note row through BTClientDataAPI.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ client: string }> }
) {
  try {
    const { client } = await context.params;
    if (!client) {
      return NextResponse.json({ error: "Client parameter required" }, { status: 400 });
    }

    const body = await request.json();
    const { action, columnKey, newValue, rowData, apiId } = body;
    if (!["updateCell", "addRow", "deleteNote", "deleteRow"].includes(action)) {
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    if (action === "addRow") {
      const row = await createMigratedRow("miscRows", { Client: client, ...rowData });
      return NextResponse.json({ success: true, row });
    }

    if (!isPositiveInteger(apiId)) {
      return NextResponse.json(
        { error: `A stable apiId is required for ${action}` },
        { status: 400 }
      );
    }

    if (action === "updateCell" || action === "deleteNote") {
      if (!MISC_COLUMNS.includes(columnKey)) {
        return NextResponse.json({ error: `Invalid column: ${columnKey}` }, { status: 400 });
      }

      if (action === "deleteNote") {
        const rows = await readApiDataset("miscRows", client);
        const current = rows.find((row) => Number(row._apiId) === apiId);
        if (!current) {
          return NextResponse.json({ error: "Note row not found" }, { status: 404 });
        }

        const hasOtherNotes = MISC_COLUMNS.some((key) => (
          key !== columnKey && String(current[key] ?? "").trim().length > 0
        ));
        if (!hasOtherNotes) {
          await archiveMigratedRow("miscRows", apiId);
          return NextResponse.json({ success: true });
        }
      }

      const row = await updateMigratedRow(
        "miscRows",
        apiId,
        { [columnKey]: action === "deleteNote" ? "" : (newValue ?? "") }
      );
      return NextResponse.json({ success: true, row });
    }

    await archiveMigratedRow("miscRows", apiId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating misc data:", error);
    return NextResponse.json({ error: "Failed to update misc data" }, { status: 500 });
  }
}
