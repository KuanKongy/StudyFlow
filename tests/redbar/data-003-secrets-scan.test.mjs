/**
 * data-003 — no obvious secret literals in tracked source (heuristic).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("data-003 — tracked files do not contain obvious secret literals", () => {
  try {
    execSync(
      'git grep -n -E "(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AUTH0_M2M_CLIENT_SECRET=|OPENAI_API_KEY=sk-)" -- "*.md" "*.js" "*.mjs" "*.ts" "*.tsx" "*.yml" "*.yaml" "*.tf" "*.json" ":!tests/redbar/data-003-secrets-scan.test.mjs" 2>/dev/null',
      { cwd: repoRoot, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
    );
    assert.fail("Found obvious secret-like literal in tracked files (remove or redact before commit)");
  } catch (e) {
    if (e.status === 1) return;
    if (e.code === 1) return;
    throw e;
  }
});

test("data-003 — .env files are gitignored at repo root", () => {
  const rootIgnore = readFileSync(resolve(repoRoot, ".gitignore"), "utf8");
  assert.match(rootIgnore, /^\.env$/m);
});

test("data-003 — pre-commit blocks staged .env files", () => {
  const hook = readFileSync(resolve(repoRoot, "githooks/pre-commit"), "utf8");
  assert.match(hook, /git diff --cached --name-only/);
  assert.match(hook, /refusing to commit \.env files/);
});
