import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_JWT_SECRET, getJwtSecret } from "../src/lib/auth/config";
import {
  clearLoginFailures,
  loginRetryAfterSeconds,
  recordLoginFailure,
} from "../src/lib/auth/login-rate-limit";
test("production authentication refuses a missing or default JWT secret", () => {
  const production = { NODE_ENV: "production", DISABLE_AUTH: "false" };
  assert.throws(() => getJwtSecret(production), /JWT_SECRET must be set/);
  assert.throws(
    () => getJwtSecret({ ...production, JWT_SECRET: DEFAULT_JWT_SECRET }),
    /JWT_SECRET must be set/
  );
  assert.equal(
    getJwtSecret({ ...production, JWT_SECRET: "test-only-strong-random-secret-0001" }),
    "test-only-strong-random-secret-0001"
  );
});

test("repeated login failures are temporarily rate limited", () => {
  const key = `test-${Date.now()}`;
  const now = 1_000_000;
  clearLoginFailures(key);
  for (let attempt = 0; attempt < 10; attempt += 1) recordLoginFailure(key, now);
  assert.equal(loginRetryAfterSeconds(key, now), 900);
  assert.equal(loginRetryAfterSeconds(key, now + 900_001), 0);
  clearLoginFailures(key);
});
