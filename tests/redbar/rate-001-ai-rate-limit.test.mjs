/**
 * Verification test — claim rate-001
 *
 * Clause:       "Each user is limited to 10 AI job requests per hour."
 * Enforcement:  api/src/index.js — aiRateLimiter, Redis rate:{userId}:ai
 *
 * Run: node --test tests/redbar/rate-001-ai-rate-limit.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { redisClient, authFetch } from "../helpers/redbar-live.mjs";
import { LIVE, sub } from "./live-setup.mjs";

test("rate-001 — 11th AI request returns 429", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const r = redisClient();
  await r.connect();
  try {
    await r.del(`rate:${sub}:ai`);
  } catch {
    /* */
  }
  const cre = await authFetch("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name: `redbar-rate-${Date.now()}`, description: "" }),
  });
  const g = await cre.json();
  const gid = (g._id || g.groupId).toString();
  const top = await authFetch("/api/topics", {
    method: "POST",
    body: JSON.stringify({ title: "r", groupIds: [gid] }),
  });
  assert.strictEqual(top.status, 200);
  const tj = await top.json();
  const topicId = (tj._id || tj.topicId).toString();
  const note = await authFetch("/api/notes", {
    method: "POST",
    body: JSON.stringify({ title: "n", content: "c", topicId }),
  });
  assert.strictEqual(note.status, 200);
  const nj = await note.json();
  const materialId = nj.materialId.toString();
  let lastStatus = 200;
  for (let i = 0; i < 11; i++) {
    const res = await authFetch(`/api/materials/${materialId}/flashcards`, { method: "POST" });
    lastStatus = res.status;
    if (i < 10) assert.strictEqual(res.status, 200, `request ${i + 1}`);
  }
  assert.strictEqual(lastStatus, 429);
  await r.del(`rate:${sub}:ai`);
  await r.quit();
  await authFetch(`/api/materials/${materialId}/note`, { method: "DELETE" });
  await authFetch(`/api/topics/${topicId}`, { method: "DELETE" });
  await authFetch(`/api/groups/${gid}`, { method: "DELETE" });
});
