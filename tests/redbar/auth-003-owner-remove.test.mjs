/**
 * Verification test — claim auth-003
 *
 * Clause:       Owner adds/removes others; non-owner may self-join public groups (no joinCode) via POST; join code uses /api/groups/join.
 * Enforcement:  api/src/index.js — POST and DELETE /api/groups/:id/members
 *
 * Run: node --test tests/redbar/auth-003-owner-remove.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mongoWithClient, authFetch } from "../helpers/redbar-live.mjs";
import { LIVE, sub } from "./live-setup.mjs";

test("auth-003 — non-owner cannot remove members", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const { client, db } = await mongoWithClient();
  try {
    const { insertedId } = await db.collection("groups").insertOne({
      name: "redbar-auth-003",
      description: "",
      ownerId: "auth0|other-owner-auth003",
      memberIds: ["auth0|other-owner-auth003", sub, "auth0|victim"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const res = await authFetch(`/api/groups/${insertedId.toString()}/members`, {
      method: "DELETE",
      body: JSON.stringify({ userId: "auth0|victim" }),
    });
    assert.strictEqual(res.status, 403);
  } finally {
    await db.collection("groups").deleteMany({ name: "redbar-auth-003" });
    await client.close();
  }
});

test("auth-003 — non-owner cannot add members", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const { client, db } = await mongoWithClient();
  try {
    const { insertedId } = await db.collection("groups").insertOne({
      name: "redbar-auth-003-add",
      description: "",
      ownerId: "auth0|other-owner-auth003b",
      memberIds: ["auth0|other-owner-auth003b"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const res = await authFetch(`/api/groups/${insertedId.toString()}/members`, {
      method: "POST",
      body: JSON.stringify({ userId: "auth0|someone" }),
    });
    assert.strictEqual(res.status, 403);
  } finally {
    await db.collection("groups").deleteMany({ name: "redbar-auth-003-add" });
    await client.close();
  }
});

test("auth-003 — non-owner can self-join a public group (POST members with self)", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const { client, db } = await mongoWithClient();
  try {
    const { insertedId } = await db.collection("groups").insertOne({
      name: "redbar-auth-003-public-self",
      description: "",
      joinCode: null,
      ownerId: "auth0|pub-owner-auth003",
      memberIds: ["auth0|pub-owner-auth003"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const res = await authFetch(`/api/groups/${insertedId.toString()}/members`, {
      method: "POST",
      body: JSON.stringify({ userId: sub }),
    });
    assert.strictEqual(res.status, 200);
    const g = await db.collection("groups").findOne({ _id: insertedId });
    assert.ok(g.memberIds.includes(sub), "caller should be added to public group");
  } finally {
    await db.collection("groups").deleteMany({ name: "redbar-auth-003-public-self" });
    await client.close();
  }
});

test("auth-003 — non-owner cannot self-join a private group via POST members", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const { client, db } = await mongoWithClient();
  try {
    const { insertedId } = await db.collection("groups").insertOne({
      name: "redbar-auth-003-private-self",
      description: "",
      joinCode: "secret-auth003",
      ownerId: "auth0|priv-owner-auth003",
      memberIds: ["auth0|priv-owner-auth003"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const res = await authFetch(`/api/groups/${insertedId.toString()}/members`, {
      method: "POST",
      body: JSON.stringify({ userId: sub }),
    });
    assert.strictEqual(res.status, 403);
  } finally {
    await db.collection("groups").deleteMany({ name: "redbar-auth-003-private-self" });
    await client.close();
  }
});
