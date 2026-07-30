/**
 * Red-bar — claim auth-007
 *
 * Clause:       "Group membership grants read access to shared materials, never write:
 *                only the owner can edit a note or modify flashcards."
 * Enforcement:  api/src/index.js — ownerId checks on PUT .../note, PUT .../cards,
 *               POST /api/flashcard-sets/:id/cards, DELETE /api/flashcards/:id.
 *
 * Seeds a group where the M2M test user is a co-member (NOT the owner) and
 * verifies reads succeed while every write path returns 403 and leaves the
 * data untouched. Reverting the owner-only guards to canAccessMaterial()
 * makes the writes succeed and fails this test.
 *
 * Requires: Docker Compose + Auth0 M2M.
 *
 * Run: node --test tests/redbar/auth-007-note-write-owner.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import "./live-setup.mjs";
import { mongoWithClient, authFetch, ObjectId } from "../helpers/redbar-live.mjs";
import { LIVE, sub } from "./live-setup.mjs";

const FOREIGN = "auth0|not-me-auth007";

test("auth-007 — live: co-member can read but not write another member's note and cards", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const { client, db } = await mongoWithClient();
  const groupId = new ObjectId();
  const topicId = new ObjectId();
  const noteMaterialId = new ObjectId();
  const fcMaterialId = new ObjectId();
  const setId = new ObjectId();
  const cardId = new ObjectId();
  try {
    await db.collection("groups").insertOne({
      _id: groupId,
      name: "redbar-auth007",
      description: "",
      ownerId: FOREIGN,
      memberIds: [FOREIGN, sub],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await db.collection("topics").insertOne({
      _id: topicId,
      title: "redbar-auth007-topic",
      ownerId: FOREIGN,
      description: "",
      groupIds: [groupId],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await db.collection("studyMaterials").insertMany([
      {
        _id: noteMaterialId,
        type: "note",
        title: "shared note",
        ownerId: FOREIGN,
        topicId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        _id: fcMaterialId,
        type: "flashcardSet",
        title: "shared cards",
        ownerId: FOREIGN,
        topicId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
    await db.collection("notes").insertOne({ materialId: noteMaterialId, content: "original body" });
    await db.collection("flashcardSets").insertOne({ _id: setId, materialId: fcMaterialId, createdAt: Date.now() });
    await db.collection("flashcards").insertOne({
      _id: cardId,
      setId,
      question: "original q",
      answer: "original a",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Reads still work for a co-member
    const read = await authFetch(`/api/materials/${noteMaterialId.toString()}/note`);
    assert.strictEqual(read.status, 200);

    // Note write is owner-only
    const putNote = await authFetch(`/api/materials/${noteMaterialId.toString()}/note`, {
      method: "PUT",
      body: JSON.stringify({ title: "hijacked", content: "overwritten" }),
    });
    assert.strictEqual(putNote.status, 403);
    const noteDoc = await db.collection("notes").findOne({ materialId: noteMaterialId });
    assert.strictEqual(noteDoc.content, "original body", "note content must be unchanged");

    // Card writes are owner-only
    const putCard = await authFetch(`/api/materials/${cardId.toString()}/cards`, {
      method: "PUT",
      body: JSON.stringify({ question: "hijacked q" }),
    });
    assert.strictEqual(putCard.status, 403);

    const postCard = await authFetch(`/api/flashcard-sets/${setId.toString()}/cards`, {
      method: "POST",
      body: JSON.stringify({ question: "injected q", answer: "injected a" }),
    });
    assert.strictEqual(postCard.status, 403);

    const delCard = await authFetch(`/api/flashcards/${cardId.toString()}`, { method: "DELETE" });
    assert.strictEqual(delCard.status, 403);

    const cardDoc = await db.collection("flashcards").findOne({ _id: cardId });
    assert.ok(cardDoc, "card must still exist");
    assert.strictEqual(cardDoc.question, "original q");
    const cardCount = await db.collection("flashcards").countDocuments({ setId });
    assert.strictEqual(cardCount, 1, "no card added or removed");
  } finally {
    await db.collection("flashcards").deleteMany({ setId });
    await db.collection("flashcardSets").deleteOne({ _id: setId });
    await db.collection("notes").deleteMany({ materialId: noteMaterialId });
    await db.collection("studyMaterials").deleteMany({ _id: { $in: [noteMaterialId, fcMaterialId] } });
    await db.collection("topics").deleteOne({ _id: topicId });
    await db.collection("groups").deleteOne({ _id: groupId });
    await client.close();
  }
});
