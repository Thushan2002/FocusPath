import { redirect } from "next/navigation";
import { todayFocusConceptId } from "@/lib/dal/roadmap";
import { requireUser } from "@/lib/session";

/** "Focus" in the sidebar opens today's focus, or the roadmap to pick one. */
export default async function FocusIndex() {
  const user = await requireUser();
  const id = await todayFocusConceptId(user.id);
  redirect(id ? `/focus/${id}` : "/roadmap");
}
