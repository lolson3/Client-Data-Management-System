import { NextResponse } from "next/server";
import { readMigratedDataset } from "@/lib/data/silver-datasets";

/**
 * @swagger
 * /api/data/clients:
 *   get:
 *     tags: [Data]
 *     summary: List all clients
 *     description: Returns clients from BTClientDataAPI as dropdown-ready options, sorted by label.
 *     responses:
 *       200:
 *         description: List of clients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clients:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value: { type: string, description: Company abbreviation, example: VANCE }
 *                       label: { type: string, example: Vance Industries (VANCE) }
 *                       group: { type: string }
 *       401: { description: Not authenticated }
 *       500: { description: Failed to load clients }
 */
export async function GET() {
  try {
    const companies = await readMigratedDataset("companies");
    const clients = companies
      .filter((company) => company.Abbrv && company["Company Name"])
      .map((company) => ({
        value: String(company.Abbrv),
        label: `${company["Company Name"]} (${company.Abbrv})`,
        group: company.Group || undefined,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Failed to load clients:", error);
    return NextResponse.json({ error: "Failed to load clients" }, { status: 500 });
  }
}
