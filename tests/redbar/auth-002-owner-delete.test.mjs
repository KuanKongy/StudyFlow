/**
 * Verification test — claim auth-002
 *
 * Clause:       "Only the owner of a group can delete that group."
 * Enforcement:  api/src/index.js — DELETE /api/groups/:id
 *
 * Run: node --test tests/redbar/auth-002-owner-delete.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mongoWithClient, authFetch } from "../helpers/redbar-live.mjs";
import { LIVE } from "./live-setup.mjs";

test("auth-002 — non-owner cannot delete group (seeded owner)", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const { client, db } = await mongoWithClient();
  try {
    const { insertedId } = await db.collection("groups").insertOne({
      name: "redbar-auth-002-foreign",
      description: "",
      ownerId: "auth0|redbar-foreign-owner",
      memberIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const res = await authFetch(`/api/groups/${insertedId.toString()}`, { method: "DELETE" });
    assert.strictEqual(res.status, 403);
  } finally {
    await db.collection("groups").deleteMany({ name: "redbar-auth-002-foreign" });
    await client.close();
  }
});

test("auth-002 — owner can delete own group", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const res = await authFetch("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name: `redbar-del-${Date.now()}`, description: "x" }),
  });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  const gid = (body._id || body.groupId).toString();
  const del = await authFetch(`/api/groups/${gid}`, { method: "DELETE" });
  assert.strictEqual(del.status, 200);
});
