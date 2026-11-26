import { TutorMessageInputSchema } from "@focuspath/shared";
import { sendTutorMessage, tutorHistory } from "@/lib/dal/tutor";
import { parseBody, rateLimit, route } from "@/lib/http";
import { uuidParam } from "@/lib/params";
import { AI_LIMITS } from "@/lib/rate-limit";

export const GET = route(async ({ req, userId }) => {
  const conceptId = uuidParam(new URL(req.url).searchParams.get("conceptId") ?? undefined);
  return { messages: await tutorHistory(userId, conceptId) };
});

export const POST = route(async ({ req, userId }) => {
  const input = await parseBody(req, TutorMessageInputSchema);
  await rateLimit(userId, "tutor", AI_LIMITS.tutor);
  return sendTutorMessage(userId, input);
});
