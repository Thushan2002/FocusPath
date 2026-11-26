import { getRoadmapView } from "@/lib/dal/roadmap";
import { notFound } from "@/lib/errors";
import { route } from "@/lib/http";

export const GET = route(async ({ userId }) => {
  const view = await getRoadmapView(userId);
  if (!view) throw notFound("No roadmap yet");
  return view;
});
