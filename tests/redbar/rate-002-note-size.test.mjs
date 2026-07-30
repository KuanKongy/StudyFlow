/**
 * Red-bar — claim rate-002
 *
 * Clause:       "Note content sent to OpenAI is capped at 50,000 characters."
 * Enforcement:  worker/index.js — before OpenAI (fails job, not UI-only).
 * Complementary: frontend/src/lib/validation.ts (UX cap).
 *
 * This test exercises the real worker path: oversized note → job failed with worker error.
 * Removing the check in worker/index.js causes this test to fail (job succeeds or wrong error).
 *
 * Requires: Docker Compose (api, worker, mongo, redis) + Auth0 M2M.
 *
 * Run: node --test tests/redbar/rate-002-note-size.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { authFetch } from "../helpers/redbar-live.mjs";
import { waitForJobStatus } from "../helpers/redbar-jobs.mjs";
import { LIVE } from "./live-setup.mjs";

const OVER = 50_000 + 1;

test("rate-002 — live: worker fails AI job when note exceeds 50k chars", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  await authFetch("/api/me");

  const cre = await authFetch("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name: `redbar-r2-${Date.now()}`, description: "" }),
  });
  const g = await cre.json();
  const gid = (g._id || g.groupId).toString();
  const top = await authFetch("/api/topics", {
    method: "POST",
    body: JSON.stringify({ title: "r2", groupIds: [gid] }),
  });
  assert.strictEqual(top.status, 200);
  const tj = await top.json();
  const topicId = (tj._id || tj.topicId).toString();

  const bigContent = "a".repeat(OVER);
  const note = await authFetch("/api/notes", {
    method: "POST",
    body: JSON.stringify({ title: "big", content: bigContent, topicId }),
  });
  const noteText = await note.text();
  assert.strictEqual(note.status, 200, noteText);
  const nj = JSON.parse(noteText);
  const materialId = nj.materialId.toString();

  const jobRes = await authFetch(`/api/materials/${materialId}/flashcards`, {
    method: "POST",
  });
  assert.strictEqual(jobRes.status, 200);
  const { jobId } = await jobRes.json();
  const jobIdHex = jobId?.toString?.() ?? String(jobId);

  try {
    const j = await waitForJobStatus(authFetch, jobIdHex, {
      timeoutMs: 60_000,
      wantStatus: "failed",
    });
    assert.strictEqual(j.status, "failed");
    assert.ok(
      String(j.error || "").includes("Note too large to summarize"),
      `expected worker error, got: ${j.error}`
    );
  } finally {
    await authFetch(`/api/materials/${materialId}/note`, { method: "DELETE" });
    await authFetch(`/api/topics/${topicId}`, { method: "DELETE" });
    await authFetch(`/api/groups/${gid}`, { method: "DELETE" });
  }
});
