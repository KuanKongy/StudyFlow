/**
 * Smoke test — Topics CRUD
 *
 * Covers: POST /api/topics, GET /api/topics, PUT /api/topics/:id, DELETE /api/topics/:id
 * Run: node --test tests/smoke/topics-crud.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

let nextId = 1;
function id() { return `tid-${nextId++}`; }

function createStores() {
  return {
    topics: [],
    groups: [
      { _id: "g1", ownerId: "auth0|alice", memberIds: ["auth0|alice", "auth0|bob"] },
    ],
  };
}

function buildServer(stores, requestingUser = "auth0|alice") {
  return http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    const url = new URL(req.url, "http://localhost");

    if (req.method === "POST" && url.pathname === "/api/topics") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const { title, description, groupIds } = JSON.parse(body);
        if (!title) { res.writeHead(400); res.end(JSON.stringify({ error: "title required" })); return; }
        const topic = { _id: id(), title, ownerId: requestingUser, description: description || "", groupIds: groupIds || [], createdAt: Date.now(), updatedAt: Date.now() };
        stores.topics.push(topic);
        res.writeHead(200);
        res.end(JSON.stringify(topic));
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/topics") {
      const userGroupIds = stores.groups.filter((g) => g.memberIds.includes(requestingUser)).map((g) => g._id);
      const visible = stores.topics.filter((t) => {
        if (t.ownerId === requestingUser && (!t.groupIds || t.groupIds.length === 0)) return true;
        if (t.groupIds && t.groupIds.some((gid) => userGroupIds.includes(gid))) return true;
        return false;
      });
      res.writeHead(200);
      res.end(JSON.stringify(visible));
      return;
    }

    const topicMatch = url.pathname.match(/^\/api\/topics\/([^/]+)$/);
    if (topicMatch) {
      const tid = topicMatch[1];

      if (req.method === "PUT") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          const topic = stores.topics.find((t) => t._id === tid);
          if (!topic) { res.writeHead(404); res.end(JSON.stringify({ error: "Topic not found" })); return; }
          const updates = JSON.parse(body);
          if (updates.title) topic.title = updates.title;
          if (updates.description !== undefined) topic.description = updates.description;
          if (updates.groupIds) topic.groupIds = updates.groupIds;
          topic.updatedAt = Date.now();
          res.writeHead(200);
          res.end(JSON.stringify(topic));
        });
        return;
      }

      if (req.method === "DELETE") {
        const idx = stores.topics.findIndex((t) => t._id === tid);
        if (idx === -1) { res.writeHead(404); res.end(JSON.stringify({ error: "Topic not found" })); return; }
        stores.topics.splice(idx, 1);
        res.writeHead(200);
        res.end(JSON.stringify({ message: "Topic deleted successfully" }));
        return;
      }
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });
}

test("POST /api/topics — creates topic", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/topics`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Math", description: "Numbers", groupIds: ["g1"] }),
  });
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.title, "Math");
  assert.deepStrictEqual(body.groupIds, ["g1"]);
});

test("POST /api/topics — missing title returns 400", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/topics`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: "no title" }),
  });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 400);
});

test("GET /api/topics — returns own private + group topics", async () => {
  const stores = createStores();
  stores.topics.push({ _id: "t1", title: "Private", ownerId: "auth0|alice", groupIds: [], createdAt: 1 });
  stores.topics.push({ _id: "t2", title: "Shared", ownerId: "auth0|bob", groupIds: ["g1"], createdAt: 2 });
  stores.topics.push({ _id: "t3", title: "Hidden", ownerId: "auth0|charlie", groupIds: ["g99"], createdAt: 3 });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/topics`);
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  const ids = body.map((t) => t._id);
  assert.ok(ids.includes("t1"), "Private owned topic visible");
  assert.ok(ids.includes("t2"), "Group topic visible");
  assert.ok(!ids.includes("t3"), "Unrelated topic hidden");
});

test("PUT /api/topics/:id — updates title", async () => {
  const stores = createStores();
  stores.topics.push({ _id: "t1", title: "Old", ownerId: "auth0|alice", groupIds: [] });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/topics/t1`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "New Title" }),
  });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(stores.topics[0].title, "New Title");
});

test("DELETE /api/topics/:id — removes topic", async () => {
  const stores = createStores();
  stores.topics.push({ _id: "t1", title: "X", ownerId: "auth0|alice", groupIds: [] });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/topics/t1`, { method: "DELETE" });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(stores.topics.length, 0);
});
