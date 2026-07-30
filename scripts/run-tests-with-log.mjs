import { mkdirSync, createWriteStream } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const receiptsDir = resolve(repoRoot, "evidence/receipts");
mkdirSync(receiptsDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:]/g, "-");
const logPath = resolve(receiptsDir, `npm-test-${stamp}.log`);

let reviewCommit = "unknown";
try {
  reviewCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
} catch {
  /* leave unknown */
}

let worktreeState = "unknown";
try {
  const status = execFileSync("git", ["status", "--short"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  worktreeState = status ? `dirty\n${status}` : "clean";
} catch {
  /* leave unknown */
}

const baseArgs = [
  "--test",
  "--test-concurrency=1",
  "tests/redbar/*.test.mjs",
  "tests/smoke/*.test.mjs",
  "tests/integration/*.test.mjs",
];
const extraArgs = process.argv.slice(2);
const childArgs = [...baseArgs, ...extraArgs];

const log = createWriteStream(logPath, { flags: "a" });
log.write(`command: node ${childArgs.join(" ")}\n`);
log.write(`timestamp: ${new Date().toISOString()}\n`);
log.write(`commit: ${reviewCommit}\n`);
log.write(`worktree_state: ${worktreeState}\n`);
log.write(`cwd: ${repoRoot}\n`);
log.write(`log_file: ${logPath}\n\n`);

const child = spawn(process.execPath, childArgs, {
  cwd: repoRoot,
  env: process.env,
  stdio: ["inherit", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  log.write(chunk);
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
  log.write(chunk);
});

child.on("close", (code, signal) => {
  if (signal) {
    log.write(`\nprocess terminated by signal: ${signal}\n`);
    log.end(() => process.kill(process.pid, signal));
    return;
  }
  log.write(`\nexit_code: ${code ?? 1}\n`);
  log.end(() => {
    process.exit(code ?? 1);
  });
});
