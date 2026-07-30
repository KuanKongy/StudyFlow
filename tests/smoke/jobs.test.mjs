/**
 * Smoke test — Jobs
 *
 * Covers: GET /api/jobs, GET /api/jobs/:id, 404 for unknown job
 * Run: node --test tests/smoke/jobs.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

function createStores() {
  return {
    jobs: [
      { _id: "j1", type: "GENERATE_SUMMARY", ownerId: "auth0|alice", status: "done", createdAt: 200 },
      { _id: "j2", type: "GENERATE_FLASHCARDS", ownerId: "auth0|alice", status: "queued", createdAt: 100 },
      { _id: "j3", type: "GENERATE_SUMMARY", ownerId: "auth0|bob", status: "done", createdAt: 300 },
    ],
    cache: new Map(),
  };
}

function buildServer(stores, requestingUser = "auth0|alice") {
  return http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    const url = new URL(req.url, "http://localhost");

    if (req.method === "GET" && url.pathname === "/api/jobs") {
      const userJobs = stores.jobs
        .filter((j) => j.ownerId === requestingUser)
        .sort((a, b) => b.createdAt - a.createdAt);
      res.writeHead(200);
      res.end(JSON.stringify(userJobs));
      return;
    }

    const jobMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)$/);
    if (req.method === "GET" && jobMatch) {
      const jobId = jobMatch[1];
      const cached = stores.cache.get(`job:${jobId}`);
      if (cached) { res.writeHead(200); res.end(JSON.stringify({ status: cached })); return; }
      const job = stores.jobs.find((j) => j._id === jobId);
      if (!job) { res.writeHead(404); res.end(JSON.stringify({ error: "Job not found" })); return; }
      stores.cache.set(`job:${jobId}`, job.status);
      res.writeHead(200);
      res.end(JSON.stringify({ status: job.status }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });
}

test("GET /api/jobs — returns user's jobs sorted by createdAt desc", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/jobs`);
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.length, 2, "Only Alice's jobs");
  assert.ok(body[0].createdAt >= body[1].createdAt, "Sorted descending");
});

test("GET /api/jobs/:id — returns status and caches", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/jobs/j1`);
  const body = await res.json();
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.status, "done");
  assert.ok(stores.cache.has("job:j1"), "Status should be cached");
});

test("GET /api/jobs/:id — unknown job returns 404", async () => {
  const stores = createStores();
  const server = buildServer(stores);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/jobs/nonexistent`);
  await new Promise((r) => server.close(r));
  assert.strictEqual(res.status, 404);
});
