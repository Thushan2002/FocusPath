import { redirect } from "next/navigation";
import { latestRoadmapFor } from "@/lib/dal/profile";
import { requireUser } from "@/lib/session";
import { GeneratingView } from "./generating-view";

export default async function GeneratingPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const user = await requireUser();
  const { id } = await searchParams;
  const roadmapId = id ?? (await latestRoadmapFor(user.id))?.id;
  if (!roadmapId) redirect("/onboarding");
  return <GeneratingView roadmapId={roadmapId} />;
}
