/**
 * Smoke test — Materials listing with filter param
 *
 * Covers: GET /api/materials?filter=all|mine|shared, isOwner field, deduplication
 * Run: node --test tests/smoke/materials-filter.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

function createStores() {
  return {
    materials: [
      { _id: "m1", type: "note", ownerId: "auth0|alice", topicId: "t1", updatedAt: 3 },
      { _id: "m2", type: "summary", ownerId: "auth0|alice", topicId: "t1", updatedAt: 2 },
      { _id: "m3", type: "note", ownerId: "auth0|bob", topicId: "t-shared", updatedAt: 1 },
      { _id: "m4", type: "note", ownerId: "auth0|charlie", topicId: "t-other", updatedAt: 0 },
    ],
    groups: [
      { _id: "g1", memberIds: ["auth0|alice", "auth0|bob"] },
    ],
    topics: [
      { _id: "t1", ownerId: "auth0|alice", groupIds: [] },
      { _id: "t-shared", ownerId: "auth0|bob", groupIds: ["g1"] },
      { _id: "t-other", ownerId: "auth0|charlie", groupIds: ["g99"] },
    ],
  };
}

function buildServer(stores, requestingUser = "auth0|alice") {
  return http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    const url = new URL(req.url, "http://localhost");

    if (req.method === "GET" && url.pathname === "/api/materials") {
      const filter = url.searchParams.get("filter") || "all";
      const userId = requestingUser;
      const userGroupIds = stores.groups.filter((g) => g.memberIds.includes(userId)).map((g) => g._id);
      const sharedTopicIds = stores.topics
        .filter((t) => t.groupIds.some((gid) => userGroupIds.includes(gid)))
        .map((t) => t._id);

      let materials;
      if (filter === "mine") {
        materials = stores.materials.filter((m) => m.ownerId === userId);
      } else if (filter === "shared") {
        materials = stores.materials.filter((m) => sharedTopicIds.includes(m.topicId) && m.ownerId !== userId);
      } else {
        const own = stores.materials.filter((m) => m.ownerId === userId);
        const shared = stores.materials.filter((m) => sharedTopicIds.includes(m.topicId) && m.ownerId !== userId);
        const seen = new Set(own.map((m) => m._id));
        materials = [...own];
        for (const m of shared) {
          if (!seen.has(m._id)) materials.push(m);
        }
      }

      const result = materials.map((m) => ({ ...m, isOwner: m.ownerId === userId }));
      res.writeHead(200);
      res.end(JSON.stringify(result));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });
}

test("GET /api/materials (filter=all) — returns own + shared", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/materials`);
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  const ids = body.map((m) => m._id);
  assert.ok(ids.includes("m1"), "Own material included");
  assert.ok(ids.includes("m2"), "Own material included");
  assert.ok(ids.includes("m3"), "Shared material included");
  assert.ok(!ids.includes("m4"), "Unrelated material excluded");
});

test("GET /api/materials?filter=mine — returns only own", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/materials?filter=mine`);
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(body.length, 2);
  assert.ok(body.every((m) => m.ownerId === "auth0|alice"));
});

test("GET /api/materials?filter=shared — returns only shared (not owned)", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/materials?filter=shared`);
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(body.length, 1);
  assert.strictEqual(body[0]._id, "m3");
  assert.strictEqual(body[0].isOwner, false);
});

test("GET /api/materials — isOwner boolean is correct", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/materials`);
  const body = await res.json();
  await new Promise((r) => server.close(r));
  const m1 = body.find((m) => m._id === "m1");
  const m3 = body.find((m) => m._id === "m3");
  assert.strictEqual(m1.isOwner, true);
  assert.strictEqual(m3.isOwner, false);
});

test("GET /api/materials (filter=all) — deduplicates own material in shared topic", async () => {
  const stores = createStores();
  stores.materials.push({ _id: "m-dup", type: "note", ownerId: "auth0|alice", topicId: "t-shared", updatedAt: 5 });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/materials`);
  const body = await res.json();
  await new Promise((r) => server.close(r));
  const dupCount = body.filter((m) => m._id === "m-dup").length;
  assert.strictEqual(dupCount, 1, "Own material in shared topic should not be duplicated");
});
