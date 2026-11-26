import { SwitchCheckInputSchema } from "@focuspath/shared";
import { checkSwitch } from "@/lib/dal/focus-guard";
import { parseBody, route } from "@/lib/http";

export const POST = route(async ({ req, userId }) => {
  const { conceptId, targetTopic } = await parseBody(req, SwitchCheckInputSchema);
  return checkSwitch(userId, conceptId, targetTopic);
});
