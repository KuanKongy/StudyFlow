/**
 * Verification test — claim cicd-003
 *
 * Clause:       "Docker images scanned on push (ECR)."
 * Enforcement:  terraform/modules/ecr/main.tf
 *
 * Run: node --test tests/redbar/cicd-003-ecr-scan.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../terraform");

test("cicd-003 — ECR repositories enable scan_on_push", () => {
  const ecr = readFileSync(resolve(root, "modules/ecr/main.tf"), "utf8");
  assert.ok(ecr.includes("scan_on_push = true"));
});
