import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AppError } from "./errors";

/**
 * For server-component pages keyed by a UUID route segment: validates the id, runs the loader
 * and turns a DAL 404 (including "belongs to another learner") into Next's not-found page.
 */
export async function loadByIdOr404<T>(id: string, load: (id: string) => Promise<T>): Promise<T> {
  if (!z.uuid().safeParse(id).success) notFound();
  try {
    return await load(id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
}
