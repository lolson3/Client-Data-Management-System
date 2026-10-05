import { NextRequest, NextResponse } from "next/server";
import { filterOutInactive, readMigratedDataset } from "@/lib/data/silver-datasets";

/**
 * GET /api/data/external-info?client=XXX
 * Returns external info (firewalls/routers) for a specific client
 * Includes internal IP address from core infrastructure data
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

    const filteredExternal = await readMigratedDataset("externalInfo", client, {
      includeInactive: true,
    });

    // Get core infrastructure data to find internal IPs
    const filteredCore = await readMigratedDataset("core", client, { includeInactive: true });

    // Enrich external info with internal IP from core data
    const enrichedData = filteredExternal.map((item: any) => {
      // Find matching core item by SubName (location) and device type keywords
      const deviceType = (item["Device Type"] || "").toLowerCase();

      // Look for a core item at the same location that matches the device type
      const matchingCore = filteredCore.find((core: any) => {
        if (core.SubName !== item.SubName) return false;

        const coreName = (core.Name || "").toLowerCase();
        const coreDesc = (core.Description || "").toLowerCase();

        // Match if core name/description contains the device type or common network device keywords
        return coreName.includes(deviceType) ||
               coreDesc.includes(deviceType) ||
               (deviceType.includes("firewall") && (coreName.includes("firewall") || coreDesc.includes("firewall"))) ||
               (deviceType.includes("router") && (coreName.includes("router") || coreDesc.includes("router"))) ||
               (deviceType.includes("gateway") && (coreName.includes("gateway") || coreDesc.includes("gateway")));
      });

      // If no keyword match, try matching just by SubName for single-device locations
      const fallbackCore = !matchingCore
        ? filteredCore.find((core: any) => core.SubName === item.SubName)
        : null;

      const coreItem = matchingCore || fallbackCore;

      return {
        ...item,
        IntIP: coreItem?.["IP address"] || null,
        // Include core identifiers for editing IntIP (updates Core.xlsx)
        _coreClient: coreItem?.Client,
        _coreName: coreItem?.Name,
        _coreApiId: coreItem?._apiId,
      };
    });

    // Filter out inactive rows
    const activeData = filterOutInactive(enrichedData);

    return NextResponse.json({
      data: activeData,
      count: activeData.length,
    });
  } catch (error) {
    console.error("Error loading external info:", error);
    return NextResponse.json(
      { error: "Failed to load external info" },
      { status: 500 }
    );
  }
}
