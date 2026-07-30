/**
 * Verification test — claim ai-003
 *
 * Clause:       "Queued AI work and cached job status use separate Redis key namespaces."
 * Enforcement:  Redis `queue:jobs` list + API/Worker `job:{id}` status cache
 *
 * Run: node --test tests/redbar/ai-003-queue-cache-separation.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { authFetch, redisClient } from "../helpers/redbar-live.mjs";
import { waitForJobStatus } from "../helpers/redbar-jobs.mjs";
import { LIVE } from "./live-setup.mjs";

const composeDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function dockerCompose(args) {
  return execFileSync("docker", ["compose", ...args], {
    cwd: composeDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("ai-003 — queued jobs and cached job status use separate Redis keys", async (t) => {
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
    body: JSON.stringify({ name: `redbar-ai3-${Date.now()}`, description: "" }),
  });
  assert.strictEqual(cre.status, 200);
  const g = await cre.json();
  const gid = (g._id || g.groupId).toString();

  const top = await authFetch("/api/topics", {
    method: "POST",
    body: JSON.stringify({ title: "ai3", groupIds: [gid] }),
  });
  assert.strictEqual(top.status, 200);
  const tj = await top.json();
  const topicId = (tj._id || tj.topicId).toString();

  const note = await authFetch("/api/notes", {
    method: "POST",
    body: JSON.stringify({ title: "ai3", content: "queue and cache separation", topicId }),
  });
  assert.strictEqual(note.status, 200);
  const nj = await note.json();
  const materialId = nj.materialId.toString();

  const redis = redisClient();
  await redis.connect();

  let jobId;
  try {
    dockerCompose(["stop", "worker"]);

    const jobRes = await authFetch(`/api/materials/${materialId}/summary`, { method: "POST" });
    assert.strictEqual(jobRes.status, 200);
    const body = await jobRes.json();
    jobId = String(body.jobId);

    const queuedItems = await redis.lRange("queue:jobs", 0, -1);
    assert.ok(
      queuedItems.some((raw) => raw.includes(jobId)),
      "queued job should appear in queue:jobs while worker is stopped"
    );

    dockerCompose(["start", "worker"]);

    const job = await waitForJobStatus(authFetch, jobId, {
      timeoutMs: 120_000,
      wantStatus: "done",
    });
    assert.strictEqual(job.status, "done");

    const statusRes = await authFetch(`/api/jobs/${jobId}`);
    assert.strictEqual(statusRes.status, 200);
    const statusBody = await statusRes.json();
    assert.strictEqual(statusBody.status, "done");

    const queueAfter = await redis.lRange("queue:jobs", 0, -1);
    assert.ok(queueAfter.every((raw) => !raw.includes(jobId)), "queue payload should be gone after processing");

    const cachedJobStatus = await redis.get(`job:${jobId}`);
    assert.strictEqual(cachedJobStatus, "done");
  } finally {
    try {
      dockerCompose(["start", "worker"]);
    } catch {
      /* best effort */
    }
    await redis.quit();
    await authFetch(`/api/materials/${materialId}/note`, { method: "DELETE" });
    await authFetch(`/api/topics/${topicId}`, { method: "DELETE" });
    await authFetch(`/api/groups/${gid}`, { method: "DELETE" });
  }
});
