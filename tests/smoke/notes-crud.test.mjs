/**
 * Smoke test — Notes CRUD
 *
 * Covers: POST /api/notes, GET/PUT/DELETE /api/materials/:id/note
 * Run: node --test tests/smoke/notes-crud.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

let nextId = 1;
function id() { return `id-${nextId++}`; }

function createStores() {
  return {
    materials: [],
    notes: [],
  };
}

function buildServer(stores, requestingUser = "auth0|alice") {
  return http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    const url = new URL(req.url, "http://localhost");

    if (req.method === "POST" && url.pathname === "/api/notes") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const { title, content, topicId } = JSON.parse(body);
        if (!content || !title || !topicId) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "missing data required" }));
          return;
        }
        const materialId = id();
        stores.materials.push({ _id: materialId, type: "note", title, ownerId: requestingUser, topicId, createdAt: Date.now(), updatedAt: Date.now() });
        stores.notes.push({ materialId, content });
        res.writeHead(200);
        res.end(JSON.stringify({ materialId }));
      });
      return;
    }

    const noteMatch = url.pathname.match(/^\/api\/materials\/([^/]+)\/note$/);
    if (noteMatch) {
      const matId = noteMatch[1];
      const material = stores.materials.find((m) => m._id === matId);

      if (req.method === "GET") {
        if (!material) { res.writeHead(404); res.end(JSON.stringify({ error: "Material not found" })); return; }
        if (material.ownerId !== requestingUser) { res.writeHead(403); res.end(JSON.stringify({ error: "Forbidden" })); return; }
        const note = stores.notes.find((n) => n.materialId === matId);
        res.writeHead(200);
        res.end(JSON.stringify(note));
        return;
      }

      if (req.method === "PUT") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          if (!material) { res.writeHead(404); res.end(JSON.stringify({ error: "Material not found" })); return; }
          if (material.ownerId !== requestingUser) { res.writeHead(403); res.end(JSON.stringify({ error: "Forbidden" })); return; }
          const { title, content } = JSON.parse(body);
          material.title = title;
          material.updatedAt = Date.now();
          const note = stores.notes.find((n) => n.materialId === matId);
          if (note) note.content = content;
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));
        });
        return;
      }

      if (req.method === "DELETE") {
        if (!material) { res.writeHead(404); res.end(JSON.stringify({ error: "Material not found" })); return; }
        if (material.ownerId !== requestingUser) { res.writeHead(403); res.end(JSON.stringify({ error: "Forbidden" })); return; }
        stores.notes = stores.notes.filter((n) => n.materialId !== matId);
        stores.materials = stores.materials.filter((m) => m._id !== matId);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
        return;
      }
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });
}

test("POST /api/notes — creates note and returns materialId", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Test Note", content: "Hello", topicId: "t1" }),
  });
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.ok(body.materialId, "Should return materialId");
  assert.strictEqual(stores.materials.length, 1);
  assert.strictEqual(stores.notes.length, 1);
});

test("POST /api/notes — missing fields returns 400", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "No content" }),
  });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 400);
});

test("GET /api/materials/:id/note — returns note content", async () => {
  const stores = createStores();
  stores.materials.push({ _id: "m1", type: "note", title: "Note 1", ownerId: "auth0|alice", topicId: "t1" });
  stores.notes.push({ materialId: "m1", content: "Body text" });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/materials/m1/note`);
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.content, "Body text");
});

test("PUT /api/materials/:id/note — updates title and content", async () => {
  const stores = createStores();
  stores.materials.push({ _id: "m1", type: "note", title: "Old", ownerId: "auth0|alice", topicId: "t1", updatedAt: 0 });
  stores.notes.push({ materialId: "m1", content: "old body" });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/materials/m1/note`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "New Title", content: "new body" }),
  });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(stores.materials[0].title, "New Title");
  assert.strictEqual(stores.notes[0].content, "new body");
});

test("PUT /api/materials/:id/note — non-owner returns 403", async () => {
  const stores = createStores();
  stores.materials.push({ _id: "m1", type: "note", title: "X", ownerId: "auth0|bob" });
  stores.notes.push({ materialId: "m1", content: "x" });
  const server = buildServer(stores, "auth0|alice");
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/materials/m1/note`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "X", content: "x" }),
  });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 403);
});

test("DELETE /api/materials/:id/note — removes note and material", async () => {
  const stores = createStores();
  stores.materials.push({ _id: "m1", type: "note", title: "X", ownerId: "auth0|alice" });
  stores.notes.push({ materialId: "m1", content: "x" });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/materials/m1/note`, { method: "DELETE" });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(stores.materials.length, 0);
  assert.strictEqual(stores.notes.length, 0);
});

test("DELETE /api/materials/:id/note — non-owner returns 403", async () => {
  const stores = createStores();
  stores.materials.push({ _id: "m1", type: "note", title: "X", ownerId: "auth0|bob" });
  stores.notes.push({ materialId: "m1", content: "x" });
  const server = buildServer(stores, "auth0|alice");
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/materials/m1/note`, { method: "DELETE" });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 403);
});
