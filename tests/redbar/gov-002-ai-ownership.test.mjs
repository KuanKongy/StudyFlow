/**
 * Verification test — claim gov-002
 *
 * Clause:       "AI processing only triggers if the requesting user has access to the source note."
 * Enforcement:  api/src/index.js — canAccessMaterial() on POST .../flashcards
 *
 * Run: node --test tests/redbar/gov-002-ai-ownership.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mongoWithClient, authFetch, ObjectId } from "../helpers/redbar-live.mjs";
import { LIVE } from "./live-setup.mjs";

test("gov-002 — cannot enqueue summary or flashcards on inaccessible note", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const { client, db } = await mongoWithClient();
  try {
    const mid = new ObjectId();
    await db.collection("studyMaterials").insertOne({
      _id: mid,
      type: "note",
      title: "secret",
      ownerId: "auth0|alice-gov2",
      topicId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const flashcardsRes = await authFetch(`/api/materials/${mid.toString()}/flashcards`, {
      method: "POST",
    });
    assert.strictEqual(flashcardsRes.status, 403);

    const summaryRes = await authFetch(`/api/materials/${mid.toString()}/summary`, {
      method: "POST",
    });
    assert.strictEqual(summaryRes.status, 403);

    const queuedJobs = await db.collection("jobs").countDocuments({ inputMaterialId: mid });
    assert.strictEqual(queuedJobs, 0, "unauthorized AI requests must not create jobs");
    await db.collection("studyMaterials").deleteOne({ _id: mid });
  } finally {
    await client.close();
  }
});
