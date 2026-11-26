import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getActiveGoal } from "@/lib/dal/profile";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!(await getActiveGoal(user.id))) redirect("/onboarding");
  return <AppShell userName={user.name}>{children}</AppShell>;
}
