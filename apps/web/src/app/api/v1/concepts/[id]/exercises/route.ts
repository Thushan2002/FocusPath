import { listExercises } from "@/lib/dal/exercises";
import { rateLimit, route } from "@/lib/http";
import { uuidParam } from "@/lib/params";
import { AI_LIMITS } from "@/lib/rate-limit";

export const GET = route<{ id: string }>(async ({ userId, params }) => {
  await rateLimit(userId, "generate", AI_LIMITS.generate);
  return { exercises: await listExercises(userId, uuidParam(params.id)) };
});
