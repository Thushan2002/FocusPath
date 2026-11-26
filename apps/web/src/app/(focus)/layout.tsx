import { requireUser } from "@/lib/session";

export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <>{children}</>;
}
