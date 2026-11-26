import { OnboardingInputSchema } from "@focuspath/shared";
import { completeOnboarding } from "@/lib/dal/profile";
import { parseBody, rateLimit, route } from "@/lib/http";
import { enqueueRoadmapGeneration } from "@/lib/queue";
import { AI_LIMITS } from "@/lib/rate-limit";

export const POST = route(async ({ req, userId }) => {
  const input = await parseBody(req, OnboardingInputSchema);
  await rateLimit(userId, "roadmap", AI_LIMITS.roadmap);
  const result = await completeOnboarding(userId, input);
  await enqueueRoadmapGeneration(result.roadmapId);
  return { ...result, status: "generating" };
});
