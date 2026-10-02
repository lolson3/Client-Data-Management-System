import { NextRequest, NextResponse } from "next/server";
import { readExcelFile, filterByClient, filterOutInactive } from "@/lib/excel/reader";

/**
 * GET /api/data/users?client=XXX
 * Returns user accounts for a specific client, enriched with matched workstation data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const client = searchParams.get("client");

    if (!client) {
      return NextResponse.json(
        { error: "Client parameter required" },
        { status: 400 }
      );
    }

    const data = readExcelFile("users");
    const filtered = filterByClient(data, client);
    const activeData = filterOutInactive(filtered);

    // Cross-reference with workstations
    const workstations = readExcelFile("workstations");
    const clientWorkstations = filterOutInactive(filterByClient(workstations, client));

    // Build workstation lookup by Computer Name (case-insensitive, trimmed)
    const wsMap = new Map<string, any[]>();
    clientWorkstations.forEach((ws: any) => {
      if (ws["Computer Name"]) {
        const key = String(ws["Computer Name"]).trim().toLowerCase();
        const existing = wsMap.get(key) || [];
        existing.push(ws);
        wsMap.set(key, existing);
      }
    });

    // Enrich each user with matched workstations
    const enriched = activeData.map((user: any) => {
      const computerName = user["Computer Name"] ? String(user["Computer Name"]).trim() : null;
      const matchedWS = computerName ? (wsMap.get(computerName.toLowerCase()) || []) : [];

      return {
        ...user,
        _workstations: matchedWS.map((ws: any) => ({
          computerName: ws["Computer Name"] || "-",
          ipAddress: ws["IP Address"] || "-",
          serviceTag: ws["Service Tag"] || "-",
          cpu: ws.CPU || "-",
          description: ws.Description || "-",
          grouping: ws.Grouping || "-",
          win11Capable: ws["Win11 Capable"],
        })),
        _workstationCount: matchedWS.length,
      };
    });

    return NextResponse.json({
      data: enriched,
      count: enriched.length,
    });
  } catch (error) {
    console.error("Error loading users:", error);
    return NextResponse.json(
      { error: "Failed to load users" },
      { status: 500 }
    );
  }
}
