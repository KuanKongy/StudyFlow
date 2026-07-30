/**
 * Smoke test — Flashcard Sets & Cards CRUD
 *
 * Covers: POST /api/flashcard-sets, GET /api/materials/:id/flashcard-set,
 *         GET /api/flashcard-sets/:id/cards, POST /api/flashcard-sets/:id/cards,
 *         PUT /api/materials/:id/cards, DELETE /api/flashcards/:id
 *         Card writes are owner-only (auth-007): non-owners get 403.
 * Run: node --test tests/smoke/flashcards-crud.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

let nextId = 1;
function uid() { return `fid-${nextId++}`; }

function createStores() {
  return { materials: [], flashcardSets: [], flashcards: [] };
}

function buildServer(stores, requestingUser = "auth0|alice") {
  // auth-007: card writes require owning the set's material
  function ownsSet(setId) {
    const set = stores.flashcardSets.find((s) => s._id === setId);
    if (!set) return null;
    const material = stores.materials.find((m) => m._id === set.materialId);
    if (!material) return null;
    return material.ownerId === requestingUser;
  }

  return http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    const url = new URL(req.url, "http://localhost");

    if (req.method === "POST" && url.pathname === "/api/flashcard-sets") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const { title, topicId, cards } = JSON.parse(body);
        if (!title || !topicId) { res.writeHead(400); res.end(JSON.stringify({ error: "title and topicId required" })); return; }
        const materialId = uid();
        stores.materials.push({ _id: materialId, type: "flashcardSet", title, ownerId: requestingUser, topicId });
        const setId = uid();
        stores.flashcardSets.push({ _id: setId, materialId });
        if (cards && Array.isArray(cards)) {
          for (const c of cards) {
            stores.flashcards.push({ _id: uid(), setId, question: c.question, answer: c.answer });
          }
        }
        res.writeHead(200);
        res.end(JSON.stringify({ materialId, setId }));
      });
      return;
    }

    const fsMatch = url.pathname.match(/^\/api\/materials\/([^/]+)\/flashcard-set$/);
    if (req.method === "GET" && fsMatch) {
      const set = stores.flashcardSets.find((s) => s.materialId === fsMatch[1]);
      res.writeHead(set ? 200 : 200);
      res.end(JSON.stringify(set || null));
      return;
    }

    const cardsGetMatch = url.pathname.match(/^\/api\/flashcard-sets\/([^/]+)\/cards$/);
    if (cardsGetMatch) {
      const setId = cardsGetMatch[1];

      if (req.method === "GET") {
        const cards = stores.flashcards.filter((c) => c.setId === setId);
        res.writeHead(200);
        res.end(JSON.stringify(cards));
        return;
      }

      if (req.method === "POST") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          const { question, answer } = JSON.parse(body);
          if (!question || !answer) { res.writeHead(400); res.end(JSON.stringify({ error: "question and answer required" })); return; }
          const owns = ownsSet(setId);
          if (owns === null) { res.writeHead(404); res.end(JSON.stringify({ error: "Flashcard set not found" })); return; }
          if (!owns) { res.writeHead(403); res.end(JSON.stringify({ error: "Forbidden" })); return; }
          const card = { _id: uid(), setId, question, answer };
          stores.flashcards.push(card);
          res.writeHead(200);
          res.end(JSON.stringify(card));
        });
        return;
      }
    }

    const updateCardMatch = url.pathname.match(/^\/api\/materials\/([^/]+)\/cards$/);
    if (req.method === "PUT" && updateCardMatch) {
      const cardId = updateCardMatch[1];
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const { question, answer } = JSON.parse(body);
        if (!question && !answer) { res.writeHead(400); res.end(JSON.stringify({ error: "Need question or answer" })); return; }
        const card = stores.flashcards.find((c) => c._id === cardId);
        if (!card) { res.writeHead(404); res.end(JSON.stringify({ error: "Flashcard not found" })); return; }
        if (ownsSet(card.setId) === false) { res.writeHead(403); res.end(JSON.stringify({ error: "Forbidden" })); return; }
        if (question) card.question = question;
        if (answer) card.answer = answer;
        res.writeHead(200);
        res.end(JSON.stringify({ matchedCount: 1 }));
      });
      return;
    }

    const deleteCardMatch = url.pathname.match(/^\/api\/flashcards\/([^/]+)$/);
    if (req.method === "DELETE" && deleteCardMatch) {
      const cardId = deleteCardMatch[1];
      const idx = stores.flashcards.findIndex((c) => c._id === cardId);
      if (idx === -1) { res.writeHead(404); res.end(JSON.stringify({ error: "Flashcard not found" })); return; }
      if (ownsSet(stores.flashcards[idx].setId) === false) { res.writeHead(403); res.end(JSON.stringify({ error: "Forbidden" })); return; }
      stores.flashcards.splice(idx, 1);
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });
}

test("POST /api/flashcard-sets — creates set with cards", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/flashcard-sets`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Bio Vocab", topicId: "t1", cards: [{ question: "Q1", answer: "A1" }, { question: "Q2", answer: "A2" }] }),
  });
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.ok(body.materialId);
  assert.ok(body.setId);
  assert.strictEqual(stores.materials.length, 1);
  assert.strictEqual(stores.flashcards.length, 2);
});

test("POST /api/flashcard-sets — missing title returns 400", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/flashcard-sets`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topicId: "t1" }),
  });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 400);
});

test("GET /api/materials/:id/flashcard-set — returns set", async () => {
  const stores = createStores();
  stores.flashcardSets.push({ _id: "fs1", materialId: "m1" });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/materials/m1/flashcard-set`);
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body._id, "fs1");
});

test("GET /api/flashcard-sets/:id/cards — returns cards for set", async () => {
  const stores = createStores();
  stores.flashcards.push({ _id: "c1", setId: "fs1", question: "Q", answer: "A" });
  stores.flashcards.push({ _id: "c2", setId: "fs1", question: "Q2", answer: "A2" });
  stores.flashcards.push({ _id: "c3", setId: "fs2", question: "Other", answer: "Set" });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/flashcard-sets/fs1/cards`);
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.length, 2);
});

test("POST /api/flashcard-sets/:id/cards — adds a card", async () => {
  const stores = createStores();
  stores.materials.push({ _id: "m1", type: "flashcardSet", title: "S", ownerId: "auth0|alice" });
  stores.flashcardSets.push({ _id: "fs1", materialId: "m1" });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/flashcard-sets/fs1/cards`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "New Q", answer: "New A" }),
  });
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.question, "New Q");
  assert.strictEqual(stores.flashcards.length, 1);
});

test("PUT /api/materials/:id/cards — updates question and answer", async () => {
  const stores = createStores();
  stores.materials.push({ _id: "m1", type: "flashcardSet", title: "S", ownerId: "auth0|alice" });
  stores.flashcardSets.push({ _id: "fs1", materialId: "m1" });
  stores.flashcards.push({ _id: "c1", setId: "fs1", question: "Old Q", answer: "Old A" });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/materials/c1/cards`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "Updated Q", answer: "Updated A" }),
  });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(stores.flashcards[0].question, "Updated Q");
  assert.strictEqual(stores.flashcards[0].answer, "Updated A");
});

test("DELETE /api/flashcards/:id — removes card", async () => {
  const stores = createStores();
  stores.materials.push({ _id: "m1", type: "flashcardSet", title: "S", ownerId: "auth0|alice" });
  stores.flashcardSets.push({ _id: "fs1", materialId: "m1" });
  stores.flashcards.push({ _id: "c1", setId: "fs1", question: "Q", answer: "A" });
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/flashcards/c1`, { method: "DELETE" });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(stores.flashcards.length, 0);
});

function seedForeignSet(stores) {
  stores.materials.push({ _id: "m9", type: "flashcardSet", title: "Bob's set", ownerId: "auth0|bob" });
  stores.flashcardSets.push({ _id: "fs9", materialId: "m9" });
  stores.flashcards.push({ _id: "c9", setId: "fs9", question: "Q", answer: "A" });
}

test("POST /api/flashcard-sets/:id/cards — non-owner returns 403", async () => {
  const stores = createStores();
  seedForeignSet(stores);
  const server = buildServer(stores, "auth0|alice");
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/flashcard-sets/fs9/cards`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "Q2", answer: "A2" }),
  });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 403);
  assert.strictEqual(stores.flashcards.length, 1);
});

test("PUT /api/materials/:id/cards — non-owner returns 403", async () => {
  const stores = createStores();
  seedForeignSet(stores);
  const server = buildServer(stores, "auth0|alice");
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/materials/c9/cards`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "Hijacked" }),
  });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 403);
  assert.strictEqual(stores.flashcards[0].question, "Q");
});

test("DELETE /api/flashcards/:id — non-owner returns 403", async () => {
  const stores = createStores();
  seedForeignSet(stores);
  const server = buildServer(stores, "auth0|alice");
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/flashcards/c9`, { method: "DELETE" });
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 403);
  assert.strictEqual(stores.flashcards.length, 1);
});
