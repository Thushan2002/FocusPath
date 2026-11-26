import { createServer, type Server } from "node:http";

/** Liveness endpoint for orchestration (and for Playwright to wait on). */
export function startHealthServer(port: number, isHealthy: () => boolean): Server {
  return createServer((_req, res) => {
    const ok = isHealthy();
    res.writeHead(ok ? 200 : 503, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: ok ? "ok" : "stopped" }));
  }).listen(port);
}
