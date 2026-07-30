/**
 * Red-bar — claims auth-005 / gov-001
 *
 * Clause:       "Users can only access materials in topics they can access (reads + notes/flashcard-set create)."
 * Enforcement:  api/src/index.js — canAccessMaterial(); canAccessTopic() for POST notes and flashcard-sets.
 *
 * Proof is **live HTTP** against the real API (no duplicated access logic in this file).
 * Removing or gutting canAccessMaterial in the API must yield wrong status codes and fail this test.
 *
 * Requires: Docker Compose + Auth0 M2M.
 *
 * Run: node --test tests/redbar/auth-005-material-isolation.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import "./live-setup.mjs";
import { mongoWithClient, authFetch, ObjectId } from "../helpers/redbar-live.mjs";
import { LIVE } from "./live-setup.mjs";

test("auth-005 / gov-001 — live: inaccessible note, summary, topic materials, and flashcards return 403", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const { client, db } = await mongoWithClient();
  const hiddenGroupId = new ObjectId();
  const hiddenTopicId = new ObjectId();
  const noteMaterialId = new ObjectId();
  const summaryMaterialId = new ObjectId();
  const flashcardMaterialId = new ObjectId();
  const flashcardSetId = new ObjectId();
  try {
    await db.collection("groups").insertOne({
      _id: hiddenGroupId,
      name: "redbar-auth005-hidden",
      description: "",
      ownerId: "auth0|not-me-auth005",
      memberIds: ["auth0|not-me-auth005"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await db.collection("topics").insertOne({
      _id: hiddenTopicId,
      title: "redbar-auth005-topic",
      ownerId: "auth0|not-me-auth005",
      description: "",
      groupIds: [hiddenGroupId],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await db.collection("studyMaterials").insertMany([
      {
        _id: noteMaterialId,
        type: "note",
        title: "secret note",
        ownerId: "auth0|not-me-auth005",
        topicId: hiddenTopicId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        _id: summaryMaterialId,
        type: "summary",
        title: "secret summary",
        ownerId: "auth0|not-me-auth005",
        topicId: hiddenTopicId,
        derivedFrom: noteMaterialId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        _id: flashcardMaterialId,
        type: "flashcardSet",
        title: "secret flashcards",
        ownerId: "auth0|not-me-auth005",
        topicId: hiddenTopicId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
    await db.collection("notes").insertMany([
      { materialId: noteMaterialId, content: "note body" },
      { materialId: summaryMaterialId, content: "summary body" },
    ]);
    await db.collection("flashcardSets").insertOne({
      _id: flashcardSetId,
      materialId: flashcardMaterialId,
      createdAt: Date.now(),
    });
    await db.collection("flashcards").insertOne({
      _id: new ObjectId(),
      setId: flashcardSetId,
      question: "q1",
      answer: "a1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const materialRes = await authFetch(`/api/materials/${noteMaterialId.toString()}`);
    assert.strictEqual(materialRes.status, 403);

    const noteRes = await authFetch(`/api/materials/${noteMaterialId.toString()}/note`);
    assert.strictEqual(noteRes.status, 403);

    const summaryRes = await authFetch(`/api/materials/${summaryMaterialId.toString()}`);
    assert.strictEqual(summaryRes.status, 403);

    const topicRes = await authFetch(`/api/topics/${hiddenTopicId.toString()}/materials`);
    assert.strictEqual(topicRes.status, 403);

    const setRes = await authFetch(`/api/materials/${flashcardMaterialId.toString()}/flashcard-set`);
    assert.strictEqual(setRes.status, 403);

    const cardsRes = await authFetch(`/api/flashcard-sets/${flashcardSetId.toString()}/cards`);
    assert.strictEqual(cardsRes.status, 403);

    const postNote = await authFetch("/api/notes", {
      method: "POST",
      body: JSON.stringify({
        title: "n",
        content: "c",
        topicId: hiddenTopicId.toString(),
      }),
    });
    assert.strictEqual(postNote.status, 403);

    const postFc = await authFetch("/api/flashcard-sets", {
      method: "POST",
      body: JSON.stringify({
        title: "fc",
        topicId: hiddenTopicId.toString(),
      }),
    });
    assert.strictEqual(postFc.status, 403);
  } finally {
    await db.collection("flashcards").deleteMany({ setId: flashcardSetId });
    await db.collection("flashcardSets").deleteOne({ _id: flashcardSetId });
    await db.collection("notes").deleteMany({ materialId: { $in: [noteMaterialId, summaryMaterialId] } });
    await db.collection("studyMaterials").deleteMany({
      _id: { $in: [noteMaterialId, summaryMaterialId, flashcardMaterialId] },
    });
    await db.collection("topics").deleteOne({ _id: hiddenTopicId });
    await db.collection("groups").deleteOne({ _id: hiddenGroupId });
    await client.close();
  }
});
