/**
 * Verification test — claim data-004
 *
 * Clause:       "OPENAI_API_KEY is injected only into the Worker task."
 * Enforcement:  terraform/modules/ecs/main.tf — ECS task definitions
 *
 * Run: node --test tests/redbar/data-004-worker-secret-isolation.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../terraform");
const frontendRoot = resolve(root, "../frontend/src");

function readFrontendSource(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) return readFrontendSource(fullPath);
      if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) return [];
      return [readFileSync(fullPath, "utf8")];
    })
    .join("\n");
}

test("data-004 — worker task gets OPENAI_API_KEY secret and api task does not", () => {
  const ecs = readFileSync(resolve(root, "modules/ecs/main.tf"), "utf8");
  const workerBlock = ecs.match(/resource "aws_ecs_task_definition" "worker"[\s\S]*?resource "aws_ecs_service" "api"/);
  const apiBlock = ecs.match(/resource "aws_ecs_task_definition" "api"[\s\S]*?resource "aws_ecs_task_definition" "worker"/);

  assert.ok(workerBlock, "worker task definition block should exist");
  assert.ok(apiBlock, "api task definition block should exist");
  assert.match(workerBlock[0], /OPENAI_API_KEY/);
  assert.doesNotMatch(apiBlock[0], /OPENAI_API_KEY/);
});

test("data-004 — frontend client build does not reference OPENAI_API_KEY", () => {
  const frontendSource = readFrontendSource(frontendRoot);
  assert.doesNotMatch(frontendSource, /OPENAI_API_KEY/);
  assert.doesNotMatch(frontendSource, /VITE_OPENAI/i);
});
