import { Queue, Worker } from "bullmq";
import type { Redis } from "ioredis";
import type { Database } from "@focuspath/db";
import { markRoadmapFailed } from "@focuspath/db/roadmap";
import { QUEUES, type RoadmapJob } from "@focuspath/shared";
import type { AiClient } from "@focuspath/shared/ai-client";
import type { WorkerConfig } from "./config";
import { sendDueReminders } from "./jobs/reminders";
import { generateRoadmap } from "./jobs/roadmap";
import type { Mailer } from "./mailer";

/** Dependencies the job handlers need. Injected, so handlers never create their own clients. */
export interface JobDeps {
  db: Database;
  ai: AiClient;
  mailer: Mailer;
  connection: Redis;
}

/** Something that can be shut down gracefully. */
export interface Closable {
  close(): Promise<void>;
}

/** Roadmap generation: retried by BullMQ; marked failed only after the last attempt. */
export function startRoadmapWorker(deps: JobDeps, cfg: WorkerConfig) {
  const worker = new Worker<RoadmapJob>(
    QUEUES.roadmap,
    (job) => generateRoadmap(deps.db, deps.ai, job.data.roadmapId),
    {
      connection: deps.connection,
      concurrency: cfg.roadmapConcurrency,
    },
  );
  worker.on("failed", async (job, err) => {
    console.error(`roadmap job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      await markRoadmapFailed(deps.db, job.data.roadmapId, err.message);
    }
  });
  worker.on("completed", (job) => console.log(`roadmap ${job.data.roadmapId} ready`));
  return worker;
}

/** Revision reminders: a repeatable scan that emails learners with due revisions. */
export async function startReminderWorker(deps: JobDeps, cfg: WorkerConfig): Promise<Closable[]> {
  const queue = new Queue(QUEUES.reminders, { connection: deps.connection });
  await queue.upsertJobScheduler("due-revisions", { every: cfg.reminderEveryMs }, { name: "scan" });
  const worker = new Worker(
    QUEUES.reminders,
    async () => {
      const sent = await sendDueReminders(deps.db, deps.mailer);
      if (sent) console.log(`sent ${sent} revision reminder email(s)`);
    },
    { connection: deps.connection },
  );
  return [worker, queue];
}
