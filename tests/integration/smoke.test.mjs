/**
 * Integration smoke test — runs against live Docker Compose stack
 *
 * Prerequisites:
 *   1. Docker Compose running (docker compose up -d)
 *   2. Auth0 M2M credentials in api/src/.env
 *
 * Run: npm run test:integration
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { authFetch } from "./setup.mjs";

const state = {};

test("health — GET /health returns 200", async () => {
  const res = await fetch("http://localhost:4000/health");
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.ok, true);
});

test("user — GET /api/me returns profile", async () => {
  const res = await authFetch("/api/me");
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(body.authId, "Should have authId");
  state.authId = body.authId;
});

test("user — PUT /api/me updates username", async () => {
  const tag = `testuser${Date.now()}`;
  const res = await authFetch("/api/me", {
    method: "PUT",
    body: JSON.stringify({ username: tag }),
  });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.username, tag);
});

test("group — POST /api/groups creates a group", async () => {
  const res = await authFetch("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name: "Integration Test Group", description: "Smoke test" }),
  });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(body._id || body.groupId, "Should return group id");
  state.groupId = (body._id || body.groupId).toString();
});

test("topic — POST /api/topics creates a topic", async () => {
  const res = await authFetch("/api/topics", {
    method: "POST",
    body: JSON.stringify({ title: "Integration Topic", groupIds: [state.groupId] }),
  });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  state.topicId = (body._id || body.topicId).toString();
});

test("note — POST /api/notes creates a note", async () => {
  const res = await authFetch("/api/notes", {
    method: "POST",
    body: JSON.stringify({ title: "Integration Note", content: "Test body", topicId: state.topicId }),
  });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(body.materialId, "Should return materialId");
  state.noteMaterialId = body.materialId.toString();
});

test("materials — GET /api/materials?filter=mine includes the note", async () => {
  const res = await authFetch("/api/materials?filter=mine");
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  const ids = body.map((m) => (m._id || m.id).toString());
  assert.ok(ids.includes(state.noteMaterialId), "Note should appear in mine");
});

test("flashcard-set — POST /api/flashcard-sets creates manual set", async () => {
  const res = await authFetch("/api/flashcard-sets", {
    method: "POST",
    body: JSON.stringify({
      title: "Integration FC Set",
      topicId: state.topicId,
      cards: [{ question: "Q1", answer: "A1" }],
    }),
  });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(body.materialId, "Should return materialId");
  assert.ok(body.setId, "Should return setId");
  state.fcMaterialId = body.materialId.toString();
  state.fcSetId = body.setId.toString();
});

test("flashcard-cards — GET /api/flashcard-sets/:id/cards returns cards", async () => {
  const res = await authFetch(`/api/flashcard-sets/${state.fcSetId}/cards`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(body.length >= 1, "Should have at least 1 card");
});

test("jobs — GET /api/jobs returns jobs list", async () => {
  const res = await authFetch("/api/jobs");
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body), "Jobs should be an array");
});

test("cleanup — delete note, topic, group", async () => {
  if (state.noteMaterialId) {
    const res = await authFetch(`/api/materials/${state.noteMaterialId}/note`, { method: "DELETE" });
    assert.strictEqual(res.status, 200);
  }
  if (state.topicId) {
    const res = await authFetch(`/api/topics/${state.topicId}`, { method: "DELETE" });
    assert.strictEqual(res.status, 200);
  }
  if (state.groupId) {
    const res = await authFetch(`/api/groups/${state.groupId}`, { method: "DELETE" });
    assert.strictEqual(res.status, 200);
  }
});
