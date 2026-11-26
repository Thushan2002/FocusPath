import { AttemptInputSchema } from "@focuspath/shared";
import { submitAttempt } from "@/lib/dal/assessment";
import { parseBody, route } from "@/lib/http";
import { uuidParam } from "@/lib/params";

export const POST = route<{ id: string }>(async ({ req, userId, params }) => {
  const { answers } = await parseBody(req, AttemptInputSchema);
  return submitAttempt(userId, uuidParam(params.id), answers);
});
