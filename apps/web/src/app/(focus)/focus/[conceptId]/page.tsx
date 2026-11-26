import type { Metadata } from "next";
import { getConceptDetail } from "@/lib/dal/roadmap";
import { loadByIdOr404 } from "@/lib/page-data";
import { requireUser } from "@/lib/session";
import { FocusScreen } from "./focus-screen";

export const metadata: Metadata = { title: "Focus mode" };

export default async function FocusPage({ params }: { params: Promise<{ conceptId: string }> }) {
  const user = await requireUser();
  const { conceptId } = await params;
  const concept = await loadByIdOr404(conceptId, (id) => getConceptDetail(user.id, id));
  return <FocusScreen concept={concept} />;
}
