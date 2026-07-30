/**
 * Verification test — claim ops-001
 *
 * Clause:       "The API server exposes a /health endpoint that returns { ok: true }."
 * Enforcement:  api/src/index.js — GET /health
 *
 * Run: node --test tests/redbar/ops-001-health.test.mjs
 */
import "./live-setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { API_BASE } from "../helpers/redbar-live.mjs";
import { LIVE } from "./live-setup.mjs";

const terraformRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../terraform");

test("ops-001 — GET /health returns ok", async (t) => {
  if (!LIVE) {
    t.skip();
    return;
  }
  const res = await fetch(`${API_BASE}/health`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.ok, true);
});

test("ops-001 — Terraform ALB target group health check uses /health", () => {
  const alb = readFileSync(resolve(terraformRoot, "modules/alb/main.tf"), "utf8");
  assert.match(alb, /path\s*=\s*"\/health"/);
});
