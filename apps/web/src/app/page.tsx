import { redirect } from "next/navigation";
import { homePathFor } from "@/lib/dal/profile";
import { getSessionUser } from "@/lib/session";

export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? await homePathFor(user.id) : "/login");
}
