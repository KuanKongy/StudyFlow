/**
 * Verification test — claim auth-004
 *
 * Clause:       List + update: only topics the user may see (GET) and only the owner may update (PUT).
 * Enforcement:  api/src/index.js — GET /api/topics, PUT /api/topics/:id
 *
 * Run: node --test tests/redbar/auth-004-topic-isolation.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mongoWithClient, authFetch, ObjectId } from "../helpers/redbar-live.mjs";
import { LIVE } from "./live-setup.mjs";

test("auth-004 — topics in groups user is not a member of are hidden", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const { client, db } = await mongoWithClient();
  try {
    const groupId = new ObjectId();
    const topicId = new ObjectId();
    await db.collection("groups").insertOne({
      _id: groupId,
      name: "redbar-auth004-hidden",
      description: "",
      ownerId: "auth0|alice-auth004",
      memberIds: ["auth0|alice-auth004"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await db.collection("topics").insertOne({
      _id: topicId,
      title: "Secret topic auth-004",
      ownerId: "auth0|alice-auth004",
      description: "",
      groupIds: [groupId],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const res = await authFetch("/api/topics");
    assert.strictEqual(res.status, 200);
    const topics = await res.json();
    const ids = topics.map((x) => (x._id || x.topicId).toString());
    assert.ok(!ids.includes(topicId.toString()), "hidden group topic must not appear");
  } finally {
    await db.collection("topics").deleteMany({ title: "Secret topic auth-004" });
    await db.collection("groups").deleteMany({ name: "redbar-auth004-hidden" });
    await client.close();
  }
});

test("auth-004 — non-owner cannot update someone else's topic", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const { client, db } = await mongoWithClient();
  try {
    const topicId = new ObjectId();
    await db.collection("topics").insertOne({
      _id: topicId,
      title: "redbar-auth004-put",
      ownerId: "auth0|alice-auth004-put",
      description: "",
      groupIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const res = await authFetch(`/api/topics/${topicId.toString()}`, {
      method: "PUT",
      body: JSON.stringify({ title: "hacked title", description: "x" }),
    });
    assert.strictEqual(res.status, 403);
  } finally {
    await db.collection("topics").deleteMany({ title: "redbar-auth004-put" });
    await client.close();
  }
});
