export class ApiRequestError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

function responseMessage(payload: unknown, status: number, statusText: string): string {
  if (payload && typeof payload === "object") {
    const candidate = payload as { error?: unknown; message?: unknown };
    if (typeof candidate.error === "string" && candidate.error.trim()) {
      return candidate.error;
    }
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message;
    }
  }
  if (typeof payload === "string" && payload.trim()) return payload;
  return statusText || `Request failed with status ${status}`;
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const rawBody = await response.text();
  let payload: unknown;

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = rawBody;
    }
  }

  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      responseMessage(payload, response.status, response.statusText),
      payload,
    );
  }

  if (rawBody && typeof payload === "string") {
    throw new ApiRequestError(
      response.status,
      "The server returned an invalid JSON response",
      payload,
    );
  }

  return payload as T;
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    credentials: "same-origin",
    ...init,
  });
  return readJsonResponse<T>(response);
}

export function isUnauthorizedApiError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === 401;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
