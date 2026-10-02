import { NextRequest, NextResponse } from "next/server";
import { readExcelFile, filterByClient, filterOutInactive } from "@/lib/excel/reader";

/**
 * GET /api/data/domains?client=XXX
 * Returns domains for a specific client
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

    // Domain records are small and may be maintained directly in the workbook.
    // Read them fresh so domain-type changes are immediately reflected in the UI.
    const data = readExcelFile("domains", false);
    const filtered = filterByClient(data, client);
    const activeData = filterOutInactive(filtered);

    return NextResponse.json({
      data: activeData,
      count: activeData.length,
    });
  } catch (error) {
    console.error("Error loading domains:", error);
    return NextResponse.json(
      { error: "Failed to load domains" },
      { status: 500 }
    );
  }
}
