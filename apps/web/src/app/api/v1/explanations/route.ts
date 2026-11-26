import { ExplanationInputSchema } from "@focuspath/shared";
import { submitExplanation } from "@/lib/dal/explanations";
import { parseBody, rateLimit, route } from "@/lib/http";
import { AI_LIMITS } from "@/lib/rate-limit";

export const POST = route(async ({ req, userId }) => {
  const { conceptId, text } = await parseBody(req, ExplanationInputSchema);
  await rateLimit(userId, "explanation", AI_LIMITS.explanation);
  return submitExplanation(userId, conceptId, text);
});
