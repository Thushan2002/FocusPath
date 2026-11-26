import "server-only";
import { z } from "zod";
import { notFound } from "./errors";

/** Route ids must be UUIDs; anything else is simply not found. */
export function uuidParam(value: string | undefined): string {
  const r = z.uuid().safeParse(value);
  if (!r.success) throw notFound();
  return r.data;
}
