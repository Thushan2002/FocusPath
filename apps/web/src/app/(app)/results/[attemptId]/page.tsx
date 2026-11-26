import type { Metadata } from "next";
import { getResults } from "@/lib/dal/assessment";
import { loadByIdOr404 } from "@/lib/page-data";
import { requireUser } from "@/lib/session";
import { ResultsScreen } from "./results-screen";

export const metadata: Metadata = { title: "Results" };

export default async function ResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const user = await requireUser();
  const { attemptId } = await params;
  const results = await loadByIdOr404(attemptId, (id) => getResults(user.id, id));
  return <ResultsScreen r={results} />;
}
