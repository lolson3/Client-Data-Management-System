import { NextRequest, NextResponse } from "next/server";
import { readMigratedDataset } from "@/lib/data/silver-datasets";

/**
 * GET /api/data/workstations-users?client=XXX
 * Returns workstations with their assigned users (many-to-many merged data)
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

    const clientWorkstations = await readMigratedDataset("workstations", client);
    const clientUsers = await readMigratedDataset("users", client, { includeInactive: true });

    // Build a map of Computer Name -> array of users (case-insensitive, trimmed)
    const userMap = new Map<string, any[]>();
    clientUsers.forEach((user: any) => {
      if (user["Computer Name"]) {
        const key = String(user["Computer Name"]).trim().toLowerCase();
        const existing = userMap.get(key) || [];
        existing.push(user);
        userMap.set(key, existing);
      }
    });

    // Merge workstations with all matched users
    const merged = clientWorkstations.map((ws: any) => {
      const wsComputerName = ws["Computer Name"] ? String(ws["Computer Name"]).trim() : null;
      const matchedUsers = wsComputerName ? (userMap.get(wsComputerName.toLowerCase()) || []) : [];

      const primaryUser = matchedUsers[0] || null;

      return {
        // Workstation fields
        computerName: ws["Computer Name"] || "-",
        ipAddress: ws["IP Address"] || "-",
        location: primaryUser ? primaryUser.SubName : (ws.Grouping || "-"),
        cpu: ws.CPU || "-",
        serviceTag: ws["Service Tag"] || "-",
        description: ws.Description || "-",
        win11Capable: ws["Win11 Capable"],
        Active: ws.Active,

        // Primary user fields at top level (for sorting/searching/backwards compat)
        username: primaryUser ? primaryUser.Login : "-",
        fullName: primaryUser ? primaryUser.Name : "-",
        email: primaryUser ? primaryUser.Login : "-",
        phone: primaryUser ? primaryUser.Phone : "-",

        // Many-to-many: all users
        userCount: matchedUsers.length,
        userDisplay: matchedUsers.length === 0 ? "No user" : matchedUsers.length === 1 ? (primaryUser?.Login || "-") : `${matchedUsers.length} users`,
        users: matchedUsers.map((u: any) => ({
          login: u.Login || "-",
          name: u.Name || "-",
          phone: u.Phone || "-",
          cell: u.Cell || "-",
          computerName: u["Computer Name"] || "-",
          subName: u.SubName || "-",
          _userClient: u.Client,
          _userLogin: u.Login,
          _userApiId: u._apiId,
        })),

        // Workstation identifiers for editing
        _wsClient: ws.Client,
        _wsComputerName: ws["Computer Name"],
        _wsApiId: ws._apiId,
        // Primary user identifiers for backwards compat
        _userClient: primaryUser?.Client,
        _userLogin: primaryUser?.Login,
        _userApiId: primaryUser?._apiId,
      };
    });

    return NextResponse.json({
      data: merged,
      count: merged.length,
    });
  } catch (error) {
    console.error("Error loading workstations/users:", error);
    return NextResponse.json(
      { error: "Failed to load workstations/users" },
      { status: 500 }
    );
  }
}
