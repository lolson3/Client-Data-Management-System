import { NextRequest, NextResponse } from "next/server";
import { readExcelFile, filterByClient, filterOutInactive } from "@/lib/excel/reader";

/**
 * GET /api/data/core?client=XXX
 * Returns core infrastructure (servers/routers/switches) for a specific client
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

    // Keep server and directory login details synchronized with workbook edits.
    const data = readExcelFile("core", false);
    const filtered = filterByClient(data, client);
    const activeData = filterOutInactive(filtered);

    return NextResponse.json({
      data: activeData,
      count: activeData.length,
    });
  } catch (error) {
    console.error("Error loading core infrastructure:", error);
    return NextResponse.json(
      { error: "Failed to load core infrastructure" },
      { status: 500 }
    );
  }
}
