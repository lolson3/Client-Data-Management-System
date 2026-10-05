import { NextResponse } from "next/server";
import { checkDataSources } from "@/lib/data/registry";
import { version } from "../../../../package.json";

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [System]
 *     summary: Check every data source the server depends on
 *     description: >
 *       Runs the same precheck as server startup: for each dataset, reports
 *       the source type (sqlite/api), the resolved location the server is
 *       actually using, whether it is reachable, and the row count.
 *     responses:
 *       200:
 *         description: Data source manifest
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 version: { type: string }
 *                 ok: { type: boolean, description: True when every required source is readable }
 *                 summary: { type: string, example: 24/24 data sources OK }
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key: { type: string, example: core }
 *                       type: { type: string, enum: [sqlite, api] }
 *                       container: { type: string, description: Table name(s) }
 *                       ok: { type: boolean }
 *                       rows: { type: integer }
 *       503: { description: One or more required data sources are unavailable }
 */
export async function GET() {
  const sources = await checkDataSources();
  const okCount = sources.filter((s) => s.ok).length;
  const failing = sources.filter((s) => !s.ok);

  const ok = failing.length === 0;
  return NextResponse.json({
    version,
    ok,
    summary: `${okCount}/${sources.length} data sources OK`,
    sources: sources.map(({ key, type, container, ok: sourceOk, rows }) => ({
      key,
      type,
      container,
      ok: sourceOk,
      rows,
    })),
  }, { status: ok ? 200 : 503 });
}
