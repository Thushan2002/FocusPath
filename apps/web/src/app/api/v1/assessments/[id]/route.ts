import { getAssessment } from "@/lib/dal/assessment";
import { route } from "@/lib/http";
import { uuidParam } from "@/lib/params";

export const GET = route<{ id: string }>(async ({ userId, params }) => getAssessment(userId, uuidParam(params.id)));
