import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getToday } from "@/lib/dal/plan";
import { getActiveGoal } from "@/lib/dal/profile";
import { requireUser } from "@/lib/session";
import { Dashboard } from "./dashboard";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const user = await requireUser();
  const goal = await getActiveGoal(user.id);
  if (!goal?.activeRoadmapId) redirect("/roadmap/generating");
  const today = await getToday(user.id, user.name);
  return <Dashboard initial={today} />;
}
