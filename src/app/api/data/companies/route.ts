import { NextRequest, NextResponse } from "next/server";
import {
  createMigratedRow,
  readMigratedDataset,
  updateMigratedRow,
} from "@/lib/data/silver-datasets";

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

    const companies = await readMigratedDataset("companies");
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
 *     description: Writes to the companies table via BTClientDataAPI. Use `action` "add" (rejects duplicate Abbrv) or "update" (requires `apiId` to locate the row).
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
 *               apiId:
 *                 type: integer
 *                 description: Required for update — identifies the existing row
 *     responses:
 *       200: { description: Saved }
 *       400: { description: Missing rowData / apiId, or invalid action }
 *       401: { description: Not authenticated }
 *       409: { description: A company with this abbreviation already exists }
 *       500: { description: Failed to save company }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, rowData } = body;

    if (!rowData) {
      return NextResponse.json({ error: "Missing rowData" }, { status: 400 });
    }

    if (action === "add") {
      const existing = (await readMigratedDataset("companies")).some(
        (company) => String(company.Abbrv).trim().toLowerCase() ===
          String(rowData.Abbrv).trim().toLowerCase(),
      );
      if (existing) {
        return NextResponse.json(
          { error: "A company with this abbreviation already exists" },
          { status: 409 },
        );
      }
      const company = await createMigratedRow("companies", rowData);
      return NextResponse.json({ success: true, company });
    }

    if (action === "update") {
      const apiId = body.apiId;
      if (!Number.isInteger(apiId) || apiId <= 0) {
        return NextResponse.json({ error: "Missing company apiId" }, { status: 400 });
      }
      const company = await updateMigratedRow("companies", apiId, rowData);
      return NextResponse.json({ success: true, company });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Failed to save company:", error);
    return NextResponse.json({ error: "Failed to save company" }, { status: 500 });
  }
}
