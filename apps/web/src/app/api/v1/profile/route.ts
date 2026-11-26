import { ProfileUpdateSchema } from "@focuspath/shared";
import { getProfile, updateProfile } from "@/lib/dal/profile";
import { notFound } from "@/lib/errors";
import { parseBody, route } from "@/lib/http";

export const GET = route(async ({ userId }) => {
  const p = await getProfile(userId);
  if (!p) throw notFound("No profile yet");
  return p;
});

export const PUT = route(async ({ req, userId }) => {
  const patch = await parseBody(req, ProfileUpdateSchema);
  return updateProfile(userId, patch);
});
