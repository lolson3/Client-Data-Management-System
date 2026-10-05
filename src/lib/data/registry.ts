/**
 * Data-source registry: the single place that knows where every piece of
 * app data currently lives, and how to verify it's reachable.
 *
 * Application datasets are served by the data API. The SQLite auth/preferences
 * database remains local.
 *
 * Consumed by src/instrumentation.ts (startup report) and /api/health.
 */

import { checkDataApiHealth } from "@/lib/data/api-client";
import { DATASETS } from "@/lib/data/silver-datasets";

export type DataSourceType = "sqlite" | "api";

export interface DataSourceStatus {
  /** Dataset key, e.g. "core", "companies", "auth-db" */
  key: string;
  type: DataSourceType;
  /** Resolved path the server actually uses */
  location: string;
  /** Table name (sqlite) or comma-separated table list (api) */
  container: string;
  ok: boolean;
  /** Row count when ok */
  rows?: number;
  /** Why the check failed */
  error?: string;
}

async function checkSqliteSources(): Promise<DataSourceStatus[]> {
  const location = process.env.AUTH_DB_PATH || "./data/auth.db";
  const tables: Array<{ key: string; table: string }> = [
    { key: "auth-db", table: "users" },
    { key: "preferences-db", table: "user_preferences" },
  ];

  try {
    const { getDb, getDbLoadError } = await import("@/lib/db/sqlite");
    const db = await getDb();
    if (!db) {
      const reason = getDbLoadError();
      return tables.map(({ key, table }) => ({
        key,
        type: "sqlite" as const,
        location,
        container: table,
        ok: false,
        error: reason
          ? `better-sqlite3 failed to load: ${reason}`
          : "better-sqlite3 unavailable",
      }));
    }
    return tables.map(({ key, table }) => {
      try {
        const { n } = db
          .prepare(`SELECT COUNT(*) AS n FROM ${table}`)
          .get() as { n: number };
        return { key, type: "sqlite" as const, location, container: table, ok: true, rows: n };
      } catch (error) {
        return {
          key,
          type: "sqlite" as const,
          location,
          container: table,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
  } catch (error) {
    return tables.map(({ key, table }) => ({
      key,
      type: "sqlite" as const,
      location,
      container: table,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

async function checkSilverApi(): Promise<DataSourceStatus> {
  const location = process.env.DATA_API_BASE_URL || "not configured";
  const base: DataSourceStatus = {
    key: "silver-api",
    type: "api",
    location,
    container: Object.values(DATASETS).map(({ table }) => table).join(", "),
    ok: false,
  };

  try {
    return { ...base, ok: await checkDataApiHealth() };
  } catch (error) {
    return {
      ...base,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check every registered data source.
 */
export async function checkDataSources(): Promise<DataSourceStatus[]> {
  const sqlite = await checkSqliteSources();
  const api = await checkSilverApi();
  return [api, ...sqlite];
}
