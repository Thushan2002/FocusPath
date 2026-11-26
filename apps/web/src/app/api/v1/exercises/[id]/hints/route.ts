import { HintInputSchema } from "@focuspath/shared";
import { requestHint } from "@/lib/dal/exercises";
import { parseBody, rateLimit, route } from "@/lib/http";
import { uuidParam } from "@/lib/params";
import { AI_LIMITS } from "@/lib/rate-limit";

export const POST = route<{ id: string }>(async ({ req, userId, params }) => {
  const { currentCode, lastError } = await parseBody(req, HintInputSchema);
  await rateLimit(userId, "hint", AI_LIMITS.hint);
  return requestHint(userId, uuidParam(params.id), currentCode, lastError);
});
