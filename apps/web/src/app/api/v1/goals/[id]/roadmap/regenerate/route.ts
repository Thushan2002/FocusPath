import { startRoadmapRegeneration } from "@/lib/dal/profile";
import { rateLimit, route } from "@/lib/http";
import { uuidParam } from "@/lib/params";
import { enqueueRoadmapGeneration } from "@/lib/queue";
import { AI_LIMITS } from "@/lib/rate-limit";

export const POST = route<{ id: string }>(async ({ userId, params }) => {
  await rateLimit(userId, "roadmap", AI_LIMITS.roadmap);
  const { roadmapId } = await startRoadmapRegeneration(userId, uuidParam(params.id));
  await enqueueRoadmapGeneration(roadmapId);
  return { roadmapId, status: "generating" };
});
