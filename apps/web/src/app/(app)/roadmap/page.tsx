import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRoadmapView } from "@/lib/dal/roadmap";
import { requireUser } from "@/lib/session";
import { RoadmapScreen } from "./roadmap-screen";

export const metadata: Metadata = { title: "Roadmap" };

export default async function RoadmapPage() {
  const user = await requireUser();
  const view = await getRoadmapView(user.id);
  if (!view) redirect("/roadmap/generating");
  return <RoadmapScreen initial={view} />;
}
