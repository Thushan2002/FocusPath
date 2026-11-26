import { listRevisions } from "@/lib/dal/revisions";
import { route } from "@/lib/http";

export const GET = route(async ({ userId }) => ({ revisions: await listRevisions(userId) }));
