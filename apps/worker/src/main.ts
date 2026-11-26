/**
 * Composition root: builds every dependency once from config and wires it into the workers.
 * Nothing below this file constructs its own clients.
 */
import { Redis } from "ioredis";
import { createDb } from "@focuspath/db";
import { createAiClient } from "@focuspath/shared/ai-client";
import { loadConfig, loadRootEnv } from "./config";
import { startHealthServer } from "./health";
import { createMailer } from "./mailer";
import { startReminderWorker, startRoadmapWorker, type JobDeps } from "./queues";

loadRootEnv();
const cfg = loadConfig();

const { db, close: closeDb } = createDb(cfg.databaseUrl);
const deps: JobDeps = {
  db,
  ai: createAiClient(cfg.ai),
  mailer: createMailer({ ...cfg.smtp, appUrl: cfg.appUrl }),
  connection: new Redis(cfg.redisUrl, { maxRetriesPerRequest: null }),
};

const roadmapWorker = startRoadmapWorker(deps, cfg);
const reminders = await startReminderWorker(deps, cfg);
const health = startHealthServer(cfg.healthPort, () => roadmapWorker.isRunning());

console.log("worker started: roadmap generation + revision reminders");

async function shutdown() {
  health.close();
  await Promise.allSettled([roadmapWorker.close(), ...reminders.map((r) => r.close())]);
  await closeDb();
  deps.connection.disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
