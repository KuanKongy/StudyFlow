/**
 * Red-bar — claim ai-001
 *
 * Clause:       "OpenAI 429 responses trigger backoff and re-queue (up to max retries)."
 * Enforcement:  worker/index.js — callOpenAI (real worker process).
 *
 * Starts a local stub that returns HTTP 429 for /v1/chat/completions. The worker container
 * must be configured with OPENAI_BASE_URL=http://host.docker.internal:19723/v1 (see docker-compose.yml).
 * If the worker uses the real OpenAI API, this job may succeed and the assertion will fail — fix env, not the test.
 *
 * Requires: Docker Compose + Auth0 M2M + worker OPENAI_BASE_URL pointing at stub (port 19723).
 *
 * Run: REDBAR_RUN_AI001_STUB=1 node --test tests/redbar/ai-001-backoff.test.mjs
 * Setup: tests/redbar/README.md (claim ai-001).
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { authFetch } from "../helpers/redbar-live.mjs";
import { waitForJobStatus } from "../helpers/redbar-jobs.mjs";
import { LIVE } from "./live-setup.mjs";
import { startOpenAI429Stub } from "../helpers/openai-stub-429.mjs";
import { redisClient, mongoWithClient, ObjectId } from "../helpers/redbar-live.mjs";

const STUB_PORT = 19723;

test("ai-001 — live: worker exhausts retries on 429 and marks job failed", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  if (process.env.REDBAR_RUN_AI001_STUB !== "1") {
    t.skip(
      "Set REDBAR_RUN_AI001_STUB=1 and worker OPENAI_BASE_URL=http://host.docker.internal:19723/v1 then restart worker (see tests/redbar/README.md)"
    );
    return;
  }

  const stub = await startOpenAI429Stub(STUB_PORT);

  const r = redisClient();
  await r.connect();
  try {
    await r.del("circuit-breaker:openai");
  } catch {
    /* */
  }

  await authFetch("/api/me");

  const cre = await authFetch("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name: `redbar-ai1-${Date.now()}`, description: "" }),
  });
  const g = await cre.json();
  const gid = (g._id || g.groupId).toString();
  const top = await authFetch("/api/topics", {
    method: "POST",
    body: JSON.stringify({ title: "ai1", groupIds: [gid] }),
  });
  assert.strictEqual(top.status, 200);
  const tj = await top.json();
  const topicId = (tj._id || tj.topicId).toString();

  const note = await authFetch("/api/notes", {
    method: "POST",
    body: JSON.stringify({ title: "n", content: "short note for 429 test", topicId }),
  });
  assert.strictEqual(note.status, 200);
  const nj = await note.json();
  const materialId = nj.materialId.toString();

  const jobRes = await authFetch(`/api/materials/${materialId}/flashcards`, {
    method: "POST",
  });
  assert.strictEqual(jobRes.status, 200);
  const { jobId } = await jobRes.json();
  const jobIdHex = jobId?.toString?.() ?? String(jobId);

  try {
    const j = await waitForJobStatus(authFetch, jobIdHex, {
      timeoutMs: 120_000,
      wantStatus: "failed",
    });
    assert.strictEqual(j.status, "failed");
    assert.ok(
      String(j.error || "").toLowerCase().includes("rate limit"),
      `expected OpenAI rate-limit failure from worker, got: ${j.error}. Is worker OPENAI_BASE_URL=http://host.docker.internal:${STUB_PORT}/v1 ?`
    );
    assert.ok(
      typeof stub.getRequestCount === "function" && stub.getRequestCount() >= 3,
      "worker should retry the OpenAI call multiple times before failing"
    );

    const { client, db } = await mongoWithClient();
    try {
      const persisted = await db.collection("jobs").findOne({ _id: new ObjectId(jobIdHex) });
      assert.ok(persisted, "job should remain queryable in MongoDB");
      assert.strictEqual(persisted.retries, 3, "job should record exhausted retries");
    } finally {
      await client.close();
    }
  } finally {
    await new Promise((res) => stub.close(() => res()));
    await r.del("circuit-breaker:openai");
    await r.quit();
    await authFetch(`/api/materials/${materialId}/note`, { method: "DELETE" });
    await authFetch(`/api/topics/${topicId}`, { method: "DELETE" });
    await authFetch(`/api/groups/${gid}`, { method: "DELETE" });
  }
});
