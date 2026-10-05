import { NextRequest, NextResponse } from "next/server";
import { readMigratedDataset } from "@/lib/data/silver-datasets";

/**
 * GET /api/data/emails?client=XXX
 * Returns email accounts for a specific client
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

    const activeData = await readMigratedDataset("emails", client);

    return NextResponse.json({
      data: activeData,
      count: activeData.length,
    });
  } catch (error) {
    console.error("Error loading emails:", error);
    return NextResponse.json(
      { error: "Failed to load emails" },
      { status: 500 }
    );
  }
}
