import { StudySessionUpdateSchema } from "@focuspath/shared";
import { updateStudySession } from "@/lib/dal/plan";
import { parseBody, route } from "@/lib/http";
import { uuidParam } from "@/lib/params";

export const PATCH = route<{ id: string }>(async ({ req, userId, params }) => {
  const { activeSeconds, ended } = await parseBody(req, StudySessionUpdateSchema);
  return updateStudySession(userId, uuidParam(params.id), activeSeconds, ended);
});
