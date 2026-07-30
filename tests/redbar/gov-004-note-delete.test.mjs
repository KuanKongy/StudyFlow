/**
 * Verification test — claim gov-004
 *
 * Clause:       "Deleting a note removes studyMaterial and note content; related caches invalidated."
 * Enforcement:  api/src/index.js — DELETE /api/materials/:id/note
 *
 * Run: node --test tests/redbar/gov-004-note-delete.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { authFetch, mongoWithClient, ObjectId, redisClient } from "../helpers/redbar-live.mjs";
import { LIVE } from "./live-setup.mjs";

test("gov-004 — DELETE note removes note and derived summary", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const cre = await authFetch("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name: `redbar-gov4-${Date.now()}`, description: "" }),
  });
  const g = await cre.json();
  const gid = (g._id || g.groupId).toString();
  const top = await authFetch("/api/topics", {
    method: "POST",
    body: JSON.stringify({ title: "g4", groupIds: [gid] }),
  });
  const tj = await top.json();
  const topicId = (tj._id || tj.topicId).toString();
  const note = await authFetch("/api/notes", {
    method: "POST",
    body: JSON.stringify({ title: "n", content: "c", topicId }),
  });
  const nj = await note.json();
  const materialId = nj.materialId.toString();
  const cacheKey = `topic:${topicId}:materials`;

  const seedCache = await authFetch(`/api/topics/${topicId}/materials`);
  assert.strictEqual(seedCache.status, 200);

  const redis = redisClient();
  await redis.connect();
  try {
    assert.ok(await redis.get(cacheKey), "topic materials cache should be populated before delete");
  } finally {
    await redis.quit();
  }

  const { client, db } = await mongoWithClient();
  let summaryMaterialId;
  try {
    const sourceMaterial = await db.collection("studyMaterials").findOne({ _id: new ObjectId(materialId) });
    assert.ok(sourceMaterial, "source material should exist");
    const summaryInsert = await db.collection("studyMaterials").insertOne({
      type: "summary",
      title: `Summary: ${sourceMaterial.title}`,
      ownerId: sourceMaterial.ownerId,
      topicId: sourceMaterial.topicId ?? null,
      derivedFrom: sourceMaterial._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    summaryMaterialId = summaryInsert.insertedId;
    await db.collection("notes").insertOne({
      materialId: summaryMaterialId,
      content: "derived summary body",
    });
  } finally {
    await client.close();
  }

  const del = await authFetch(`/api/materials/${materialId}/note`, { method: "DELETE" });
  assert.strictEqual(del.status, 200);
  const get = await authFetch(`/api/materials/${materialId}/note`);
  assert.strictEqual(get.status, 404);

  const verify = await mongoWithClient();
  const redisAfter = redisClient();
  await redisAfter.connect();
  try {
    const sourceMaterial = await verify.db.collection("studyMaterials").findOne({ _id: new ObjectId(materialId) });
    const sourceNote = await verify.db.collection("notes").findOne({ materialId: new ObjectId(materialId) });
    const summaryMaterial = await verify.db.collection("studyMaterials").findOne({ _id: summaryMaterialId });
    const summaryNote = await verify.db.collection("notes").findOne({ materialId: summaryMaterialId });
    assert.strictEqual(sourceMaterial, null, "source studyMaterial should be deleted");
    assert.strictEqual(sourceNote, null, "source note content should be deleted");
    assert.strictEqual(summaryMaterial, null, "derived summary material should be deleted");
    assert.strictEqual(summaryNote, null, "derived summary note content should be deleted");
    assert.strictEqual(await redisAfter.get(cacheKey), null, "topic materials cache should be invalidated");
  } finally {
    await redisAfter.quit();
    await verify.client.close();
  }

  await authFetch(`/api/topics/${topicId}`, { method: "DELETE" });
  await authFetch(`/api/groups/${gid}`, { method: "DELETE" });
});
