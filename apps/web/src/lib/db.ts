import "server-only";
import { createDb, type Database } from "@focuspath/db";
import { env } from "./env";

const g = globalThis as unknown as { __fpDb?: Database };

/** One pool per process (survives dev hot reloads). */
export function db(): Database {
  g.__fpDb ??= createDb(env().DATABASE_URL).db;
  return g.__fpDb;
}
