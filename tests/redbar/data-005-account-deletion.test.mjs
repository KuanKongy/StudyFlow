/**
 * Verification test — claim data-005
 *
 * Clause:       "Deleting an account removes user data, cache keys, queue entries for that user."
 * Enforcement:  api/src/index.js — DELETE /api/account
 *
 * Run: node --test tests/redbar/data-005-account-deletion.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mongoWithClient, authFetch, redisClient, ObjectId } from "../helpers/redbar-live.mjs";
import { LIVE, sub } from "./live-setup.mjs";

test("data-005 — DELETE /api/account removes user data", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }

  const meRes = await authFetch("/api/me");
  assert.strictEqual(meRes.status, 200);
  await meRes.json();

  const { client, db } = await mongoWithClient();
  const r = redisClient();
  try {
    await r.connect();

    const ownedGroupId = new ObjectId();
    const sharedGroupId = new ObjectId();
    const topicId = new ObjectId();
    const noteMaterialId = new ObjectId();
    const summaryMaterialId = new ObjectId();
    const flashcardMaterialId = new ObjectId();
    const flashcardSetId = new ObjectId();
    const queuedJobId = new ObjectId();

    await db.collection("groups").insertMany([
      {
        _id: ownedGroupId,
        name: "d5-owned",
        description: "",
        ownerId: sub,
        memberIds: [sub],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        _id: sharedGroupId,
        name: "d5-shared",
        description: "",
        ownerId: "auth0|other-owner",
        memberIds: [sub, "auth0|other-owner"],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    await db.collection("topics").insertOne({
      _id: topicId,
      title: "d5-topic",
      ownerId: sub,
      groupIds: [ownedGroupId],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await db.collection("studyMaterials").insertMany([
      {
        _id: noteMaterialId,
        type: "note",
        title: "d5-note",
        ownerId: sub,
        topicId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        _id: summaryMaterialId,
        type: "summary",
        title: "d5-summary",
        ownerId: sub,
        topicId,
        derivedFrom: noteMaterialId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        _id: flashcardMaterialId,
        type: "flashcardSet",
        title: "d5-flashcards",
        ownerId: sub,
        topicId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    await db.collection("notes").insertMany([
      { materialId: noteMaterialId, content: "hello account deletion" },
      { materialId: summaryMaterialId, content: "summary content" },
    ]);

    await db.collection("flashcardSets").insertOne({
      _id: flashcardSetId,
      materialId: flashcardMaterialId,
      createdAt: Date.now(),
    });

    await db.collection("flashcards").insertMany([
      { setId: flashcardSetId, question: "q1", answer: "a1", createdAt: Date.now() },
      { setId: flashcardSetId, question: "q2", answer: "a2", createdAt: Date.now() },
    ]);

    await db.collection("jobs").insertOne({
      _id: queuedJobId,
      type: "GENERATE_SUMMARY",
      inputMaterialId: noteMaterialId,
      ownerId: sub,
      status: "queued",
      retries: 0,
      createdAt: Date.now(),
      requestId: `data-005-${Date.now()}`,
    });

    await db.collection("groupAuditLog").insertMany([
      {
        groupId: ownedGroupId,
        actorId: sub,
        targetId: "auth0|someone-else",
        action: "add",
        timestamp: Date.now(),
      },
      {
        groupId: sharedGroupId,
        actorId: "auth0|other-owner",
        targetId: sub,
        action: "add",
        timestamp: Date.now(),
      },
    ]);

    await r.lPush("queue:jobs", JSON.stringify({ jobId: queuedJobId.toString() }));
    await r.set(`cache:${sub}:materials`, "x", { EX: 60 });
    await r.set(`cache:${sub}:topic:${topicId.toString()}`, "y", { EX: 60 });

    const acc = await authFetch("/api/account", { method: "DELETE" });
    assert.strictEqual(acc.status, 200);

    assert.strictEqual(await db.collection("users").countDocuments({ authId: sub }), 0);
    assert.strictEqual(await db.collection("studyMaterials").countDocuments({ ownerId: sub }), 0);
    assert.strictEqual(
      await db.collection("notes").countDocuments({ materialId: { $in: [noteMaterialId, summaryMaterialId] } }),
      0
    );
    assert.strictEqual(await db.collection("flashcardSets").countDocuments({ _id: flashcardSetId }), 0);
    assert.strictEqual(await db.collection("flashcards").countDocuments({ setId: flashcardSetId }), 0);
    assert.strictEqual(await db.collection("topics").countDocuments({ ownerId: sub }), 0);
    assert.strictEqual(await db.collection("jobs").countDocuments({ ownerId: sub }), 0);
    assert.strictEqual(await db.collection("groups").countDocuments({ ownerId: sub }), 0);
    assert.strictEqual(
      await db
        .collection("groupAuditLog")
        .countDocuments({ $or: [{ actorId: sub }, { targetId: sub }] }),
      0
    );

    const sharedGroup = await db.collection("groups").findOne({ _id: sharedGroupId });
    assert.ok(sharedGroup, "shared group owned by another user should remain");
    assert.ok(!sharedGroup.memberIds.includes(sub), "deleted user should be removed from surviving groups");

    const queueItems = await r.lRange("queue:jobs", 0, -1);
    assert.ok(
      queueItems.every((raw) => !raw.includes(queuedJobId.toString())),
      "queued job payload for deleted user should be removed from Redis"
    );

    const keys = await r.keys(`cache:${sub}:*`);
    assert.strictEqual(keys.length, 0);
  } finally {
    await r.quit();
    await client.close();
  }
});
