import { SubmissionInputSchema } from "@focuspath/shared";
import { submitExercise } from "@/lib/dal/exercises";
import { parseBody, route } from "@/lib/http";
import { uuidParam } from "@/lib/params";

export const POST = route<{ id: string }>(async ({ req, userId, params }) => {
  const { code, results } = await parseBody(req, SubmissionInputSchema);
  return submitExercise(userId, uuidParam(params.id), code, results);
});
