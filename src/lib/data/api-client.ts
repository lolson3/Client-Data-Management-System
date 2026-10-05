import "server-only";

const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_TIMEOUT_MS = 10_000;

export interface SilverRow extends Record<string, unknown> {
  id: number;
  created_at?: string;
  updated_at?: string;
}

interface SilverMutationResponse {
  row: SilverRow;
}

interface SilverListResponse {
  table: string;
  columns: string[];
  total: number;
  rows: SilverRow[];
  limit: number;
  offset: number;
}

export class DataApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "DataApiError";
  }
}

function getBaseUrl(): string {
  const value = process.env.DATA_API_BASE_URL?.trim();
  if (!value) {
    throw new DataApiError("DATA_API_BASE_URL is not configured");
  }
  return value.replace(/\/$/, "");
}

function getPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function requestJson<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  const timeoutMs = getPositiveInteger(process.env.DATA_API_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method: options.method || "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = "";
      try {
        const payload = await response.json() as { error?: string; message?: string };
        detail = payload.error || payload.message || "";
      } catch {
        // Keep the status-only error when the upstream body is not JSON.
      }
      throw new DataApiError(
        `Data API request failed with HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
        response.status,
      );
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof DataApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new DataApiError(`Data API request timed out after ${timeoutMs}ms`);
    }
    throw new DataApiError(
      `Data API request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function listSilverRows(
  table: string,
  options: { client?: string } = {},
): Promise<SilverRow[]> {
  const pageSize = Math.min(
    getPositiveInteger(process.env.DATA_API_PAGE_SIZE, DEFAULT_PAGE_SIZE),
    1000,
  );
  const rows: SilverRow[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const query = new URLSearchParams({
      limit: String(pageSize),
      offset: String(offset),
    });
    if (options.client) query.set("client", options.client);

    const page = await requestJson<SilverListResponse>(
      `/api/data/${encodeURIComponent(table)}?${query.toString()}`,
    );

    if (!Array.isArray(page.rows) || !Number.isFinite(page.total)) {
      throw new DataApiError(`Data API returned an invalid list response for ${table}`);
    }

    rows.push(...page.rows);
    total = page.total;
    if (page.rows.length === 0) break;
    offset += page.rows.length;
  }

  return rows;
}

export async function checkDataApiHealth(): Promise<boolean> {
  const response = await requestJson<{ ok?: boolean }>("/health");
  return response.ok === true;
}

export async function createSilverRow(
  table: string,
  values: Record<string, unknown>,
): Promise<SilverRow> {
  const response = await requestJson<SilverMutationResponse>(`/api/data/${encodeURIComponent(table)}`, {
    method: "POST",
    body: values,
  });
  return response.row;
}

export async function updateSilverRow(
  table: string,
  id: number,
  values: Record<string, unknown>,
): Promise<SilverRow> {
  const response = await requestJson<SilverMutationResponse>(
    `/api/data/${encodeURIComponent(table)}/${encodeURIComponent(String(id))}`,
    { method: "PATCH", body: values },
  );
  return response.row;
}

export async function archiveSilverRow(table: string, id: number): Promise<SilverRow> {
  const response = await requestJson<SilverMutationResponse>(
    `/api/data/${encodeURIComponent(table)}/${encodeURIComponent(String(id))}`,
    { method: "DELETE" },
  );
  return response.row;
}
