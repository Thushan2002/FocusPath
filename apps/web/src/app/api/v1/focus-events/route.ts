import { FocusEventInputSchema } from "@focuspath/shared";
import { recordFocusEvent } from "@/lib/dal/focus-guard";
import { parseBody, route } from "@/lib/http";

export const POST = route(async ({ req, userId }) => {
  const { conceptId, targetTopic, choice } = await parseBody(req, FocusEventInputSchema);
  return recordFocusEvent(userId, conceptId, targetTopic, choice);
});
