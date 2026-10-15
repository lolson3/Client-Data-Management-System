import test from "node:test";
import assert from "node:assert/strict";
import {
  ApiRequestError,
  apiErrorMessage,
  isUnauthorizedApiError,
  readJsonResponse,
  requestJson,
} from "../src/lib/client-api";

test("client API helper returns successful JSON responses", async () => {
  const result = await readJsonResponse<{ data: string }>(new Response(
    JSON.stringify({ data: "ok" }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  ));

  assert.deepEqual(result, { data: "ok" });
});

test("client API helper preserves API error status and message", async () => {
  await assert.rejects(
    () => readJsonResponse(new Response(
      JSON.stringify({ error: "Not authenticated" }),
      { status: 401, statusText: "Unauthorized" },
    )),
    (error: unknown) => {
      assert.ok(error instanceof ApiRequestError);
      assert.equal(error.status, 401);
      assert.equal(error.message, "Not authenticated");
      assert.equal(isUnauthorizedApiError(error), true);
      return true;
    },
  );
});

test("client API helper rejects non-JSON success bodies", async () => {
  await assert.rejects(
    () => readJsonResponse(new Response("<html>unexpected</html>", { status: 200 })),
    /invalid JSON response/,
  );
});

test("client API requests use same-origin cookies by default", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.credentials, "same-origin");
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  try {
    assert.deepEqual(await requestJson<{ ok: boolean }>("/api/test"), { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("client API error fallback handles non-Error values", () => {
  assert.equal(apiErrorMessage("failure", "Request failed"), "Request failed");
});
