import { NextResponse } from "next/server";
import { getAllClients } from "@/lib/excel/reader";

/**
 * @swagger
 * /api/data/clients:
 *   get:
 *     tags: [Data]
 *     summary: List all clients
 *     description: Returns clients from companies.xlsx as dropdown-ready options, sorted by label.
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
    const clients = getAllClients();
    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Failed to load clients:", error);
    return NextResponse.json({ error: "Failed to load clients" }, { status: 500 });
  }
}
