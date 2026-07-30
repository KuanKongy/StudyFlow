/**
 * Verification test — claim gov-005
 *
 * Clause:       "All group membership changes are audit-logged."
 * Enforcement:  api/src/index.js — GroupAuditLog on create, add/remove/join/leave, and PUT memberIds
 *
 * Run: node --test tests/redbar/gov-005-membership-audit.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mongoWithClient, authFetch, ObjectId } from "../helpers/redbar-live.mjs";
import { LIVE, sub } from "./live-setup.mjs";

test("gov-005 — add, remove, join, and leave write full audit log entries", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const cre = await authFetch("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name: `redbar-gov5-${Date.now()}`, description: "" }),
  });
  assert.strictEqual(cre.status, 200);
  const g = await cre.json();
  const gid = (g._id || g.groupId).toString();

  const { client: c0, db: db0 } = await mongoWithClient();
  try {
    const createRow = await db0.collection("groupAuditLog").findOne({
      groupId: new ObjectId(gid),
      action: "create",
    });
    assert.ok(createRow, "audit log should record group create");
    assert.strictEqual(createRow.actorId, sub);
    assert.strictEqual(createRow.targetId, sub);
  } finally {
    await c0.close();
  }

  const add = await authFetch(`/api/groups/${gid}/members`, {
    method: "POST",
    body: JSON.stringify({ userId: "auth0|audit-target" }),
  });
  assert.strictEqual(add.status, 200);
  const remove = await authFetch(`/api/groups/${gid}/members`, {
    method: "DELETE",
    body: JSON.stringify({ userId: "auth0|audit-target" }),
  });
  assert.strictEqual(remove.status, 200);

  const joinGroupId = new ObjectId();
  const leaveGroupId = new ObjectId();
  const joinCode = `gov5-join-${Date.now()}`;
  const { client, db } = await mongoWithClient();
  try {
    await db.collection("groups").insertMany([
      {
        _id: joinGroupId,
        name: "redbar-gov5-join",
        description: "",
        ownerId: "auth0|seed-join-owner",
        memberIds: ["auth0|seed-join-owner"],
        joinCode,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        _id: leaveGroupId,
        name: "redbar-gov5-leave",
        description: "",
        ownerId: "auth0|seed-leave-owner",
        memberIds: ["auth0|seed-leave-owner", sub],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    const joinRes = await authFetch("/api/groups/join", {
      method: "POST",
      body: JSON.stringify({ joinCode }),
    });
    assert.strictEqual(joinRes.status, 200);

    const leaveRes = await authFetch(`/api/groups/${leaveGroupId.toString()}/leave`, {
      method: "POST",
    });
    assert.strictEqual(leaveRes.status, 200);

    const rows = await db
      .collection("groupAuditLog")
      .find({
        groupId: { $in: [new ObjectId(gid), joinGroupId, leaveGroupId] },
        action: { $in: ["add", "remove", "join", "leave"] },
      })
      .toArray();
    const addRow = rows.find((row) => row.action === "add");
    const removeRow = rows.find((row) => row.action === "remove");
    const joinRow = rows.find((row) => row.action === "join");
    const leaveRow = rows.find((row) => row.action === "leave");
    assert.ok(addRow, "audit log should record member add");
    assert.ok(removeRow, "audit log should record member remove");
    assert.ok(joinRow, "audit log should record join");
    assert.ok(leaveRow, "audit log should record leave");
    for (const row of [addRow, removeRow]) {
      assert.strictEqual(String(row.groupId), gid);
      assert.strictEqual(row.actorId, sub);
      assert.strictEqual(row.targetId, "auth0|audit-target");
      assert.ok(typeof row.timestamp === "number" && Number.isFinite(row.timestamp));
    }
    for (const row of [joinRow, leaveRow]) {
      assert.strictEqual(row.actorId, sub);
      assert.strictEqual(row.targetId, sub);
      assert.ok(typeof row.timestamp === "number" && Number.isFinite(row.timestamp));
    }
    assert.strictEqual(String(joinRow.groupId), joinGroupId.toString());
    assert.strictEqual(String(leaveRow.groupId), leaveGroupId.toString());

    const putGroup = await authFetch("/api/groups", {
      method: "POST",
      body: JSON.stringify({ name: `redbar-gov5-put-${Date.now()}`, description: "" }),
    });
    assert.strictEqual(putGroup.status, 200);
    const pg = await putGroup.json();
    const putGid = (pg._id || pg.groupId).toString();
    const putRes = await authFetch(`/api/groups/${putGid}`, {
      method: "PUT",
      body: JSON.stringify({ memberIds: [sub, "auth0|put-audit-target"] }),
    });
    assert.strictEqual(putRes.status, 200);
    const putAddRow = await db.collection("groupAuditLog").findOne({
      groupId: new ObjectId(putGid),
      action: "add",
      targetId: "auth0|put-audit-target",
    });
    assert.ok(putAddRow, "PUT memberIds should write add audit entries");
    await db.collection("groupAuditLog").deleteMany({ groupId: new ObjectId(putGid) });
    await authFetch(`/api/groups/${putGid}`, { method: "DELETE" });

    await db.collection("groupAuditLog").deleteMany({
      groupId: { $in: [joinGroupId, leaveGroupId] },
    });
    await db.collection("groups").deleteMany({ _id: { $in: [joinGroupId, leaveGroupId] } });
  } finally {
    await client.close();
  }
  await authFetch(`/api/groups/${gid}`, { method: "DELETE" });
});
