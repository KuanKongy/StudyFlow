/**
 * Verification test — claim res-001
 *
 * Clause:       "Production Terraform region config is ca-central-1."
 * Enforcement:  terraform/config.tfvars + providers.tf
 *
 * Run: node --test tests/redbar/res-001-terraform-region.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../terraform");

test("res-001 — production Terraform config uses ca-central-1", () => {
  const config = readFileSync(resolve(root, "config.tfvars"), "utf8");
  const providers = readFileSync(resolve(root, "providers.tf"), "utf8");
  assert.match(config, /aws_region\s*=\s*"ca-central-1"/);
  assert.match(providers, /provider "aws"[\s\S]*region\s*=\s*var\.aws_region/);
});
