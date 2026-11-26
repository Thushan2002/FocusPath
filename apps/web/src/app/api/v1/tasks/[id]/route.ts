import { TaskPatchSchema } from "@focuspath/shared";
import { setTaskDone } from "@/lib/dal/plan";
import { parseBody, route } from "@/lib/http";
import { uuidParam } from "@/lib/params";

export const PATCH = route<{ id: string }>(async ({ req, userId, params }) => {
  const { done } = await parseBody(req, TaskPatchSchema);
  return setTaskDone(userId, uuidParam(params.id), done);
});
