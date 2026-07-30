/**
 * Red-bar — claim val-001
 *
 * Clause:       "Malformed ids are rejected with 400, never a 500 from an
 *                ObjectId cast crash."
 * Enforcement:  api/src/index.js — validateId middleware + ObjectId.isValid
 *               checks on body-supplied ids.
 *
 * Requires: Docker Compose + Auth0 M2M.
 *
 * Run: node --test tests/redbar/val-001-invalid-id-400.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import "./live-setup.mjs";
import { authFetch } from "../helpers/redbar-live.mjs";
import { LIVE } from "./live-setup.mjs";

test("val-001 — live: malformed ids return 400, not 500", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }

  const paramCases = [
    ["GET", "/api/materials/not-a-valid-id"],
    ["GET", "/api/materials/not-a-valid-id/note"],
    ["GET", "/api/jobs/not-a-valid-id"],
    ["DELETE", "/api/flashcards/not-a-valid-id"],
    ["PUT", "/api/topics/not-a-valid-id", { title: "x" }],
    ["DELETE", "/api/groups/not-a-valid-id"],
  ];
  for (const [method, path, body] of paramCases) {
    const res = await authFetch(path, {
      method,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    assert.strictEqual(res.status, 400, `${method} ${path} should 400, got ${res.status}`);
  }

  const bodyCases = [
    ["/api/notes", { title: "t", content: "c", topicId: "nope" }],
    ["/api/flashcard-sets", { title: "t", topicId: "nope" }],
    ["/api/topics", { title: "t", groupIds: ["nope"] }],
  ];
  for (const [path, body] of bodyCases) {
    const res = await authFetch(path, { method: "POST", body: JSON.stringify(body) });
    assert.strictEqual(res.status, 400, `POST ${path} with bad id should 400, got ${res.status}`);
  }
});
