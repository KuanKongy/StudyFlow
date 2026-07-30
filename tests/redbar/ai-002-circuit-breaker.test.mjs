/**
 * Verification test — claim ai-002
 *
 * Clause:       "Circuit breaker blocks new AI jobs when OpenAI is overloaded (503 from API)."
 * Enforcement:  Redis circuit-breaker:openai; api — aiCircuitBreaker
 *
 * Unit coverage of 429 → breaker key overlaps ai-001 mock pattern; this file asserts live API 503.
 *
 * Run: node --test tests/redbar/ai-002-circuit-breaker.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { redisClient, authFetch } from "../helpers/redbar-live.mjs";
import { waitForJobStatus } from "../helpers/redbar-jobs.mjs";
import { LIVE } from "./live-setup.mjs";
import { startOpenAI429Stub } from "../helpers/openai-stub-429.mjs";

const STUB_PORT = 19723;

test("ai-002 — repeated OpenAI 429s trip breaker and API returns 503", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  if (process.env.REDBAR_RUN_AI001_STUB !== "1") {
    t.skip(
      "Set REDBAR_RUN_AI001_STUB=1 and worker OPENAI_BASE_URL=http://host.docker.internal:19723/v1 then restart worker"
    );
    return;
  }

  const stub = await startOpenAI429Stub(STUB_PORT);
  const r = redisClient();
  await r.connect();
  try {
    await r.del("circuit-breaker:openai");

    await authFetch("/api/me");

    const cre = await authFetch("/api/groups", {
      method: "POST",
      body: JSON.stringify({ name: `redbar-cb-${Date.now()}`, description: "" }),
    });
    const g = await cre.json();
    const gid = (g._id || g.groupId).toString();
    const top = await authFetch("/api/topics", {
      method: "POST",
      body: JSON.stringify({ title: "cb", groupIds: [gid] }),
    });
    const tj = await top.json();
    const topicId = (tj._id || tj.topicId).toString();
    const note = await authFetch("/api/notes", {
      method: "POST",
      body: JSON.stringify({ title: "n", content: "c", topicId }),
    });
    const nj = await note.json();
    const materialId = nj.materialId.toString();

    const firstJobRes = await authFetch(`/api/materials/${materialId}/flashcards`, { method: "POST" });
    assert.strictEqual(firstJobRes.status, 200);
    const { jobId } = await firstJobRes.json();

    const failedJob = await waitForJobStatus(authFetch, String(jobId), {
      timeoutMs: 120_000,
      wantStatus: "failed",
    });
    assert.match(String(failedJob.error || ""), /rate limit/i);

    const breaker = await r.get("circuit-breaker:openai");
    assert.ok(breaker, "worker should trip circuit-breaker:openai after repeated 429s");

    const res = await authFetch(`/api/materials/${materialId}/flashcards`, { method: "POST" });
    assert.strictEqual(res.status, 503);
    const body = await res.json();
    assert.ok(String(body.error || "").includes("unavailable"));
    await authFetch(`/api/materials/${materialId}/note`, { method: "DELETE" });
    await authFetch(`/api/topics/${topicId}`, { method: "DELETE" });
    await authFetch(`/api/groups/${gid}`, { method: "DELETE" });
  } finally {
    await r.del("circuit-breaker:openai");
    await r.quit();
    await new Promise((res) => stub.close(() => res()));
  }
});
