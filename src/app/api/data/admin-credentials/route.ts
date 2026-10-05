import { NextRequest, NextResponse } from "next/server";
import { readMigratedDataset } from "@/lib/data/silver-datasets";

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

    const [clientAdminEmails, clientMitelLogins, clientAcronisBackups, clientCloudflareAdmins] =
      await Promise.all([
        readMigratedDataset("adminEmails", client),
        readMigratedDataset("adminVoipLogins", client),
        readMigratedDataset("acronisBackups", client),
        readMigratedDataset("cloudflareAdmins", client),
      ]);

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
