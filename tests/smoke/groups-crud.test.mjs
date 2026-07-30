/**
 * Smoke test — Groups CRUD
 *
 * Covers: POST /api/groups, GET /api/groups, GET /api/groups/available,
 *         POST /api/groups/join, PUT /api/groups/:id, DELETE /api/groups/:id
 * Run: node --test tests/smoke/groups-crud.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

let nextId = 1;
function gid() { return `g-${nextId++}`; }

function createStores() {
  return {
    groups: [],
    auditLog: [],
  };
}

function buildServer(stores, requestingUser = "auth0|alice") {
  return http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    const url = new URL(req.url, "http://localhost");

    if (req.method === "POST" && url.pathname === "/api/groups") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const { name, description, joinCode } = JSON.parse(body);
        if (!name) { res.writeHead(400); res.end(JSON.stringify({ error: "name required" })); return; }
        const group = { _id: gid(), name, description: description || "", joinCode: joinCode || null, ownerId: requestingUser, memberIds: [requestingUser], createdAt: Date.now(), updatedAt: Date.now() };
        stores.groups.push(group);
        res.writeHead(200);
        res.end(JSON.stringify(group));
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/groups") {
      const mine = stores.groups.filter((g) => g.memberIds.includes(requestingUser));
      res.writeHead(200);
      res.end(JSON.stringify(mine));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/groups/available") {
      const available = stores.groups.filter((g) => !g.memberIds.includes(requestingUser) && !g.joinCode);
      res.writeHead(200);
      res.end(JSON.stringify(available));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/groups/join") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const { joinCode } = JSON.parse(body);
        if (!joinCode) { res.writeHead(400); res.end(JSON.stringify({ error: "joinCode required" })); return; }
        const group = stores.groups.find((g) => g.joinCode === joinCode);
        if (!group) { res.writeHead(404); res.end(JSON.stringify({ error: "Invalid join code" })); return; }
        if (!group.memberIds.includes(requestingUser)) group.memberIds.push(requestingUser);
        stores.auditLog.push({ groupId: group._id, actorId: requestingUser, action: "join" });
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, group }));
      });
      return;
    }

    const groupMatch = url.pathname.match(/^\/api\/groups\/([^/]+)$/);
    if (groupMatch) {
      const gId = groupMatch[1];

      if (req.method === "PUT") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          const group = stores.groups.find((g) => g._id === gId);
          if (!group) { res.writeHead(404); res.end(JSON.stringify({ error: "Group not found" })); return; }
          const updates = JSON.parse(body);
          if (updates.name) group.name = updates.name;
          if (updates.description !== undefined) group.description = updates.description;
          if (updates.joinCode !== undefined) group.joinCode = updates.joinCode || null;
          group.updatedAt = Date.now();
          res.writeHead(200);
          res.end(JSON.stringify(group));
        });
        return;
      }

      if (req.method === "DELETE") {
        const group = stores.groups.find((g) => g._id === gId);
        if (!group) { res.writeHead(404); res.end(JSON.stringify({ error: "Group not found" })); return; }
        if (group.ownerId !== requestingUser) { res.writeHead(403); res.end(JSON.stringify({ error: "Forbidden" })); return; }
        stores.groups = stores.groups.filter((g) => g._id !== gId);
        res.writeHead(200);
        res.end(JSON.stringify({ message: "Group deleted successfully" }));
        return;
      }
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });
}

test("POST /api/groups — creates group with description and joinCode", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/groups`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "CS 101", description: "Intro CS", joinCode: "ABC123" }),
  });
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.name, "CS 101");
  assert.strictEqual(body.description, "Intro CS");
  assert.strictEqual(body.joinCode, "ABC123");
  assert.ok(body.memberIds.includes("auth0|alice"));
});

test("GET /api/groups — returns groups user is a member of", async () => {
  const stores = createStores();
  stores.groups.push({ _id: "g1", name: "My Group", memberIds: ["auth0|alice"], ownerId: "auth0|alice" });
  stores.groups.push({ _id: "g2", name: "Other Group", memberIds: ["auth0|bob"], ownerId: "auth0|bob" });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/groups`);
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.length, 1);
  assert.strictEqual(body[0]._id, "g1");
});

test("GET /api/groups/available — excludes user's groups and private groups", async () => {
  const stores = createStores();
  stores.groups.push({ _id: "g1", name: "My", memberIds: ["auth0|alice"], joinCode: null });
  stores.groups.push({ _id: "g2", name: "Public", memberIds: ["auth0|bob"], joinCode: null });
  stores.groups.push({ _id: "g3", name: "Private", memberIds: ["auth0|bob"], joinCode: "SECRET" });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/groups/available`);
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.length, 1);
  assert.strictEqual(body[0]._id, "g2");
});

test("POST /api/groups/join — valid code adds user", async () => {
  const stores = createStores();
  stores.groups.push({ _id: "g1", name: "Secret Club", memberIds: ["auth0|bob"], joinCode: "XYZ", ownerId: "auth0|bob" });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/groups/join`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ joinCode: "XYZ" }),
  });
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.ok(body.group.memberIds.includes("auth0|alice"));
});

test("POST /api/groups/join — invalid code returns 404", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/groups/join`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ joinCode: "NOPE" }),
  });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 404);
});

test("PUT /api/groups/:id — updates name and description", async () => {
  const stores = createStores();
  stores.groups.push({ _id: "g1", name: "Old", description: "", memberIds: ["auth0|alice"], ownerId: "auth0|alice" });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/groups/g1`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "New Name", description: "Updated desc" }),
  });
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.name, "New Name");
  assert.strictEqual(body.description, "Updated desc");
});

test("DELETE /api/groups/:id — owner can delete", async () => {
  const stores = createStores();
  stores.groups.push({ _id: "g1", name: "X", memberIds: ["auth0|alice"], ownerId: "auth0|alice" });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/groups/g1`, { method: "DELETE" });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(stores.groups.length, 0);
});
