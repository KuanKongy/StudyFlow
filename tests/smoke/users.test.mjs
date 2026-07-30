/**
 * Smoke test — Users CRUD
 *
 * Covers: GET /api/me, PUT /api/me (happy + 400),
 *         POST /api/users/batch (data-006: no emails, co-members only)
 * Run: node --test tests/smoke/users.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

function createStores() {
  return {
    users: new Map([
      ["auth0|alice", { authId: "auth0|alice", email: "alice@test.com", username: "alice", name: "Alice", picture: null, createdAt: Date.now() }],
      ["auth0|bob", { authId: "auth0|bob", email: "bob@test.com", username: "bob", name: "Bob", picture: null, createdAt: Date.now() }],
      ["auth0|carol", { authId: "auth0|carol", email: "carol@test.com", username: "carol", name: "Carol", picture: null, createdAt: Date.now() }],
    ]),
    // alice and bob share a group; carol is a stranger
    groups: [{ _id: "g1", memberIds: ["auth0|alice", "auth0|bob"] }],
  };
}

function buildServer(stores, requestingUser = "auth0|alice") {
  return http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");

    if (req.method === "GET" && req.url === "/api/me") {
      const user = stores.users.get(requestingUser);
      if (user) { res.writeHead(200); res.end(JSON.stringify(user)); }
      else { res.writeHead(404); res.end(JSON.stringify({ error: "User not found" })); }
      return;
    }

    if (req.method === "PUT" && req.url === "/api/me") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const { username, name, picture } = JSON.parse(body);
        if (!username && !name && picture === undefined) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Provide at least one of: username, name, picture" }));
          return;
        }
        const user = stores.users.get(requestingUser);
        if (!user) { res.writeHead(404); res.end(JSON.stringify({ error: "User not found" })); return; }
        if (username) user.username = username;
        if (name) user.name = name;
        if (picture !== undefined) user.picture = picture;
        res.writeHead(200);
        res.end(JSON.stringify(user));
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/users/batch") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const { authIds } = JSON.parse(body);
        if (!authIds || !Array.isArray(authIds)) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "authIds array required" }));
          return;
        }
        // data-006: only co-members are resolvable, and emails are never returned
        const visible = new Set([requestingUser]);
        for (const g of stores.groups) {
          if (g.memberIds.includes(requestingUser)) g.memberIds.forEach((m) => visible.add(m));
        }
        const users = authIds
          .filter((id) => visible.has(id) && stores.users.has(id))
          .map((id) => {
            const { email: _email, ...rest } = stores.users.get(id);
            return rest;
          });
        res.writeHead(200);
        res.end(JSON.stringify(users));
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });
}

test("GET /api/me — returns existing user", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/me`);
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.authId, "auth0|alice");
  assert.strictEqual(body.username, "alice");
});

test("PUT /api/me — updates username and name", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "alice2", name: "Alice Updated" }),
  });
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.username, "alice2");
  assert.strictEqual(body.name, "Alice Updated");
});

test("PUT /api/me — empty body returns 400", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 400);
});

test("POST /api/users/batch — returns co-members without email", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/users/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authIds: ["auth0|bob"] }),
  });
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.length, 1);
  assert.strictEqual(body[0].authId, "auth0|bob");
  assert.ok(!("email" in body[0]), "email must not be exposed in batch lookups");
});

test("POST /api/users/batch — excludes users with no shared group", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/users/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authIds: ["auth0|bob", "auth0|carol"] }),
  });
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(body.map((u) => u.authId), ["auth0|bob"]);
});
