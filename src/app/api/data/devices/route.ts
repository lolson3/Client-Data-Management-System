import { NextRequest, NextResponse } from "next/server";
import { readMigratedDataset } from "@/lib/data/silver-datasets";

/**
 * GET /api/data/devices?client=XXX
 * Returns devices (printers, scanners, etc.) for a specific client
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

    const activeData = await readMigratedDataset("devices", client);

    return NextResponse.json({
      data: activeData,
      count: activeData.length,
    });
  } catch (error) {
    console.error("Error loading devices:", error);
    return NextResponse.json(
      { error: "Failed to load devices" },
      { status: 500 }
    );
  }
}
