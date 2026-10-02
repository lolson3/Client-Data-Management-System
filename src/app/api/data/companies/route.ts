import { NextRequest, NextResponse } from "next/server";
import { addExcelRow, updateExcelRow, ensureExcelFileExists, readExcelFile } from "@/lib/excel/reader";

/**
 * @swagger
 * /api/data/companies:
 *   get:
 *     tags: [Data]
 *     summary: Get a company by abbreviation
 *     parameters:
 *       - name: abbrv
 *         in: query
 *         required: true
 *         schema: { type: string }
 *         description: Company abbreviation (the Abbrv column)
 *     responses:
 *       200:
 *         description: The matching company row
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 company: { $ref: '#/components/schemas/Company' }
 *       400: { description: Missing abbrv }
 *       401: { description: Not authenticated }
 *       404: { description: Company not found }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const abbrv = searchParams.get("abbrv");

    if (!abbrv) {
      return NextResponse.json({ error: "Missing abbrv" }, { status: 400 });
    }

    const companies = readExcelFile("companies");
    const company = companies.find((c: any) => String(c.Abbrv) === abbrv);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (error: any) {
    console.error("Failed to load company:", error);
    return NextResponse.json({ error: "Failed to load company" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/data/companies:
 *   post:
 *     tags: [Data]
 *     summary: Add or update a company
 *     description: Writes to companies.xlsx. Use `action` "add" (rejects duplicate Abbrv) or "update" (requires `rowIdentifier.Abbrv` to locate the row).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, rowData]
 *             properties:
 *               action: { type: string, enum: [add, update] }
 *               rowData: { $ref: '#/components/schemas/Company' }
 *               rowIdentifier:
 *                 type: object
 *                 description: Required for update — identifies the existing row
 *                 properties:
 *                   Abbrv: { type: string }
 *     responses:
 *       200: { description: Saved }
 *       400: { description: Missing rowData / identifier, or invalid action }
 *       401: { description: Not authenticated }
 *       409: { description: A company with this abbreviation already exists }
 *       500: { description: Failed to save company }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, rowData, rowIdentifier } = body;

    if (!rowData) {
      return NextResponse.json({ error: "Missing rowData" }, { status: 400 });
    }

    ensureExcelFileExists("companies", ["Company Name", "Abbrv", "Group", "Status"]);

    if (action === "add") {
      const existing = readExcelFile("companies").some(
        (c: any) => String(c.Abbrv).trim().toLowerCase() === String(rowData.Abbrv).trim().toLowerCase()
      );
      if (existing) {
        return NextResponse.json({ error: "A company with this abbreviation already exists" }, { status: 409 });
      }

      const success = addExcelRow("companies", rowData);
      if (!success) {
        return NextResponse.json({ error: "Failed to add company" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "update") {
      if (!rowIdentifier?.Abbrv) {
        return NextResponse.json({ error: "Missing company identifier" }, { status: 400 });
      }

      const success = updateExcelRow("companies", rowIdentifier, rowData);
      if (!success) {
        return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Failed to save company:", error);
    return NextResponse.json({ error: "Failed to save company" }, { status: 500 });
  }
}
