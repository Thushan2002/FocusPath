import { getToday } from "@/lib/dal/plan";
import { route } from "@/lib/http";

export const GET = route(async ({ user }) => getToday(user.id, user.name));
