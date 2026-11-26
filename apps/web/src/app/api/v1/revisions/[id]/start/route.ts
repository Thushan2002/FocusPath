import { startRevision } from "@/lib/dal/assessment";
import { rateLimit, route } from "@/lib/http";
import { uuidParam } from "@/lib/params";
import { AI_LIMITS } from "@/lib/rate-limit";

export const POST = route<{ id: string }>(async ({ userId, params }) => {
  await rateLimit(userId, "generate", AI_LIMITS.generate);
  return startRevision(userId, uuidParam(params.id));
});
