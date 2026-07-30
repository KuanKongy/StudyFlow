/**
 * Verification test — claim ops-004
 *
 * Clause:       "Failed AI jobs are marked failed and do not block later jobs."
 * Enforcement:  worker/index.js — main loop catch/continue
 *
 * Run: node --test tests/redbar/ops-004-failed-job-continues-queue.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { authFetch, mongoWithClient, redisClient } from "../helpers/redbar-live.mjs";
import { waitForJobStatus } from "../helpers/redbar-jobs.mjs";
import { LIVE, sub } from "./live-setup.mjs";

test("ops-004 — failed job does not block later queued work", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }

  const me = await authFetch("/api/me");
  assert.strictEqual(me.status, 200);
  const user = await me.json();
  const userId = user.authId;

  const cre = await authFetch("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name: `redbar-ops4-${Date.now()}`, description: "" }),
  });
  assert.strictEqual(cre.status, 200);
  const g = await cre.json();
  const gid = (g._id || g.groupId).toString();

  const top = await authFetch("/api/topics", {
    method: "POST",
    body: JSON.stringify({ title: "ops4", groupIds: [gid] }),
  });
  assert.strictEqual(top.status, 200);
  const tj = await top.json();
  const topicId = (tj._id || tj.topicId).toString();

  const huge = "x".repeat(60_001);
  const note = await authFetch("/api/notes", {
    method: "POST",
    body: JSON.stringify({ title: "ops4", content: huge, topicId }),
  });
  assert.strictEqual(note.status, 200);
  const nj = await note.json();
  const materialId = nj.materialId.toString();

  const { client, db } = await mongoWithClient();
  const redis = redisClient();
  await redis.connect();

  let badJobId;
  try {
    await redis.del(`rate:${sub}:ai`);
    const badJob = {
      type: "BROKEN_TEST_JOB",
      ownerId: userId,
      status: "queued",
      retries: 0,
      createdAt: Date.now() - 1000,
      requestId: `ops4-bad-${Date.now()}`,
    };
    const badInsert = await db.collection("jobs").insertOne(badJob);
    badJobId = String(badInsert.insertedId);
    await redis.lPush("queue:jobs", JSON.stringify({ jobId: badJobId }));

    const secondRes = await authFetch(`/api/materials/${materialId}/flashcards`, { method: "POST" });
    assert.strictEqual(secondRes.status, 200);
    const { jobId: secondJobId } = await secondRes.json();

    const bad = await waitForJobStatus(authFetch, badJobId, { timeoutMs: 120_000, wantStatus: "failed" });
    assert.match(String(bad.error || ""), /Unknown job type/);

    const second = await waitForJobStatus(authFetch, String(secondJobId), {
      timeoutMs: 120_000,
      wantStatus: "failed",
    });
    assert.match(String(second.error || ""), /Note too large/);
  } finally {
    await redis.del(`rate:${sub}:ai`);
    await redis.quit();
    await client.close();
    await authFetch(`/api/materials/${materialId}/note`, { method: "DELETE" });
    await authFetch(`/api/topics/${topicId}`, { method: "DELETE" });
    await authFetch(`/api/groups/${gid}`, { method: "DELETE" });
  }
});
