/**
 * Poll GET /api/jobs until a job reaches expected status or any terminal status.
 * @param {typeof import("../helpers/redbar-live.mjs").authFetch} authFetch
 * @param {string} jobIdHex
 * @param {{ timeoutMs?: number, intervalMs?: number, wantStatus?: string }} opts
 */
export async function waitForJobStatus(authFetch, jobIdHex, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const intervalMs = opts.intervalMs ?? 500;
  const deadline = Date.now() + timeoutMs;
  const want = opts.wantStatus;

  while (Date.now() < deadline) {
    const r = await authFetch("/api/jobs");
    if (!r.ok) throw new Error(`GET /api/jobs ${r.status}`);
    const jobs = await r.json();
    const j = jobs.find((x) => String(x._id) === jobIdHex);
    if (j) {
      if (want === "failed" && j.status === "done") {
        throw new Error(
          "expected job failed (OpenAI 429) but got done — set worker OPENAI_BASE_URL to the 429 stub (see tests/redbar/ai-001-backoff.test.mjs)"
        );
      }
      if (want === "done" && j.status === "failed") {
        throw new Error(
          `expected job done but got failed: ${j.error || "unknown worker error"}`
        );
      }
      if (want) {
        if (j.status === want) return j;
        if ((j.status === "failed" || j.status === "done") && j.status !== want) {
          throw new Error(`expected job ${want} but got ${j.status}: ${j.error || "no error message"}`);
        }
      } else if (j.status === "failed" || j.status === "done") {
        return j;
      }
    }
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  throw new Error(`timeout waiting for job ${jobIdHex} (want ${want || "terminal"})`);
}
