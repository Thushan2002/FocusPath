import "server-only";
import { Queue } from "bullmq";
import { QUEUES, type RoadmapJob } from "@focuspath/shared";
import { redis } from "./redis";

const g = globalThis as unknown as { __fpRoadmapQueue?: Queue<RoadmapJob> };

function roadmapQueue() {
  g.__fpRoadmapQueue ??= new Queue<RoadmapJob>(QUEUES.roadmap, { connection: redis() });
  return g.__fpRoadmapQueue;
}

export async function enqueueRoadmapGeneration(roadmapId: string) {
  await roadmapQueue().add(
    "generate",
    { roadmapId },
    { jobId: roadmapId, attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 100, removeOnFail: 500 },
  );
}
