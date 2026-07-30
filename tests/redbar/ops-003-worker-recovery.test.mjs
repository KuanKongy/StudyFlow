/**
 * Verification test — claim ops-003
 *
 * Clause:       "Queued jobs that remain in Redis are processed when the Worker recovers."
 * Enforcement:  Redis queue + worker/index.js recovery loop
 *
 * Run: node --test tests/redbar/ops-003-worker-recovery.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { authFetch, redisClient } from "../helpers/redbar-live.mjs";
import { waitForJobStatus } from "../helpers/redbar-jobs.mjs";
import { LIVE, sub } from "./live-setup.mjs";

const composeDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function dockerCompose(args) {
  return execFileSync("docker", ["compose", ...args], {
    cwd: composeDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("ops-003 — queued jobs still run after worker restart", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  await authFetch("/api/me");

  try {
    dockerCompose(["ps", "worker"]);
  } catch {
    t.skip("docker compose worker service is not available");
    return;
  }

  const cre = await authFetch("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name: `redbar-ops3-${Date.now()}`, description: "" }),
  });
  assert.strictEqual(cre.status, 200);
  const g = await cre.json();
  const gid = (g._id || g.groupId).toString();

  const top = await authFetch("/api/topics", {
    method: "POST",
    body: JSON.stringify({ title: "ops3", groupIds: [gid] }),
  });
  assert.strictEqual(top.status, 200);
  const tj = await top.json();
  const topicId = (tj._id || tj.topicId).toString();

  const note = await authFetch("/api/notes", {
    method: "POST",
    body: JSON.stringify({ title: "ops3", content: "x".repeat(60_001), topicId }),
  });
  assert.strictEqual(note.status, 200);
  const nj = await note.json();
  const materialId = nj.materialId.toString();

  const redis = redisClient();
  await redis.connect();

  let baselineQueueLen = 0;
  try {
    await redis.del(`rate:${sub}:ai`);
    baselineQueueLen = await redis.lLen("queue:jobs");
  } finally {
    await redis.quit();
  }

  const jobIds = [];
  try {
    dockerCompose(["stop", "worker"]);

    for (let i = 0; i < 3; i++) {
      const res = await authFetch(`/api/materials/${materialId}/flashcards`, { method: "POST" });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      jobIds.push(String(body.jobId));
    }

    const redisWhileStopped = redisClient();
    await redisWhileStopped.connect();
    try {
      const queueLen = await redisWhileStopped.lLen("queue:jobs");
      assert.ok(queueLen >= baselineQueueLen + 3, "jobs should remain queued while worker is stopped");
    } finally {
      await redisWhileStopped.quit();
    }

    dockerCompose(["start", "worker"]);

    for (const jobId of jobIds) {
      const job = await waitForJobStatus(authFetch, jobId, {
        timeoutMs: 120_000,
        wantStatus: "failed",
      });
      assert.match(String(job.error || ""), /Note too large/);
    }
  } finally {
    try {
      dockerCompose(["start", "worker"]);
    } catch {
      /* best effort */
    }
    const redisCleanup = redisClient();
    await redisCleanup.connect();
    try {
      await redisCleanup.del(`rate:${sub}:ai`);
    } finally {
      await redisCleanup.quit();
    }
    await authFetch(`/api/materials/${materialId}/note`, { method: "DELETE" });
    await authFetch(`/api/topics/${topicId}`, { method: "DELETE" });
    await authFetch(`/api/groups/${gid}`, { method: "DELETE" });
  }
});
