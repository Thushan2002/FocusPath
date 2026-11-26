import { getConceptDetail } from "@/lib/dal/roadmap";
import { route } from "@/lib/http";
import { uuidParam } from "@/lib/params";

export const GET = route<{ id: string }>(async ({ userId, params }) => getConceptDetail(userId, uuidParam(params.id)));
