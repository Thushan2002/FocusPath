import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth().api.getSession({ headers: await headers() });
  if (!session) return null;
  return { id: session.user.id, name: session.user.name, email: session.user.email };
});

/** For server components/layouts: the signed-in user, or a redirect to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
