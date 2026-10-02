import { NextRequest, NextResponse } from "next/server";
import { readExcelFile, filterByClient, filterOutInactive, ensureExcelFileExists } from "@/lib/excel/reader";

const WEBSITE_HEADERS = [
  "Client",
  "Registrar", "Registrar Credential Location",
  "Registrar Username", "Registrar Password",
  "DNS Host", "DNS Server Credential Location",
  "DNS Username", "DNS Password",
  "Website Host", "Website Credential Location",
  "Website Username", "Website Password",
  "URL", "Notes", "Is Inactive"
];

/**
 * GET /api/data/websites?client=XXX
 * Returns website/DNS records for a specific client
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

    // Auto-create the file if it doesn't exist
    ensureExcelFileExists("websites", WEBSITE_HEADERS);

    const data = readExcelFile("websites");
    const filtered = filterByClient(data, client);
    const activeData = filterOutInactive(filtered);

    return NextResponse.json({
      data: activeData,
      count: activeData.length,
    });
  } catch (error) {
    console.error("Error loading websites:", error);
    return NextResponse.json(
      { error: "Failed to load websites" },
      { status: 500 }
    );
  }
}
