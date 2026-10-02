import { NextRequest, NextResponse } from "next/server";
import { readExcelFile, filterByClient, filterOutInactive } from "@/lib/excel/reader";

/**
 * GET /api/data/admin-credentials?client=XXX
 * Returns all admin credentials (emails, mitel, acronis, cloudflare) for a specific client
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

    // Fetch all admin credential data
    const adminEmails = readExcelFile("adminEmails");
    const voipLogins = readExcelFile("adminVoipLogins");
    const acronisBackups = readExcelFile("acronisBackups");
    const cloudflareAdmins = readExcelFile("cloudflareAdmins");

    // Filter by client and remove inactive
    const clientAdminEmails = filterOutInactive(filterByClient(adminEmails, client));
    const clientMitelLogins = filterOutInactive(filterByClient(voipLogins, client));
    const clientAcronisBackups = filterOutInactive(filterByClient(acronisBackups, client));
    const clientCloudflareAdmins = filterOutInactive(filterByClient(cloudflareAdmins, client));

    return NextResponse.json({
      adminEmails: clientAdminEmails,
      voipLogins: clientMitelLogins,
      acronisBackups: clientAcronisBackups,
      cloudflareAdmins: clientCloudflareAdmins,
      counts: {
        adminEmails: clientAdminEmails.length,
        voipLogins: clientMitelLogins.length,
        acronisBackups: clientAcronisBackups.length,
        cloudflareAdmins: clientCloudflareAdmins.length,
      },
    });
  } catch (error) {
    console.error("Error loading admin credentials:", error);
    return NextResponse.json(
      { error: "Failed to load admin credentials" },
      { status: 500 }
    );
  }
}
