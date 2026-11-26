import { getRoadmapStatus } from "@/lib/dal/profile";
import { route } from "@/lib/http";
import { uuidParam } from "@/lib/params";

export const GET = route<{ id: string }>(async ({ userId, params }) => getRoadmapStatus(userId, uuidParam(params.id)));
