/**
 * Red-bar — claim auth-008 (regression for the member-removal cascade)
 *
 * Clause:       "Removing a member from a group only affects data shared through
 *                THAT group. The member's topics and materials in other groups —
 *                and other users' materials stored there — are untouched."
 * Enforcement:  api/src/index.js — handleMemberRemovalCascade scopes its topic
 *               queries to the group being left.
 *
 * Regression: the cascade used to run `Topics.find({ ownerId })` with no group
 * filter, destroying other members' materials in every topic the removed user
 * owned anywhere. This test removes a member from group G1 and asserts their
 * topic in unrelated group G2 (holding a third user's material) survives.
 *
 * Requires: Docker Compose + Auth0 M2M.
 *
 * Run: node --test tests/redbar/auth-008-removal-cascade-scope.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import "./live-setup.mjs";
import { mongoWithClient, authFetch, ObjectId } from "../helpers/redbar-live.mjs";
import { LIVE, sub } from "./live-setup.mjs";

const REMOVED = "auth0|redbar-a8-removed";
const BYSTANDER = "auth0|redbar-a8-bystander";

test("auth-008 — live: removing a member does not touch their topics in other groups", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const { client, db } = await mongoWithClient();
  const g1 = new ObjectId(); // owned by the test user; REMOVED is a member
  const g2 = new ObjectId(); // unrelated group of REMOVED + BYSTANDER
  const topicInG1 = new ObjectId(); // owned by REMOVED, attached to g1
  const topicInG2 = new ObjectId(); // owned by REMOVED, attached to g2
  const materialInG2 = new ObjectId(); // BYSTANDER's material inside topicInG2
  try {
    await db.collection("groups").insertMany([
      {
        _id: g1,
        name: "redbar-a8-g1",
        description: "",
        ownerId: sub,
        memberIds: [sub, REMOVED],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        _id: g2,
        name: "redbar-a8-g2",
        description: "",
        ownerId: REMOVED,
        memberIds: [REMOVED, BYSTANDER],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
    await db.collection("topics").insertMany([
      {
        _id: topicInG1,
        title: "redbar-a8-topic-g1",
        ownerId: REMOVED,
        description: "",
        groupIds: [g1],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        _id: topicInG2,
        title: "redbar-a8-topic-g2",
        ownerId: REMOVED,
        description: "",
        groupIds: [g2],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
    await db.collection("studyMaterials").insertOne({
      _id: materialInG2,
      type: "note",
      title: "bystander note in g2",
      ownerId: BYSTANDER,
      topicId: topicInG2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await db.collection("notes").insertOne({ materialId: materialInG2, content: "must survive" });

    // Owner of g1 removes REMOVED from g1
    const res = await authFetch(`/api/groups/${g1.toString()}/members`, {
      method: "DELETE",
      body: JSON.stringify({ userId: REMOVED }),
    });
    assert.strictEqual(res.status, 200);

    // The g1 topic is detached from g1
    const t1 = await db.collection("topics").findOne({ _id: topicInG1 });
    assert.ok(t1, "topic in g1 still exists");
    assert.ok(!t1.groupIds.some((g) => g.toString() === g1.toString()), "topic detached from g1");

    // The unrelated g2 topic and the bystander's material are untouched
    const t2 = await db.collection("topics").findOne({ _id: topicInG2 });
    assert.ok(t2, "topic in unrelated group must survive");
    assert.strictEqual(t2.groupIds.length, 1);
    assert.strictEqual(t2.groupIds[0].toString(), g2.toString());

    const survivor = await db.collection("studyMaterials").findOne({ _id: materialInG2 });
    assert.ok(survivor, "bystander material in the unrelated group must survive");
    const noteDoc = await db.collection("notes").findOne({ materialId: materialInG2 });
    assert.ok(noteDoc, "bystander note body must survive");
  } finally {
    await db.collection("notes").deleteMany({ materialId: materialInG2 });
    await db.collection("studyMaterials").deleteMany({ _id: materialInG2 });
    await db.collection("topics").deleteMany({ _id: { $in: [topicInG1, topicInG2] } });
    await db.collection("groups").deleteMany({ _id: { $in: [g1, g2] } });
    await db.collection("groupAuditLog").deleteMany({ groupId: { $in: [g1, g2] } });
    await client.close();
  }
});
