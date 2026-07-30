/**
 * Minimal HTTP server that responds 429 to POST .../chat/completions (OpenAI-compatible).
 * Worker must use OPENAI_BASE_URL pointing at this stub (e.g. http://host.docker.internal:PORT/v1).
 */
import http from "node:http";

/**
 * @param {number} port
 * @returns {Promise<import("node:http").Server>}
 */
export function startOpenAI429Stub(port) {
  let requestCount = 0;
  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url.includes("chat/completions")) {
      requestCount++;
      req.on("data", () => {});
      req.on("end", () => {
        res.writeHead(429, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: { message: "rate_limit_exceeded", type: "rate_limit" },
          })
        );
      });
      return;
    }
    res.writeHead(404).end();
  });
  server.getRequestCount = () => requestCount;
  return new Promise((resolve, reject) => {
    server.listen(port, "0.0.0.0", () => resolve(server));
    server.on("error", reject);
  });
}
