/**
 * Verification test — claim auth-001
 *
 * Clause:       "All /api/* endpoints require a valid Auth0 JWT.
 *                Requests without a valid token receive 401 Unauthorized."
 * Enforcement:  api/src/index.js — app.use("/api", checkJwt)
 *
 * Run: node --test tests/redbar/auth-001-jwt-required.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { API_BASE } from "../helpers/redbar-live.mjs";
import { LIVE } from "./live-setup.mjs";

test("auth-001 — /api/* without token returns 401", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const res = await fetch(`${API_BASE}/api/me`);
  assert.strictEqual(res.status, 401);
});
