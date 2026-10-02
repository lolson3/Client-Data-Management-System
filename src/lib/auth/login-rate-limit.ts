const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

interface AttemptWindow {
  failures: number;
  resetsAt: number;
}

const globalStore = globalThis as typeof globalThis & {
  __cdmsLoginAttempts?: Map<string, AttemptWindow>;
};
const attempts = globalStore.__cdmsLoginAttempts ??= new Map<string, AttemptWindow>();

function currentWindow(identifier: string, now: number): AttemptWindow | undefined {
  const existing = attempts.get(identifier);
  if (existing && existing.resetsAt > now) return existing;
  if (existing) attempts.delete(identifier);
  return undefined;
}

export function loginRetryAfterSeconds(identifier: string, now = Date.now()): number {
  const existing = currentWindow(identifier, now);
  if (!existing || existing.failures < MAX_FAILURES) return 0;
  return Math.max(1, Math.ceil((existing.resetsAt - now) / 1000));
}

export function recordLoginFailure(identifier: string, now = Date.now()): void {
  const existing = currentWindow(identifier, now);
  if (existing) {
    existing.failures += 1;
  } else {
    attempts.set(identifier, { failures: 1, resetsAt: now + WINDOW_MS });
  }
}

export function clearLoginFailures(identifier: string): void {
  attempts.delete(identifier);
}
