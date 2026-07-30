/**
 * Verification test — claim gov-003
 *
 * Clause:       "AI-generated summaries link back to the source note via derivedFrom."
 * Enforcement:  worker/index.js — StudyMaterials.insertOne for summaries
 *
 * Run: node --test tests/redbar/gov-003-flashcard-materialid.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { authFetch, mongoWithClient, ObjectId } from "../helpers/redbar-live.mjs";
import { waitForJobStatus } from "../helpers/redbar-jobs.mjs";
import { LIVE } from "./live-setup.mjs";

test("gov-003 — generated summaries store derivedFrom source material", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  await authFetch("/api/me");

  const cre = await authFetch("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name: `redbar-gov3-${Date.now()}`, description: "" }),
  });
  assert.strictEqual(cre.status, 200);
  const g = await cre.json();
  const gid = (g._id || g.groupId).toString();

  const top = await authFetch("/api/topics", {
    method: "POST",
    body: JSON.stringify({ title: "gov3", groupIds: [gid] }),
  });
  assert.strictEqual(top.status, 200);
  const tj = await top.json();
  const topicId = (tj._id || tj.topicId).toString();

  const note = await authFetch("/api/notes", {
    method: "POST",
    body: JSON.stringify({ title: "gov3", content: "summary provenance test", topicId }),
  });
  assert.strictEqual(note.status, 200);
  const nj = await note.json();
  const sourceMaterialId = nj.materialId.toString();

  const jobRes = await authFetch(`/api/materials/${sourceMaterialId}/summary`, {
    method: "POST",
  });
  assert.strictEqual(jobRes.status, 200);
  const { jobId } = await jobRes.json();
  const job = await waitForJobStatus(authFetch, String(jobId), {
    timeoutMs: 120_000,
    wantStatus: "done",
  });

  const { client, db } = await mongoWithClient();
  try {
    const summaryMaterialId = new ObjectId(String(job.resultMaterialId));
    const summaryMaterial = await db.collection("studyMaterials").findOne({ _id: summaryMaterialId });
    assert.ok(summaryMaterial, "summary studyMaterial should exist");
    assert.strictEqual(String(summaryMaterial.type), "summary");
    assert.strictEqual(String(summaryMaterial.derivedFrom), sourceMaterialId);
  } finally {
    await client.close();
  }
  await authFetch(`/api/materials/${sourceMaterialId}/note`, { method: "DELETE" });
  await authFetch(`/api/topics/${topicId}`, { method: "DELETE" });
  await authFetch(`/api/groups/${gid}`, { method: "DELETE" });
});
