import { NextRequest, NextResponse } from "next/server";
import { readExcelFile, filterByClient, filterOutInactive } from "@/lib/excel/reader";

/**
 * GET /api/data/workstations?client=XXX
 * Returns raw workstation data for a specific client, enriched with matched user data
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

    const data = readExcelFile("workstations");
    const filtered = filterByClient(data, client);
    const activeData = filterOutInactive(filtered);

    // Cross-reference with users
    const users = readExcelFile("users");
    const clientUsers = filterByClient(users, client);

    // Build user lookup by Computer Name (case-insensitive, trimmed)
    const userMap = new Map<string, any[]>();
    clientUsers.forEach((user: any) => {
      if (user["Computer Name"]) {
        const key = String(user["Computer Name"]).trim().toLowerCase();
        const existing = userMap.get(key) || [];
        existing.push(user);
        userMap.set(key, existing);
      }
    });

    // Enrich each workstation with matched users
    const enriched = activeData.map((ws: any) => {
      const computerName = ws["Computer Name"] ? String(ws["Computer Name"]).trim() : null;
      const matchedUsers = computerName ? (userMap.get(computerName.toLowerCase()) || []) : [];

      return {
        ...ws,
        _users: matchedUsers.map((u: any) => ({
          name: u.Name || "-",
          login: u.Login || "-",
          phone: u.Phone || "-",
          cell: u.Cell || "-",
          subName: u.SubName || "-",
          notes: u.Notes || "-",
        })),
        _userCount: matchedUsers.length,
      };
    });

    return NextResponse.json({
      data: enriched,
      count: enriched.length,
    });
  } catch (error) {
    console.error("Error loading workstations:", error);
    return NextResponse.json(
      { error: "Failed to load workstations" },
      { status: 500 }
    );
  }
}
