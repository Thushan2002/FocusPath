import { SetFocusInputSchema } from "@focuspath/shared";
import { setTodayFocus } from "@/lib/dal/plan";
import { parseBody, route } from "@/lib/http";

export const POST = route(async ({ req, userId }) => {
  const { conceptId } = await parseBody(req, SetFocusInputSchema);
  return setTodayFocus(userId, conceptId);
});
