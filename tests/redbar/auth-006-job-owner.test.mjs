/**
 * Red-bar — claim auth-006
 *
 * Clause:       Job status polling is restricted to the job owner.
 * Enforcement:  api/src/index.js — GET /api/jobs/:id
 *
 * Run: node --test tests/redbar/auth-006-job-owner.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mongoWithClient, authFetch, ObjectId } from "../helpers/redbar-live.mjs";
import { LIVE, sub } from "./live-setup.mjs";

test("auth-006 — cannot read another user's job status", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const jobId = new ObjectId();
  const { client, db } = await mongoWithClient();
  try {
    await db.collection("jobs").insertOne({
      _id: jobId,
      type: "GENERATE_SUMMARY",
      ownerId: "auth0|foreign-job-owner",
      status: "queued",
      retries: 0,
      createdAt: Date.now(),
    });
    const res = await authFetch(`/api/jobs/${jobId.toString()}`);
    assert.strictEqual(res.status, 403);
  } finally {
    await db.collection("jobs").deleteOne({ _id: jobId });
    await client.close();
  }
});

test("auth-006 — owner can read own job status", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const jobId = new ObjectId();
  const { client, db } = await mongoWithClient();
  try {
    await db.collection("jobs").insertOne({
      _id: jobId,
      type: "TEST",
      ownerId: sub,
      status: "queued",
      retries: 0,
      createdAt: Date.now(),
    });
    const res = await authFetch(`/api/jobs/${jobId.toString()}`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, "queued");
  } finally {
    await db.collection("jobs").deleteOne({ _id: jobId });
    await client.close();
  }
});
