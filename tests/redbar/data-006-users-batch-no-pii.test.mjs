/**
 * Red-bar — claim data-006
 *
 * Clause:       "User lookups never expose email addresses, and only resolve
 *                users who share a group with the caller."
 * Enforcement:  api/src/index.js — POST /api/users/batch (projection + co-member filter).
 *
 * Seeds one co-member (shares a group with the M2M test user) and one stranger,
 * both with emails in Mongo. The batch endpoint must return the co-member
 * without an email field and omit the stranger entirely.
 *
 * Requires: Docker Compose + Auth0 M2M.
 *
 * Run: node --test tests/redbar/data-006-users-batch-no-pii.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import "./live-setup.mjs";
import { mongoWithClient, authFetch, ObjectId } from "../helpers/redbar-live.mjs";
import { LIVE, sub } from "./live-setup.mjs";

const CO_MEMBER = "auth0|redbar-d6-comember";
const STRANGER = "auth0|redbar-d6-stranger";

test("data-006 — live: users/batch returns co-members without email and hides strangers", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const { client, db } = await mongoWithClient();
  const groupId = new ObjectId();
  try {
    await db.collection("users").insertMany([
      {
        authId: CO_MEMBER,
        email: "comember@example.com",
        username: `d6comember${Date.now()}`,
        name: "Co Member",
        picture: null,
        createdAt: Date.now(),
      },
      {
        authId: STRANGER,
        email: "stranger@example.com",
        username: `d6stranger${Date.now()}`,
        name: "Total Stranger",
        picture: null,
        createdAt: Date.now(),
      },
    ]);
    await db.collection("groups").insertOne({
      _id: groupId,
      name: "redbar-data006",
      description: "",
      ownerId: CO_MEMBER,
      memberIds: [CO_MEMBER, sub],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const res = await authFetch("/api/users/batch", {
      method: "POST",
      body: JSON.stringify({ authIds: [CO_MEMBER, STRANGER] }),
    });
    assert.strictEqual(res.status, 200);
    const users = await res.json();

    const ids = users.map((u) => u.authId);
    assert.ok(ids.includes(CO_MEMBER), "co-member should be resolvable");
    assert.ok(!ids.includes(STRANGER), "stranger with no shared group must not be resolvable");
    for (const u of users) {
      assert.ok(!("email" in u), `email must never be returned (got one for ${u.authId})`);
    }
  } finally {
    await db.collection("users").deleteMany({ authId: { $in: [CO_MEMBER, STRANGER] } });
    await db.collection("groups").deleteOne({ _id: groupId });
    await client.close();
  }
});
