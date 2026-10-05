import { NextRequest, NextResponse } from "next/server";
import { readMigratedDataset } from "@/lib/data/silver-datasets";

/**
 * GET /api/data/phone-numbers?client=XXX
 * Returns phone numbers for a specific client
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

    const activeData = await readMigratedDataset("phoneNumbers", client);

    return NextResponse.json({
      data: activeData,
      count: activeData.length,
    });
  } catch (error) {
    console.error("Error loading phone numbers:", error);
    return NextResponse.json(
      { error: "Failed to load phone numbers" },
      { status: 500 }
    );
  }
}
