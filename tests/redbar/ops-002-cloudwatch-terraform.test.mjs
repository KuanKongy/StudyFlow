/**
 * Verification test — claim ops-002
 *
 * Clause:       "CloudWatch log retention configured for 30 days."
 * Enforcement:  terraform/modules/ecs/main.tf + config.tfvars
 *
 * Run: node --test tests/redbar/ops-002-cloudwatch-terraform.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../terraform");

test("ops-002 — ECS tasks ship logs with awslogs and retain them for 30 days", () => {
  const ecs = readFileSync(resolve(root, "modules/ecs/main.tf"), "utf8");
  assert.ok(ecs.includes("retention_in_days = var.log_retention_days"));
  assert.match(ecs, /logDriver\s*=\s*"awslogs"/);
  assert.match(ecs, /awslogs-group/);
  assert.match(ecs, /awslogs-region/);
  assert.match(ecs, /awslogs-stream-prefix/);
  const config = readFileSync(resolve(root, "config.tfvars"), "utf8");
  assert.match(config, /log_retention_days\s*=\s*30/);
});
