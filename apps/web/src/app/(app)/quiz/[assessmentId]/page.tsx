import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAssessment } from "@/lib/dal/assessment";
import { loadByIdOr404 } from "@/lib/page-data";
import { requireUser } from "@/lib/session";
import { QuizScreen } from "./quiz-screen";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const user = await requireUser();
  const { assessmentId } = await params;
  const quiz = await loadByIdOr404(assessmentId, (id) => getAssessment(user.id, id));
  if (quiz.attemptId) redirect(`/results/${quiz.attemptId}`);
  return <QuizScreen quiz={quiz} />;
}
