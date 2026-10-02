import { NextRequest, NextResponse } from "next/server";
import { readExcelFile, filterByClient, filterOutInactive } from "@/lib/excel/reader";

/**
 * GET /api/data/containers?client=XXX
 * Returns containers for a specific client
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

    const data = readExcelFile("containers");
    const filtered = filterByClient(data, client);
    const activeData = filterOutInactive(filtered);

    return NextResponse.json({
      data: activeData,
      count: activeData.length,
    });
  } catch (error) {
    console.error("Error loading containers:", error);
    return NextResponse.json(
      { error: "Failed to load containers" },
      { status: 500 }
    );
  }
}
