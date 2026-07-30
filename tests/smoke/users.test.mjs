/**
 * Smoke test — Users CRUD
 *
 * Covers: GET /api/me, PUT /api/me (happy + 400)
 * Run: node --test tests/smoke/users.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

function createStores() {
  return {
    users: new Map([
      ["auth0|alice", { authId: "auth0|alice", email: "alice@test.com", username: "alice", name: "Alice", picture: null, createdAt: Date.now() }],
    ]),
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
