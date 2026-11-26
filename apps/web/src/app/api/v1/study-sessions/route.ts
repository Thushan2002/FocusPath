import { StudySessionStartSchema } from "@focuspath/shared";
import { startStudySession } from "@/lib/dal/plan";
import { parseBody, route } from "@/lib/http";

export const POST = route(async ({ req, userId }) => {
  const { conceptId } = await parseBody(req, StudySessionStartSchema);
  return startStudySession(userId, conceptId);
});
